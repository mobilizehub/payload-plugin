import type { CollectionConfig, Field } from 'payload'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { authenticated } from '../../access/authenticated.js'
import { syncStatusFromActivityBeforeChangeHook } from './hooks/sync-status-from-activity.js'

export const generateEmailsCollection = (emailsConfig: MobilizehubPluginConfig) => {
  const defaultFields: Field[] = [
    {
      name: 'providerId',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
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
          label: 'Queued',
          value: 'queued',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
        {
          label: 'Sent',
          value: 'sent',
        },
        {
          label: 'Delivered',
          value: 'delivered',
        },
        {
          label: 'Bounced',
          value: 'bounced',
        },
        {
          label: 'Unsubscribed',
          value: 'unsubscribed',
        },
        {
          label: 'Complained',
          value: 'complained',
        },
      ],
      required: true,
    },
    {
      name: 'broadcast',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: emailsConfig.broadcastsOverrides?.slug || 'broadcasts',
    },
    {
      name: 'contact',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: emailsConfig.contactsOverrides?.slug || 'contacts',
    },

    {
      name: 'activityField',
      type: 'ui',
      admin: {
        components: {
          Field: '@mobilizehub/payload-plugin/rsc#EmailActivityField',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'from',
      type: 'text',
      admin: {
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'activity',
      type: 'array',
      admin: {
        hidden: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Sent', value: 'sent' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Opened', value: 'opened' },
            { label: 'Clicked', value: 'clicked' },
            { label: 'Bounced', value: 'bounced' },
            { label: 'Unsubscribed', value: 'unsubscribed' },
            { label: 'Complained', value: 'complained' },
          ],
          required: true,
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
      ],
      label: '',
    },
    {
      name: 'subject',
      type: 'text',
      admin: {
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'to',
      type: 'text',
      admin: {
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'html',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'emailPreview',
      type: 'ui',
      admin: {
        components: {
          Field: '@mobilizehub/payload-plugin/client#EmailPreviewField',
        },
      },
    },
  ]

  const config: CollectionConfig = {
    ...(emailsConfig.emailsOverrides || {}),
    slug: emailsConfig.emailsOverrides?.slug || 'emails',
    access: {
      create: () => false,
      delete: () => false,
      read: authenticated,
      update: () => false,
      ...(emailsConfig.emailsOverrides?.access || {}),
    },
    admin: {
      ...(emailsConfig.emailsOverrides?.admin || {}),
      hidden: emailsConfig.emailsOverrides?.admin?.hidden || false,
      useAsTitle: emailsConfig.emailsOverrides?.admin?.useAsTitle || 'to',
    },
    fields: emailsConfig.emailsOverrides?.fields
      ? emailsConfig.emailsOverrides.fields({ defaultFields })
      : defaultFields,
    hooks: {
      beforeChange: [
        syncStatusFromActivityBeforeChangeHook,
        ...(emailsConfig.emailsOverrides?.hooks?.beforeChange || []),
      ],
      ...(emailsConfig.emailsOverrides?.hooks || {}),
    },
  }

  return config
}
