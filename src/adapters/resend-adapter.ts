import type { Payload, PayloadRequest } from 'payload'

import crypto from 'crypto'

import type { EmailActivityType, EmailAdapter, EmailMessage } from '../types/index.js'

import { formatFromAddress } from '../utils/email.js'

type ResendAdapterOptions = {
  apiKey: string
  defaultFromAddress: string
  defaultFromName: string
  render: ReturnType<EmailAdapter>['render']
  webhookSecret: string
}

type ResendWebhookPayload = {
  created_at: string
  data: {
    [key: string]: unknown
    email_id?: string
  }
  type: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'
const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60 // 5 minutes

const WEBHOOK_EVENT_TO_ACTIVITY: Record<string, EmailActivityType> = {
  'email.bounced': 'bounced',
  'email.clicked': 'clicked',
  'email.complained': 'complained',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.failed': 'failed',
  'email.opened': 'opened',
  'email.received': 'received',
  'email.sent': 'sent',
}

async function sendResendEmail(
  apiKey: string,
  message: EmailMessage,
  idempotencyKey?: string,
): Promise<{ providerId: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const response = await fetch(RESEND_API_URL, {
    body: JSON.stringify({
      from: message.from,
      html: message.html,
      subject: message.subject,
      to: message.to,
    }),
    headers,
    method: 'POST',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as { id: string }

  return { providerId: data.id }
}

type SvixHeaders = {
  id: string
  signature: string
  timestamp: string
}

function extractSvixHeaders(req: PayloadRequest): SvixHeaders {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signature = req.headers.get('svix-signature')

  if (!id || !timestamp || !signature) {
    throw new Error('Missing required Svix headers')
  }

  return { id, signature, timestamp }
}

function verifyTimestamp(timestamp: string): void {
  const timestampSeconds = parseInt(timestamp, 10)
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    throw new Error('Webhook timestamp is too old')
  }
}

function computeExpectedSignature(
  svixId: string,
  svixTimestamp: string,
  body: string,
  webhookSecret: string,
): string {
  const signedContent = `${svixId}.${svixTimestamp}.${body}`

  // Resend webhook secrets are prefixed with "whsec_" and base64 encoded
  const secretParts = webhookSecret.split('_')
  const secretBase64 = secretParts.length > 1 ? secretParts[1] : secretParts[0]
  const secretBytes = Buffer.from(secretBase64, 'base64')

  return crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')
}

function verifySignature(svixSignature: string, expectedSignature: string): boolean {
  // Svix signatures can be multiple, space-delimited with version prefix (e.g., "v1,<sig>")
  const signatures = svixSignature.split(' ').map((sig) => {
    const [version, signature] = sig.split(',')
    return { signature, version }
  })

  return signatures.some(({ signature, version }) => {
    if (version !== 'v1') {
      return false
    }

    try {
      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    } catch {
      return false
    }
  })
}

async function verifyWebhookSignature(
  req: PayloadRequest,
  webhookSecret: string,
): Promise<ResendWebhookPayload> {
  const headers = extractSvixHeaders(req)

  verifyTimestamp(headers.timestamp)

  if (!req.text) {
    throw new Error('Request does not have a text body method')
  }

  const body = await req.text()

  if (!body) {
    throw new Error('No body in request')
  }

  const expectedSignature = computeExpectedSignature(
    headers.id,
    headers.timestamp,
    body,
    webhookSecret,
  )

  if (!verifySignature(headers.signature, expectedSignature)) {
    throw new Error('Invalid webhook signature')
  }

  return JSON.parse(body) as ResendWebhookPayload
}

async function findEmailByProviderId(
  payload: Payload,
  providerId: string,
): Promise<{ activity?: unknown[]; id: number | string } | null> {
  const result = await payload.find({
    collection: 'emails',
    limit: 1,
    where: {
      providerId: { equals: providerId },
    },
  })

  return (result.docs[0] as { activity?: unknown[]; id: number | string }) || null
}

async function addEmailActivity(
  payload: Payload,
  emailId: number | string,
  currentActivity: undefined | unknown[],
  activityType: EmailActivityType,
): Promise<void> {
  const updatedActivity = [
    ...(currentActivity || []),
    {
      type: activityType,
      timestamp: new Date().toISOString(),
    },
  ]

  await payload.update({
    id: emailId,
    collection: 'emails',
    data: {
      activity: updatedActivity,
    },
  })
}

async function handleWebhookEvent(
  payload: Payload,
  eventType: string,
  emailProviderId: string,
  logger: Payload['logger'],
): Promise<void> {
  const activityType = WEBHOOK_EVENT_TO_ACTIVITY[eventType]

  if (!activityType) {
    logger.warn(`Unhandled webhook event type: ${eventType}`)
    return
  }

  const email = await findEmailByProviderId(payload, emailProviderId)

  if (!email) {
    logger.error(`No email record found for provider ID: ${emailProviderId}`)
    return
  }

  await addEmailActivity(payload, email.id, email.activity, activityType)

  // Log based on severity
  const warnEvents = ['email.bounced', 'email.complained', 'email.delivery_delayed']
  const errorEvents = ['email.failed']

  if (errorEvents.includes(eventType)) {
    logger.error(`Email ${activityType}: ${emailProviderId}`)
  } else if (warnEvents.includes(eventType)) {
    logger.warn(`Email ${activityType}: ${emailProviderId}`)
  } else {
    logger.info(`Email ${activityType}: ${emailProviderId}`)
  }
}

/**
 * Resend email adapter for MobilizeHub
 *
 * @example
 * ```typescript
 * import { resendAdapter } from '@mobilizehub/payload-plugin/adapters'
 *
 * const emailAdapter = resendAdapter({
 *   apiKey: process.env.RESEND_API_KEY!,
 *   webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
 *   defaultFromAddress: 'noreply@example.com',
 *   defaultFromName: 'My App',
 *   render: ({ html }) => html,
 * })
 *
 * // In your Payload config:
 * plugins: [
 *   mobilizehub({
 *     email: emailAdapter,
 *     // ...
 *   }),
 * ]
 * ```
 */
export const resendAdapter = (opts: ResendAdapterOptions): EmailAdapter => {
  return ({ payload }) => ({
    name: 'resend-mobilizehub-adapter',
    defaultFromAddress: opts.defaultFromAddress,
    defaultFromName: opts.defaultFromName,
    render: opts.render,

    sendEmail: async (message) => {
      const fromAddress =
        message.from || formatFromAddress(opts.defaultFromName, opts.defaultFromAddress)

      return sendResendEmail(
        opts.apiKey,
        {
          from: fromAddress,
          html: message.html,
          subject: message.subject,
          to: message.to,
        },
        message.idempotencyKey,
      )
    },

    webhookHandler: async (req) => {
      const { payload } = req
      const logger = payload.logger

      try {
        const webhookPayload = await verifyWebhookSignature(req, opts.webhookSecret)

        const emailProviderId = webhookPayload.data.email_id

        if (!emailProviderId) {
          logger.warn(`Webhook event ${webhookPayload.type} has no email_id`)
          return
        }

        await handleWebhookEvent(payload, webhookPayload.type, emailProviderId, logger)
      } catch (error) {
        logger.error(
          `Resend webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
        throw error
      }
    },
  })
}
