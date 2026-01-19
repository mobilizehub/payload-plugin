import type { TaskConfig, Where } from 'payload'

import z from 'zod'

import type { MobilizehubPluginConfig } from '../types/index.js'

/**
 * Schema for validating broadcast documents before processing.
 */
const BroadcastSchema = z.object({
  id: z.number(),
  content: z.any().refine((val) => val !== undefined && val !== null, {
    message: 'Broadcast content is missing',
  }),
  fromAddress: z.email({ message: 'Invalid from address email format' }),
  fromName: z.string().min(1, { message: 'From name is required' }),
  meta: z.object({
    contactsCount: z.number().min(0),
    lastProcessedContactId: z.number().min(0).default(0),
    processedCount: z.number().min(0),
  }),
  subject: z.string().min(1, { message: 'Subject is required' }),
  tags: z.array(z.any()).optional(),
  to: z.literal('all').or(z.literal('tags')),
})

type ParsedBroadcast = z.infer<typeof BroadcastSchema>

/**
 * Validates a broadcast document against the schema.
 * Returns typed data on success, or flattened field errors on failure.
 */
function safeParseBroadcast(broadcast: unknown) {
  const result = BroadcastSchema.safeParse(broadcast)

  if (!result.success) {
    return {
      data: null,
      errors: z.flattenError(result.error).fieldErrors,
      success: false as const,
    }
  }

  return {
    data: result.data,
    success: true as const,
  }
}

/**
 * Builds the where clause for fetching the next batch of contacts.
 * Uses cursor-based pagination (id > lastProcessedContactId) for consistent
 * ordering and efficient queries at scale.
 */
function buildContactsWhereClause(
  broadcast: ParsedBroadcast,
  rawBroadcast: Record<string, unknown>,
): Where {
  const conditions: Where[] = [
    { emailOptIn: { equals: true } },
    { id: { greater_than: broadcast.meta.lastProcessedContactId } },
  ]

  // Tags may be populated objects or raw IDs depending on query depth
  if (broadcast.to === 'tags' && Array.isArray(rawBroadcast.tags) && rawBroadcast.tags.length > 0) {
    const tagIds = rawBroadcast.tags.map((t: { id: number | string } | number | string) =>
      typeof t === 'object' ? t.id : t,
    )
    conditions.push({ tags: { in: tagIds } })
  }

  return { and: conditions }
}

/**
 * Extracts a numeric ID from a contact, handling string IDs from some database adapters.
 */
function getLastContactId(contact: { id: number | string }): number {
  return typeof contact.id === 'number' ? contact.id : parseInt(contact.id, 10)
}

/**
 * Creates the send-broadcasts scheduled task.
 *
 * Processes broadcasts by polling for documents with status 'sending' and
 * queuing batches of send-email jobs. Each invocation processes one broadcast
 * and one batch of contacts, allowing the task to be distributed across
 * multiple schedule intervals.
 */
export const createSendBroadcastsTask = (pluginConfig: MobilizehubPluginConfig): TaskConfig => {
  const BATCH_SIZE = pluginConfig.broadcastConfig?.batchSize || 100
  const TASK_SCHEDULE = pluginConfig.broadcastConfig?.taskSchedule || '*/5 * * * *'
  const BROADCAST_QUEUE_NAME = pluginConfig.broadcastConfig?.broadcastQueueName || 'send-broadcasts'
  const EMAIL_QUEUE_NAME = pluginConfig.broadcastConfig?.emailQueueName || 'send-emails'

  return {
    slug: 'send-broadcasts',
    handler: async ({ req }) => {
      const { payload } = req
      const logger = payload.logger

      const { docs } = await payload.find({
        collection: 'broadcasts',
        limit: 1,
        sort: 'id',
        where: { status: { equals: 'sending' } },
      })

      const rawBroadcast = docs[0]

      if (!rawBroadcast) {
        logger.info('No broadcasts with status "sending" found')
        return { output: { success: true } }
      }

      const parsed = safeParseBroadcast(rawBroadcast)

      if (!parsed.success) {
        logger.error({ errors: parsed.errors }, `Broadcast ${rawBroadcast.id} validation failed`)
        await payload.update({
          id: rawBroadcast.id,
          collection: 'broadcasts',
          data: { status: 'failed' },
        })
        return { output: { success: false } }
      }

      const broadcast = parsed.data
      const whereClause = buildContactsWhereClause(
        broadcast,
        rawBroadcast as Record<string, unknown>,
      )

      const { docs: contacts } = await payload.find({
        collection: 'contacts',
        limit: BATCH_SIZE,
        sort: 'id',
        where: whereClause,
      })

      if (contacts.length === 0) {
        logger.info(
          `Broadcast ${broadcast.id} complete. ` +
            `Processed: ${broadcast.meta.processedCount}, Expected: ${broadcast.meta.contactsCount}`,
        )
        await payload.update({
          id: broadcast.id,
          collection: 'broadcasts',
          data: { status: 'sent' },
        })
        return { output: { success: true } }
      }

      await Promise.all(
        contacts.map((contact) =>
          payload.jobs.queue({
            input: { broadcastId: broadcast.id, contactId: contact.id },
            queue: EMAIL_QUEUE_NAME,
            task: 'send-email',
          }),
        ),
      )

      await payload.update({
        id: broadcast.id,
        collection: 'broadcasts',
        data: {
          meta: {
            lastProcessedContactId: getLastContactId(contacts[contacts.length - 1]),
            processedCount: broadcast.meta.processedCount + contacts.length,
          },
        },
      })

      logger.info(
        `Broadcast ${broadcast.id}: queued ${contacts.length} emails, ` +
          `total processed: ${broadcast.meta.processedCount + contacts.length}`,
      )

      return { output: { success: true } }
    },
    outputSchema: [
      {
        name: 'success',
        type: 'checkbox',
      },
    ],
    retries: 3,
    schedule: [
      {
        cron: TASK_SCHEDULE,
        queue: BROADCAST_QUEUE_NAME,
      },
    ],
  }
}
