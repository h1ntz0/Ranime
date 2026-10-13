import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'

// Keep the Fastify app lazy for Vercel cold starts. Database migrations run explicitly before
// release through the direct/session connection, never as a background request side effect.
let cachedApp: FastifyInstance | null = null

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

async function getApp() {
  if (!cachedApp) {
    const { buildApp } = await import('../apps/api/src/app.js')
    const app = await buildApp({ logger: false })
    await app.ready()
    if (process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() && process.env.BOOTSTRAP_ADMIN_PASSWORD) {
      try {
        await ensureBootstrapAdmin(app.pool)
      } catch (error) {
        console.error('Bootstrap admin failed (non-fatal)', error)
      }
    }
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
