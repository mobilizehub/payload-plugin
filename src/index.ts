import type { Config } from 'payload'

export type MobilizehubPluginConfig = {
  disabled?: boolean
}

export const mobilizehubPlugin =
  (pluginOptions: MobilizehubPluginConfig) =>
  (config: Config): Config => {
    if (!config.collections) {
      config.collections = []
    }

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
