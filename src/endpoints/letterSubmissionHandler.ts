import type { CollectionSlug, Payload, PayloadHandler } from 'payload'

import z from 'zod'

import type { MobilizehubPluginConfig } from '../types/index.js'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'
import { isValidEmail } from '../utils/email.js'

/**
 * Schema for letter submission request body.
 */
const LetterSubmissionBodySchema = z.object({
  body: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
  letterId: z.union([z.string(), z.number()]),
})

/**
 * Maximum length of a contact-edited letter body, when the campaign allows editing.
 */
const DEFAULT_MAX_BODY_LENGTH = 10_000

/**
 * Letter type for validation.
 */
type LetterDocument = {
  body?: string
  confirmationMessage?: unknown
  confirmationType?: 'message' | 'redirect'
  contactFields?: Array<{
    blockType: string
    required?: boolean
  }>
  editable?: boolean
  id: number | string
  reference?: {
    relationTo: 'letters' | 'pages'
    value: { slug?: string } | number | string
  }
  status?: 'draft' | 'published'
  subject?: string
  url?: string
}

/**
 * Validates submission data against letter field configuration.
 */
function validateSubmissionData(
  data: Record<string, unknown>,
  contactFields: LetterDocument['contactFields'],
): { errors: string[]; valid: boolean } {
  const errors: string[] = []

  if (!contactFields || contactFields.length === 0) {
    return { errors: [], valid: true }
  }

  for (const field of contactFields) {
    if (field.required) {
      const value = data[field.blockType]
      if (value === undefined || value === null || value === '') {
        errors.push(`${field.blockType} is required`)
      }
    }
  }

  // Validate email format if present
  if (data.email && typeof data.email === 'string' && !isValidEmail(data.email)) {
    errors.push('Invalid email format')
  }

  return {
    errors,
    valid: errors.length === 0,
  }
}

/**
 * Fetches and validates a letter exists and is published.
 */
async function getPublishedLetter(
  payload: Payload,
  letterId: number | string,
  collectionSlug: CollectionSlug,
): Promise<LetterDocument | null> {
  try {
    const letter = await payload.findByID({
      id: letterId,
      collection: collectionSlug,
    })

    if (!letter) {
      return null
    }

    // Only allow submissions to published letters
    if ((letter as LetterDocument).status !== 'published') {
      return null
    }

    return letter as LetterDocument
  } catch {
    return null
  }
}

/**
 * Strips HTML tags from a contact-edited body and caps its length.
 *
 * The body is plain text the whole way through - authored as text, edited in a
 * textarea, stored as text - so anything tag-shaped is markup the client had no
 * business sending.
 */
function sanitizeBody(body: string, maxLength: number): string {
  return body.replace(/<[^>]*>/g, '').slice(0, maxLength)
}

/**
 * Builds the confirmation response based on letter settings.
 */
function buildConfirmationResponse(letter: LetterDocument): {
  message?: unknown
  redirect?: string
  type: 'message' | 'redirect'
} {
  if (letter.confirmationType === 'redirect' && letter.reference) {
    let redirectUrl: string | undefined

    if (letter.url) {
      redirectUrl = letter.url
    } else if (typeof letter.reference.value === 'object' && letter.reference.value.slug) {
      redirectUrl = `/${letter.reference.value.slug}`
    }

    if (redirectUrl) {
      return { type: 'redirect', redirect: redirectUrl }
    }
  }

  return {
    type: 'message',
    message: letter.confirmationMessage || 'Thank you for sending this letter.',
  }
}

/**
 * Creates the public letter submission endpoint handler.
 *
 * Accepts letters from frontend applications, validates the data, creates a
 * letter submission record - whose hooks deliver the letter to the campaign's
 * target - and returns the appropriate confirmation.
 *
 * This endpoint is public (no authentication required) but validates:
 * - Letter exists and is published
 * - Required fields are present
 * - Email format is valid (if provided)
 * - The submitted body, which is discarded entirely when the campaign does not
 *   allow editing, and otherwise stripped of HTML and capped in length
 *
 * @example
 * ```typescript
 * endpoints: [
 *   {
 *     handler: letterSubmissionHandler(pluginConfig),
 *     method: 'post',
 *     path: '/letters.createSubmission',
 *   },
 * ]
 * ```
 */
export const letterSubmissionHandler = (pluginConfig: MobilizehubPluginConfig): PayloadHandler => {
  const lettersSlug = pluginConfig.lettersOverrides?.slug || 'letters'
  const letterSubmissionsSlug =
    pluginConfig.letterSubmissionsOverrides?.slug || 'letterSubmissions'
  const maxBodyLength = pluginConfig.letterConfig?.maxBodyLength || DEFAULT_MAX_BODY_LENGTH

  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    try {
      const requestBody = await req.json()

      // Validate request body structure
      const parseResult = LetterSubmissionBodySchema.safeParse(requestBody)

      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || 'Invalid request body'
        return errorResponse(ErrorCodes.VALIDATION_ERROR, firstError, 400)
      }

      const { body, data, letterId } = parseResult.data

      // Fetch and validate letter
      const letter = await getPublishedLetter(payload, letterId, lettersSlug)

      if (!letter) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Letter not found or not published', 404)
      }

      // Validate submission data against letter fields
      const validation = validateSubmissionData(data, letter.contactFields)

      if (!validation.valid) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, validation.errors.join(', '), 400)
      }

      const campaignBody = letter.body || ''

      // Never trust client text when editing is off.
      const letterBody =
        letter.editable && body !== undefined ? sanitizeBody(body, maxBodyLength) : campaignBody

      // Create the letter submission
      // Note: The collection hooks handle contact creation and delivery
      const submission = await payload.create({
        collection: letterSubmissionsSlug,
        data: {
          body: letterBody,
          data,
          edited: letterBody !== campaignBody,
          letter: letter.id as number,
          subject: letter.subject,
        },
        // Use internal context to bypass access control
        overrideAccess: true,
      })

      // Build confirmation response
      const confirmation = buildConfirmationResponse(letter)

      return successResponse(
        {
          confirmation,
          submissionId: submission.id,
        },
        201,
      )
    } catch (error) {
      logger.error(error as Error, 'Error processing letter submission')
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to process letter submission',
        500,
      )
    }
  }
}
