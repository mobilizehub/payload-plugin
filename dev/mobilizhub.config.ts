import { mobilizehubPlugin } from 'payload-plugin'

import { CONSTS } from './consts.js'
import { renderEmailTemplate } from './helpers/renderEmailTemplate.js'

export const mobilizehub = mobilizehubPlugin({
  broadcastConfig: {
    batchSize: 10,
    taskSchedule: '* * * * *', // every minute
  },
  email: () => {
    return {
      name: 'test-email-adapter',
      defaultFromAddress: CONSTS.defaultFromAddress,
      defaultFromName: CONSTS.defaultFromName,
      render: renderEmailTemplate,
      sendEmail: async (opts) => {
        console.log('Sending email with test-email-adapter', opts)
        return Promise.resolve()
      },
    }
  },
  pagesOverrides: {
    blocks: ({ defaultBlocks }) => [
      ...defaultBlocks,
      {
        slug: 'hero',
        fields: [
          {
            name: 'headline',
            type: 'text',
            label: 'Headline',
          },
        ],
        interfaceName: 'HeroBlock',
      },
    ],
  },
})
