import type { Config } from 'payload'

import type { MobilizehubPluginConfig } from './types/index.js'

import { generateContactsCollection } from './collections/contacts/generateContactsCollection.js'
import { generateTagsCollection } from './collections/tags/generateTagsCollection.js'

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
    )

    if (pluginOptions.disabled) {
      return config
    }

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }
    }

    return config
  }
