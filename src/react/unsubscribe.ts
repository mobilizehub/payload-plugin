const apiUrl = '/api/unsubscribe'

/**
 * Confirms an unsubscribe request by sending the token to the backend.
 */
export async function confirmUnsubscribe({ token }: { token: string }) {
  return fetch(apiUrl, {
    body: JSON.stringify({ token }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  }).then((res) => res.json())
}
