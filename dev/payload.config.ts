import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { createContentCollection } from 'payload-plugin/collections'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { mobilizehub } from './mobilizhub.config.js'
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
      createContentCollection({
        slug: 'pages',
        contentFields: [
          {
            name: 'blocks',
            type: 'blocks',
            blocks: [
              {
                slug: 'content',
                fields: [{ name: 'richText', type: 'richText', label: false }],
                interfaceName: 'ContentBlock',
              },
              {
                slug: 'hero',
                fields: [{ name: 'headline', type: 'text', label: 'Headline' }],
                interfaceName: 'HeroBlock',
              },
            ],
            label: 'Blocks',
          },
        ],
      }),
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
    plugins: [mobilizehub],
    secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  })
}

export default buildConfigWithMemoryDB()
