import type { Payload } from 'payload'

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
        data: contact,
      })
    }
  }
}
export const seed = async (payload: Payload) => {
  await seedUser(payload)
  await seedContact(payload)
}
