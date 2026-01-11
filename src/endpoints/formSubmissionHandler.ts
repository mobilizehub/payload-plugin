import type { CollectionSlug, Payload, PayloadHandler } from 'payload'

import z from 'zod'

import type { MobilizehubPluginConfig } from '../types/index.js'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'

/**
 * Schema for form submission request body.
 */
const FormSubmissionBodySchema = z.object({
  data: z.record(z.string(), z.unknown()),
  formId: z.union([z.string(), z.number()]),
})

/**
 * Form type for validation.
 */
type FormDocument = {
  confirmationMessage?: unknown
  confirmationType?: 'message' | 'redirect'
  contactFields?: Array<{
    blockType: string
    required?: boolean
  }>
  id: number | string
  reference?: {
    relationTo: 'forms' | 'pages'
    value: { slug?: string } | number | string
  }
  status?: 'draft' | 'published'
  url?: string
}

/**
 * Validates submission data against form field configuration.
 */
function validateSubmissionData(
  data: Record<string, unknown>,
  contactFields: FormDocument['contactFields'],
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
 * Fetches and validates a form exists and is published.
 */
async function getPublishedForm(
  payload: Payload,
  formId: number | string,
  collectionSlug: CollectionSlug,
): Promise<FormDocument | null> {
  try {
    const form = await payload.findByID({
      id: formId,
      collection: collectionSlug,
    })

    if (!form) {
      return null
    }

    // Only allow submissions to published forms
    if ((form as FormDocument).status !== 'published') {
      return null
    }

    return form as FormDocument
  } catch {
    return null
  }
}

/**
 * Builds the confirmation response based on form settings.
 */
function buildConfirmationResponse(form: FormDocument): {
  message?: unknown
  redirect?: string
  type: 'message' | 'redirect'
} {
  if (form.confirmationType === 'redirect' && form.reference) {
    let redirectUrl: string | undefined

    if (form.url) {
      redirectUrl = form.url
    } else if (typeof form.reference.value === 'object' && form.reference.value.slug) {
      redirectUrl = `/${form.reference.value.slug}`
    }

    if (redirectUrl) {
      return { type: 'redirect', redirect: redirectUrl }
    }
  }

  return {
    type: 'message',
    message: form.confirmationMessage || 'Thank you for your submission.',
  }
}

/**
 * Creates the public form submission endpoint handler.
 *
 * Accepts form submissions from frontend applications, validates the data,
 * creates a form submission record, and returns the appropriate confirmation.
 *
 * This endpoint is public (no authentication required) but validates:
 * - Form exists and is published
 * - Required fields are present
 * - Email format is valid (if provided)
 */
export const formSubmissionHandler = (
  pluginConfig: MobilizehubPluginConfig,
): PayloadHandler => {
  const formsSlug = pluginConfig.formsOverrides?.slug || 'forms'
  const formSubmissionsSlug = pluginConfig.formSubmissionsOverrides?.slug || 'formSubmissions'

  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    try {
      const body = await req.json()

      // Validate request body structure
      const parseResult = FormSubmissionBodySchema.safeParse(body)

      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || 'Invalid request body'
        return errorResponse(ErrorCodes.VALIDATION_ERROR, firstError, 400)
      }

      const { data, formId } = parseResult.data

      // Fetch and validate form
      const form = await getPublishedForm(payload, formId, formsSlug)

      if (!form) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Form not found or not published', 404)
      }

      // Validate submission data against form fields
      const validation = validateSubmissionData(data, form.contactFields)

      if (!validation.valid) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, validation.errors.join(', '), 400)
      }

      // Create the form submission
      // Note: The beforeChange hook will handle contact creation/update
      const submission = await payload.create({
        collection: formSubmissionsSlug,
        data: {
          data,
          form: form.id as number,
        },
        // Use internal context to bypass access control
        overrideAccess: true,
      })

      // Build confirmation response
      const confirmation = buildConfirmationResponse(form)

      return successResponse(
        {
          confirmation,
          submissionId: submission.id,
        },
        201,
      )
    } catch (error) {
      logger.error(error as Error, 'Error processing form submission')
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to process submission',
        500,
      )
    }
  }
}
