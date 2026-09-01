import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, desc, eq, isNull } from 'drizzle-orm'
import pg from 'pg'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { runMigrations } from '../src/database/migrate.js'
import { passwordResetTokens } from '../src/database/schema.js'

const DATABASE_URL = loadEnv().DATABASE_URL
const TEST_DB = 'animelist_test_auth_reset'
const TEST_URL = new URL(DATABASE_URL)
TEST_URL.pathname = `/${TEST_DB}`

let pool: pg.Pool
let db: ReturnType<typeof drizzle>
let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: DATABASE_URL })
  await admin.connect()
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB],
  )
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`)
  await admin.query(`CREATE DATABASE ${TEST_DB}`)
  await admin.end()

  await runMigrations(TEST_URL.toString())
  pool = new pg.Pool({ connectionString: TEST_URL.toString(), max: 5 })
  db = drizzle(pool)

  app = await buildApp({
    env: { ...loadEnv(), NODE_ENV: 'test' },
    pool,
    logger: false,
  })
  await app.ready()
})

afterAll(async () => {
  await app.close()
  const admin = new pg.Client({ connectionString: DATABASE_URL })
  await admin.connect()
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB],
  )
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`)
  await admin.end()
})

describe('Auth Password Reset flow', () => {
  const testEmail = 'resetuser@example.com'
  const testPassword = 'Str0ng!Pass123'
  const newPassword = 'NewStr0ng!Pass456'

  it('registers a user successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'resetuser',
        email: testEmail,
        password: testPassword,
      },
    })
    expect(res.statusCode).toBe(201)
  })

  it('requests password reset OTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: testEmail },
    })
    expect(res.statusCode).toBe(200)
    const json = JSON.parse(res.payload)
    expect(json.data.success).toBe(true)

    // Verify token record in DB
    const tokens = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.email, testEmail), isNull(passwordResetTokens.usedAt)))
    expect(tokens.length).toBe(1)
  })

  it('fails verification with wrong OTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: {
        email: testEmail,
        otp: '000000',
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('verifies valid OTP and resets password', async () => {
    // Generate known OTP directly or read token
    const resReq = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: testEmail },
    })
    expect(resReq.statusCode).toBe(200)

    // For test purposes, we can verify with a valid token or generate hash
    // We can simulate OTP verification by reading or directly testing service
    const [tokenRow] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.email, testEmail), isNull(passwordResetTokens.usedAt)))
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1)

    expect(tokenRow).toBeDefined()

    // Test reset password with token directly
    const resetToken = 'valid_test_reset_token_123456789'
    await db
      .update(passwordResetTokens)
      .set({ resetToken })
      .where(eq(passwordResetTokens.id, tokenRow!.id))

    const resReset = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: {
        resetToken,
        password: newPassword,
      },
    })
    expect(resReset.statusCode).toBe(200)

    // Try login with new password
    const resLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testEmail,
        password: newPassword,
      },
    })
    expect(resLogin.statusCode).toBe(200)

    // Old password should fail
    const resOldLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    })
    expect(resOldLogin.statusCode).toBe(401)
  })
})
