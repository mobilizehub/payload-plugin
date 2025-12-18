'use client'
import { useFormFields } from '@payloadcms/ui'
import React from 'react'

export const EmailPreviewField: React.FC = () => {
  const htmlField = useFormFields(([fields]) => {
    return fields['html']
  })
  const value = htmlField?.value as string

  if (!value) {
    return (
      <div
        className="field-type text"
        style={{
          flex: '1 1 auto',
        }}
      >
        <label className="field-label" htmlFor="email-preview">
          Email Preview <span className="required">*</span>
        </label>
        <div className="field-type__wrap">
          <input id="email-preview" type="hidden" />
          <div
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 'var(--style-radius-s)',
              display: 'block',
              minHeight: '400px',
              width: '100%',
            }}
            title="Email Preview"
          >
            No email content available
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="field-type text"
      style={{
        flex: '1 1 auto',
      }}
    >
      <label className="field-label" htmlFor="email-preview">
        Email Preview <span className="required">*</span>
      </label>
      <div className="field-type__wrap">
        <input id="email-preview" type="hidden" />
        <iframe
          sandbox="allow-same-origin"
          srcDoc={value}
          style={{
            backgroundColor: 'var(--theme-input-bg)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s)',
            display: 'block',
            height: '100vh',
            width: '100%',
          }}
          title="Email Preview"
        />
      </div>
    </div>
  )
}
