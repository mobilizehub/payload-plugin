import { mobilizehubPlugin } from '@mobilizehub/payload-plugin'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { renderEmailTemplate } from './helpers/renderEmailTemplate.js'
import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

const buildConfigWithMemoryDB = async () => {
  return buildConfig({
    admin: {
      importMap: {
        baseDir: path.resolve(dirname),
      },
    },
    collections: [
      {
        slug: 'media',
        fields: [],
        upload: {
          staticDir: path.resolve(dirname, 'media'),
        },
      },
    ],
    db: sqliteAdapter({
      client: {
        url: 'file:./payload.db',
      },
    }),
    debug: true,
    editor: lexicalEditor(),
    email: testEmailAdapter,
    jobs: {
      autoRun: [
        {
          cron: '* * * * *',
          queue: 'send-broadcasts',
        },
        {
          cron: '* * * * *',
          queue: 'send-emails',
        },
      ],
    },
    onInit: async (payload) => {
      await seed(payload)
    },
    plugins: [
      mobilizehubPlugin({
        broadcastConfig: {
          batchSize: 10,
          taskSchedule: '* * * * *', // every minute
        },
        email: () => {
          return {
            name: 'test-email-adapter',
            defaultFromAddress: 'dev@payloadcms.com',
            defaultFromName: 'Dev',
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
      }),
    ],
    secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  })
}

export default buildConfigWithMemoryDB()
