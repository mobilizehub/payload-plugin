import type { Payload, SanitizedConfig } from 'payload'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EmailMessage, MobilizehubPluginConfig } from '../src/types/index.js'

import { letterSubmissionHandler } from '../src/endpoints/letterSubmissionHandler.js'
import { unsubscribeHandler } from '../src/endpoints/unsubscribeHandler.js'
import { createSendEmailTask } from '../src/tasks/sendEmailTask.js'
import { generateUnsubscribeToken } from '../src/utils/unsubscribe-token.js'
import { sentEmails } from './helpers/recordingEmailAdapter.js'

let payload: Payload
let config: SanitizedConfig

const lexicalContent = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Hello',
            version: 1,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        textStyle: '',
        version: 1,
      },
    ],
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
}

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
      // The slug is unique and the test database outlives the run, so the slug
      // has to be new every time.
      const slug = `home-${Date.now()}`

      const page = await payload.create({
        collection: 'pages',
        data: {
          name: 'Home',
          slug,
          blocks: [],
          status: 'published',
        },
      })

      expect(page.name).toBe('Home')
      expect(page.slug).toBe(slug)
      expect(page.status).toBe('published')
    })
  })

  describe('send-email task idempotency', () => {
    it('sends once and creates one row when the task runs twice', async () => {
      const sent: EmailMessage[] = []

      const broadcast = await payload.create({
        collection: 'broadcasts',
        data: {
          name: 'Idempotency broadcast',
          content: lexicalContent,
          fromAddress: 'dev@mobilizehub.com',
          fromName: 'Dev',
          previewText: 'Peek inside',
          replyTo: 'inbox@mobilizehub.com',
          status: 'draft',
          subject: 'Idempotency check',
          to: 'all',
        },
      })

      const contact = await payload.create({
        collection: 'contacts',
        data: {
          email: `idempotency-${Date.now()}@example.com`,
          emailOptIn: true,
          firstName: 'Ida',
          lastName: 'Potent',
        },
      })

      const pluginConfig = {
        email: () => ({
          name: 'recording-adapter',
          defaultFromAddress: 'dev@mobilizehub.com',
          defaultFromName: 'Dev',
          render: ({ html }: EmailMessage) => html,
          sendEmail: (message: EmailMessage) => {
            sent.push(message)
            return Promise.resolve({ providerId: `provider-${sent.length}` })
          },
        }),
      } as unknown as MobilizehubPluginConfig

      const task = createSendEmailTask(pluginConfig)
      const run = () =>
        (task.handler as (args: unknown) => Promise<{ output: { success: boolean } }>)({
          input: { broadcastId: broadcast.id, contactId: contact.id },
          req: { payload },
        })

      await run()
      await run()

      const { docs } = await payload.find({
        collection: 'emails',
        where: {
          and: [{ broadcast: { equals: broadcast.id } }, { contact: { equals: contact.id } }],
        },
      })

      // dev/payload-types.ts predates these fields; regenerate with `pnpm generate:types`.
      const [email] = docs as ((typeof docs)[number] & {
        idempotencyKey?: string
        replyTo?: string
        unsubscribeTokenId?: string
      })[]

      expect(docs).toHaveLength(1)
      expect(sent).toHaveLength(1)
      expect(email.idempotencyKey).toEqual(expect.any(String))
      expect(sent[0].idempotencyKey).toBe(email.idempotencyKey)
      expect(email.status).toBe('sent')

      // Retries depend on this coming from the row, not the live broadcast.
      expect(email.replyTo).toBe('inbox@mobilizehub.com')
      expect(sent[0].replyTo).toBe('inbox@mobilizehub.com')

      const token = await payload.findByID({
        id: email.unsubscribeTokenId!,
        collection: 'emailUnsubscribeTokens',
        depth: 0,
        disableErrors: true,
      })

      expect(token?.emailId).toBe(email.id)
    })

    it('rejects a second email row for the same broadcast and contact', async () => {
      const broadcast = await payload.create({
        collection: 'broadcasts',
        data: {
          name: 'Duplicate broadcast',
          content: lexicalContent,
          fromAddress: 'dev@mobilizehub.com',
          fromName: 'Dev',
          status: 'draft',
          subject: 'Duplicate check',
          to: 'all',
        },
      })

      const contact = await payload.create({
        collection: 'contacts',
        data: {
          email: `duplicate-${Date.now()}@example.com`,
          emailOptIn: true,
          firstName: 'Dupe',
          lastName: 'Check',
        },
      })

      const data = {
        broadcast: broadcast.id,
        contact: contact.id,
        from: 'dev@mobilizehub.com',
        html: '<p>body</p>',
        status: 'queued' as const,
        subject: 'Duplicate check',
        to: contact.email,
      }

      await payload.create({ collection: 'emails', data })

      await expect(payload.create({ collection: 'emails', data })).rejects.toThrow()
    })
  })

  describe('letter submissions', () => {
    it('sends the letter to the target and tags the contact', async () => {
      const suffix = Date.now()
      const contactEmail = `contact-${suffix}@example.com`

      const tag = await payload.create({
        collection: 'tags',
        data: { name: `Letter writers ${suffix}` },
      })

      const letter = await payload.create({
        collection: 'letters',
        data: {
          name: `Letter ${suffix}`,
          slug: `letter-${suffix}`,
          body: 'Dear Joe Smith,\n\nPlease take action.',
          contactFields: [
            { blockType: 'email', label: 'Email', required: true },
            { blockType: 'firstName', label: 'First Name', required: true },
            { blockType: 'lastName', label: 'Last Name', required: false },
          ],
          editable: true,
          email: `joe-smith-${suffix}@example.com`,
          status: 'published',
          subject: 'Please take action',
          tags: [tag.id],
          target: 'Joe Smith',
        },
      })

      const before = sentEmails.length

      const handler = letterSubmissionHandler({} as MobilizehubPluginConfig)
      const response = await handler({
        json: () =>
          Promise.resolve({
            body: 'Dear Joe Smith,\n\nPlease take action. I am writing in my own words.',
            data: { email: contactEmail, firstName: 'Jane', lastName: 'Doe' },
            letterId: letter.id,
          }),
        payload,
      } as unknown as Parameters<typeof handler>[0])

      expect(response.status).toBe(201)

      const { docs: submissions } = await payload.find({
        collection: 'letterSubmissions',
        where: { letter: { equals: letter.id } },
      })

      expect(submissions).toHaveLength(1)
      expect(submissions[0].edited).toBe(true)
      expect(submissions[0].body).toContain('in my own words')

      const { docs: emails } = await payload.find({
        collection: 'emails',
        where: { letterSubmission: { equals: submissions[0].id } },
      })

      expect(emails).toHaveLength(1)
      expect(emails[0].to).toBe(`joe-smith-${suffix}@example.com`)
      expect(emails[0].subject).toBe('Please take action')
      // The contact's address belongs in Reply-To, never in From.
      expect(emails[0].replyTo).toBe(contactEmail)
      expect(emails[0].from).not.toContain(contactEmail)

      // The submission holds the delivery record, so bounces are traceable.
      const linkedEmail = submissions[0].email

      expect(typeof linkedEmail === 'object' ? linkedEmail?.id : linkedEmail).toBe(emails[0].id)

      const sent = sentEmails.slice(before)

      expect(sent).toHaveLength(1)
      expect(sent[0].to).toBe(`joe-smith-${suffix}@example.com`)
      expect(sent[0].replyTo).toBe(contactEmail)
      expect(sent[0].html).toContain('Dear Joe Smith,')
      expect(sent[0].html).toContain('in my own words')
      expect(sent[0].html).toContain('Jane Doe')

      const { docs: contacts } = await payload.find({
        collection: 'contacts',
        where: { email: { equals: contactEmail } },
      })

      expect(contacts).toHaveLength(1)
      expect(contacts[0].firstName).toBe('Jane')
      expect(contacts[0].tags?.map((t) => (typeof t === 'object' ? t.id : t))).toContain(tag.id)
    })
  })

  describe('unsubscribe endpoint', () => {
    it('opts the contact out when given a valid token', async () => {
      const contact = await payload.create({
        collection: 'contacts',
        data: {
          email: `unsubscribe-${Date.now()}@example.com`,
          emailOptIn: true,
          firstName: 'Una',
          lastName: 'Subscribe',
        },
      })

      const email = await payload.create({
        collection: 'emails',
        data: {
          from: 'dev@mobilizehub.com',
          html: '<p>body</p>',
          status: 'sent',
          subject: 'Unsubscribe check',
          to: contact.email,
        },
      })

      const tokenId = crypto.randomUUID()

      await payload.create({
        collection: 'emailUnsubscribeTokens',
        data: { id: tokenId, emailId: email.id },
      })

      const handler = unsubscribeHandler()
      const response = await handler({
        json: () => Promise.resolve({ token: generateUnsubscribeToken({ tokenId }) }),
        payload,
      } as unknown as Parameters<typeof handler>[0])

      expect(response.status).toBe(200)

      const updated = await payload.findByID({ id: contact.id, collection: 'contacts' })

      expect(updated.emailOptIn).toBe(false)
    })
  })
})
