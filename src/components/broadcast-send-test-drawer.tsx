'use client'

import { Button, Drawer, toast, useDocumentInfo, useFormModified, useModal } from '@payloadcms/ui'
import React, { useCallback, useState } from 'react'

import { isValidEmail } from '../utils/email.js'

interface TestBroadcastDrawerProps {
  broadcastId?: string
  buttonLabel?: string
}

const apiEndpoint = '/api/send-test-email'

export const SendTestBroadcastDrawer: React.FC<TestBroadcastDrawerProps> = ({
  buttonLabel = 'Test email',
}) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const { id, initialData } = useDocumentInfo()
  const { toggleModal } = useModal()
  const modified = useFormModified()

  const isDraft = initialData?.status === 'draft'

  const drawerSlug = 'test-broadcast-drawer'

  const handleSendTest = useCallback(async () => {
    setError(null)

    if (!email) {
      setError('Please enter an email address')
      return
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(apiEndpoint, {
        body: JSON.stringify({
          broadcastId: id,
          testEmail: email,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setEmail('') // Clear the input
        toast.success('Test broadcast sent successfully')
        toggleModal(drawerSlug)
      } else {
        toast.error('Failed to send test broadcast')
        setError(data.message || 'Failed to send test broadcast')
      }
    } catch {
      toast.error('Failed to send test broadcast')
      setError('An error occurred while sending the test broadcast')
    } finally {
      setIsLoading(false)
    }
  }, [email, id, toggleModal])

  if (!id) {
    return null
  }

  return (
    <>
      <Button disabled={!isDraft || modified} onClick={() => toggleModal(drawerSlug)} size="medium">
        {buttonLabel}
      </Button>

      <Drawer slug={drawerSlug} title="Send Test">
        <form className="form" noValidate onSubmit={handleSendTest}>
          <div className="render-fields">
            {error && (
              <div
                className="field-type"
                style={{
                  backgroundColor: 'var(--theme-error-50)',
                  border: '1px solid var(--theme-error-500)',
                  borderRadius: '4px',
                  color: 'var(--theme-error-900)',
                  marginBottom: 'var(--base-unit)',
                  padding: '0.75rem',
                }}
              >
                {error}
              </div>
            )}

            <div className="field-type text">
              <label className="field-label" htmlFor="field-test-email">
                Email Address
                <span className="required">*</span>
              </label>
              <div className="field-type__wrap">
                <input
                  aria-label="Email address"
                  data-rtl="false"
                  disabled={isLoading}
                  id="field-test-email"
                  name="testEmail"
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                />
              </div>
              <div className="field-description field-description-testEmail">
                A test version of this broadcast will be sent to the email address above. The test
                email will be clearly marked as a test.
              </div>
            </div>
          </div>

          <div className="form-submit">
            <button
              aria-label="Send test broadcast"
              className="btn btn--icon-style-without-border btn--size-medium btn--style-primary"
              disabled={isLoading || !email}
              type="submit"
            >
              <span className="btn__content">
                <span className="btn__label">{isLoading ? 'Sending...' : 'Send Test'}</span>
              </span>
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
