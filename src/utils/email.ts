/**
 * Formats an email address with an optional display name according to RFC 5322.
 *
 * @param fromName - The display name to show (e.g., "John Doe")
 * @param fromAddress - The actual email address (e.g., "john@example.com")
 * @returns Formatted email string. If fromName is provided: `"John Doe" <john@example.com>`
 *          Otherwise just returns the email address.
 *
 * @example
 * ```typescript
 * formatFromAddress("Acme Corp", "hello@acme.com")
 * // Returns: '"Acme Corp" <hello@acme.com>'
 *
 * formatFromAddress("", "hello@acme.com")
 * // Returns: 'hello@acme.com'
 * ```
 */
export function formatFromAddress(fromName: string, fromAddress: string): string {
  return fromName ? `"${fromName}" <${fromAddress}>` : fromAddress
}

/**
 * Validates if a string is a properly formatted email address.
 *
 * Uses a permissive regex that catches most invalid formats while allowing
 * valid edge cases like plus-addressing (user+tag@domain.com).
 *
 * @param email - The string to validate
 * @returns `true` if the string appears to be a valid email format
 *
 * @example
 * ```typescript
 * isValidEmail("user@example.com")     // true
 * isValidEmail("user+tag@example.com") // true
 * isValidEmail("invalid")              // false
 * isValidEmail("missing@domain")       // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)
}
