import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { authenticated } from '../../access/authenticated.js'
import { createProcessPetitionSignatureHook } from './hooks/processPetitionSignature.js'
import { createSendPetitionAutoresponseHook } from './hooks/sendAutoresponse.js'

export const generatePetitionSignaturesCollection = (
  petitionSignaturesConfig: MobilizehubPluginConfig,
) => {
  const defaultFields: Field[] = [
    {
      name: 'petition',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: petitionSignaturesConfig.petitionsOverrides?.slug || 'petitions',
      required: true,
    },
    {
      name: 'contact',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: petitionSignaturesConfig.contactsOverrides?.slug || 'contacts',
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
      admin: {
        description: 'The raw data submitted with the petition signature.',
      },
    },
  ]

  const config: CollectionConfig = {
    ...(petitionSignaturesConfig.petitionSignaturesOverrides || {}),
    slug: petitionSignaturesConfig.petitionSignaturesOverrides?.slug || 'petitionSignatures',
    access: {
      // Don't allow creation via admin or API - only via endpoint
      create: () => false,
      // Only authenticated users can read
      read: authenticated,
      // Prevent updates
      update: () => false,
      ...(petitionSignaturesConfig.petitionSignaturesOverrides?.access || {}),
    },
    admin: {
      ...(petitionSignaturesConfig.petitionSignaturesOverrides?.admin || {}),
      defaultColumns: petitionSignaturesConfig.petitionSignaturesOverrides?.admin
        ?.defaultColumns || ['id', 'petition', 'contact', 'createdAt'],
      hidden: petitionSignaturesConfig.petitionSignaturesOverrides?.admin?.hidden || true,
    },
    fields: petitionSignaturesConfig.petitionSignaturesOverrides?.fields
      ? petitionSignaturesConfig.petitionSignaturesOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      afterChange: [createSendPetitionAutoresponseHook(petitionSignaturesConfig)],
      beforeChange: [createProcessPetitionSignatureHook(petitionSignaturesConfig)],
      ...(petitionSignaturesConfig.petitionSignaturesOverrides?.hooks || {}),
    },
  }

  return config
}
