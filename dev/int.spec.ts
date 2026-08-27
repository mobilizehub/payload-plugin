import type { Payload, SanitizedConfig } from 'payload'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

  describe('createContentCollection utility', () => {
    it('registers a pages collection created with createContentCollection', () => {
      const slugs = config.collections.map((collection) => collection.slug)

      expect(slugs).toContain('pages')
      expect(slugs).not.toContain('posts')
      expect(slugs).not.toContain('authors')
    })

    it('creates a page with name, slug, and status fields', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          name: 'Home',
          slug: 'home',
          blocks: [],
          status: 'published',
        },
      })

      expect(page.name).toBe('Home')
      expect(page.slug).toBe('home')
      expect(page.status).toBe('published')
    })
  })
})
