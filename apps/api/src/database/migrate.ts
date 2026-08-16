import { fileURLToPath, pathToFileURL } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { loadEnv } from '../config/env.js'
import { createPool } from './pool.js'

export const migrationsFolder = fileURLToPath(
  new URL('../../../../database/migrations', import.meta.url),
)

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = createPool(databaseUrl)
  try {
    await migrate(drizzle(pool), { migrationsFolder })
  } finally {
    await pool.end()
  }
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  const env = loadEnv()
  await runMigrations(env.DATABASE_URL)
  console.log('Migrations applied.')
}