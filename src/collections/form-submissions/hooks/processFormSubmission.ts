import type { CollectionBeforeChangeHook } from 'payload'

import type { MobilizehubPluginConfig } from '../../../types/index.js'

/**
 * Contact field mapping from form submission data to contact fields.
 */
const CONTACT_FIELD_MAP = [
  'email',
  'emailOptIn',
  'firstName',
  'lastName',
  'mobileNumber',
  'mobileOptIn',
  'address',
  'city',
  'state',
  'zip',
  'country',
] as const

type ContactFieldName = (typeof CONTACT_FIELD_MAP)[number]

/**
 * Extracts contact-related fields from form submission data.
 */
function extractContactData(
  submissionData: Record<string, unknown>,
): Partial<Record<ContactFieldName, unknown>> {
  const contactData: Partial<Record<ContactFieldName, unknown>> = {}

  for (const field of CONTACT_FIELD_MAP) {
    if (submissionData[field] !== undefined) {
      contactData[field] = submissionData[field]
    }
  }

  return contactData
}

/**
 * Creates the form submission processing hook.
 *
 * This hook:
 * 1. Creates or updates a contact based on submission data
 * 2. Applies form tags to the contact
 * 3. Links the submission to the contact by returning modified data
 */
export const createProcessFormSubmissionHook = (
  pluginConfig: MobilizehubPluginConfig,
): CollectionBeforeChangeHook => {
  const contactsSlug = pluginConfig.contactsOverrides?.slug || 'contacts'
  const formsSlug = pluginConfig.formsOverrides?.slug || 'forms'

  return async ({ data, operation, req }) => {
    // Only process on creation
    if (operation !== 'create') {
      return data
    }

    const { payload } = req
    const logger = payload.logger

    // Parse submission data
    const submissionData = data.data as Record<string, unknown> | undefined

    if (!submissionData) {
      logger.warn('Form submission has no data')
      return data
    }

    // Email is required for contact creation
    const email = submissionData.email as string | undefined

    if (!email || typeof email !== 'string') {
      logger.info('Form submission has no email, skipping contact creation')
      return data
    }

    try {
      // Extract contact fields from submission
      const contactData = extractContactData(submissionData)

      // Find or create contact
      const existingContactResult = await payload.find({
        collection: contactsSlug,
        limit: 1,
        where: { email: { equals: email } },
      })

      const existingContact = existingContactResult.docs[0] as
        | { id: number | string; tags?: (number | string)[] }
        | undefined

      let contactId: number | string

      if (existingContact) {
        // Update existing contact (merge data, don't overwrite with empty values)
        const updateData: Record<string, unknown> = {}

        for (const [key, value] of Object.entries(contactData)) {
          if (value !== undefined && value !== null && value !== '') {
            updateData[key] = value
          }
        }

        await payload.update({
          id: existingContact.id,
          collection: contactsSlug,
          data: updateData,
        })

        contactId = existingContact.id
        logger.info(`Updated contact ${contactId} from form submission`)
      } else {
        // Create new contact
        const newContact = await payload.create({
          collection: contactsSlug,
          data: contactData,
        })

        contactId = newContact.id
        logger.info(`Created contact ${contactId} from form submission`)
      }

      const formId = data.form as { id: number | string } | number | string
      const formIdValue = typeof formId === 'object' ? formId.id : formId

      if (!formIdValue) {
        logger.error('Form ID not found for form submission')
        throw new Error('Form ID not found for form submission')
      }

      // Get form to check for tags
      const form = await payload.findByID({
        id: formIdValue,
        collection: formsSlug,
        depth: 0,
      })

      // Apply form tags to contact
      if (form && Array.isArray(form.tags) && form.tags.length > 0) {
        // Get form tag IDs
        const formTagIds = form.tags.map((t: { id: number | string } | number | string) =>
          typeof t === 'object' ? t.id : t,
        )

        // Fetch current contact to get up-to-date tags
        const currentContact = await payload.findByID({
          id: contactId,
          collection: contactsSlug,
          depth: 0,
        })

        // Get existing tag IDs (normalize to IDs)
        const existingTagIds = (
          (currentContact.tags as ({ id: number | string } | number | string)[]) || []
        ).map((t) => (typeof t === 'object' ? t.id : t))

        // Find only new tags that don't already exist
        const newTagIds = formTagIds.filter(
          (tagId: number | string) => !existingTagIds.includes(tagId),
        )

        if (newTagIds.length > 0) {
          // Merge tags
          const mergedTags = [...existingTagIds, ...newTagIds]

          // Update contact with merged tags
          await payload.update({
            id: contactId,
            collection: contactsSlug,
            data: { tags: mergedTags },
          })

          logger.info(`Applied ${newTagIds.length} new tags to contact ${contactId}`)
        } else {
          logger.info(`Contact ${contactId} already has all form tags`)
        }
      }

      // Return data with contact linked - no separate update needed
      return {
        ...data,
        contact: contactId,
      }
    } catch (error) {
      logger.error(error as Error, 'Error processing form submission')
      // Don't throw - we don't want to fail the submission
      return data
    }
  }
}
