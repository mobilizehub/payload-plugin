import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { createContactFieldsConfig } from '../../fields/contact-fields.js'
import { createNameField } from '../../fields/name.js'
import { createPublishedAtField } from '../../fields/publishedAt.js'
import { createSlugField } from '../../fields/slug.js'
import { createStatusField } from '../../fields/status.js'

export const generatePetitionsCollection = (petitionsConfig: MobilizehubPluginConfig) => {
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
              name: 'content',
              type: 'richText',
              label: 'Content',
            },
            {
              name: 'target',
              type: 'text',
              admin: {
                description: 'Who or what is this petition addressed to?',
              },
              label: 'Petition Target',
            },
            {
              name: 'ask',
              type: 'textarea',
              admin: {
                description: 'What is this petition asking for or demanding?',
              },
              label: 'Petition Ask',
            },
            {
              name: 'goal',
              type: 'number',
              admin: {
                description: 'The target number of signatures for this petition.',
              },
              label: 'Signature Goal',
              min: 1,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'legend',
              type: 'text',
              localized: true,
            },
            createContactFieldsConfig(),
            {
              name: 'submitButtonLabel',
              type: 'text',
              defaultValue: 'Sign Petition',
              localized: true,
            },
            {
              name: 'confirmationType',
              type: 'radio',
              admin: {
                description:
                  'Choose whether to display an on-page message or redirect to a different page after they sign the petition.',
                layout: 'horizontal',
              },
              defaultValue: 'message',
              options: [
                {
                  label: 'Message',
                  value: 'message',
                },
                {
                  label: 'Redirect',
                  value: 'redirect',
                },
              ],
            },
            {
              name: 'confirmationMessage',
              type: 'richText',
              admin: {
                condition: (_, siblingData) => siblingData?.confirmationType === 'message',
              },
              localized: true,
            },
            {
              name: 'type',
              type: 'radio',
              admin: {
                condition: (_, siblingData) => siblingData?.confirmationType === 'redirect',
                layout: 'horizontal',
              },
              defaultValue: 'reference',
              options: [
                {
                  label: 'Internal link',
                  value: 'reference',
                },
                {
                  label: 'Custom URL',
                  value: 'custom',
                },
              ],
            },
            {
              name: 'reference',
              type: 'relationship',
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.confirmationType === 'redirect' && siblingData?.type === 'reference',
              },
              label: 'Document to link to',
              maxDepth: 2,
              relationTo: ['petitions'],
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.confirmationType === 'redirect' && siblingData?.type === 'custom',
              },
              label: 'URL to redirect to',
              required: true,
            },
            {
              name: 'tags',
              type: 'relationship',
              admin: {
                description: 'Tag all contacts who sign this petition with these tags.',
              },
              hasMany: true,
              relationTo: 'tags',
            },
            {
              name: 'autoresponse',
              type: 'group',
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  admin: {
                    style: {
                      marginTop: '1.5rem',
                    },
                  },
                  defaultValue: false,
                  label: 'Automatically send an autoresponse email to the signer',
                },
                {
                  name: 'fromName',
                  type: 'text',
                  defaultValue: ({ req }) => petitionsConfig.email(req).defaultFromName || '',
                  label: 'Name',
                  required: true,
                },
                {
                  name: 'fromAddress',
                  type: 'text',
                  admin: {
                    description: 'The from address is set in the email configuration.',
                    readOnly: true,
                  },
                  defaultValue: ({ req }) => petitionsConfig.email(req).defaultFromAddress || '',
                  label: 'Address',
                  required: true,
                },
                {
                  name: 'replyTo',
                  type: 'text',
                  localized: true,
                },
                {
                  name: 'subject',
                  type: 'text',
                  localized: true,
                },
                {
                  name: 'previewText',
                  type: 'text',
                  localized: true,
                },
                {
                  name: 'content',
                  type: 'richText',
                  localized: true,
                },
              ],
            },
          ],
          label: 'Form',
        },
        {
          fields: [
            {
              name: 'petitionSignatures',
              type: 'join',
              collection: 'petitionSignatures',
              on: 'petition',
            },
          ],
          label: 'Signatures',
        },
      ],
    },
  ]

  const config: CollectionConfig = {
    ...(petitionsConfig.petitionsOverrides || {}),
    slug: petitionsConfig.petitionsOverrides?.slug || 'petitions',
    access: {
      read: () => true,
      ...(petitionsConfig.petitionsOverrides?.access || {}),
    },
    admin: {
      ...(petitionsConfig.petitionsOverrides?.admin || {}),
      defaultColumns: petitionsConfig.petitionsOverrides?.admin?.defaultColumns || [
        'id',
        'name',
        'slug',
        'status',
      ],
      hidden: petitionsConfig.petitionsOverrides?.admin?.hidden || false,
      useAsTitle: petitionsConfig.petitionsOverrides?.admin?.useAsTitle || 'name',
    },
    fields: petitionsConfig.petitionsOverrides?.fields
      ? petitionsConfig.petitionsOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      ...(petitionsConfig.petitionsOverrides?.hooks || {}),
    },
  }

  return config
}
