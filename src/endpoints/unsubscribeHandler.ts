import type { Payload, PayloadHandler } from 'payload'

import z from 'zod'

import type { Contact, UnsubscribeTokenRecord } from '../types/index.js'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'
import { verifyUnsubscribeToken } from '../utils/unsubscribe-token.js'

/**
 * Schema for validating unsubscribe request body.
 */
const UnsubscribeBodySchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
})

/**
 * Validates the request body against the schema.
 * Returns typed data on success, or error message on failure.
 */
function validateRequestBody(body: unknown) {
  const result = UnsubscribeBodySchema.safeParse(body)

  if (!result.success) {
    const firstError = result.error.issues[0]?.message || 'Invalid request body'
    return { error: firstError, success: false as const }
  }

  return { data: result.data, success: true as const }
}

/**
 * Checks if a token has expired by comparing the expiration date to now.
 */
function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Fetches an unsubscribe token record by ID.
 * Returns null if the record doesn't exist.
 */
async function findUnsubscribeRecord(
  payload: Payload,
  tokenId: string,
): Promise<null | UnsubscribeTokenRecord> {
  try {
    const record = await payload.findByID({
      id: tokenId,
      collection: 'emailUnsubscribeTokens',
    })
    return record as null | UnsubscribeTokenRecord
  } catch {
    return null
  }
}

/**
 * Fetches an email document by ID.
 * Returns null if the email doesn't exist.
 */
async function findEmailById(
  payload: Payload,
  emailId: number | string,
): Promise<{ to: string } | null> {
  try {
    const email = await payload.findByID({
      id: emailId,
      collection: 'emails',
    })
    return email as unknown as { to: string } | null
  } catch {
    return null
  }
}

/**
 * Finds a contact by their email address.
 * Returns null if no matching contact exists.
 */
async function findContactByEmail(payload: Payload, emailAddress: string): Promise<Contact | null> {
  const result = await payload.find({
    collection: 'contacts',
    limit: 1,
    where: {
      email: { equals: emailAddress },
    },
  })

  return (result.docs[0] as Contact) || null
}

/**
 * Sets a contact's emailOptIn to false to unsubscribe them from emails.
 */
async function unsubscribeContact(payload: Payload, contactId: number | string): Promise<void> {
  await payload.update({
    id: contactId,
    collection: 'contacts',
    data: {
      emailOptIn: false,
    },
  })
}

/**
 * Creates the unsubscribe endpoint handler.
 *
 * Processes unsubscribe requests by validating a signed token, looking up
 * the associated email and contact, then setting the contact's emailOptIn
 * to false. Handles already-unsubscribed contacts gracefully.
 */
export const unsubscribeHandler = (): PayloadHandler => {
  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    try {
      const body = await req.json()

      const validation = validateRequestBody(body)
      if (!validation.success) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, validation.error, 400)
      }

      const { token } = validation.data

      const verificationResult = verifyUnsubscribeToken({ token })

      if (!verificationResult) {
        return errorResponse(ErrorCodes.TOKEN_INVALID, 'Invalid or expired token', 400)
      }

      const { tokenId } = verificationResult

      const unsubscribeRecord = await findUnsubscribeRecord(payload, tokenId)

      if (!unsubscribeRecord) {
        return errorResponse(ErrorCodes.TOKEN_INVALID, 'Invalid token', 400)
      }

      if (unsubscribeRecord.expiresAt && isTokenExpired(unsubscribeRecord.expiresAt)) {
        return errorResponse(ErrorCodes.TOKEN_EXPIRED, 'Token has expired', 400)
      }

      if (!unsubscribeRecord.emailId) {
        logger.error(`Unsubscribe record ${tokenId} has no emailId`)
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid unsubscribe record', 400)
      }

      const email = await findEmailById(payload, unsubscribeRecord.emailId)

      if (!email) {
        logger.error(
          `Email ${unsubscribeRecord.emailId} not found for unsubscribe record ${tokenId}`,
        )
        return errorResponse(ErrorCodes.NOT_FOUND, 'Associated email not found', 404)
      }

      const contact = await findContactByEmail(payload, email.to)

      if (!contact) {
        logger.error(`Contact not found for email address ${email.to}`)
        return errorResponse(ErrorCodes.CONTACT_NOT_FOUND, 'Associated contact not found', 404)
      }

      if (contact.emailOptIn === false) {
        logger.info(`Contact ${contact.id} (${email.to}) is already unsubscribed`)
        return successResponse({ message: 'Already unsubscribed' }, 200)
      }

      await unsubscribeContact(payload, contact.id)

      logger.info(`Contact ${contact.id} (${email.to}) successfully unsubscribed`)

      return successResponse({ message: 'Successfully unsubscribed' }, 200)
    } catch (error) {
      logger.error(error as Error, 'Error processing unsubscribe request')
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error', 500)
    }
  }
}
