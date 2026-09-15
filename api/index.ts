import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'

// The runtime imports below stay dynamic on purpose: this is the Vercel function entry, and the
// Fastify app graph plus the migrator must only load once a request actually needs them.
let cachedApp: FastifyInstance | null = null
let migrationsRan = false

/**
 * Bootstrap accounts are supplied by the environment. Nothing is hardcoded here: this file is
 * committed, so a literal password would be a published production credential. When the two
 * vars are absent (the default) no account is created or promoted.
 */
async function ensureBootstrapAdmin(pool: Pool) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!email || !password) return

  const { rows } = await pool.query(`SELECT role FROM users WHERE email = $1`, [email])
  if (rows.length === 0) {
    const argon2 = await import('argon2')
    await pool.query(
      `INSERT INTO users (username, email, password_hash, role) VALUES ($1,$2,$3,'ADMIN') ON CONFLICT (email) DO NOTHING`,
      [email.split('@')[0]?.slice(0, 32) || 'admin', email, await argon2.hash(password)],
    )
    return
  }
  await pool.query(
    `UPDATE users SET role='ADMIN', updated_at=now() WHERE email=$1 AND role <> 'ADMIN'`,
    [email],
  )
}

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
      connectionString: env.DATABASE_URL.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(
        /[?&]$/,
        '',
      ),
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 15000,
      ssl: { rejectUnauthorized: false },
    })
    try {
      await migrate(drizzle(pool), { migrationsFolder })
      try {
        await ensureBootstrapAdmin(pool)
      } catch (e) {
        console.error('Bootstrap admin failed (non-fatal)', e)
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
    // Log the detail server-side only. Returning it would hand absolute paths, dependency
    // internals and driver error text (including query fragments) to any anonymous caller.
    console.error('Serverless bootstrap error:', err)
    if (res.headersSent) return
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }))
  }
}
