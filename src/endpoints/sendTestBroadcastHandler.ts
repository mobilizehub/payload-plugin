import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { PayloadHandler, PayloadRequest } from 'payload'

import type { EmailMessage, MobilizehubPluginConfig } from '../types/index.js'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'
import { formatFromAddress } from '../utils/email.js'
import { parseLexicalContent } from '../utils/lexical.js'

type Broadcast = {
  content?: SerializedEditorState
  fromAddress?: string
  fromName?: string
  id: number | string
  subject?: string
}

type SendTestEmailBody = {
  broadcastId?: unknown
  testEmail?: unknown
}

type ValidationResult =
  | { broadcastId: number; success: true; testEmail: string }
  | { code: string; error: string; success: false }

/**
 * Validates the request body contains valid broadcastId and testEmail fields.
 */
function validateRequestBody(body: SendTestEmailBody): ValidationResult {
  const { broadcastId, testEmail } = body

  if (typeof broadcastId !== 'number') {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      error: 'broadcastId is required and must be a number',
      success: false,
    }
  }

  if (typeof testEmail !== 'string' || testEmail.length === 0) {
    return { code: ErrorCodes.VALIDATION_ERROR, error: 'testEmail is required', success: false }
  }

  if (!testEmail.includes('@')) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      error: 'testEmail must be a valid email address',
      success: false,
    }
  }

  return { broadcastId, success: true, testEmail }
}

/**
 * Validates that a broadcast has all required fields for sending.
 */
function validateBroadcastFields(
  broadcast: Broadcast,
): { code: string; error: string; success: false } | { success: true } {
  if (!broadcast.content) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      error: 'Broadcast content is required',
      success: false,
    }
  }

  if (!broadcast.fromName) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      error: 'Broadcast fromName is required',
      success: false,
    }
  }

  if (!broadcast.fromAddress) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      error: 'Broadcast fromAddress is required',
      success: false,
    }
  }

  if (!broadcast.subject) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      error: 'Broadcast subject is required',
      success: false,
    }
  }

  return { success: true }
}

/**
 * Fetches a broadcast, renders its content, and sends a test email.
 * Test emails do not include an unsubscribe token.
 */
async function sendTestEmail(
  req: PayloadRequest,
  broadcastId: number,
  testEmail: string,
  emailConfig: MobilizehubPluginConfig['email'],
): Promise<Response> {
  const { payload } = req
  const logger = payload.logger

  const broadcast = (await payload.findByID({
    id: broadcastId,
    collection: 'broadcasts',
  })) as Broadcast | null

  if (!broadcast) {
    logger.error(`Broadcast with ID ${broadcastId} not found`)
    return errorResponse(ErrorCodes.BROADCAST_NOT_FOUND, 'Broadcast not found', 404)
  }

  const validation = validateBroadcastFields(broadcast)
  if (!validation.success) {
    logger.error(`Broadcast ${broadcastId}: ${validation.error}`)
    return errorResponse(validation.code, validation.error, 400)
  }

  const { render, sendEmail } = emailConfig(req)

  const parsedContent = await parseLexicalContent(broadcast.content!, payload.config)

  const fromAddress = formatFromAddress(broadcast.fromName!, broadcast.fromAddress!)

  const html = render({
    from: fromAddress,
    html: parsedContent.html,
    markdown: parsedContent.markdown,
    plainText: parsedContent.plainText,
    subject: broadcast.subject!,
    to: testEmail,
    token: '',
  })

  const emailInput: Pick<EmailMessage, 'from' | 'html' | 'subject' | 'to'> = {
    from: fromAddress,
    html,
    subject: broadcast.subject!,
    to: testEmail,
  }

  await sendEmail(emailInput)

  logger.info(`Test email sent to ${testEmail} for broadcast ${broadcastId}`)

  return successResponse({ message: 'Test email sent successfully' }, 200)
}

/**
 * Creates the send-test-email endpoint handler.
 *
 * Allows authenticated users to send a test email for a broadcast to a
 * specified email address. Validates the broadcast exists and has all
 * required fields before rendering and sending.
 */
export const sendTestEmailHandler = (
  config: Pick<MobilizehubPluginConfig, 'email'>,
): PayloadHandler => {
  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    if (!req.user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    try {
      const body = (await req.json()) as SendTestEmailBody

      const validation = validateRequestBody(body)
      if (!validation.success) {
        return errorResponse(validation.code, validation.error, 400)
      }

      return await sendTestEmail(req, validation.broadcastId, validation.testEmail, config.email)
    } catch (error) {
      logger.error(error as Error, 'Error sending test email')
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error sending test email', 500)
    }
  }
}
