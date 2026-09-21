import type { EmailAdapter, EmailMessage } from '@mobilizehub/payload-plugin'

/**
 * Every message the recording adapter was asked to send, in order.
 *
 * Integration tests read this to assert on mail the plugin sends from inside a
 * collection hook, where the adapter comes from the registered plugin config
 * rather than one the test built.
 */
export const sentEmails: EmailMessage[] = []

/**
 * An email adapter that records messages for test purposes.
 */
export const testEmailAdapter: EmailAdapter = () => ({
  name: 'recording-email-adapter',
  defaultFromAddress: 'dev@mobilizehub.com',
  defaultFromName: 'Dev',
  render: ({ html }) => html,
  sendEmail: (message) => {
    sentEmails.push(message)
    return Promise.resolve({ providerId: `recorded-${sentEmails.length}` })
  },
})
