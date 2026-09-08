// src/endpoints/emailWebhookHandler.ts
import type { PayloadHandler } from 'payload'

import type { MobilizehubPluginConfig } from '../types/index.js'

import { ErrorCodes, errorResponse, successResponse } from '../utils/api-response.js'

/**
 * Creates the email webhook endpoint handler.
 *
 * Receives webhook events from email providers (e.g., Resend) and delegates
 * processing to the configured email adapter's webhookHandler.
 */
export const emailWebhookHandler = (
  config: Pick<MobilizehubPluginConfig, 'email'>,
): PayloadHandler => {
  return async (req) => {
    const { payload } = req
    const logger = payload.logger

    try {
      const adapter = config.email({ payload })

      if (!adapter.webhookHandler) {
        logger.warn('Email webhook received but no webhookHandler configured')
        return errorResponse(
          ErrorCodes.BAD_REQUEST,
          'Webhook handler not configured for this email adapter',
          501,
        )
      }

      const result = await adapter.webhookHandler(req)

      // Providers redeliver on any non-2xx, so an adapter returning an error
      // status is asking for another attempt at an event it cannot process yet.
      if (result && result.status >= 400) {
        return errorResponse(
          result.code ?? ErrorCodes.INTERNAL_ERROR,
          result.message ?? 'Email webhook could not be processed',
          result.status,
        )
      }

      logger.info('Email webhook processed successfully')

      return successResponse(result?.body ?? { received: true }, result?.status ?? 200)
    } catch (error) {
      logger.error(error as Error, 'Email webhook processing failed')

      // A thrown error means the event itself is unusable - a bad signature, a
      // malformed body - and no number of redeliveries will change that, so it
      // is acknowledged rather than retried. Events that are merely premature
      // return an error status above instead of throwing.
      return successResponse({ processed: false, received: true }, 200)
    }
  }
}
