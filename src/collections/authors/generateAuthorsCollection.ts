import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { createNameField } from '../../fields/name.js'

export const generateAuthorsCollection = (
  authorsConfig: Pick<MobilizehubPluginConfig, 'authorsOverrides'>,
): CollectionConfig => {
  const defaultFields: Field[] = [createNameField()]

  const config: CollectionConfig = {
    ...authorsConfig.authorsOverrides,
    slug: authorsConfig.authorsOverrides?.slug || 'authors',
    access: {
      read: () => true,
      ...(authorsConfig.authorsOverrides?.access || {}),
    },
    admin: {
      ...(authorsConfig.authorsOverrides?.admin || {}),
      defaultColumns: authorsConfig.authorsOverrides?.admin?.defaultColumns || ['id', 'name'],
      hidden: authorsConfig.authorsOverrides?.admin?.hidden ?? true,
      useAsTitle: authorsConfig.authorsOverrides?.admin?.useAsTitle || 'name',
    },
    fields: authorsConfig.authorsOverrides?.fields
      ? authorsConfig.authorsOverrides.fields({ defaultFields })
      : defaultFields,
  }

  return config
}
