import type { Payload, PayloadHandler } from 'payload'

import type { Contact, UnsubscribeTokenRecord } from '../types/index.js'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'
import { verifyUnsubscribeToken } from '../utils/unsubscribe-token.js'

type UnsubscribeBody = {
  token?: unknown
}

function validateToken(token: unknown): token is string {
  return typeof token === 'string' && token.length > 0
}

function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

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
    // findByID throws if not found
    return null
  }
}

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

async function unsubscribeContact(payload: Payload, contactId: number | string): Promise<void> {
  await payload.update({
    id: contactId,
    collection: 'contacts',
    data: {
      emailOptIn: false,
    },
  })
}

export const unsubscribeHandler = (): PayloadHandler => {
  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    logger.info('Unsubscribe endpoint called')

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    try {
      const body = (await req.json()) as UnsubscribeBody

      // Validate token is present
      if (!validateToken(body.token)) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Token is required', 400)
      }

      // Verify token signature and extract tokenId
      const verificationResult = verifyUnsubscribeToken({ token: body.token })

      if (!verificationResult) {
        return errorResponse(ErrorCodes.TOKEN_INVALID, 'Invalid or expired token', 400)
      }

      const { tokenId } = verificationResult

      // Find the unsubscribe token record
      const unsubscribeRecord = await findUnsubscribeRecord(payload, tokenId)

      if (!unsubscribeRecord) {
        return errorResponse(ErrorCodes.TOKEN_INVALID, 'Invalid token', 400)
      }

      // Check if token has expired in database
      if (unsubscribeRecord.expiresAt && isTokenExpired(unsubscribeRecord.expiresAt)) {
        return errorResponse(ErrorCodes.TOKEN_EXPIRED, 'Token has expired', 400)
      }

      // Validate the record has an emailId
      if (!unsubscribeRecord.emailId) {
        logger.error(`Unsubscribe record ${tokenId} has no emailId`)
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid unsubscribe record', 400)
      }

      // Fetch the associated email
      const email = await findEmailById(payload, unsubscribeRecord.emailId)

      if (!email) {
        logger.error(
          `Email ${unsubscribeRecord.emailId} not found for unsubscribe record ${tokenId}`,
        )
        return errorResponse(ErrorCodes.NOT_FOUND, 'Associated email not found', 404)
      }

      // Find the contact by email address
      const contact = await findContactByEmail(payload, email.to)

      if (!contact) {
        logger.error(`Contact not found for email address ${email.to}`)
        return errorResponse(ErrorCodes.CONTACT_NOT_FOUND, 'Associated contact not found', 404)
      }

      // Check if already unsubscribed
      if (contact.emailOptIn === false) {
        logger.info(`Contact ${contact.id} (${email.to}) is already unsubscribed`)
        return successResponse({ message: 'Already unsubscribed' }, 200)
      }

      // Unsubscribe the contact
      await unsubscribeContact(payload, contact.id)

      logger.info(`Contact ${contact.id} (${email.to}) successfully unsubscribed`)

      return successResponse({ message: 'Successfully unsubscribed' }, 200)
    } catch (error) {
      logger.error(error as Error, 'Error processing unsubscribe request')
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error', 500)
    }
  }
}
