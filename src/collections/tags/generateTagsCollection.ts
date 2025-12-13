import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { authenticated } from '../../access/authenticated.js'

export const generateTagsCollection = (
  tagsConfig: Pick<MobilizehubPluginConfig, 'tagsOverrides'>,
): CollectionConfig => {
  const defaultFields: Field[] = [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ]

  const config: CollectionConfig = {
    ...tagsConfig.tagsOverrides,
    slug: tagsConfig.tagsOverrides?.slug || 'tags',
    access: {
      read: authenticated,
      ...(tagsConfig.tagsOverrides?.access || {}),
    },
    admin: {
      ...(tagsConfig.tagsOverrides?.admin || {}),
      hidden: tagsConfig.tagsOverrides?.admin?.hidden || true,
      useAsTitle: tagsConfig.tagsOverrides?.admin?.useAsTitle || 'name',
    },
    fields: tagsConfig.tagsOverrides?.fields
      ? tagsConfig.tagsOverrides.fields({ defaultFields })
      : defaultFields,
  }

  return config
}
