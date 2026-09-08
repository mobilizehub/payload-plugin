import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { BasePayload, TaskConfig } from 'payload'

import type { MobilizehubPluginConfig } from '../types/index.js'

import { EmailSendError } from '../adapters/resend-adapter.js'
import { formatFromAddress } from '../utils/email.js'
import { parseLexicalContent } from '../utils/lexical.js'
import { generateUnsubscribeToken } from '../utils/unsubscribe-token.js'

/**
 * Resolves collection slugs from plugin config, falling back to defaults.
 */
function getCollectionSlugs(config: MobilizehubPluginConfig) {
  return {
    broadcasts: config.broadcastsOverrides?.slug || 'broadcasts',
    contacts: config.contactsOverrides?.slug || 'contacts',
    emails: config.emailsOverrides?.slug || 'emails',
  }
}

/**
 * Checks if an email record already exists for a broadcast-contact pair.
 */
async function checkEmailExists(
  payload: BasePayload,
  collection: string,
  broadcastId: number | string,
  contactId: number | string,
) {
  const { docs } = await payload.find({
    collection,
    limit: 1,
    where: {
      and: [{ broadcast: { equals: broadcastId } }, { contact: { equals: contactId } }],
    },
  })

  return docs[0] ?? null
}

/**
 * Writes the unsubscribe token record unless it already exists.
 */
async function ensureUnsubscribeToken(
  payload: BasePayload,
  tokenId: string,
  emailId: number | string,
) {
  const existing = await payload.findByID({
    id: tokenId,
    collection: 'emailUnsubscribeTokens',
    disableErrors: true,
  })

  if (existing) {
    return
  }

  await payload.create({
    collection: 'emailUnsubscribeTokens',
    data: { id: tokenId, emailId },
  })
}

/**
 * Creates the send-email task configuration.
 *
 * Handles delivery of a single email for one contact within a broadcast.
 * Queued by the send-broadcasts task, one job per contact.
 */
export const createSendEmailTask = (pluginConfig: MobilizehubPluginConfig): TaskConfig => {
  const collections = getCollectionSlugs(pluginConfig)

  return {
    slug: 'send-email',
    handler: async ({ input, req }) => {
      const { payload } = req
      const logger = payload.logger

      const { broadcastId, contactId } = input as { broadcastId: number; contactId: number }

      const existingEmail = await checkEmailExists(
        payload,
        collections.emails,
        broadcastId,
        contactId,
      )

      // Anything past 'queued' has already been handed to the provider.
      if (existingEmail && existingEmail.status !== 'queued') {
        logger.info(
          `Email already sent for broadcast ${broadcastId}, contact ${contactId} ` +
            `(email ID: ${existingEmail.id}, status: ${existingEmail.status})`,
        )
        return { output: { success: true } }
      }

      const [contact, broadcast] = await Promise.all([
        payload.findByID({ id: contactId, collection: collections.contacts }),
        payload.findByID({ id: broadcastId, collection: collections.broadcasts }),
      ])

      if (!contact) {
        throw new Error(`Contact ${contactId} not found`)
      }
      if (!broadcast) {
        throw new Error(`Broadcast ${broadcastId} not found`)
      }

      const sender = pluginConfig.email({ payload })
      const fromAddress = formatFromAddress(broadcast.fromName, broadcast.fromAddress)

      const parsedContent = await parseLexicalContent(
        broadcast.content as SerializedEditorState,
        payload.config,
      )

      // The link baked into already-rendered HTML has to keep resolving. The
      // regenerated token string carries a fresh timestamp, which is fine —
      // verification only checks the signature and age.
      const tokenId = existingEmail?.unsubscribeTokenId ?? crypto.randomUUID()
      const unsubscribeToken = generateUnsubscribeToken({ tokenId })

      let email = existingEmail

      if (!email) {
        // previewText reaches the inbox as a preheader in the rendered HTML; no
        // provider takes it as a field.
        const html = sender.render({
          from: fromAddress,
          html: parsedContent.html,
          markdown: parsedContent.markdown,
          plainText: parsedContent.plainText,
          previewText: broadcast.previewText,
          subject: broadcast.subject,
          to: contact.email,
          token: unsubscribeToken,
        })

        try {
          email = await payload.create({
            collection: collections.emails,
            data: {
              broadcast: broadcast.id,
              contact: contact.id,
              from: fromAddress,
              html,
              idempotencyKey: crypto.randomUUID(),
              replyTo: broadcast.replyTo,
              status: 'queued',
              subject: broadcast.subject,
              to: contact.email,
              unsubscribeTokenId: tokenId,
            },
          })
        } catch (error) {
          // Another worker won the race on the unique (broadcast, contact) index.
          const raced = await checkEmailExists(payload, collections.emails, broadcastId, contactId)
          if (!raced) {
            throw error
          }
          logger.info(`Lost create race for broadcast ${broadcastId}, contact ${contactId}`)
          return { output: { success: true } }
        }

        await payload.create({
          collection: 'emailUnsubscribeTokens',
          data: { id: tokenId, emailId: email.id },
        })
      } else {
        logger.info(`Resuming queued email ${email.id} for broadcast ${broadcastId}`)

        // The previous attempt may have died between the two creates above, or this
        // row may predate unsubscribeTokenId entirely.
        await ensureUnsubscribeToken(payload, tokenId, email.id)

        if (!email.unsubscribeTokenId) {
          email = await payload.update({
            id: email.id,
            collection: collections.emails,
            data: { unsubscribeTokenId: tokenId },
          })
        }
      }

      // A byte-identical payload under the same key turns a retry into a replay
      // rather than a 409.
      let result
      try {
        result = await sender.sendEmail({
          from: email.from,
          html: email.html,
          idempotencyKey: email.idempotencyKey ?? undefined,
          markdown: parsedContent.markdown,
          plainText: parsedContent.plainText,
          previewText: broadcast.previewText,
          replyTo: email.replyTo ?? undefined,
          subject: email.subject,
          to: email.to,
          token: unsubscribeToken,
        })
      } catch (error) {
        if (error instanceof EmailSendError && !error.retryable) {
          await payload.update({
            id: email.id,
            collection: collections.emails,
            data: {
              activity: [{ type: 'failed', timestamp: new Date().toISOString() }],
              status: 'failed',
            },
          })
          logger.error(`Email ${email.id} failed permanently: ${error.message}`)
          return { output: { success: false } }
        }
        throw error
      }

      await payload.update({
        id: email.id,
        collection: collections.emails,
        data: {
          activity: [{ type: 'sent', timestamp: new Date().toISOString() }],
          providerId: result?.providerId,
          status: 'sent',
        },
      })

      logger.info(`Sent email ${email.id} for broadcast ${broadcastId} to ${contact.email}`)

      return { output: { success: true } }
    },
    inputSchema: [
      { name: 'contactId', type: 'number', required: true },
      { name: 'broadcastId', type: 'number', required: true },
    ],
    outputSchema: [{ name: 'success', type: 'checkbox' }],
    retries: 3,
  }
}
