import type { Block, CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { createNameField } from '../../fields/name.js'
import { createPublishedAtField } from '../../fields/publishedAt.js'
import { createSlugField } from '../../fields/slug.js'
import { createStatusField } from '../../fields/status.js'

export const generatePagesCollection = (pagesConfig: MobilizehubPluginConfig) => {
  const { blocks: blocksOverride, ...pagesOverrides } = pagesConfig.pagesOverrides || {}

  const defaultBlocks: Block[] = [
    {
      slug: 'content',
      fields: [
        {
          name: 'richText',
          type: 'richText',
          label: false,
        },
      ],
      interfaceName: 'ContentBlock',
    },
  ]

  const blocks = blocksOverride ? blocksOverride({ defaultBlocks }) : defaultBlocks

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
              name: 'blocks',
              type: 'blocks',
              blocks,
              label: 'Blocks',
            },
          ],
          label: 'Content',
        },
      ],
    },
  ]

  const config: CollectionConfig = {
    ...pagesOverrides,
    slug: pagesOverrides.slug || 'pages',
    access: {
      read: () => true,
      ...(pagesOverrides.access || {}),
    },
    admin: {
      ...(pagesOverrides.admin || {}),
      defaultColumns: pagesOverrides.admin?.defaultColumns || ['id', 'name', 'slug', 'status'],
      hidden: pagesOverrides.admin?.hidden || false,
      useAsTitle: pagesOverrides.admin?.useAsTitle || 'name',
    },
    fields: pagesOverrides.fields ? pagesOverrides.fields({ defaultFields }) : defaultFields,
    hooks: {
      ...(pagesOverrides.hooks || {}),
    },
  }

  return config
}
