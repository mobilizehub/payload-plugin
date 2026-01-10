import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { createContactFieldsConfig } from '../../fields/contact-fields.js'
import { createNameField } from '../../fields/name.js'
import { createPublishedAtField } from '../../fields/publishedAt.js'
import { createSlugField } from '../../fields/slug.js'
import { createStatusField } from '../../fields/status.js'

export const generateFormsCollection = (formsConfig: MobilizehubPluginConfig) => {
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
              localized: true,
            },
            {
              name: 'confirmationType',
              type: 'radio',
              admin: {
                description:
                  'Choose whether to display an on-page message or redirect to a different page after they submit the form.',
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
              relationTo: ['pages', 'forms'],
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
                description: 'Tag all contacts submitted via this form with these tags.',
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
                  label: 'Automatically send an autoresponse email to the submitter',
                },
                {
                  name: 'fromName',
                  type: 'text',
                  defaultValue: ({ req }) => formsConfig.email(req).defaultFromName || '',
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
                  defaultValue: ({ req }) => formsConfig.email(req).defaultFromAddress || '',
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
              name: 'formSubmissions',
              type: 'join',
              collection: 'formSubmissions',
              on: 'form',
            },
          ],
          label: 'Submissions',
        },
      ],
    },
  ]

  const config: CollectionConfig = {
    ...(formsConfig.formsOverrides || {}),
    slug: formsConfig.formsOverrides?.slug || 'forms',
    access: {
      read: () => true,
      ...(formsConfig.formsOverrides?.access || {}),
    },
    admin: {
      ...(formsConfig.formsOverrides?.admin || {}),
      defaultColumns: formsConfig.formsOverrides?.admin?.defaultColumns || [
        'id',
        'name',
        'slug',
        'status',
      ],
      hidden: formsConfig.formsOverrides?.admin?.hidden || false,
      useAsTitle: formsConfig.formsOverrides?.admin?.useAsTitle || 'name',
    },
    fields: formsConfig.formsOverrides?.fields
      ? formsConfig.formsOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      ...(formsConfig.formsOverrides?.hooks || {}),
    },
  }

  return config
}
