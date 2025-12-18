/**
 * Standard API success response format
 * @template T - Type of the data payload
 */
export type ApiSuccessResponse<T = unknown> = {
  data?: T
  success: true
}

/**
 * Standard API error response format
 */
export type ApiErrorResponse = {
  error: {
    /** Error code constant (e.g., 'BAD_REQUEST', 'UNAUTHORIZED') */
    code: string
    /** Human-readable error message */
    message: string
  }
  success: false
}

/**
 * Union type for all API responses
 * @template T - Type of the data payload for success responses
 */
export type ApiResponse<T = unknown> = ApiErrorResponse | ApiSuccessResponse<T>

/**
 * Create a standardized success response
 *
 * @template T - Type of the response data
 * @param data - Optional data payload to include in the response
 * @param status - HTTP status code (default: 200)
 * @returns Response object with JSON body
 *
 * @example
 * ```typescript
 * return successResponse({ message: 'Email sent successfully' }, 200)
 * // Returns: { success: true, data: { message: 'Email sent successfully' } }
 * ```
 */
export function successResponse<T>(data?: T, status = 200): Response {
  return Response.json({ data, success: true }, { status })
}

/**
 * Create a standardized error response
 *
 * @param code - Error code from ErrorCodes constant
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 400)
 * @returns Response object with JSON error body
 *
 * @example
 * ```typescript
 * return errorResponse(ErrorCodes.UNAUTHORIZED, 'You must be logged in', 401)
 * // Returns: { success: false, error: { code: 'UNAUTHORIZED', message: '...' } }
 * ```
 */
export function errorResponse(code: string, message: string, status = 400): Response {
  return Response.json({ error: { code, message }, success: false }, { status })
}

/**
 * Standard error codes used across the MobilizeHub plugin API
 */
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  BROADCAST_INVALID_STATUS: 'BROADCAST_INVALID_STATUS',
  BROADCAST_NOT_FOUND: 'BROADCAST_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const
