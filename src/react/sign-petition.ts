const apiUrl = '/api/petitions.createSignature'

/**
 * Response type from the petition signature API.
 */
type PetitionSignatureResponse = {
  data?: {
    confirmation: {
      message?: unknown
      redirect?: string
      type: 'message' | 'redirect'
    }
    signatureId: number | string
  }
  error?: {
    code: string
    message: string
  }
  success: boolean
}

/**
 * Options for handling petition signature responses.
 */
type SignPetitionOptions = {
  /**
   * Called when the petition returns a message confirmation.
   * @param message - The confirmation message (may be a RichText object)
   */
  onMessage?: (message: unknown) => void
  /**
   * Called when the petition should redirect after signing.
   * @param redirect - The URL to redirect to
   */
  onRedirect?: (redirect: string) => void
}

/**
 * Signs a petition via the backend API.
 *
 * @param args - Petition signature arguments
 * @param args.petitionId - The ID of the petition to sign
 * @param args.data - The signature data (contact info)
 * @param args.opts - Optional callbacks for handling the response
 * @returns The signature data including confirmation and signatureId
 * @throws Error if the signature fails
 *
 * @example
 * ```tsx
 * const handleSign = async (formData: Record<string, unknown>) => {
 *   try {
 *     const result = await signPetition({
 *       petitionId: '1',
 *       data: formData,
 *       opts: {
 *         onRedirect: (url) => router.push(url),
 *         onMessage: (message) => setConfirmation(message),
 *       },
 *     })
 *     console.log('Signature ID:', result.signatureId)
 *   } catch (error) {
 *     console.error('Petition signature failed:', error)
 *   }
 * }
 * ```
 */
export async function signPetition(args: {
  data: Record<string, unknown>
  opts?: SignPetitionOptions
  petitionId: number | string
}) {
  const response = await fetch(apiUrl, {
    body: JSON.stringify({ data: args.data, petitionId: args.petitionId }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const result: PetitionSignatureResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error?.message || 'Signature failed')
  }

  if (result.data?.confirmation.type === 'redirect' && result.data.confirmation.redirect) {
    args.opts?.onRedirect?.(result.data.confirmation.redirect)
  }

  if (result.data?.confirmation.type === 'message') {
    args.opts?.onMessage?.(result.data.confirmation.message)
  }

  return result.data
}
