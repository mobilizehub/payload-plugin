import React from 'react'

/**
 * Root layout for the non-admin dev pages.
 *
 * The admin panel has its own root layout under `(payload)`, so this group keeps
 * Payload's global styles out of the public pages.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: '#f4f4f4',
          fontFamily: 'Arial, sans-serif',
          margin: 0,
          padding: '40px 20px',
        }}
      >
        {children}
      </body>
    </html>
  )
}
