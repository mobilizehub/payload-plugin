import type { BasePayload } from 'payload'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmailMessage, MobilizehubPluginConfig } from '../types/index.js'

import { EmailSendError } from '../adapters/resend-adapter.js'
import { createSendEmailTask } from './sendEmailTask.js'

vi.mock('../utils/lexical.js', () => ({
  parseLexicalContent: vi.fn(() =>
    Promise.resolve({
      html: '<p>body</p>',
      markdown: 'body',
      plainText: 'body',
    }),
  ),
}))

process.env.PAYLOAD_SECRET = 'test-secret'

type EmailRow = { id: number } & Record<string, unknown>

type TokenRow = { emailId: number | string; id: string }

const BROADCAST = {
  id: 1,
  content: {},
  fromAddress: 'campaigns@example.com',
  fromName: 'Example',
  previewText: 'preview',
  replyTo: 'reply@example.com',
  subject: 'Subject line',
}

const CONTACT = { id: 2, email: 'contact@example.com' }

/** A row left at 'queued' by an attempt that died before the provider call. */
function queuedRow(): EmailRow {
  return {
    id: 10,
    from: '"Example" <campaigns@example.com>',
    html: '<html>stored</html>',
    idempotencyKey: 'stored-key',
    replyTo: 'stored-reply@example.com',
    status: 'queued',
    subject: 'Subject line',
    to: CONTACT.email,
    unsubscribeTokenId: 'stored-token-id',
  }
}

/**
 * Minimal in-memory stand-in for the parts of Payload the task touches.
 */
function createFakePayload(seedEmails: EmailRow[] = [], seedTokens: TokenRow[] = []) {
  const emails = [...seedEmails]
  const unsubscribeTokens = [...seedTokens]
  let nextId = Math.max(0, ...emails.map((email) => email.id)) + 1

  const payload = {
    config: {} as BasePayload['config'],
    create: vi.fn(({ collection, data }: { collection: string; data: EmailRow }) => {
      if (collection === 'emailUnsubscribeTokens') {
        unsubscribeTokens.push(data as unknown as TokenRow)
        return Promise.resolve(data)
      }

      const row = { ...data, id: nextId++ } as EmailRow
      emails.push(row)
      return Promise.resolve(row)
    }),
    find: vi.fn(() => Promise.resolve({ docs: emails.slice(0, 1) })),
    findByID: vi.fn(({ id, collection }: { collection: string; id: number | string }) => {
      if (collection === 'emailUnsubscribeTokens') {
        return Promise.resolve(unsubscribeTokens.find((token) => token.id === id) ?? null)
      }

      return Promise.resolve(collection === 'contacts' ? CONTACT : { ...BROADCAST, id })
    }),
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    update: vi.fn(({ id, data }: { data: Record<string, unknown>; id: number }) => {
      const row = emails.find((email) => email.id === id)!
      Object.assign(row, data)
      return Promise.resolve(row)
    }),
  }

  return { emails, payload, unsubscribeTokens }
}

type SendEmail = (message: EmailMessage) => Promise<{ providerId: string }>

function createSendEmailSpy() {
  return vi.fn<SendEmail>(() => Promise.resolve({ providerId: 'provider-1' }))
}

function createRenderSpy() {
  return vi.fn(({ html }: EmailMessage) => `<html>${html}</html>`)
}

function createPluginConfig(sendEmail: SendEmail, render = createRenderSpy()) {
  return {
    email: () => ({
      name: 'test-adapter',
      defaultFromAddress: 'campaigns@example.com',
      defaultFromName: 'Example',
      render,
      sendEmail,
    }),
  } as unknown as MobilizehubPluginConfig
}

function runTask(pluginConfig: MobilizehubPluginConfig, payload: unknown) {
  const task = createSendEmailTask(pluginConfig)

  return (task.handler as (args: unknown) => Promise<{ output: { success: boolean } }>)({
    input: { broadcastId: BROADCAST.id, contactId: CONTACT.id },
    req: { payload },
  })
}

describe('createSendEmailTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an email with an idempotency key and sends with that same key', async () => {
    const sendEmail = createSendEmailSpy()
    const { emails, payload, unsubscribeTokens } = createFakePayload()

    const result = await runTask(createPluginConfig(sendEmail), payload)

    expect(result.output.success).toBe(true)
    expect(emails).toHaveLength(1)
    expect(emails[0].idempotencyKey).toEqual(expect.any(String))
    expect(emails[0].idempotencyKey).not.toBe('')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      html: emails[0].html,
      idempotencyKey: emails[0].idempotencyKey,
    })
    expect(unsubscribeTokens).toEqual([{ id: emails[0].unsubscribeTokenId, emailId: emails[0].id }])
    expect(emails[0].status).toBe('sent')
  })

  it('stores replyTo on the row and sends the stored value, not the live broadcast', async () => {
    const sendEmail = createSendEmailSpy()
    const { emails, payload } = createFakePayload()

    await runTask(createPluginConfig(sendEmail), payload)

    expect(emails[0].replyTo).toBe(BROADCAST.replyTo)
    expect(sendEmail.mock.calls[0][0].replyTo).toBe(BROADCAST.replyTo)

    // The queued row's replyTo differs from the broadcast's, standing in for a
    // broadcast edited between attempts.
    const resumed = createFakePayload([queuedRow()], [{ id: 'stored-token-id', emailId: 10 }])
    const resumedSend = createSendEmailSpy()

    await runTask(createPluginConfig(resumedSend), resumed.payload)

    expect(resumedSend.mock.calls[0][0].replyTo).toBe('stored-reply@example.com')
  })

  it('passes previewText into render so it lands in the stored html', async () => {
    const render = createRenderSpy()
    const { payload } = createFakePayload()

    await runTask(createPluginConfig(createSendEmailSpy(), render), payload)

    expect(render.mock.calls[0][0].previewText).toBe(BROADCAST.previewText)
  })

  it('returns early without sending when the existing row is already sent', async () => {
    const sendEmail = createSendEmailSpy()
    const { payload } = createFakePayload([
      {
        id: 10,
        html: '<html>stored</html>',
        idempotencyKey: 'stored-key',
        status: 'sent',
      },
    ])

    const result = await runTask(createPluginConfig(sendEmail), payload)

    expect(result.output.success).toBe(true)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('resumes a queued row using its stored key and stored html', async () => {
    const sendEmail = createSendEmailSpy()
    const { emails, payload, unsubscribeTokens } = createFakePayload(
      [queuedRow()],
      [{ id: 'stored-token-id', emailId: 10 }],
    )

    await runTask(createPluginConfig(sendEmail), payload)

    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      html: '<html>stored</html>',
      idempotencyKey: 'stored-key',
    })
    expect(emails).toHaveLength(1)
    expect(unsubscribeTokens).toHaveLength(1)
    expect(payload.create).not.toHaveBeenCalled()
    expect(emails[0].status).toBe('sent')
  })

  it('writes the unsubscribe token when a crash left the row without one', async () => {
    const sendEmail = createSendEmailSpy()
    const { emails, payload, unsubscribeTokens } = createFakePayload([queuedRow()])

    await runTask(createPluginConfig(sendEmail), payload)

    // The link already baked into the stored HTML depends on this ID, not a fresh one.
    expect(unsubscribeTokens).toEqual([{ id: 'stored-token-id', emailId: 10 }])
    expect(emails).toHaveLength(1)
  })

  it('mints and persists a token ID for a queued row that predates the field', async () => {
    const sendEmail = createSendEmailSpy()
    const { emails, payload, unsubscribeTokens } = createFakePayload([
      { ...queuedRow(), unsubscribeTokenId: undefined },
    ])

    await runTask(createPluginConfig(sendEmail), payload)

    const tokenId = emails[0].unsubscribeTokenId

    expect(tokenId).toEqual(expect.any(String))
    expect(unsubscribeTokens).toEqual([{ id: tokenId, emailId: 10 }])
  })

  it('reuses the stored key when a transient failure forces a second run', async () => {
    const sendEmail = vi
      .fn<SendEmail>()
      .mockRejectedValueOnce(new EmailSendError('Rate limited', 429, true))
      .mockResolvedValueOnce({ providerId: 'provider-1' })

    const { emails, payload, unsubscribeTokens } = createFakePayload()
    const pluginConfig = createPluginConfig(sendEmail)

    await expect(runTask(pluginConfig, payload)).rejects.toThrow('Rate limited')

    const keyAfterFirstRun = emails[0].idempotencyKey
    expect(emails[0].status).toBe('queued')

    await runTask(pluginConfig, payload)

    expect(emails).toHaveLength(1)
    expect(emails[0].idempotencyKey).toBe(keyAfterFirstRun)
    expect(unsubscribeTokens).toHaveLength(1)
    expect(sendEmail.mock.calls[1][0].idempotencyKey).toBe(keyAfterFirstRun)
  })

  it('marks the row failed without rethrowing on a non-retryable send error', async () => {
    const sendEmail = vi
      .fn<SendEmail>()
      .mockRejectedValue(
        new EmailSendError('Resend API error: 422 - invalid to address', 422, false),
      )
    const { emails, payload } = createFakePayload()

    const result = await runTask(createPluginConfig(sendEmail), payload)

    expect(result.output.success).toBe(false)
    expect(emails[0].status).toBe('failed')
    expect(emails[0].activity).toEqual([{ type: 'failed', timestamp: expect.any(String) }])
    expect(payload.logger.error).toHaveBeenCalled()
  })
})
