import type { Payload, PayloadHandler, Where } from 'payload'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'

type SendBroadcastBody = {
  broadcastId?: unknown
}

type Broadcast = {
  id: number | string
  status?: string
  tags?: Array<{ id: number | string } | number | string>
  to?: string
}

/**
 * Validates the request body contains a valid broadcastId.
 */
function validateRequestBody(
  body: SendBroadcastBody,
): { broadcastId: number | string; success: true } | { error: string; success: false } {
  if (!body.broadcastId) {
    return { error: 'broadcastId is required', success: false }
  }
  return { broadcastId: body.broadcastId as number | string, success: true }
}

/**
 * Fetches a broadcast by ID.
 * Returns null if the broadcast doesn't exist.
 */
async function findBroadcastById(
  payload: Payload,
  broadcastId: number | string,
): Promise<Broadcast | null> {
  try {
    const broadcast = await payload.findByID({
      id: broadcastId,
      collection: 'broadcasts',
    })
    return broadcast as Broadcast | null
  } catch {
    return null
  }
}

/**
 * Builds the where clause for counting eligible contacts.
 * Adds tag filtering if the broadcast targets specific tags.
 */
function buildContactsWhereClause(broadcast: Broadcast): Where {
  const whereClause: Where = {
    emailOptIn: { equals: true },
  }

  if (broadcast.to === 'tags' && Array.isArray(broadcast.tags) && broadcast.tags.length > 0) {
    const tagIds = broadcast.tags.map((t) => (typeof t === 'object' ? t.id : t))
    whereClause.tags = { in: tagIds }
  }

  return whereClause
}

/**
 * Creates the send-broadcast endpoint handler.
 *
 * Initiates sending a broadcast by validating the broadcast is in draft status,
 * counting eligible contacts, and updating the status to 'sending'. The actual
 * email delivery is handled by the send-broadcasts scheduled task.
 */
export const sendBroadcastHandler = (): PayloadHandler => {
  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    if (!req.user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    try {
      const body = (await req.json()) as SendBroadcastBody

      const validation = validateRequestBody(body)
      if (!validation.success) {
        logger.error(validation.error)
        return errorResponse(ErrorCodes.BAD_REQUEST, validation.error, 400)
      }

      const { broadcastId } = validation

      const broadcast = await findBroadcastById(payload, broadcastId)

      if (!broadcast) {
        logger.error(`Broadcast ${broadcastId} not found`)
        return errorResponse(ErrorCodes.BROADCAST_NOT_FOUND, 'Broadcast not found', 404)
      }

      if (broadcast.status !== 'draft') {
        logger.error(
          `Broadcast ${broadcastId} is not in draft status (current: ${broadcast.status})`,
        )
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Broadcast must be in draft status to send',
          400,
        )
      }

      const whereClause = buildContactsWhereClause(broadcast)

      const contactsCount = await payload.db.count({
        collection: 'contacts',
        where: whereClause,
      })

      await payload.update({
        id: broadcastId,
        collection: 'broadcasts',
        data: {
          meta: {
            contactsCount: contactsCount.totalDocs,
            lastProcessedContactId: 0,
            processedCount: 0,
          },
          status: 'sending',
        },
      })

      logger.info(`Broadcast ${broadcastId} queued for sending`)

      return successResponse({ message: 'Broadcast queued for sending' }, 200)
    } catch (err) {
      logger.error(err, 'Error occurred while queueing broadcast')
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error queueing broadcast', 500)
    }
  }
}
