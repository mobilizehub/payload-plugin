/**
 * Escapes the characters that would otherwise be read as markup.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Converts plain text to HTML.
 *
 * Blank lines separate paragraphs; single newlines become line breaks. Used for
 * letter bodies, which are plain text the whole way from the template field to
 * the contact's textarea to the sent email.
 *
 * @param text - The plain text to convert
 * @returns The text as HTML paragraphs
 *
 * @example
 * ```typescript
 * textToHtml('Dear Joe Smith,\nI write to you\n\nYours sincerely')
 * // Returns: '<p>Dear Joe Smith,<br />I write to you</p><p>Yours sincerely</p>'
 * ```
 */
export function textToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('')
}
