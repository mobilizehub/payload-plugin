import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { BasePayload, TaskConfig } from 'payload'

import type { MobilizehubPluginConfig } from '../types/index.js'

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

      // Skip if already processed (handles job retries)
      const existingEmail = await checkEmailExists(
        payload,
        collections.emails,
        broadcastId,
        contactId,
      )

      if (existingEmail) {
        logger.info(
          `Email already exists for broadcast ${broadcastId}, contact ${contactId} ` +
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

      const tokenId = crypto.randomUUID()
      const unsubscribeToken = generateUnsubscribeToken({ tokenId })

      const parsedContent = await parseLexicalContent(
        broadcast.content as SerializedEditorState,
        payload.config,
      )

      const html = sender.render({
        from: fromAddress,
        html: parsedContent.html,
        markdown: parsedContent.markdown,
        plainText: parsedContent.plainText,
        subject: broadcast.subject,
        to: contact.email,
        token: unsubscribeToken,
      })

      // Create record before sending so failures are trackable
      const email = await payload.create({
        collection: collections.emails,
        data: {
          broadcast: broadcast.id,
          contact: contact.id,
          from: fromAddress,
          html,
          status: 'queued',
          subject: broadcast.subject,
          to: contact.email,
        },
      })

      await payload.create({
        collection: 'emailUnsubscribeTokens',
        data: { id: tokenId, emailId: email.id },
      })

      const result = await sender.sendEmail({
        from: fromAddress,
        html,
        idempotencyKey: `broadcast-${broadcastId}-contact-${contactId}`,
        markdown: parsedContent.markdown,
        plainText: parsedContent.plainText,
        previewText: broadcast.previewText,
        replyTo: broadcast.replyTo,
        subject: broadcast.subject,
        to: contact.email,
        token: unsubscribeToken,
      })

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
