import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { CollectionAfterChangeHook } from 'payload'

import type { MobilizehubPluginConfig } from '../../../types/index.js'

import { formatFromAddress } from '../../../utils/email.js'
import { parseLexicalContent } from '../../../utils/lexical.js'

/**
 * Autoresponse configuration from letter.
 */
type AutoresponseConfig = {
  content?: SerializedEditorState
  enabled?: boolean
  fromAddress?: string
  fromName?: string
  previewText?: string
  replyTo?: string
  subject?: string
}

/**
 * Creates the autoresponse email hook for letter submissions.
 *
 * This hook sends an automatic confirmation email to the contact who sent the
 * letter when autoresponse is enabled on the letter. It:
 * 1. Checks if autoresponse is enabled on the letter
 * 2. Validates required autoresponse fields
 * 3. Parses Lexical content to HTML
 * 4. Renders through email template
 * 5. Sends the email
 *
 * Errors are logged but never thrown to avoid failing the submission.
 */
export const createSendLetterAutoresponseHook = (
  pluginConfig: MobilizehubPluginConfig,
): CollectionAfterChangeHook => {
  const lettersSlug = pluginConfig.lettersOverrides?.slug || 'letters'
  const contactsSlug = pluginConfig.contactsOverrides?.slug || 'contacts'

  return async ({ doc, operation, req }) => {
    // Only process on create
    if (operation !== 'create') {
      return doc
    }

    const { payload } = req
    const logger = payload.logger

    try {
      // Get letter ID from submission
      const letterId = doc.letter as { id: number | string } | number | string
      const letterIdValue = typeof letterId === 'object' ? letterId.id : letterId

      if (!letterIdValue) {
        return doc
      }

      // Fetch letter to get autoresponse configuration
      const letter = await payload.findByID({
        id: letterIdValue,
        collection: lettersSlug,
      })

      if (!letter) {
        return doc
      }

      // Check if autoresponse is enabled
      const autoresponse = letter.autoresponse as AutoresponseConfig | undefined

      if (!autoresponse?.enabled) {
        return doc
      }

      // Get contact email
      const contactId = doc.contact as { id: number | string } | number | string | undefined

      if (!contactId) {
        logger.warn('Letter submission has no linked contact, skipping autoresponse')
        return doc
      }

      const contactIdValue = typeof contactId === 'object' ? contactId.id : contactId

      const contact = await payload.findByID({
        id: contactIdValue,
        collection: contactsSlug,
      })

      const contactEmail = contact?.email as string | undefined

      if (!contactEmail) {
        logger.warn(`Contact ${contactIdValue} has no email, skipping autoresponse`)
        return doc
      }

      // Validate required autoresponse fields
      const { content, fromAddress, fromName, previewText, replyTo, subject } = autoresponse

      if (!subject) {
        logger.warn(`Letter ${letterIdValue} autoresponse has no subject, skipping`)
        return doc
      }

      if (!content) {
        logger.warn(`Letter ${letterIdValue} autoresponse has no content, skipping`)
        return doc
      }

      if (!fromName || !fromAddress) {
        logger.warn(`Letter ${letterIdValue} autoresponse has no from address, skipping`)
        return doc
      }

      // Get email adapter
      const { render, sendEmail } = pluginConfig.email(req)

      // Parse Lexical content
      const parsedContent = await parseLexicalContent(content, payload.config)

      // Format from address
      const formattedFromAddress = formatFromAddress(fromName, fromAddress)

      // Render through email template
      const html = await render({
        from: formattedFromAddress,
        html: parsedContent.html,
        markdown: parsedContent.markdown,
        plainText: parsedContent.plainText,
        previewText,
        replyTo,
        subject,
        to: contactEmail,
        token: '', // No unsubscribe token for autoresponse
      })

      // Send the email
      await sendEmail({
        from: formattedFromAddress,
        html,
        subject,
        to: contactEmail,
      })

      logger.info(`Sent autoresponse to ${contactEmail} for letter ${letterIdValue}`)
    } catch (error) {
      logger.error(error as Error, 'Error sending autoresponse email')
      // Don't throw - submission should still succeed
    }

    return doc
  }
}
