import type { AccessArgs, User } from 'payload'

import { describe, expect, it } from 'vitest'

import { authenticated } from './authenticated.js'

describe('authenticated', () => {
  it('returns true when user exists', () => {
    const args = {
      req: { user: { id: '123', email: 'test@example.com' } },
    } as AccessArgs<User>

    expect(authenticated(args)).toBe(true)
  })

  it('returns false when user is null', () => {
    const args = {
      req: { user: null },
    } as unknown as AccessArgs<User>

    expect(authenticated(args)).toBe(false)
  })

  it('returns false when user is undefined', () => {
    const args = {
      req: { user: undefined },
    } as unknown as AccessArgs<User>

    expect(authenticated(args)).toBe(false)
  })
})
