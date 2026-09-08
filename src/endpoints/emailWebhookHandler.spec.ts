import type { BasePayload, PayloadRequest } from 'payload'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MobilizehubPluginConfig, WebhookResult } from '../types/index.js'

import { emailWebhookHandler } from './emailWebhookHandler.js'

const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

/**
 * Builds a plugin config whose adapter webhook does whatever the test needs,
 * so only the endpoint's translation of that outcome is under test.
 */
function createConfig(
  webhookHandler: (() => Promise<undefined | WebhookResult>) | undefined,
): Pick<MobilizehubPluginConfig, 'email'> {
  return {
    email: () => ({
      name: 'test-adapter',
      defaultFromAddress: 'campaigns@example.com',
      defaultFromName: 'Example',
      render: ({ html }) => html ?? '',
      sendEmail: () => Promise.resolve(),
      webhookHandler,
    }),
  }
}

const req = { payload: { logger } as unknown as BasePayload } as unknown as PayloadRequest

describe('emailWebhookHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('acknowledges an event the adapter handled', async () => {
    const response = await emailWebhookHandler(createConfig(() => Promise.resolve(undefined)))(req)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true })
  })

  it('passes an adapter error status through so the provider redelivers', async () => {
    const response = await emailWebhookHandler(
      createConfig(() =>
        Promise.resolve({ code: 'NOT_FOUND', message: 'No email record', status: 503 }),
      ),
    )(req)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'NOT_FOUND', message: 'No email record' },
      success: false,
    })
  })

  it('acknowledges a thrown error rather than inviting a retry storm', async () => {
    const response = await emailWebhookHandler(
      createConfig(() => Promise.reject(new Error('Invalid webhook signature'))),
    )(req)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: { processed: false },
    })
  })

  it('reports a missing webhook handler as unimplemented', async () => {
    const response = await emailWebhookHandler(createConfig(undefined))(req)

    expect(response.status).toBe(501)
  })
})
