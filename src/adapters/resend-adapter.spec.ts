import type { BasePayload, PayloadRequest } from 'payload'

import crypto from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EmailSendError, resendAdapter } from './resend-adapter.js'

const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

const WEBHOOK_SECRET = 'whsec_dGVzdA=='

function createAdapter(payload: Partial<BasePayload> = {}) {
  return resendAdapter({
    apiKey: 'test-key',
    defaultFromAddress: 'campaigns@example.com',
    defaultFromName: 'Example',
    render: ({ html }) => html,
    webhookSecret: WEBHOOK_SECRET,
  })({ payload: { logger, ...payload } as unknown as BasePayload })
}

const message = {
  from: 'campaigns@example.com',
  html: '<p>body</p>',
  idempotencyKey: 'key-1',
  subject: 'Subject line',
  to: 'contact@example.com',
}

function mockResponse(status: number, body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(JSON.parse(body) as unknown),
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(body),
      }),
    ),
  )
}

describe('resendAdapter sendEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns the provider ID on success', async () => {
    mockResponse(200, JSON.stringify({ id: 'provider-1' }))

    await expect(createAdapter().sendEmail(message)).resolves.toEqual({
      providerId: 'provider-1',
    })
  })

  it('forwards replyTo to Resend as reply_to', async () => {
    mockResponse(200, JSON.stringify({ id: 'provider-1' }))

    await createAdapter().sendEmail({ ...message, replyTo: 'inbox@example.com' })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toMatchObject({
      reply_to: 'inbox@example.com',
    })
  })

  it('omits reply_to entirely when no replyTo is set', async () => {
    mockResponse(200, JSON.stringify({ id: 'provider-1' }))

    await createAdapter().sendEmail(message)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('reply_to')
  })

  it('throws a non-retryable EmailSendError and logs loudly on a 409', async () => {
    mockResponse(409, JSON.stringify({ name: 'invalid_idempotent_request' }))

    const error = await createAdapter()
      .sendEmail(message)
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(EmailSendError)
    expect((error as EmailSendError).status).toBe(409)
    expect((error as EmailSendError).retryable).toBe(false)
    expect(logger.error).toHaveBeenCalled()
  })

  it('throws a non-retryable EmailSendError on a 422', async () => {
    mockResponse(422, JSON.stringify({ name: 'validation_error' }))

    const error = (await createAdapter()
      .sendEmail(message)
      .catch((caught: unknown) => caught)) as EmailSendError

    expect(error.retryable).toBe(false)
  })

  it('throws a retryable EmailSendError on a 429 and on a 5xx', async () => {
    mockResponse(429, JSON.stringify({ name: 'rate_limit_exceeded' }))

    const rateLimited = (await createAdapter()
      .sendEmail(message)
      .catch((caught: unknown) => caught)) as EmailSendError

    expect(rateLimited.retryable).toBe(true)

    mockResponse(503, JSON.stringify({ name: 'internal_server_error' }))

    const serverError = (await createAdapter()
      .sendEmail(message)
      .catch((caught: unknown) => caught)) as EmailSendError

    expect(serverError.retryable).toBe(true)
  })
})

type ActivityEntry = { timestamp: string; type: string }

/**
 * Builds a request carrying a genuine Svix signature, so the webhook goes through
 * the real verification path rather than around it.
 */
function createSignedRequest(eventType: string) {
  const body = JSON.stringify({
    type: eventType,
    created_at: new Date().toISOString(),
    data: { email_id: 'provider-1' },
  })

  const id = 'msg_test'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const secretBytes = Buffer.from(WEBHOOK_SECRET.split('_')[1], 'base64')
  const signature = crypto
    .createHmac('sha256', secretBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64')

  const headers = new Map([
    ['svix-id', id],
    ['svix-signature', `v1,${signature}`],
    ['svix-timestamp', timestamp],
  ])

  return {
    headers: { get: (name: string) => headers.get(name) ?? null },
    text: () => Promise.resolve(body),
  } as unknown as PayloadRequest
}

function createWebhookPayload(activity: ActivityEntry[]) {
  const email = { id: 1, activity }

  return {
    find: vi.fn(() => Promise.resolve({ docs: [email] })),
    logger,
    update: vi.fn(({ data }: { data: { activity: ActivityEntry[] } }) => {
      email.activity = data.activity
      return Promise.resolve(email)
    }),
  }
}

describe('resendAdapter webhookHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('records an activity type that is not already present', async () => {
    const payload = createWebhookPayload([{ type: 'sent', timestamp: 'earlier' }])
    const adapter = createAdapter(payload as unknown as Partial<BasePayload>)

    await adapter.webhookHandler!({
      ...createSignedRequest('email.delivered'),
      payload,
    } as unknown as PayloadRequest)

    expect(payload.update).toHaveBeenCalledTimes(1)
    expect(payload.update.mock.calls[0][0].data.activity.map((a) => a.type)).toEqual([
      'sent',
      'delivered',
    ])
  })

  it('does not append a second sent entry when the task already recorded one', async () => {
    const payload = createWebhookPayload([{ type: 'sent', timestamp: 'earlier' }])
    const adapter = createAdapter(payload as unknown as Partial<BasePayload>)

    await adapter.webhookHandler!({
      ...createSignedRequest('email.sent'),
      payload,
    } as unknown as PayloadRequest)

    expect(payload.update).not.toHaveBeenCalled()
  })

  it('absorbs a redelivered delivered webhook', async () => {
    const payload = createWebhookPayload([
      { type: 'sent', timestamp: 'earlier' },
      { type: 'delivered', timestamp: 'earlier' },
    ])
    const adapter = createAdapter(payload as unknown as Partial<BasePayload>)

    await adapter.webhookHandler!({
      ...createSignedRequest('email.delivered'),
      payload,
    } as unknown as PayloadRequest)

    expect(payload.update).not.toHaveBeenCalled()
  })

  it('asks for redelivery when the email row does not exist yet', async () => {
    const payload = {
      find: vi.fn(() => Promise.resolve({ docs: [] })),
      logger,
      update: vi.fn(),
    }
    const adapter = createAdapter(payload as unknown as Partial<BasePayload>)

    const result = await adapter.webhookHandler!({
      ...createSignedRequest('email.delivered'),
      payload,
    } as unknown as PayloadRequest)

    expect(result?.status).toBe(503)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('does not ask for redelivery once the event has been handled', async () => {
    const payload = createWebhookPayload([{ type: 'sent', timestamp: 'earlier' }])
    const adapter = createAdapter(payload as unknown as Partial<BasePayload>)

    const result = await adapter.webhookHandler!({
      ...createSignedRequest('email.delivered'),
      payload,
    } as unknown as PayloadRequest)

    expect(result).toBeUndefined()
  })

  it('still appends repeatable engagement events', async () => {
    const payload = createWebhookPayload([
      { type: 'sent', timestamp: 'earlier' },
      { type: 'opened', timestamp: 'earlier' },
    ])
    const adapter = createAdapter(payload as unknown as Partial<BasePayload>)

    await adapter.webhookHandler!({
      ...createSignedRequest('email.opened'),
      payload,
    } as unknown as PayloadRequest)

    expect(payload.update.mock.calls[0][0].data.activity.map((a) => a.type)).toEqual([
      'sent',
      'opened',
      'opened',
    ])
  })
})
