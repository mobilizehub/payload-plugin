import type { CollectionAfterChangeHook } from 'payload'

import type { MobilizehubPluginConfig } from '../../../types/index.js'

import { formatFromAddress } from '../../../utils/email.js'
import { textToHtml } from '../../../utils/text-to-html.js'

/**
 * Joins the parts of the letter into the body that gets sent, skipping any the
 * campaign left empty.
 */
function buildLetterText(parts: (string | undefined)[]): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('\n\n')
}

/**
 * Creates the letter delivery hook.
 *
 * Sends one letter submission to the campaign's target as a single email, then
 * records it in the emails collection so it picks up the same status and bounce
 * handling as every other email the plugin sends. It:
 * 1. Loads the campaign for its target address and subject
 * 2. Assembles the plain text body and converts it to HTML
 * 3. Renders through the email template and sends
 * 4. Writes the emails row and links it back to the submission
 *
 * The letter is sent from the organisation's configured address, never the
 * contact's - that would fail DMARC. The contact's address goes in Reply-To so
 * the target can reply to a real person.
 *
 * Errors are logged but never thrown to avoid failing the submission.
 *
 * @example
 * ```typescript
 * hooks: {
 *   afterChange: [createDeliverLetterHook(pluginConfig)],
 * }
 * ```
 */
export const createDeliverLetterHook = (
  pluginConfig: MobilizehubPluginConfig,
): CollectionAfterChangeHook => {
  const contactsSlug = pluginConfig.contactsOverrides?.slug || 'contacts'
  const emailsSlug = pluginConfig.emailsOverrides?.slug || 'emails'
  const lettersSlug = pluginConfig.lettersOverrides?.slug || 'letters'
  const letterSubmissionsSlug =
    pluginConfig.letterSubmissionsOverrides?.slug || 'letterSubmissions'

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

      const letter = await payload.findByID({
        id: letterIdValue,
        collection: lettersSlug,
        depth: 0,
      })

      if (!letter) {
        return doc
      }

      const targetEmail = letter.email as string | undefined

      if (!targetEmail) {
        logger.warn(`Letter ${letterIdValue} has no target email, skipping delivery`)
        return doc
      }

      const subject = letter.subject as string | undefined

      if (!subject) {
        logger.warn(`Letter ${letterIdValue} has no subject, skipping delivery`)
        return doc
      }

      const submissionData = (doc.data as Record<string, unknown> | undefined) || {}

      // The sender's details come from the linked contact where there is one, so
      // an existing contact's stored name is used over whatever was typed.
      const contactId = doc.contact as { id: number | string } | number | string | undefined
      let contact: null | Record<string, unknown> = null

      if (contactId) {
        contact = await payload.findByID({
          id: typeof contactId === 'object' ? contactId.id : contactId,
          collection: contactsSlug,
          depth: 0,
        })
      }

      const firstName = (contact?.firstName || submissionData.firstName || '') as string
      const lastName = (contact?.lastName || submissionData.lastName || '') as string
      const senderName = [firstName, lastName].filter(Boolean).join(' ').trim()
      const senderEmail = (contact?.email || submissionData.email) as string | undefined

      // The body carries its own salutation and sign-off, so only the sender's
      // name is appended - the target needs to know who wrote to them.
      const plainText = buildLetterText([doc.body as string | undefined, senderName])

      const html = textToHtml(plainText)

      const { defaultFromAddress, defaultFromName, render, sendEmail } = pluginConfig.email(req)

      const fromAddress = formatFromAddress(defaultFromName, defaultFromAddress)

      const renderedHtml = await render({
        from: fromAddress,
        html,
        plainText,
        replyTo: senderEmail,
        subject,
        to: targetEmail,
        // The target is not a contact, so no unsubscribe footer.
        token: '',
      })

      // Derived from the submission ID so a re-run replays rather than sends twice.
      const idempotencyKey = `letter-submission-${doc.id}`

      const result = await sendEmail({
        from: fromAddress,
        html: renderedHtml,
        idempotencyKey,
        plainText,
        replyTo: senderEmail,
        subject,
        to: targetEmail,
        token: '',
      })

      // Created with status 'queued'; the activity entry lifts it to 'sent'
      // through the emails collection's own sync hook, and providerId is what
      // later delivery webhooks match on.
      const email = await payload.create({
        collection: emailsSlug,
        data: {
          activity: [{ type: 'sent', timestamp: new Date().toISOString() }],
          from: fromAddress,
          html: renderedHtml,
          idempotencyKey,
          letterSubmission: doc.id,
          providerId: result?.providerId,
          replyTo: senderEmail,
          status: 'queued',
          subject,
          to: targetEmail,
        },
      })

      await payload.update({
        id: doc.id,
        collection: letterSubmissionsSlug,
        data: { email: email.id },
        overrideAccess: true,
      })

      logger.info(`Sent letter ${doc.id} to ${targetEmail} for letter ${letterIdValue}`)

      return { ...doc, email: email.id }
    } catch (error) {
      logger.error(error as Error, 'Error delivering letter')
      // Don't throw - the submission should still succeed
    }

    return doc
  }
}
