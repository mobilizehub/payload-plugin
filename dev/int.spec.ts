import type { Payload, SanitizedConfig } from 'payload'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, it } from 'vitest'

let payload: Payload
let config: SanitizedConfig

afterAll(async () => {
  if (payload?.db?.destroy) {
    await payload.db.destroy()
  }
})

beforeAll(async () => {
  config = await configPromise
  payload = await getPayload({
    config,
  })
})

describe('Plugin integration tests', () => {
  it.todo('should add integration tests')
})
