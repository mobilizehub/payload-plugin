import type { CollectionBeforeChangeHook } from 'payload'

import type { MobilizehubPluginConfig } from '../../../types/index.js'

/**
 * Contact field mapping from petition signature data to contact fields.
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
 * Extracts contact-related fields from petition signature data.
 */
function extractContactData(
  signatureData: Record<string, unknown>,
): Partial<Record<ContactFieldName, unknown>> {
  const contactData: Partial<Record<ContactFieldName, unknown>> = {}

  for (const field of CONTACT_FIELD_MAP) {
    if (signatureData[field] !== undefined) {
      contactData[field] = signatureData[field]
    }
  }

  return contactData
}

/**
 * Creates the petition signature processing hook.
 *
 * This hook:
 * 1. Creates or updates a contact based on signature data
 * 2. Applies petition tags to the contact
 * 3. Links the signature to the contact by returning modified data
 */
export const createProcessPetitionSignatureHook = (
  pluginConfig: MobilizehubPluginConfig,
): CollectionBeforeChangeHook => {
  const contactsSlug = pluginConfig.contactsOverrides?.slug || 'contacts'
  const petitionsSlug = pluginConfig.petitionsOverrides?.slug || 'petitions'

  return async ({ data, operation, req }) => {
    // Only process on creation
    if (operation !== 'create') {
      return data
    }

    const { payload } = req
    const logger = payload.logger

    // Parse signature data
    const signatureData = data.data as Record<string, unknown> | undefined

    if (!signatureData) {
      logger.warn('Petition signature has no data')
      return data
    }

    // Email is required for contact creation
    const email = signatureData.email as string | undefined

    if (!email || typeof email !== 'string') {
      logger.info('Petition signature has no email, skipping contact creation')
      return data
    }

    try {
      // Extract contact fields from signature
      const contactData = extractContactData(signatureData)

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
        logger.info(`Updated contact ${contactId} from petition signature`)
      } else {
        // Create new contact
        const newContact = await payload.create({
          collection: contactsSlug,
          data: contactData,
        })

        contactId = newContact.id
        logger.info(`Created contact ${contactId} from petition signature`)
      }

      const petitionId = data.petition as { id: number | string } | number | string
      const petitionIdValue = typeof petitionId === 'object' ? petitionId.id : petitionId

      if (!petitionIdValue) {
        logger.error('Petition ID not found for petition signature')
        throw new Error('Petition ID not found for petition signature')
      }

      // Get petition to check for tags
      const petition = await payload.findByID({
        id: petitionIdValue,
        collection: petitionsSlug,
        depth: 0,
      })

      // Apply petition tags to contact
      if (petition && Array.isArray(petition.tags) && petition.tags.length > 0) {
        // Get petition tag IDs
        const petitionTagIds = petition.tags.map((t: { id: number | string } | number | string) =>
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
        const newTagIds = petitionTagIds.filter(
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
          logger.info(`Contact ${contactId} already has all petition tags`)
        }
      }

      // Return data with contact linked - no separate update needed
      return {
        ...data,
        contact: contactId,
      }
    } catch (error) {
      logger.error(error as Error, 'Error processing petition signature')
      // Don't throw - we don't want to fail the signature
      return data
    }
  }
}
