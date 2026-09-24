const apiUrl = '/api/letters.createSubmission'

/**
 * Response type from the letter submission API.
 */
type LetterSubmissionResponse = {
  data?: {
    confirmation: {
      message?: unknown
      redirect?: string
      type: 'message' | 'redirect'
    }
    submissionId: number | string
  }
  error?: {
    code: string
    message: string
  }
  success: boolean
}

/**
 * Options for handling letter submission responses.
 */
type SendLetterOptions = {
  /**
   * Called when the letter returns a message confirmation.
   * @param message - The confirmation message (may be a RichText object)
   */
  onMessage?: (message: unknown) => void
  /**
   * Called when the letter should redirect after sending.
   * @param redirect - The URL to redirect to
   */
  onRedirect?: (redirect: string) => void
}

/**
 * Sends a letter to a campaign's target via the backend API.
 *
 * @param args - Letter submission arguments
 * @param args.letterId - The ID of the letter campaign to send
 * @param args.data - The submission data (contact info)
 * @param args.body - The letter body, when the campaign allows editing. Ignored
 * by the backend when it does not.
 * @param args.opts - Optional callbacks for handling the response
 * @returns The submission data including confirmation and submissionId
 * @throws Error if the submission fails
 *
 * @example
 * ```tsx
 * const handleSend = async (formData: Record<string, unknown>) => {
 *   try {
 *     const result = await sendLetter({
 *       letterId: '1',
 *       body: letterBody,
 *       data: formData,
 *       opts: {
 *         onRedirect: (url) => router.push(url),
 *         onMessage: (message) => setConfirmation(message),
 *       },
 *     })
 *     console.log('Submission ID:', result.submissionId)
 *   } catch (error) {
 *     console.error('Letter failed to send:', error)
 *   }
 * }
 * ```
 */
export async function sendLetter(args: {
  body?: string
  data: Record<string, unknown>
  letterId: number | string
  opts?: SendLetterOptions
}) {
  const response = await fetch(apiUrl, {
    body: JSON.stringify({ body: args.body, data: args.data, letterId: args.letterId }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const result: LetterSubmissionResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error?.message || 'Letter failed to send')
  }

  if (result.data?.confirmation.type === 'redirect' && result.data.confirmation.redirect) {
    args.opts?.onRedirect?.(result.data.confirmation.redirect)
  }

  if (result.data?.confirmation.type === 'message') {
    args.opts?.onMessage?.(result.data.confirmation.message)
  }

  return result.data
}
