import { mobilizehubPlugin } from 'payload-plugin'
import { resendAdapter } from 'payload-plugin/adapters'

import { CONSTS } from './consts.js'
import { renderEmailTemplate } from './helpers/renderEmailTemplate.js'

export const mobilizehub = mobilizehubPlugin({
  broadcastConfig: {
    batchSize: 10,
    taskSchedule: '* * * * *', // every minute
  },
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY!,
    defaultFromAddress: CONSTS.defaultFromAddress!,
    defaultFromName: CONSTS.defaultFromName!,
    render: renderEmailTemplate,
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
  }),
})
