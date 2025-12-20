import type { SelectField } from 'payload'

/**
 * Creates a 'status' select field configuration for a Collection.
 */
export const createStatusField = (): SelectField => {
  const field: SelectField = {
    name: 'status',
    type: 'select',
    admin: {
      position: 'sidebar',
    },
    defaultValue: 'draft',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
    ],
  }
  return field
}
