import type { TextField } from 'payload'

/**
 * Creates a 'name' text field configuration for a Collection.
 */
export const createNameField = (): TextField => {
  const field: TextField = {
    name: 'name',
    type: 'text',
    required: true,
  }

  return field
}
