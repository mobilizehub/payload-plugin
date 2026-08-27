import type { CollectionConfig, Field } from 'payload'

import type { CollectionOverride } from '../types/index.js'

import { createNameField } from '../fields/name.js'
import { createPublishedAtField } from '../fields/publishedAt.js'
import { createSlugField } from '../fields/slug.js'
import { createStatusField } from '../fields/status.js'

export type CreateContentCollectionOptions = {
  /**
   * Fields to render in the Content tab.
   */
  contentFields: Field[]
  /**
   * Optional overrides for the collection config, including a fields callback
   * that receives the default fields and returns a new set.
   */
  overrides?: CollectionOverride
  /**
   * The collection slug.
   */
  slug: string
}

/**
 * Creates a Payload collection config with the same tab structure used by the
 * plugin's petitions and forms collections:
 *
 * - Sidebar: status field
 * - Settings tab: name, slug, publishedAt
 * - Content tab: caller-supplied contentFields
 *
 * @example
 * createContentCollection({
 *   slug: 'pages',
 *   contentFields: [{ name: 'blocks', type: 'blocks', blocks: [...] }],
 * })
 */
export const createContentCollection = ({
  slug,
  contentFields,
  overrides,
}: CreateContentCollectionOptions): CollectionConfig => {
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
          fields: contentFields,
          label: 'Content',
        },
      ],
    },
  ]

  return {
    ...(overrides || {}),
    slug: overrides?.slug || slug,
    access: {
      read: () => true,
      ...(overrides?.access || {}),
    },
    admin: {
      ...(overrides?.admin || {}),
      defaultColumns: overrides?.admin?.defaultColumns || ['id', 'name', 'slug', 'status'],
      hidden: overrides?.admin?.hidden || false,
      useAsTitle: overrides?.admin?.useAsTitle || 'name',
    },
    fields: overrides?.fields ? overrides.fields({ defaultFields }) : defaultFields,
    hooks: {
      ...(overrides?.hooks || {}),
    },
  }
}
