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

  // Basic email validation
  if (!testEmail.includes('@')) {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      error: 'testEmail must be a valid email address',
      success: false,
    }
  }

  return { broadcastId, success: true, testEmail }
}

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

async function sendTestEmail(
  req: PayloadRequest,
  broadcastId: number,
  testEmail: string,
  emailConfig: MobilizehubPluginConfig['email'],
): Promise<Response> {
  const { payload } = req
  const logger = payload.logger

  // Fetch broadcast
  const broadcast = (await payload.findByID({
    id: broadcastId,
    collection: 'broadcasts',
  })) as Broadcast | null

  if (!broadcast) {
    logger.error(`Broadcast with ID ${broadcastId} not found`)
    return errorResponse(ErrorCodes.BROADCAST_NOT_FOUND, 'Broadcast not found', 404)
  }

  // Validate broadcast fields
  const validation = validateBroadcastFields(broadcast)
  if (!validation.success) {
    logger.error(`Broadcast ${broadcastId}: ${validation.error}`)
    return errorResponse(validation.code, validation.error, 400)
  }

  // Get email methods
  const { render, sendEmail } = emailConfig(req)

  // Parse content
  const parsedContent = await parseLexicalContent(broadcast.content!, payload.config)

  // Format from address
  const fromAddress = formatFromAddress(broadcast.fromName!, broadcast.fromAddress!)

  // Render email HTML (no unsubscribe token for test emails)
  const html = render({
    from: fromAddress,
    html: parsedContent.html,
    markdown: parsedContent.markdown,
    plainText: parsedContent.plainText,
    subject: broadcast.subject!,
    to: testEmail,
    token: '',
  })

  // Prepare email input
  const emailInput: Pick<EmailMessage, 'from' | 'html' | 'subject' | 'to'> = {
    from: fromAddress,
    html,
    subject: broadcast.subject!,
    to: testEmail,
  }

  // Send the email
  await sendEmail(emailInput)

  logger.info(`Test email sent to ${testEmail} for broadcast ${broadcastId}`)

  return successResponse({ message: 'Test email sent successfully' }, 200)
}

export const sendTestEmailHandler = (
  config: Pick<MobilizehubPluginConfig, 'email'>,
): PayloadHandler => {
  return async (req) => {
    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    if (!req.user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    try {
      const body = (await req.json()) as SendTestEmailBody

      // Validate request body
      const validation = validateRequestBody(body)
      if (!validation.success) {
        return errorResponse(validation.code, validation.error, 400)
      }

      return await sendTestEmail(req, validation.broadcastId, validation.testEmail, config.email)
    } catch (error) {
      req.payload.logger.error(error as Error, 'Error sending test email')
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error sending test email', 500)
    }
  }
}
