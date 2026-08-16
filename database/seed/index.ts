import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { runSeed, DEMO_USER } from '../../apps/api/src/database/seed.js'

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const url = process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL ?? ''
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}
const result = await runSeed(url)
console.log(`Seed complete. ${result.join(', ')}`)
console.log(`Demo account: ${DEMO_USER.email} / ${DEMO_USER.password}`)