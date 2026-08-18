import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'drizzle-kit'

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

export default defineConfig({
  schema: './src/database/schema.ts',
  out: '../../database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})