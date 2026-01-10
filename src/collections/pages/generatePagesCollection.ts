import type { Block, CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { createNameField } from '../../fields/name.js'
import { createPublishedAtField } from '../../fields/publishedAt.js'
import { createSlugField } from '../../fields/slug.js'
import { createStatusField } from '../../fields/status.js'

export const generatePagesCollection = (pagesConfig: MobilizehubPluginConfig) => {
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

  const blocks = pagesConfig.pagesOverrides?.blocks
    ? pagesConfig.pagesOverrides.blocks({ defaultBlocks })
    : defaultBlocks

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
    ...(pagesConfig.pagesOverrides || {}),
    slug: pagesConfig.pagesOverrides?.slug || 'pages',
    access: {
      read: () => true,
      ...(pagesConfig.pagesOverrides?.access || {}),
    },
    admin: {
      ...(pagesConfig.pagesOverrides?.admin || {}),
      defaultColumns: pagesConfig.pagesOverrides?.admin?.defaultColumns || [
        'id',
        'name',
        'slug',
        'status',
      ],
      hidden: pagesConfig.pagesOverrides?.admin?.hidden || false,
      useAsTitle: pagesConfig.pagesOverrides?.admin?.useAsTitle || 'name',
    },
    fields: pagesConfig.pagesOverrides?.fields
      ? pagesConfig.pagesOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      ...(pagesConfig.pagesOverrides?.hooks || {}),
    },
  }

  return config
}
