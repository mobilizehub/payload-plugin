import type { DateField } from 'payload'

/**
 * Creates a 'publishedAt' date field configuration for a Collection.
 */
export const createPublishedAtField = (): DateField => {
  const field: DateField = {
    name: 'publishedAt',
    type: 'date',
    admin: {
      date: {
        pickerAppearance: 'dayAndTime',
      },
    },
  }

  return field
}
