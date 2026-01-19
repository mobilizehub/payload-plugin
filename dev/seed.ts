import type { Payload } from 'payload'

import { CONSTS } from './consts.js'
import { createTestContacts } from './helpers/createTestContacts.js'
import { devUser } from './helpers/credentials.js'

async function seedUser(payload: Payload) {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!totalDocs) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
  }
}

async function seedContact(payload: Payload) {
  const { totalDocs } = await payload.count({
    collection: 'contacts',
  })

  if (!totalDocs) {
    const contacts = createTestContacts()

    for (const contact of contacts) {
      await payload.create({
        collection: 'contacts',
        data: { ...contact, emailOptIn: true },
      })
    }
  }
}

async function seedBroadcast(payload: Payload) {
  const { totalDocs } = await payload.count({
    collection: 'broadcasts',
  })
  if (!totalDocs) {
    await payload.create({
      collection: 'broadcasts',
      data: {
        id: 1,
        name: 'Newsletter #1',
        content: {
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
                    text: 'Welcome to our newsletter',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                textFormat: 0,
                textStyle: '',
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        fromAddress: CONSTS.defaultFromAddress,
        fromName: CONSTS.defaultFromName,
        previewText: null,
        replyTo: null,
        status: 'draft',
        subject: 'Welcome to our newsletter',
        tags: [],
        to: 'all',
      },
    })
  }
}

export const seed = async (payload: Payload) => {
  await seedUser(payload)
  await seedContact(payload)
  await seedBroadcast(payload)
}
