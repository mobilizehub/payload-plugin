import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { authenticated } from '../../access/authenticated.js'

export const generateFormSubmissionsCollection = (
  formSubmissionsConfig: MobilizehubPluginConfig,
) => {
  const defaultFields: Field[] = [
    {
      name: 'form',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: 'forms',
      required: true,
    },
    {
      name: 'contact',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: 'contacts',
    },
    {
      name: 'createdAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'data',
      type: 'json',
      label: 'Data',
    },
  ]

  const config: CollectionConfig = {
    ...(formSubmissionsConfig.formSubmissionsOverrides || {}),
    slug: formSubmissionsConfig.formSubmissionsOverrides?.slug || 'formSubmissions',
    access: {
      create: () => false,
      read: authenticated,
      update: () => false,
      ...(formSubmissionsConfig.formSubmissionsOverrides?.access || {}),
    },
    admin: {
      ...(formSubmissionsConfig.formSubmissionsOverrides?.admin || {}),
      hidden: formSubmissionsConfig.formSubmissionsOverrides?.admin?.hidden || true,
    },
    fields: formSubmissionsConfig.formSubmissionsOverrides?.fields
      ? formSubmissionsConfig.formSubmissionsOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      ...(formSubmissionsConfig.formSubmissionsOverrides?.hooks || {}),
      afterChange: [...(formSubmissionsConfig.formSubmissionsOverrides?.hooks?.afterChange || [])],
    },
  }

  return config
}
