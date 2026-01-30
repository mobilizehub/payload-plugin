import type { CollectionSlug, Payload, PayloadHandler } from 'payload'

import z from 'zod'

import type { MobilizehubPluginConfig } from '../types/index.js'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'

/**
 * Schema for petition signature request body.
 */
const PetitionSignatureBodySchema = z.object({
  data: z.record(z.string(), z.unknown()),
  petitionId: z.union([z.string(), z.number()]),
})

/**
 * Petition type for validation.
 */
type PetitionDocument = {
  confirmationMessage?: unknown
  confirmationType?: 'message' | 'redirect'
  contactFields?: Array<{
    blockType: string
    required?: boolean
  }>
  id: number | string
  reference?: {
    relationTo: 'pages' | 'petitions'
    value: { slug?: string } | number | string
  }
  status?: 'draft' | 'published'
  url?: string
}

/**
 * Validates signature data against petition field configuration.
 */
function validateSignatureData(
  data: Record<string, unknown>,
  contactFields: PetitionDocument['contactFields'],
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
  if (data.email && typeof data.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format')
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  }
}

/**
 * Fetches and validates a petition exists and is published.
 */
async function getPublishedPetition(
  payload: Payload,
  petitionId: number | string,
  collectionSlug: CollectionSlug,
): Promise<null | PetitionDocument> {
  try {
    const petition = await payload.findByID({
      id: petitionId,
      collection: collectionSlug,
    })

    if (!petition) {
      return null
    }

    // Only allow signatures to published petitions
    if ((petition as PetitionDocument).status !== 'published') {
      return null
    }

    return petition as PetitionDocument
  } catch {
    return null
  }
}

/**
 * Builds the confirmation response based on petition settings.
 */
function buildConfirmationResponse(petition: PetitionDocument): {
  message?: unknown
  redirect?: string
  type: 'message' | 'redirect'
} {
  if (petition.confirmationType === 'redirect' && petition.reference) {
    let redirectUrl: string | undefined

    if (petition.url) {
      redirectUrl = petition.url
    } else if (typeof petition.reference.value === 'object' && petition.reference.value.slug) {
      redirectUrl = `/${petition.reference.value.slug}`
    }

    if (redirectUrl) {
      return { type: 'redirect', redirect: redirectUrl }
    }
  }

  return {
    type: 'message',
    message: petition.confirmationMessage || 'Thank you for signing this petition.',
  }
}

/**
 * Creates the public petition signature endpoint handler.
 *
 * Accepts petition signatures from frontend applications, validates the data,
 * creates a petition signature record, and returns the appropriate confirmation.
 *
 * This endpoint is public (no authentication required) but validates:
 * - Petition exists and is published
 * - Required fields are present
 * - Email format is valid (if provided)
 */
export const petitionSignatureHandler = (
  pluginConfig: MobilizehubPluginConfig,
): PayloadHandler => {
  const petitionsSlug = pluginConfig.petitionsOverrides?.slug || 'petitions'
  const petitionSignaturesSlug =
    pluginConfig.petitionSignaturesOverrides?.slug || 'petitionSignatures'

  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    try {
      const body = await req.json()

      // Validate request body structure
      const parseResult = PetitionSignatureBodySchema.safeParse(body)

      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || 'Invalid request body'
        return errorResponse(ErrorCodes.VALIDATION_ERROR, firstError, 400)
      }

      const { data, petitionId } = parseResult.data

      // Fetch and validate petition
      const petition = await getPublishedPetition(payload, petitionId, petitionsSlug)

      if (!petition) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Petition not found or not published', 404)
      }

      // Validate signature data against petition fields
      const validation = validateSignatureData(data, petition.contactFields)

      if (!validation.valid) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, validation.errors.join(', '), 400)
      }

      // Create the petition signature
      // Note: The beforeChange hook will handle contact creation/update
      const signature = await payload.create({
        collection: petitionSignaturesSlug,
        data: {
          data,
          petition: petition.id as number,
        },
        // Use internal context to bypass access control
        overrideAccess: true,
      })

      // Build confirmation response
      const confirmation = buildConfirmationResponse(petition)

      return successResponse(
        {
          confirmation,
          signatureId: signature.id,
        },
        201,
      )
    } catch (error) {
      logger.error(error as Error, 'Error processing petition signature')
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to process signature',
        500,
      )
    }
  }
}
