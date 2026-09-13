import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'

let cachedApp: FastifyInstance | null = null
let migrationsRan = false

async function ensureMigrations() {
  if (migrationsRan) return
  migrationsRan = true
  try {
    // Run via isolated pool to avoid clobbering the global production pool
    const pg = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    const { migrate } = await import('drizzle-orm/node-postgres/migrator')
    const { loadEnv } = await import('../apps/api/src/config/env.js')
    const { fileURLToPath } = await import('node:url')
    const env = loadEnv()
    const migrationsFolder = fileURLToPath(new URL('../database/migrations', import.meta.url))
    const pool = new pg.default.Pool({
      connectionString: env.DATABASE_URL.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, ''),
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 15000,
      ssl: { rejectUnauthorized: false },
    })
    try {
      await migrate(drizzle(pool), { migrationsFolder })
      // Ensure demo + admin exist in prod (idempotent). Passwords are only hashed when the
      // row is missing: argon2 at boot costs ~1s of CPU per cold instance and would silently
      // revert any password change.
      try {
        const { rows: demoRows } = await pool.query(`SELECT 1 FROM users WHERE email = 'demo@example.local'`)
        if (demoRows.length === 0) {
          const argon2 = await import('argon2')
          await pool.query(
            `INSERT INTO users (username, email, password_hash, role) VALUES ('demo','demo@example.local',$1,'USER') ON CONFLICT (email) DO NOTHING`,
            [await argon2.hash('REDACTED-PASSWORD')],
          )
        }
        const { rows: adminRows } = await pool.query(`SELECT 1 FROM users WHERE email = 'admin@example.local'`)
        if (adminRows.length === 0) {
          const argon2 = await import('argon2')
          await pool.query(
            `INSERT INTO users (username, email, password_hash, role) VALUES ('arrofi','admin@example.local',$1,'ADMIN') ON CONFLICT (email) DO NOTHING`,
            [await argon2.hash('REDACTED-PASSWORD')],
          )
        } else {
          await pool.query(
            `UPDATE users SET role='ADMIN', updated_at=now() WHERE email='admin@example.local' AND role <> 'ADMIN'`,
          )
        }
      } catch (e) {
        console.error('Seed admin/demo failed (non-fatal)', e)
      }
    } finally {
      await pool.end()
    }
  } catch (e) {
    console.error('Migration failed (non-fatal):', e)
  }
}

async function getApp() {
  if (!cachedApp) {
    // Run migrations non-blocking in background or on first init
    ensureMigrations().catch(() => {})
    const { buildApp } = await import('../apps/api/src/app.js')
    const app = await buildApp({ logger: false })
    await app.ready()
    cachedApp = app
  }
  return cachedApp
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp()
    app.server.emit('request', req, res)
  } catch (err: unknown) {
    const error = err as Error | undefined
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: { message: error?.message || 'Server error', stack: error?.stack } }))
  }
}
