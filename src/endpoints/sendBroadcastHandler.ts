import type { PayloadHandler, Where } from 'payload'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'

export const sendBroadcastHandler = (): PayloadHandler => {
  return async (req) => {
    req.payload.logger.info('Send Broadcast endpoint called')

    if (!req.json) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'No JSON body provided', 400)
    }

    if (!req.user) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    try {
      const body = await req.json()
      const broadcastId = body.broadcastId

      if (!broadcastId) {
        req.payload.logger.error('Invalid or missing broadcastId')
        return errorResponse(ErrorCodes.BAD_REQUEST, 'broadcastId is required', 400)
      }

      // Validate that broadcast exists and is in draft status
      const broadcast = await req.payload.findByID({
        id: broadcastId,
        collection: 'broadcasts',
      })

      if (!broadcast) {
        req.payload.logger.error(`Broadcast ${broadcastId} not found`)
        return errorResponse(ErrorCodes.BROADCAST_NOT_FOUND, 'Broadcast not found', 404)
      }

      if (broadcast.status !== 'draft') {
        req.payload.logger.error(
          `Broadcast ${broadcastId} is not in draft status (current: ${broadcast.status})`,
        )
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Broadcast must be in draft status to send',
          400,
        )
      }

      const whereClause: Where = {
        emailOptIn: { equals: true },
      }

      /**
       * If the broadcast is targeted by tags, add a tags filter to the where clause
       */
      if (broadcast.to === 'tags' && broadcast.tags?.length) {
        const tagIds = broadcast.tags.map((t: { id: number | string } | number | string) =>
          typeof t === 'object' ? t.id : t,
        )
        whereClause.tags = { in: tagIds }
      }

      const contactsCount = await req.payload.db.count({
        collection: 'contacts',
        where: whereClause,
      })

      await req.payload.update({
        id: broadcastId,
        collection: 'broadcasts',
        data: {
          meta: {
            contactsCount: contactsCount.totalDocs,
            processedCount: 0,
          },
          status: 'sending',
        },
      })

      req.payload.logger.info(`Broadcast ${broadcastId} queued for sending`)

      return successResponse(
        {
          message: 'Broadcast queued for sending',
        },
        200,
      )
    } catch (err) {
      req.payload.logger.error(err, 'Error occurred while queueing broadcast')
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error queueing broadcast', 500)
    }
  }
}
