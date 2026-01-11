import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { CollectionAfterChangeHook } from 'payload'

import type { MobilizehubPluginConfig } from '../../../types/index.js'

import { formatFromAddress } from '../../../utils/email.js'
import { parseLexicalContent } from '../../../utils/lexical.js'

/**
 * Autoresponse configuration from form.
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
 * Creates the autoresponse email hook for form submissions.
 *
 * This hook sends an automatic confirmation email to the form submitter
 * when autoresponse is enabled on the form. It:
 * 1. Checks if autoresponse is enabled on the form
 * 2. Validates required autoresponse fields
 * 3. Parses Lexical content to HTML
 * 4. Renders through email template
 * 5. Sends the email
 *
 * Errors are logged but never thrown to avoid failing the submission.
 */
export const createSendAutoresponseHook = (
  pluginConfig: MobilizehubPluginConfig,
): CollectionAfterChangeHook => {
  const formsSlug = pluginConfig.formsOverrides?.slug || 'forms'
  const contactsSlug = pluginConfig.contactsOverrides?.slug || 'contacts'

  return async ({ doc, operation, req }) => {
    // Only process on create
    if (operation !== 'create') {
      return doc
    }

    const { payload } = req
    const logger = payload.logger

    try {
      // Get form ID from submission
      const formId = doc.form as { id: number | string } | number | string
      const formIdValue = typeof formId === 'object' ? formId.id : formId

      if (!formIdValue) {
        return doc
      }

      // Fetch form to get autoresponse configuration
      const form = await payload.findByID({
        id: formIdValue,
        collection: formsSlug,
      })

      if (!form) {
        return doc
      }

      // Check if autoresponse is enabled
      const autoresponse = form.autoresponse as AutoresponseConfig | undefined

      if (!autoresponse?.enabled) {
        return doc
      }

      // Get contact email
      const contactId = doc.contact as { id: number | string } | number | string | undefined

      if (!contactId) {
        logger.warn('Form submission has no linked contact, skipping autoresponse')
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
        logger.warn(`Form ${formIdValue} autoresponse has no subject, skipping`)
        return doc
      }

      if (!content) {
        logger.warn(`Form ${formIdValue} autoresponse has no content, skipping`)
        return doc
      }

      if (!fromName || !fromAddress) {
        logger.warn(`Form ${formIdValue} autoresponse has no from address, skipping`)
        return doc
      }

      // Get email adapter
      const { render, sendEmail } = pluginConfig.email(req)

      // Parse Lexical content
      const parsedContent = await parseLexicalContent(content, payload.config)

      // Format from address
      const formattedFromAddress = formatFromAddress(fromName, fromAddress)

      // Render through email template
      const html = render({
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

      logger.info(`Sent autoresponse to ${contactEmail} for form ${formIdValue}`)
    } catch (error) {
      logger.error(error as Error, 'Error sending autoresponse email')
      // Don't throw - submission should still succeed
    }

    return doc
  }
}
