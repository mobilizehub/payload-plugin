import type { BasePayload, CollectionConfig, Field, PayloadRequest } from 'payload'

export type FieldsOverride = (args: { defaultFields: Field[] }) => Field[]

export type CollectionOverride = { fields?: FieldsOverride } & Partial<
  Omit<CollectionConfig, 'fields'>
>

/**
 * Contact type
 */
export type Contact = {
  createdAt?: string
  email?: string
  emailOptIn: boolean
  firstName?: string
  id: number | string
  lastName?: string
  tags?: {
    createdAt?: string
    id: number | string
    name?: string
    updatedAt?: string
  }[]
  updatedAt?: string
}

/**
 * Unsubscribe token input structure
 */
export interface UnsubscribeTokenInput {
  timestamp: number
  tokenId: string
}

/**
 * Unsubscribe token record structure
 */
export type UnsubscribeTokenRecord = {
  emailId?: number | string
  expiresAt?: string
  id: string
}

/**
 * Email activity types
 */
export type EmailStatus =
  | 'bounced'
  | 'complained'
  | 'delivered'
  | 'failed'
  | 'queued'
  | 'sent'
  | 'unsubscribed'

/**
 * Email activity types from providers
 */
export type EmailActivityType =
  | 'bounced'
  | 'clicked'
  | 'complained'
  | 'delivered'
  | 'delivery_delayed'
  | 'failed'
  | 'opened'
  | 'received'
  | 'sent'

/**
 * Email message structure
 */
export type EmailMessage = {
  from: string
  html: string
  idempotencyKey?: string
  markdown?: string
  plainText?: string
  previewText?: string
  replyTo?: string
  subject: string
  to: string
  token?: string
}

/**
 * Result of a webhook call
 */
export type WebhookResult = {
  body?: unknown
  status: number
}

/**
 * Email adapter interface for sending emails
 */
export type EmailAdapter = ({ payload }: { payload: BasePayload }) => {
  defaultFromAddress: string
  defaultFromName: string
  name: string
  render: (args: EmailMessage) => string
  sendEmail: (args: EmailMessage) => Promise<{ providerId: string } | void>
  webhookHandler?: (req: PayloadRequest) => Promise<void | WebhookResult>
}

export type MobilizehubPluginConfig = {
  broadcastConfig?: {
    /**
     * Batch size for processing contacts in the broadcasts task.
     * Higher values process faster but use more memory.
     * @default 100
     */
    batchSize?: number
    /**
     * Optional custom queue name for the broadcasts task
     * @default 'send-broadcasts'
     */
    broadcastQueueName?: string
    /**
     * Optional custom queue name for the email sending task
     * @default 'send-email'
     */
    emailQueueName?: string
    /**
     * Cron schedule for the broadcasts task
     * On schedule the task will run to process and send pending broadcasts
     * @default '5 * * * *' (every 5 minutes)
     */
    taskSchedule?: string
  }
  /**
   * Overrides for the broadcasts collection
   */
  broadcastsOverrides?: CollectionOverride

  /**
   * Overrides for the contacts collection
   */
  contactsOverrides?: CollectionOverride
  /**
   * Disable the plugin
   */
  disabled?: boolean
  /**
   * Email adapter for sending emails
   */
  email: EmailAdapter
  /**
   * Overrides for the emails collection
   */
  emailsOverrides?: CollectionOverride
  /**
   * Overrides for the tags collection
   */
  tagsOverrides?: CollectionOverride
}
