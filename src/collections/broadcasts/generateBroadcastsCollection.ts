import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { authenticated } from '../../access/authenticated.js'

export const generateBroadcastsCollection = (broadcastsConfig: MobilizehubPluginConfig) => {
  const defaultFields: Field[] = [
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      defaultValue: 'draft',
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Sending',
          value: 'sending',
        },
        {
          label: "Failed",
          value: 'failed',
        },
        {
          label: 'Sent',
          value: 'sent',
        },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'name',
              type: 'text',
              access: {
                update: ({ doc }) => doc?.status === 'draft',
              },
              admin: {
                description: 'This is for internal reference only.',
              },
            },
            {
              name: 'fromName',
              type: 'text',
              defaultValue: ({ req }) => broadcastsConfig.email(req).defaultFromName || '',
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
              defaultValue: ({ req }) => broadcastsConfig.email(req).defaultFromAddress || '',
              label: 'Address',
              required: true,
            },
            {
              name: 'to',
              type: 'radio',
              admin: {
                description: 'Choose how to segment the recipients of this broadcast.',
                layout: 'horizontal',
              },
              defaultValue: 'all',
              options: [
                {
                  label: 'All',
                  value: 'all',
                },
                {
                  label: 'By Tags',
                  value: 'tags',
                },
              ],
            },
            {
              name: 'tags',
              type: 'relationship',
              admin: {
                condition: (_, siblingData) => siblingData?.to === 'tags',
                description:
                  'Select one or more tags to send this broadcast to contacts with any of the selected tags who have opted in to receive emails.',
              },
              hasMany: true,
              minRows: 1,
              relationTo: 'tags',
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
              required: true,
            },
            {
              name: 'previewText',
              type: 'text',
              localized: true,
            },
          ],
          label: 'Settings',
        },
        {
          fields: [
            {
              name: 'content',
              type: 'richText',
              label: 'Content',
              localized: true,
            },
          ],
          label: 'Content',
        },
        {
          admin: {
            condition: (_, siblingData) => siblingData?.status !== 'draft',
          },
          fields: [
            {
              name: 'metricsTable',
              type: 'ui',
              admin: {
                components: {
                  Field: '@mobilizehub/payload-plugin/rsc#MetricsCards',
                },
              },
            },
            {
              name: 'emails',
              type: 'join',
              admin: {
                condition: (_, siblingData) => siblingData?.status !== 'draft',
              },
              collection: 'emails',
              on: 'broadcast',
            },
          ],
          label: 'Metrics',
        },
      ],
    },
    {
      name: 'meta',
      type: 'group',
      admin: {
        hidden: true,
      },
      fields: [
        {
          name: 'contactsCount',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'processedCount',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'lastProcessedContactId',
          type: 'number',
          admin: {
            description: 'Used for cursor-based pagination during batch processing',
          },
          defaultValue: 0,
        },
      ],
    },
  ]

  const config: CollectionConfig = {
    ...(broadcastsConfig.broadcastsOverrides || {}),
    slug: broadcastsConfig.broadcastsOverrides?.slug || 'broadcasts',
    access: {
      read: authenticated,
      update: () => {
        return {
          status: { equals: 'draft' },
        }
      },
      ...(broadcastsConfig.broadcastsOverrides?.access || {}),
    },
    admin: {
      components: {
        edit: {
          beforeDocumentControls: [
            {
              clientProps: {
                buttonLabel: 'Send',
              },
              path: '@mobilizehub/payload-plugin/client#SendBroadcastModal',
            },
            {
              clientProps: {
                buttonLabel: 'Test',
              },
              path: '@mobilizehub/payload-plugin/client#SendTestBroadcastDrawer',
            },
          ],
        },
      },
      hidden: broadcastsConfig.broadcastsOverrides?.admin?.hidden || false,
      useAsTitle: broadcastsConfig.broadcastsOverrides?.admin?.useAsTitle || 'name',
      ...(broadcastsConfig.broadcastsOverrides?.admin || {}),
    },
    fields: broadcastsConfig.broadcastsOverrides?.fields
      ? broadcastsConfig.broadcastsOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      ...(broadcastsConfig.broadcastsOverrides?.hooks || {}),
      beforeChange: [
        ...(broadcastsConfig.broadcastsOverrides?.hooks?.beforeChange || []),
        ({ data, operation }) => {
          // When duplicating, check if this is a creation of a published doc
          if (operation === 'create' && data.status !== 'draft') {
            // Force status to draft for all newly created documents
            return {
              ...data,
              status: 'draft',
            }
          }
          return data
        },
      ],
    },
  }

  return config
}
