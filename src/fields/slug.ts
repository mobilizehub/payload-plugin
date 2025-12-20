import type { TextField } from 'payload'

/**
 * Creates a 'slug' text field configuration for a Collection.
 * The slug is auto-generated from the title if not provided,
 * and is validated to ensure it is URL-friendly.
 */
export const createSlugField = (): TextField => {
  const field: TextField = {
    name: 'slug',
    type: 'text',
    admin: {
      position: 'sidebar',
    },
    hooks: {
      beforeChange: [
        ({ data, value }) => {
          /**
           * Auto-generate slug from title if not provided
           */
          if (!value && data?.title) {
            return data.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          }
          return value
        },
      ],
      beforeValidate: [
        ({ operation, value }) => {
          if (operation === 'create' && !value) {
            return value
          }
          // Ensure slug is URL-friendly
          return value
            ?.toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
        },
      ],
    },
    required: true,
    unique: true,
    validate: (value: null | string | undefined) => {
      /**
       * Custom validation to ensure slug format
       */
      if (value && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
        return 'Slug must be lowercase and can only contain letters, numbers, and hyphens.'
      }

      return true
    },
  }

  return field
}
