import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { createContactFieldsConfig } from '../../fields/contact-fields.js'
import { createNameField } from '../../fields/name.js'
import { createPublishedAtField } from '../../fields/publishedAt.js'
import { createSlugField } from '../../fields/slug.js'
import { createStatusField } from '../../fields/status.js'
import { isValidEmail } from '../../utils/email.js'

export const generateLettersCollection = (lettersConfig: MobilizehubPluginConfig) => {
  const lettersSlug = lettersConfig.lettersOverrides?.slug || 'letters'

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
                description: 'Who or what is this letter addressed to?',
              },
              label: 'Letter Target',
            },
            {
              name: 'email',
              type: 'text',
              admin: {
                description: 'What is the email of the target this letter is addressed to?',
              },
              label: 'Letter Email',
              validate: (value: null | string | undefined) => {
                if (!value || !isValidEmail(value)) {
                  return 'Please enter a valid email address'
                }
                return true
              },
            },
            {
              name: 'subject',
              type: 'text',
              admin: {
                description: 'The subject of the letter.',
              },
              label: 'Letter Subject',
            },
            {
              name: 'body',
              type: 'textarea',
              admin: {
                description: 'The body of the letter.',
              },
              label: 'Letter Body',
            },
            {
              name: 'editable',
              type: 'checkbox',
              label: 'Allow the subject and body to be edited.',
            },
            {
              name: 'goal',
              type: 'number',
              admin: {
                description: 'The target number of letters for this campaign.',
              },
              label: 'Letter Goal',
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
              defaultValue: 'Send Letter',
              localized: true,
            },
            {
              name: 'confirmationType',
              type: 'radio',
              admin: {
                description:
                  'Choose whether to display an on-page message or redirect to a different page after they send the letter.',
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
              relationTo: [lettersSlug],
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
                description: 'Tag all contacts who send this letter with these tags.',
              },
              hasMany: true,
              relationTo: lettersConfig.tagsOverrides?.slug || 'tags',
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
                  label: 'Automatically send an autoresponse email to the sender',
                },
                {
                  name: 'fromName',
                  type: 'text',
                  defaultValue: ({ req }) => lettersConfig.email(req).defaultFromName || '',
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
                  defaultValue: ({ req }) => lettersConfig.email(req).defaultFromAddress || '',
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
              name: 'letterSubmissions',
              type: 'join',
              collection: lettersConfig.letterSubmissionsOverrides?.slug || 'letterSubmissions',
              on: 'letter',
            },
          ],
          label: 'Submissions',
        },
      ],
    },
  ]

  const config: CollectionConfig = {
    ...(lettersConfig.lettersOverrides || {}),
    slug: lettersSlug,
    access: {
      read: () => true,
      ...(lettersConfig.lettersOverrides?.access || {}),
    },
    admin: {
      ...(lettersConfig.lettersOverrides?.admin || {}),
      defaultColumns: lettersConfig.lettersOverrides?.admin?.defaultColumns || [
        'id',
        'name',
        'slug',
        'status',
      ],
      hidden: lettersConfig.lettersOverrides?.admin?.hidden || false,
      useAsTitle: lettersConfig.lettersOverrides?.admin?.useAsTitle || 'name',
    },
    fields: lettersConfig.lettersOverrides?.fields
      ? lettersConfig.lettersOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      ...(lettersConfig.lettersOverrides?.hooks || {}),
    },
    labels: {
      plural: 'Letters',
      singular: 'Letter',
      ...(lettersConfig.lettersOverrides?.labels || {}),
    },
  }

  return config
}
