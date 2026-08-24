import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { createNameField } from '../../fields/name.js'
import { createPublishedAtField } from '../../fields/publishedAt.js'
import { createSlugField } from '../../fields/slug.js'
import { createStatusField } from '../../fields/status.js'

export const generatePostsCollection = (postsConfig: MobilizehubPluginConfig) => {
  const defaultFields: Field[] = [
    createStatusField(),
    {
      type: 'tabs',
      tabs: [
        {
          fields: [createNameField(), createSlugField(), createPublishedAtField()],
          label: 'Settings',
        },
        {
          fields: [
            {
              name: 'headline',
              type: 'text',
              label: 'Headline',
            },
            {
              name: 'author',
              type: 'relationship',
              label: 'Author',
              relationTo: 'authors',
            },
            {
              name: 'content',
              type: 'richText',
              label: 'Content',
            },
          ],
          label: 'Content',
        },
      ],
    },
  ]

  const config: CollectionConfig = {
    ...(postsConfig.postsOverrides || {}),
    slug: postsConfig.postsOverrides?.slug || 'posts',
    access: {
      read: () => true,
      ...(postsConfig.postsOverrides?.access || {}),
    },
    admin: {
      ...(postsConfig.postsOverrides?.admin || {}),
      defaultColumns: postsConfig.postsOverrides?.admin?.defaultColumns || [
        'id',
        'name',
        'slug',
        'status',
        'publishedAt',
      ],
      hidden: postsConfig.postsOverrides?.admin?.hidden || false,
      useAsTitle: postsConfig.postsOverrides?.admin?.useAsTitle || 'name',
    },
    fields: postsConfig.postsOverrides?.fields
      ? postsConfig.postsOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      ...(postsConfig.postsOverrides?.hooks || {}),
    },
  }

  return config
}
