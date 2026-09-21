import type { BasePayload, PayloadRequest } from 'payload'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MobilizehubPluginConfig } from '../types/index.js'

import { letterSubmissionHandler } from './letterSubmissionHandler.js'

const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

const publishedLetter = {
  id: 1,
  body: 'Campaign body',
  confirmationType: 'message' as const,
  contactFields: [
    { blockType: 'email', required: true },
    { blockType: 'firstName', required: true },
  ],
  editable: true,
  status: 'published' as const,
  subject: 'Please take action',
}

/**
 * Builds a request whose payload returns the given letter, so only the
 * endpoint's handling of the submitted body is under test.
 */
function createRequest(
  letter: null | Record<string, unknown>,
  body: Record<string, unknown>,
  create = vi.fn().mockResolvedValue({ id: 7 }),
) {
  const payload = {
    create,
    findByID: () => (letter ? Promise.resolve(letter) : Promise.reject(new Error('Not found'))),
    logger,
  } as unknown as BasePayload

  return {
    create,
    req: {
      json: () => Promise.resolve(body),
      payload,
    } as unknown as PayloadRequest,
  }
}

const pluginConfig = {} as MobilizehubPluginConfig

describe('letterSubmissionHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates a submission and returns the confirmation', async () => {
    const { create, req } = createRequest(publishedLetter, {
      body: 'My own words',
      data: { email: 'contact@example.com', firstName: 'Jane' },
      letterId: 1,
    })

    const response = await letterSubmissionHandler(pluginConfig)(req)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      data: { confirmation: { type: 'message' }, submissionId: 7 },
      success: true,
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: 'My own words',
          edited: true,
          letter: 1,
          subject: 'Please take action',
        }),
        overrideAccess: true,
      }),
    )
  })

  it('rejects a letter that is not published', async () => {
    const { create, req } = createRequest(
      { ...publishedLetter, status: 'draft' },
      { data: { email: 'contact@example.com', firstName: 'Jane' }, letterId: 1 },
    )

    const response = await letterSubmissionHandler(pluginConfig)(req)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
      success: false,
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects a submission missing a required contact field', async () => {
    const { create, req } = createRequest(publishedLetter, {
      data: { email: 'contact@example.com' },
      letterId: 1,
    })

    const response = await letterSubmissionHandler(pluginConfig)(req)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR', message: 'firstName is required' },
      success: false,
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('discards the client body when the campaign does not allow editing', async () => {
    const { create, req } = createRequest(
      { ...publishedLetter, editable: false },
      {
        body: 'Text the contact was never allowed to send',
        data: { email: 'contact@example.com', firstName: 'Jane' },
        letterId: 1,
      },
    )

    await letterSubmissionHandler(pluginConfig)(req)

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ body: 'Campaign body', edited: false }),
      }),
    )
  })

  it('caps the body length and strips HTML from an edited body', async () => {
    const { create, req } = createRequest(publishedLetter, {
      body: `<script>alert(1)</script>${'a'.repeat(50)}`,
      data: { email: 'contact@example.com', firstName: 'Jane' },
      letterId: 1,
    })

    await letterSubmissionHandler({
      ...pluginConfig,
      letterConfig: { maxBodyLength: 20 },
    })(req)

    const submitted = create.mock.calls[0][0].data.body as string

    expect(submitted).toBe('alert(1)aaaaaaaaaaaa')
    expect(submitted).toHaveLength(20)
  })
})
