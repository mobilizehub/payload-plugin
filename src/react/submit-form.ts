const apiUrl = '/api/forms.createSubmission'

/**
 * Response type from the form submission API.
 */
type FormSubmissionResponse = {
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
 * Options for handling form submission responses.
 */
type SubmitFormOptions = {
  /**
   * Called when the form returns a message confirmation.
   * @param message - The confirmation message (may be a RichText object)
   */
  onMessage?: (message: unknown) => void
  /**
   * Called when the form should redirect after submission.
   * @param redirect - The URL to redirect to
   */
  onRedirect?: (redirect: string) => void
}

/**
 * Submits a form to the backend API.
 *
 * @param args - Form submission arguments
 * @param args.formId - The ID of the form to submit to
 * @param args.data - The form data to submit
 * @param args.opts - Optional callbacks for handling the response
 * @returns The submission data including confirmation and submissionId
 * @throws Error if the submission fails
 *
 * @example
 * ```tsx
 * const handleSubmit = async (formData: Record<string, unknown>) => {
 *   try {
 *     const result = await submitForm({
 *       formId: '1',
 *       data: formData,
 *       opts: {
 *         onRedirect: (url) => router.push(url),
 *         onMessage: (message) => setConfirmation(message),
 *       },
 *     })
 *     console.log('Submission ID:', result.submissionId)
 *   } catch (error) {
 *     console.error('Form submission failed:', error)
 *   }
 * }
 * ```
 */
export async function submitForm(args: {
  data: Record<string, unknown>
  formId: number | string
  opts?: SubmitFormOptions
}) {
  const response = await fetch(apiUrl, {
    body: JSON.stringify({ data: args.data, formId: args.formId }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const result: FormSubmissionResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error?.message || 'Submission failed')
  }

  if (result.data?.confirmation.type === 'redirect' && result.data.confirmation.redirect) {
    args.opts?.onRedirect?.(result.data.confirmation.redirect)
  }

  if (result.data?.confirmation.type === 'message') {
    args.opts?.onMessage?.(result.data.confirmation.message)
  }

  return result.data
}
