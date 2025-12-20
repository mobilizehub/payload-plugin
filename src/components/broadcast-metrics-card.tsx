import type { Payload } from 'payload'

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100
}

export const MetricsCards = async ({
  data,
  payload,
}: {
  data: { id: number }
  payload: Payload
}) => {
  const broadcastId = data.id

  if (!broadcastId) {
    return null
  }

  const broadcast = await payload.find({
    collection: 'broadcasts',
    limit: 1,
    where: {
      id: {
        equals: broadcastId,
      },
    },
  })

  if (!broadcast.totalDocs) {
    return null
  }

  const contacts = broadcast.docs[0].meta.contactsCount as number

  // Run all count queries in parallel for better performance
  const [
    { totalDocs: emails },
    { totalDocs: delivered },
    { totalDocs: bounced },
    { totalDocs: unsubscribed },
    { totalDocs: complained },
  ] = await Promise.all([
    payload.count({
      collection: 'emails',
      where: {
        broadcast: { equals: broadcastId },
      },
    }),
    payload.count({
      collection: 'emails',
      where: {
        broadcast: { equals: broadcastId },
        status: { equals: 'delivered' },
      },
    }),
    payload.count({
      collection: 'emails',
      where: {
        broadcast: { equals: broadcastId },
        status: { equals: 'bounced' },
      },
    }),
    payload.count({
      collection: 'emails',
      where: {
        broadcast: { equals: broadcastId },
        status: { equals: 'unsubscribed' },
      },
    }),
    payload.count({
      collection: 'emails',
      where: {
        broadcast: { equals: broadcastId },
        status: { equals: 'complained' },
      },
    }),
  ])

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <p>Metrics</p>
      </div>
      <div
        className="metrics-grid"
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        {[
          { name: 'Contacts', value: contacts },
          { name: 'Emails', value: emails },
          { name: 'Delivered', value: delivered },
          { name: 'Bounced', value: bounced },
          { name: 'Unsubscribed', value: unsubscribed },
          { name: 'Complained', value: complained },
        ].map((stat) => (
          <div className="card" key={stat.name}>
            <div>
              <dt className="card__title">{stat.name}</dt>
              <dd
                style={{
                  color: 'var(--theme-elevation-1000)',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  letterSpacing: '-0.025em',
                  lineHeight: '2.5rem',
                  margin: 0,
                }}
              >
                {stat.value.toLocaleString()}
              </dd>
            </div>
            {stat.name !== 'Emails' && stat.name !== 'Contacts' && emails > 0 && (
              <dd className="card__action">{roundToTwo((stat.value / emails) * 100)}%</dd>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
