import path from 'path'
import { loadEnv } from 'payload/node'
import { fileURLToPath } from 'url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default defineConfig(() => {
  loadEnv(path.resolve(dirname, './dev'))

  // Integration tests push their schema and keep the rows they create, so they
  // run against their own file rather than the database a running dev server has
  // open, whatever dev/.env sets DATABASE_URI to.
  process.env.DATABASE_URI = 'file:./payload-test.db'

  return {
    plugins: [
      tsconfigPaths({
        ignoreConfigErrors: true,
      }),
    ],
    test: {
      environment: 'node',
      // Playwright owns the e2e specs - it matches them with its own testMatch.
      // Vitest's default include picks them up too, and calling Playwright's
      // test() outside its runner throws at collection time.
      exclude: [...configDefaults.exclude, '**/e2e.spec.{ts,js}'],
      hookTimeout: 30_000,
      testTimeout: 30_000,
    },
  }
})
