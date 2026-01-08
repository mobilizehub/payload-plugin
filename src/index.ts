import type { Config, Endpoint, TaskConfig } from 'payload'

import type { MobilizehubPluginConfig } from './types/index.js'

import { generateBroadcastsCollection } from './collections/broadcasts/generateBroadcastsCollection.js'
import { generateContactsCollection } from './collections/contacts/generateContactsCollection.js'
import { generateEmailsCollection } from './collections/emails/generateEmailsCollection.js'
import { generateFormSubmissionsCollection } from './collections/form-submissions/generateFormSubmissionsCollection.js'
import { generateFormsCollection } from './collections/forms/generateFormsCollection.js'
import { generatePagesCollection } from './collections/pages/generatePagesCollection.js'
import { generateTagsCollection } from './collections/tags/generateTagsCollection.js'
import { generateUnsubscribeTokensCollection } from './collections/unsubscribe-tokens/generateUnsubscribeTokens.js'
import { emailWebhookHandler } from './endpoints/emailWebhookHandler.js'
import { sendBroadcastHandler } from './endpoints/sendBroadcastHandler.js'
import { sendTestEmailHandler } from './endpoints/sendTestBroadcastHandler.js'
import { unsubscribeHandler } from './endpoints/unsubscribeHandler.js'
import { createSendBroadcastsTask } from './tasks/sendBroadcastsTask.js'
import { createSendEmailTask } from './tasks/sendEmailTask.js'

export * from './types/index.js'

export const mobilizehubPlugin =
  (pluginOptions: MobilizehubPluginConfig) =>
  (config: Config): Config => {
    if (!config.collections) {
      config.collections = []
    }

    config.collections.push(
      generateTagsCollection(pluginOptions),
      generateContactsCollection(pluginOptions),
      generateBroadcastsCollection(pluginOptions),
      generateEmailsCollection(pluginOptions),
      generatePagesCollection(pluginOptions),
      generateUnsubscribeTokensCollection(),
      generateFormSubmissionsCollection(pluginOptions),
      generateFormsCollection(pluginOptions),
    )

    if (pluginOptions.disabled) {
      return config
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    const endpoints: Endpoint[] = [
      {
        handler: sendBroadcastHandler(),
        method: 'post',
        path: '/send-broadcast',
      },
      {
        handler: sendTestEmailHandler(pluginOptions),
        method: 'post',
        path: '/send-test-email',
      },
      {
        handler: unsubscribeHandler(),
        method: 'post',
        path: '/unsubscribe',
      },
      {
        handler: emailWebhookHandler(pluginOptions),
        method: 'post',
        path: '/webhooks/email',
      },
    ]

    config.endpoints = [...config.endpoints, ...endpoints]

    if (!config.jobs) {
      config.jobs = {
        tasks: [],
      }
    }

    const tasks: TaskConfig[] = [
      createSendBroadcastsTask(pluginOptions),
      createSendEmailTask(pluginOptions),
    ]

    config.jobs.tasks = [...(config.jobs.tasks ?? []), ...tasks]

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }
    }

    return config
  }
