import type { TaskConfig, Where } from 'payload'

import z from 'zod'

import type { MobilizehubPluginConfig } from '../types/index.js'

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

/**
 * Validates a broadcast before sending
 * @param broadcast - The broadcast document to validate
 * @returns An object indicating whether the broadcast is valid and any error codes/messages
 */
function safeParseBroadcast(broadcast: unknown) {
  const result = BroadcastSchema.safeParse(broadcast)

  if (!result.success) {
    return {
      data: null,
      message: z.flattenError(result.error).fieldErrors,
      success: false as const,
    }
  }

  return {
    data: result.data,
    success: true as const,
  }
}

/**
 * Creates a task configuration for sending broadcasts.
 * This task is called on a schedule to find broadcasts with the status "sending"
 * and processes a batch of emails by adding them to the send-email-queue.
 *
 * @param pluginConfig - The Mobilizehub plugin configuration
 * @returns A Payload TaskConfig object for the send-broadcast task
 */
export const createSendBroadcastsTask = (pluginConfig: MobilizehubPluginConfig): TaskConfig => {
  const config: TaskConfig = {
    slug: 'send-broadcasts',
    handler: async ({ req }) => {
      try {
        req.payload.logger.info('Send Broadcast task handler called')

        // Get the first broadcast with status "sending"
        const documents = await req.payload.find({
          collection: 'broadcasts',
          limit: 1,
          // Get the oldest broadcast first
          sort: 'id',
          where: {
            status: {
              equals: 'sending',
            },
          },
        })

        const broadcast = documents?.docs?.[0]

        if (!broadcast) {
          req.payload.logger.info('No broadcasts with status "sending" found.')
          return {
            output: {
              success: true,
            },
          }
        }

        const parsedBroadcast = safeParseBroadcast(broadcast)

        if (!parsedBroadcast.success) {
          req.payload.logger.error(parsedBroadcast, `Broadcast ${broadcast.id} validation failed`)
          throw new Error()
        }

        // Check if we've already processed all contacts
        if (parsedBroadcast.data.meta.processedCount >= parsedBroadcast.data.meta.contactsCount) {
          req.payload.logger.info(
            `All ${parsedBroadcast.data.meta.contactsCount} contacts have been processed for broadcast ID: ${broadcast.id}. Marking as sent.`,
          )
          // Update broadcast status to 'sent'
          await req.payload.update({
            id: parsedBroadcast.data.id,
            collection: 'broadcasts',
            data: {
              status: 'sent',
            },
          })
          return {
            output: {
              success: true,
            },
          }
        }

        // Build the where clause for fetching contacts using cursor-based pagination
        const whereClause: Where = {
          and: [
            { emailOptIn: { equals: true } },
            // Cursor-based pagination: only fetch contacts with ID greater than last processed
            { id: { greater_than: parsedBroadcast.data.meta.lastProcessedContactId } },
          ],
        }

        /**
         * If the broadcast is targeted by tags, add a tags filter to the where clause
         */
        if (broadcast.to === 'tags' && broadcast.tags?.length) {
          const tagIds = broadcast.tags.map((t: { id: number | string } | number | string) =>
            typeof t === 'object' ? t.id : t,
          )
          // Add tags filter to where clause
          ;(whereClause.and as Where[]).push({ tags: { in: tagIds } })
        }

        /**
         * Batch size for processing emails in the send broadcasts task.
         * Configurable via pluginConfig.broadcastsBatchSize, defaults to 100.
         */
        const BATCH_SIZE = pluginConfig.broadcastsBatchSize || 100

        // Fetch a batch of contacts using cursor-based pagination (no offset needed)
        const { docs: contacts } = await req.payload.find({
          collection: 'contacts',
          limit: BATCH_SIZE,
          sort: 'id', // Ensure consistent ordering for cursor pagination
          where: whereClause,
        })

        if (contacts.length === 0) {
          req.payload.logger.info(
            `No more contacts to process for broadcast ID: ${broadcast.id}. Marking as sent.`,
          )
          // Update broadcast status to 'sent' when all contacts have been processed
          await req.payload.update({
            id: parsedBroadcast.data.id,
            collection: 'broadcasts',
            data: {
              status: 'sent',
            },
          })

          return {
            output: {
              success: true,
            },
          }
        }

        // Queue send-email tasks for each contact in parallel
        await Promise.all(
          contacts.map((contact) =>
            req.payload.jobs.queue({
              input: {
                broadcastId: parsedBroadcast.data.id,
                contactId: contact.id,
              },
              queue: 'send-emails',
              task: 'send-email',
            }),
          ),
        )

        // Update the processed count and cursor position on the broadcast
        const newProcessedCount = parsedBroadcast.data.meta.processedCount + contacts.length
        const lastContact = contacts[contacts.length - 1]
        const lastProcessedContactId =
          typeof lastContact.id === 'number' ? lastContact.id : parseInt(lastContact.id)

        await req.payload.update({
          id: parsedBroadcast.data.id,
          collection: 'broadcasts',
          data: {
            meta: {
              lastProcessedContactId,
              processedCount: newProcessedCount,
            },
          },
        })

        return {
          output: {
            success: true,
          },
        }
      } catch (error) {
        req.payload.logger.error(error, 'Error in Send Broadcast task handler:')
        throw error
      }
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
        cron: pluginConfig.broadcastsTaskSchedule || '* * * * *', // Every minute
        queue: 'send-broadcasts',
      },
    ],
  }

  return config
}
