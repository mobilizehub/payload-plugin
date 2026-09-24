import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { authenticated } from '../../access/authenticated.js'
import { createDeliverLetterHook } from './hooks/deliverLetter.js'
import { createProcessLetterSubmissionHook } from './hooks/processLetterSubmission.js'
import { createSendLetterAutoresponseHook } from './hooks/sendAutoresponse.js'

export const generateLetterSubmissionsCollection = (
  letterSubmissionsConfig: MobilizehubPluginConfig,
) => {
  const lettersSlug = letterSubmissionsConfig.lettersOverrides?.slug || 'letters'

  const defaultFields: Field[] = [
    {
      name: 'letter',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: lettersSlug,
      required: true,
    },
    {
      name: 'contact',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: letterSubmissionsConfig.contactsOverrides?.slug || 'contacts',
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
      name: 'subject',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'body',
      type: 'textarea',
      admin: {
        description: 'The final letter text that was sent to the target.',
        readOnly: true,
      },
    },
    {
      name: 'edited',
      type: 'checkbox',
      admin: {
        description: 'Whether the sender changed the letter template before sending.',
        readOnly: true,
      },
    },
    {
      name: 'data',
      type: 'json',
      admin: {
        description: 'The raw data submitted with the letter.',
      },
    },
    {
      name: 'email',
      type: 'relationship',
      admin: {
        description: 'The delivery record for the letter sent to the target.',
        readOnly: true,
      },
      relationTo: letterSubmissionsConfig.emailsOverrides?.slug || 'emails',
    },
  ]

  const config: CollectionConfig = {
    ...(letterSubmissionsConfig.letterSubmissionsOverrides || {}),
    slug: letterSubmissionsConfig.letterSubmissionsOverrides?.slug || 'letterSubmissions',
    access: {
      // Don't allow creation via admin or API - only via endpoint
      create: () => false,
      // Only authenticated users can read
      read: authenticated,
      // Prevent updates
      update: () => false,
      ...(letterSubmissionsConfig.letterSubmissionsOverrides?.access || {}),
    },
    admin: {
      ...(letterSubmissionsConfig.letterSubmissionsOverrides?.admin || {}),
      defaultColumns: letterSubmissionsConfig.letterSubmissionsOverrides?.admin
        ?.defaultColumns || ['id', 'letter', 'contact', 'createdAt'],
      hidden: letterSubmissionsConfig.letterSubmissionsOverrides?.admin?.hidden || true,
    },
    fields: letterSubmissionsConfig.letterSubmissionsOverrides?.fields
      ? letterSubmissionsConfig.letterSubmissionsOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      afterChange: [
        createDeliverLetterHook(letterSubmissionsConfig),
        createSendLetterAutoresponseHook(letterSubmissionsConfig),
      ],
      beforeChange: [createProcessLetterSubmissionHook(letterSubmissionsConfig)],
      ...(letterSubmissionsConfig.letterSubmissionsOverrides?.hooks || {}),
    },
    labels: {
      plural: 'Letters',
      singular: 'Letter',
      ...(letterSubmissionsConfig.letterSubmissionsOverrides?.labels || {}),
    },
  }

  return config
}
