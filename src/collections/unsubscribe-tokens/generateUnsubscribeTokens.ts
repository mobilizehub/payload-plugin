import type { CollectionConfig, Field } from 'payload'

export const generateUnsubscribeTokensCollection = () => {
  const defaultFields: Field[] = [
    {
      name: 'id',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'emailId',
      type: 'relationship',
      relationTo: 'emails',
    },
    {
      name: 'expiresAt',
      type: 'date',
    },
  ]

  const config: CollectionConfig = {
    slug: 'emailUnsubscribeTokens',
    access: {
      create: () => false,
      delete: () => false,
      read: () => false,
      update: () => false,
    },
    admin: {
      hidden: true,
    },
    fields: defaultFields,
    hooks: {
      beforeChange: [
        ({ data, operation }) => {
          if (operation === 'create') {
            if (!data.expiresAt) {
              const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              data.expiresAt = expiresAt.toISOString()
            }
          }
          return data
        },
      ],
    },
  }

  return config
}
