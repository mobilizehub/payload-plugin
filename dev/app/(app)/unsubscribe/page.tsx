'use client'

import { confirmUnsubscribe } from 'payload-plugin/react'
import React, { useEffect, useState } from 'react'

type Status = 'error' | 'loading' | 'missing-token' | 'success'

type UnsubscribeResponse = {
  data?: { message?: string }
  error?: { code?: string; message?: string }
  success?: boolean
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  margin: '0 auto',
  maxWidth: '600px',
  padding: '40px 30px',
}

export default function UnsubscribePage() {
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')

    if (!token) {
      setStatus('missing-token')
      return
    }

    let cancelled = false

    confirmUnsubscribe({ token })
      .then((result: UnsubscribeResponse) => {
        if (cancelled) {
          return
        }

        if (result?.success) {
          setStatus('success')
          setMessage(result.data?.message ?? 'You have been unsubscribed.')
        } else {
          setStatus('error')
          setMessage(result?.error?.message ?? 'This link is invalid or has expired.')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setMessage('We could not reach the server. Please try again.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') {
    return (
      <div style={cardStyle}>
        <p>Processing your request...</p>
      </div>
    )
  }

  if (status === 'missing-token') {
    return (
      <div style={cardStyle}>
        <h1>Unsubscribe link incomplete</h1>
        <p>This page needs a token. Follow the unsubscribe link from the email directly.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={cardStyle}>
        <h1>Unsubscribe failed</h1>
        <p>{message}</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <h1>Unsubscribed</h1>
      <p>{message}</p>
      <p style={{ color: '#666666', fontSize: '14px' }}>
        You will not receive any more emails from this list.
      </p>
    </div>
  )
}
