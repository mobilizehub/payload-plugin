import crypto from 'crypto'

const UNSUBSCRIBE_TOKEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

const HMAC_ALGORITHM = 'sha256'

const TOKEN_ENCODING = 'base64url'

type UnsubscribeToken = {
  timestamp: number
  tokenId: string
}

/**
 * Creates a secure unsubscribe token for the given token ID.
 *
 * ## Token Format
 * The token consists of two parts separated by a dot:
 * - Base64URL-encoded JSON payload containing tokenId and timestamp
 * - HMAC-SHA256 signature of the payload
 *
 * ## Expiration
 * Tokens expire after 30 days from creation
 *
 * ## Security Considerations
 * - Tokens are signed with HMAC-SHA256 using PAYLOAD_SECRET
 * - Verification uses timing-safe comparison to prevent timing attacks
 * - Tokens cannot be forged without knowing PAYLOAD_SECRET
 *
 * @param args - Object containing tokenId
 * @param args.tokenId - Unique identifier for the unsubscribe token
 * @returns Base64URL-encoded token string in format: `{payload}.{signature}`
 * @throws Error if PAYLOAD_SECRET environment variable is not defined
 *
 * @example
 * ```typescript
 * const token = generateUnsubscribeToken({ tokenId: 'uuid-1234' })
 * // Returns: 'eyJ0b2tlbklkIjoidXVpZC0xMjM0IiwidGltZXN0YW1wIjoxNzAwMDAwMDAwfQ.abc123...'
 * ```
 */
export function generateUnsubscribeToken(args: { tokenId: string }): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET environment variable is not defined')
  }

  const input: UnsubscribeToken = {
    timestamp: Date.now(),
    tokenId: args.tokenId,
  }

  const inputBase64 = Buffer.from(JSON.stringify(input)).toString(TOKEN_ENCODING)

  const hmac = crypto.createHmac(HMAC_ALGORITHM, secret)
  hmac.update(inputBase64)
  const signature = hmac.digest(TOKEN_ENCODING)

  return `${inputBase64}.${signature}`
}

/**
 * Verifies an unsubscribe token and returns the decoded payload if valid.
 *
 * ## Verification Process
 * 1. Splits token into payload and signature
 * 2. Verifies HMAC signature using timing-safe comparison
 * 3. Decodes and parses the JSON payload
 * 4. Checks if token has expired (30 day limit)
 *
 * ## Security
 * - Uses `crypto.timingSafeEqual()` to prevent timing attacks
 * - Returns null for any invalid or expired token
 * - Catches and handles all errors gracefully
 *
 * @param args - Object containing the token to verify
 * @param args.token - The unsubscribe token to verify
 * @returns Decoded token input with tokenId and timestamp if valid, null otherwise
 * @throws Error if PAYLOAD_SECRET environment variable is not defined
 *
 * @example
 * ```typescript
 * const result = verifyUnsubscribeToken({ token: 'eyJ0b2...' })
 * if (result) {
 *   console.log(`Token ID: ${result.tokenId}, Created: ${new Date(result.timestamp)}`)
 * } else {
 *   console.log('Invalid or expired token')
 * }
 * ```
 */
export function verifyUnsubscribeToken(args: { token: string }): null | UnsubscribeToken {
  try {
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) {
      throw new Error('PAYLOAD_SECRET environment variable is not defined')
    }

    const parts = args.token.split('.')
    if (parts.length !== 2) {
      return null
    }

    const [inputBase64, signature] = parts

    const hmac = crypto.createHmac(HMAC_ALGORITHM, secret)
    hmac.update(inputBase64)
    const expectedSignature = hmac.digest(TOKEN_ENCODING)

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null
    }

    const inputJson = Buffer.from(inputBase64, TOKEN_ENCODING).toString('utf-8')
    const input: UnsubscribeToken = JSON.parse(inputJson)

    if (Date.now() - input.timestamp > UNSUBSCRIBE_TOKEN_EXPIRATION) {
      return null
    }

    return input
  } catch {
    return null
  }
}
