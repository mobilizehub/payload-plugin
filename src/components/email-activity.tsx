import React from 'react'

interface EmailEvent {
  id?: string
  timestamp: string
  type:
    | 'bounced'
    | 'canceled'
    | 'clicked'
    | 'complained'
    | 'delivered'
    | 'delivery_delayed'
    | 'failed'
    | 'opened'
    | 'queued'
    | 'sent'
}

function getIconForEventType(type: EmailEvent['type']): React.ReactNode {
  switch (type) {
    case 'bounced':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11.1 7.1a16.55 16.55 0 0 1 10.9 4" />
          <path d="M12 12a12.6 12.6 0 0 1-8.7 5" />
          <path d="M16.8 13.6a16.55 16.55 0 0 1-9 7.5" />
          <path d="M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10" />
          <path d="M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
    case 'canceled':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" x2="9" y1="9" y2="15" />
          <line x1="9" x2="15" y1="9" y2="15" />
        </svg>
      )
    case 'clicked':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
        </svg>
      )
    case 'complained':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      )
    case 'delivered':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
          <polyline points="15,9 18,9 18,11" />
          <path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2" />
          <line x1="6" x2="7" y1="10" y2="10" />
        </svg>
      )
    case 'delivery_delayed':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 6v6l4 2" />
          <path d="M20 12v5" />
          <path d="M20 21h.01" />
          <path d="M21.25 8.2A10 10 0 1 0 16 21.16" />
        </svg>
      )
    case 'failed':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      )
    case 'opened':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
          <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
        </svg>
      )
    case 'queued':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 5h.01" />
          <path d="M3 12h.01" />
          <path d="M3 19h.01" />
          <path d="M8 5h13" />
          <path d="M8 12h13" />
          <path d="M8 19h13" />
        </svg>
      )
    case 'sent':
      return (
        <svg
          fill="none"
          height="14"
          stroke="var(--theme-elevation-500)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" />
          <path d="M6 12h16" />
        </svg>
      )
    default:
      return null
  }
}

export const EmailActivityField = ({ data }: { data: Record<string, unknown> }) => {
  const activity = data.activity as EmailEvent[] | undefined

  return (
    <div style={{ paddingTop: '1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p>Email Events</p>
      </div>
      {(!activity || activity.length === 0) && (
        <div>
          <p style={{ color: 'var(--theme-text-secondary-color)', fontSize: '12px' }}>
            No email events recorded.
          </p>
        </div>
      )}
      {activity?.map((event, index) => (
        <div
          key={event.id ?? index}
          style={{ alignItems: 'flex-start', display: 'flex', position: 'relative' }}
        >
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              marginRight: '16px',
            }}
          >
            <div
              style={{
                alignItems: 'center',
                border: '1px solid var(--theme-border-color)',
                borderRadius: 'var(--style-radius-m)',
                display: 'flex',
                fontSize: '10px',
                height: '34px',
                justifyContent: 'center',
                width: '34px',
                zIndex: 1,
              }}
            >
              {getIconForEventType(event.type)}
            </div>
            {index < activity.length - 1 && (
              <div
                style={{
                  backgroundColor: 'var(--theme-border-color)',
                  height: '40px',
                  width: '1px',
                }}
              />
            )}
          </div>
          <div style={{ marginTop: '-2px', paddingBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>
              {event.type.replace('_', ' ')}
            </p>
            <p style={{ color: 'var(--theme-text-secondary-color)', fontSize: '12px' }}>
              {new Date(event.timestamp).toLocaleString('en-US', {
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
