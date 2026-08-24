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

  describe('posts collection', () => {
    it('is registered by the plugin', () => {
      const slugs = config.collections.map((collection) => collection.slug)

      expect(slugs).toContain('posts')
      expect(slugs).toContain('authors')
    })

    it('creates posts that share the same author', async () => {
      const author = await payload.create({
        collection: 'authors',
        data: {
          name: 'Jane Doe',
        },
      })

      const post = await payload.create({
        collection: 'posts',
        data: {
          name: 'Our First Campaign Update',
          slug: 'our-first-campaign-update',
          author: author.id,
          headline: 'Our first campaign update',
          status: 'published',
        },
      })

      const secondPost = await payload.create({
        collection: 'posts',
        data: {
          name: 'Our Second Campaign Update',
          slug: 'our-second-campaign-update',
          author: author.id,
          status: 'draft',
        },
      })

      expect(post.slug).toBe('our-first-campaign-update')
      expect(post.status).toBe('published')
      expect(post.author).toMatchObject({ id: author.id, name: 'Jane Doe' })
      expect(secondPost.author).toMatchObject({ id: author.id, name: 'Jane Doe' })
    })
  })
})
