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

      logger.info('Email webhook processed successfully')

      return successResponse(result?.body ?? { received: true }, result?.status ?? 200)
    } catch (error) {
      logger.error(error as Error, 'Email webhook processing failed')

      // Return 200 to prevent retry storms from providers
      // Log the error but acknowledge receipt
      return successResponse({ processed: false, received: true }, 200)
    }
  }
}
