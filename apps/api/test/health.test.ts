import { afterEach, describe, expect, it } from 'vitest'
import type { Pool } from 'pg'
import { buildApp } from '../src/app.js'

const openApps: Awaited<ReturnType<typeof buildApp>>[] = []

function fakePool(query: () => Promise<unknown>): Pool {
  return { query, end: async () => {} } as unknown as Pool
}

afterEach(async () => {
  const apps = openApps.splice(0)
  await Promise.all(apps.map((app) => app.close()))
})

describe('GET /api/health', () => {
  it('returns ok when the database is reachable', async () => {
    const app = await buildApp({
      env: {
        NODE_ENV: 'test',
        PORT: 4000,
        DATABASE_URL: 'postgres://test',
        ANILIST_API_URL: 'https://graphql.anilist.co',
        JWT_SECRET: 'test-secret-with-enough-length',
        FRONTEND_URL: 'http://localhost:3000',
        SMTP_FROM: 'Ranime <noreply@ranime.app>',
      },
      pool: fakePool(async () => ({ rows: [{ '?column?': 1 }] })),
      logger: false,
    })
    openApps.push(app)

    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: {
        status: 'ok',
        service: 'animelist-api',
        database: 'up',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      },
    })
  })

  it('returns 503 when the database is unreachable', async () => {
    const app = await buildApp({
      env: {
        NODE_ENV: 'test',
        PORT: 4000,
        DATABASE_URL: 'postgres://test',
        ANILIST_API_URL: 'https://graphql.anilist.co',
        JWT_SECRET: 'test-secret-with-enough-length',
        FRONTEND_URL: 'http://localhost:3000',
        SMTP_FROM: 'Ranime <noreply@ranime.app>',
      },
      pool: fakePool(async () => {
        throw new Error('connection refused')
      }),
      logger: false,
    })
    openApps.push(app)

    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(503)
    expect(response.json().data).toEqual({
      status: 'degraded',
      service: 'animelist-api',
      database: 'down',
      uptime: expect.any(Number),
      timestamp: expect.any(String),
    })
  })
})

describe('unknown routes', () => {
  it('returns the standard error envelope with 404', async () => {
    const app = await buildApp({
      env: {
        NODE_ENV: 'test',
        PORT: 4000,
        DATABASE_URL: 'postgres://test',
        ANILIST_API_URL: 'https://graphql.anilist.co',
        JWT_SECRET: 'test-secret-with-enough-length',
        FRONTEND_URL: 'http://localhost:3000',
        SMTP_FROM: 'Ranime <noreply@ranime.app>',
      },
      pool: fakePool(async () => ({ rows: [] })),
      logger: false,
    })
    openApps.push(app)

    const response = await app.inject({ method: 'GET', url: '/api/does-not-exist' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found'),
      },
    })
  })
})
