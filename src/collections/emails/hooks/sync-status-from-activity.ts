import type { CollectionBeforeChangeHook } from 'payload'

import type { EmailActivityType, EmailStatus } from '../../../types/index.js'

type ActivityItem = {
  timestamp: string
  type: 'unsubscribed' | EmailActivityType
}

/**
 * Maps activity types to their corresponding email status.
 * Some activity types (like 'opened', 'clicked') don't change the status.
 */
const activityTypeToStatus: Partial<Record<'unsubscribed' | EmailActivityType, EmailStatus>> = {
  bounced: 'bounced',
  complained: 'complained',
  delivered: 'delivered',
  sent: 'sent',
  unsubscribed: 'unsubscribed',
}

/**
 * Defines the priority of statuses for determining the "most significant" status.
 * Higher index = higher priority (terminal/negative states take precedence).
 */
const statusPriority: EmailStatus[] = [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'unsubscribed',
]

function getStatusPriority(status: EmailStatus): number {
  const index = statusPriority.indexOf(status)
  return index === -1 ? 0 : index
}

/**
 * Determines the email status based on activity history.
 * Uses the activity with the highest priority status.
 */
function getStatusFromActivity(activity: ActivityItem[]): EmailStatus | null {
  if (!activity || activity.length === 0) {
    return null
  }

  let highestPriorityStatus: EmailStatus | null = null
  let highestPriority = -1

  for (const item of activity) {
    const status = activityTypeToStatus[item.type]
    if (status) {
      const priority = getStatusPriority(status)
      if (priority > highestPriority) {
        highestPriority = priority
        highestPriorityStatus = status
      }
    }
  }

  return highestPriorityStatus
}

/**
 * A hook to synchronize the email status field based on activity history before saving.
 */
export const syncStatusFromActivityBeforeChangeHook: CollectionBeforeChangeHook = ({ data }) => {
  const activity = data.activity as ActivityItem[] | undefined

  if (!activity || activity.length === 0) {
    return data
  }

  const derivedStatus = getStatusFromActivity(activity)

  if (derivedStatus && derivedStatus !== data.status) {
    return {
      ...data,
      status: derivedStatus,
    }
  }

  return data
}
