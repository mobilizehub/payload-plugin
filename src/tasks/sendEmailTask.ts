import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { PayloadRequest, TaskConfig } from 'payload'

import type { MobilizehubPluginConfig } from '../types/index.js'

import { formatFromAddress } from '../utils/email.js'
import { parseLexicalContent } from '../utils/lexical.js'
import { generateUnsubscribeToken } from '../utils/unsubscribe-token.js'

/**
 * Get contact by ID
 */
async function getContact(
  contactId: number | string,
  req: PayloadRequest,
  config: MobilizehubPluginConfig,
) {
  const contact = await req.payload.findByID({
    id: contactId,
    collection: config.contactsOverrides?.slug || 'contacts',
  })

  if (!contact) {
    throw new Error(`Contact ${contactId} not found`)
  }

  return contact
}

/**
 * Get broadcast by ID
 */
async function getBroadcast(
  broadcastId: number | string,
  req: PayloadRequest,
  config: MobilizehubPluginConfig,
) {
  const broadcast = await req.payload.findByID({
    id: broadcastId,
    collection: config.broadcastsOverrides?.slug || 'broadcasts',
  })

  if (!broadcast) {
    throw new Error(`Broadcast ${broadcastId} not found`)
  }

  return broadcast
}

/**
 * Creates an unsubscribe token record in the database.
 */

async function createUnsubscribeToken(
  args: {
    emailId: number | string
    tokenId: string
  },
  req: PayloadRequest,
): Promise<void> {
  await req.payload.create({
    collection: 'emailUnsubscribeTokens',
    data: {
      id: args.tokenId,
      emailId: args.emailId,
    },
  })
}

/**
 * Creates a task configuration for sending emails.
 * This task is called to process sending emails for a specific contact and broadcast.
 *
 * @param taskConfig - The Mobilizehub plugin configuration
 * @returns A Payload TaskConfig object for the send-email task
 */
export const createSendEmailTask = (taskConfig: MobilizehubPluginConfig): TaskConfig => {
  const config: TaskConfig = {
    slug: 'send-email',
    handler: async ({ input, req }) => {
      req.payload.logger.info('Send Email task handler called')

      if (!input) {
        throw new Error('Input is required for send-email task')
      }

      if (!input.contactId) {
        throw new Error('contactId is required')
      }

      if (!input.broadcastId) {
        throw new Error('broadcastId is required')
      }

      /**
       * Check for existing email for this broadcast-contact combination (idempotency protection)
       * Use contact ID directly to avoid fetching contact data for duplicate checks
       */
      const existingEmails = await req.payload.find({
        collection: taskConfig.emailsOverrides?.slug || 'emails',
        limit: 1,
        where: {
          and: [
            { broadcast: { equals: input.broadcastId } },
            { contact: { equals: input.contactId } },
          ],
        },
      })

      if (existingEmails.docs.length > 0) {
        const existingEmail = existingEmails.docs[0]
        req.payload.logger.info(
          `Email already exists for broadcast ${input.broadcastId}, contact ${input.contactId} (email ID: ${existingEmail.id}, status: ${existingEmail.status})`,
        )
        return {
          errorMessage: `Email already exists for broadcast ${input.broadcastId}, contact ${input.contactId} (email ID: ${existingEmail.id}, status: ${existingEmail.status})`,
          output: {
            success: true,
          },
          state: 'succeeded',
        }
      }

      /**
       * Fetch contact and broadcast in parallel for better performance
       */
      const [contact, broadcast] = await Promise.all([
        getContact(input.contactId, req, taskConfig),
        getBroadcast(input.broadcastId, req, taskConfig),
      ])

      req.payload.logger.info(
        `Preparing to send email for broadcast ID: ${broadcast.id} to contact ID: ${contact.id}`,
      )

      /**
       * Get email configuration
       */
      const sender = taskConfig.email({
        payload: req.payload,
      })

      /**
       * Parse broadcast content into html, plaintext, and markdown
       */
      const parsedContent = await parseLexicalContent(
        broadcast.content as SerializedEditorState,
        req.payload.config,
      )

      req.payload.logger.info(`Parsed broadcast content for broadcast ID: ${broadcast.id}`)

      /**
       * Generate a unique token ID for the unsubscribe token
       */
      const tokenId = crypto.randomUUID()

      /**
       * Create unsubscribe token for contact
       */
      const unsubscribeToken = generateUnsubscribeToken({
        tokenId,
      })

      /**
       * Format from address for email
       */
      const fromAddress = formatFromAddress(broadcast.fromName, broadcast.fromAddress)

      req.payload.logger.info(
        `Formatted from address as ${fromAddress} for broadcast ID: ${broadcast.id}`,
      )

      /**
       * Render email HTML content
       */
      const html = sender.render({
        from: fromAddress,
        html: parsedContent.html,
        markdown: parsedContent.markdown,
        plainText: parsedContent.plainText,
        subject: broadcast.subject,
        to: contact.email,
        token: unsubscribeToken,
      })

      req.payload.logger.info(
        `Rendered HTML content for broadcast ID: ${broadcast.id} to contact ID: ${contact.id}`,
      )

      const emailInput = {
        broadcast: broadcast.id,
        contact: contact.id,
        from: fromAddress,
        html,
        status: 'queued',
        subject: broadcast.subject,
        to: contact.email,
      }

      req.payload.logger.info(
        emailInput,
        `Prepared email input data for broadcast ID: ${broadcast.id} to contact ID: ${contact.id}`,
      )

      /**
       * Create email record BEFORE sending (status: 'queued')
       */
      const email = await req.payload.create({
        collection: taskConfig.emailsOverrides?.slug || 'emails',
        data: emailInput,
      })

      req.payload.logger.info(
        `Created email record with ID: ${email.id} for broadcast ID: ${broadcast.id} to contact ID: ${contact.id}`,
      )

      const emailId = email.id

      /**
       * Save unsubscribe token record
       */
      await createUnsubscribeToken(
        {
          emailId: email.id,
          tokenId,
        },
        req,
      )

      /**
       * Send the email
       */
      const result = await sender.sendEmail({
        from: fromAddress,
        html,
        idempotencyKey: `broadcast-${input.broadcastId}-contact-${input.contactId}`,
        markdown: parsedContent.markdown,
        plainText: parsedContent.plainText,
        previewText: broadcast.previewText,
        replyTo: broadcast.replyTo,
        subject: broadcast.subject,
        to: contact.email,
        token: unsubscribeToken,
      })

      /**
       * Update email status to 'sent' with provider ID
       */
      await req.payload.update({
        id: emailId,
        collection: taskConfig.emailsOverrides?.slug || 'emails',
        data: {
          activity: [{ type: 'sent', timestamp: new Date().toISOString() }],
          providerId: result?.providerId,
          status: 'sent',
        },
      })

      return {
        output: {
          success: true,
        },
      }
    },

    inputSchema: [
      {
        name: 'contactId',
        type: 'number',
        required: true,
      },
      {
        name: 'broadcastId',
        type: 'number',
        required: true,
      },
    ],
    outputSchema: [
      {
        name: 'success',
        type: 'checkbox',
      },
    ],
    retries: 3,
  }

  return config
}
