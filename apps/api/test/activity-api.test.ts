import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import pg from 'pg'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { runMigrations } from '../src/database/migrate.js'
import { anime, animeStudios, studios } from '../src/database/schema.js'
import { AniListClient, AniListError } from '../src/integrations/anilist/client.js'
import { AnimeService } from '../src/services/anime.service.js'

const DATABASE_URL = loadEnv().DATABASE_URL
const TEST_DB = 'animelist_test_activity'
const TEST_URL = new URL(DATABASE_URL)
TEST_URL.pathname = `/${TEST_DB}`

let pool: pg.Pool
let app: Awaited<ReturnType<typeof buildApp>>

function cookie(res: { headers: Record<string, unknown> }): string {
  const setCookie = res.headers['set-cookie']
  const value = Array.isArray(setCookie) ? setCookie[0] : String(setCookie ?? '')
  return value.split(';')[0] ?? ''
}

async function inject(method: string, url: string, opts: { token?: string; body?: unknown } = {}) {
  return app.inject({
    method: method as 'GET',
    url,
    headers: opts.token ? { cookie: opts.token } : {},
    payload: opts.body === undefined ? undefined : (opts.body as object),
  })
}

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
  const db = drizzle(pool)

  const client = {
    query: async () => {
      throw new AniListError('upstream blocked in tests', 503)
    },
  } as unknown as AniListClient

  app = await buildApp({
    env: { ...loadEnv(), NODE_ENV: 'test' },
    pool,
    logger: false,
    animeService: new AnimeService({ client, pool, db }),
  })
  await app.ready()

  await db.insert(anime).values([
    { externalId: 910001, titleRomaji: 'Activity Anime', episodes: 12, format: 'TV', status: 'RELEASING', averageScore: 80, popularity: 100, trending: 50 },
    { externalId: 910002, titleRomaji: 'Reviewable Anime', episodes: 24, format: 'TV', status: 'FINISHED', averageScore: 90, popularity: 200, trending: 100 },
  ])
  const studio = (await db.insert(studios).values({ name: 'Test Studio' }).returning())[0]!
  const act = (await db.select({ id: anime.id }).from(anime).where(eq(anime.externalId, 910001)))[0]!
  await db.insert(animeStudios).values({ animeId: act.id, studioId: studio.id, isMain: true })
})

afterAll(async () => {
  await app.close()
})

describe('user activity feed', () => {
  const validReview = {
    rating: 8,
    title: 'Genuine thoughts',
    content: 'Really enjoying the characters and the world building in this title so far.',
    containsSpoiler: false,
  }
  let token: string

  it('requires auth for protected routes and records LIBRARY_ADDED', async () => {
    const blocked = await inject('GET', '/api/ratings/me')
    expect(blocked.statusCode).toBe(401)

    const reg = await inject('POST', '/api/auth/register', {
      body: { username: 'flowuser2', email: 'flowuser2@example.com', password: 'Str0ng!Pass123' },
    })
    token = cookie(reg)
    const added = await inject('POST', '/api/anime/910001/watchlist', {
      token,
      body: { status: 'WATCHING', currentEpisode: 2 },
    })
    expect(added.statusCode).toBe(201)

    const activity = await inject('GET', '/api/users/flowuser2/activity')
    expect(activity.statusCode).toBe(200)
    expect(activity.json().data.items[0]).toMatchObject({ type: 'LIBRARY_ADDED' })
  })

  it('records STATUS_CHANGED when status moves without completing', async () => {
    await inject('PUT', '/api/anime/910001/watchlist', {
      token,
      body: { status: 'PAUSED', currentEpisode: 2 },
    })
    const activity = await inject('GET', '/api/users/flowuser2/activity')
    expect(activity.json().data.items[0]).toMatchObject({
      type: 'STATUS_CHANGED',
      payload: { status: 'PAUSED' },
    })
  })

  it('records COMPLETED when an anime is marked completed', async () => {
    await inject('PUT', '/api/anime/910001/watchlist', {
      token,
      body: { status: 'COMPLETED', currentEpisode: 12 },
    })
    const activity = await inject('GET', '/api/users/flowuser2/activity')
    expect(activity.json().data.items[0]).toMatchObject({ type: 'COMPLETED' })
  })

  it('records RATED with the score payload', async () => {
    await inject('POST', '/api/anime/910001/rating', { token, body: { score: 8 } })
    await inject('POST', '/api/anime/910001/rating', { token, body: { score: 9 } })
    const activity = await inject('GET', '/api/users/flowuser2/activity')
    expect(activity.json().data.items[0]).toMatchObject({
      type: 'RATED',
      payload: { score: 9 },
    })
    await inject('POST', '/api/anime/910001/rating', { token, body: { score: 9 } })
    const unchanged = await inject('GET', '/api/users/flowuser2/activity')
    expect(unchanged.json().data.items[0].payload.score).toBe(9)
  })

  it('records REVIEWED and lists my reviews', async () => {
    const res = await inject('POST', '/api/anime/910002/reviews', { token, body: validReview })
    expect(res.statusCode).toBe(201)

    const activity = await inject('GET', '/api/users/flowuser2/activity')
    expect(activity.json().data.items[0]).toMatchObject({ type: 'REVIEWED' })
    expect(activity.json().data.items[0].reviewId).toBe(res.json().data.id)

    const mine = await inject('GET', '/api/reviews/me', { token })
    expect(mine.statusCode).toBe(200)
    expect(mine.json().data.items[0]).toMatchObject({
      title: 'Genuine thoughts',
      anime: { id: 910002, title: { romaji: 'Reviewable Anime' } },
    })
  })

  it('lists my ratings with anime info and paginates', async () => {
    const mine = await inject('GET', '/api/ratings/me', { token })
    expect(mine.statusCode).toBe(200)
    expect(mine.json().data.total).toBe(1)
    expect(mine.json().data.items[0]).toMatchObject({
      score: 9,
      anime: { id: 910001, title: { romaji: 'Activity Anime' } },
    })

    const limit = await inject('GET', '/api/ratings/me?limit=0', { token })
    expect(limit.statusCode).toBe(422)
  })

  it('returns 404 activity for an unknown user', async () => {
    const res = await inject('GET', '/api/users/ghost/activity')
    expect(res.statusCode).toBe(200)
    expect(res.json().data.items).toEqual([])
  })

  it('exposes a public recent reviews feed', async () => {
    const res = await inject('GET', '/api/reviews/recent')
    expect(res.statusCode).toBe(200)
    expect(res.json().data.items.length).toBeGreaterThanOrEqual(1)
    expect(res.json().data.items[0]).toMatchObject({
      user: { username: 'flowuser2' },
      anime: { id: 910002 },
    })
  })

  it('lists studios and their anime by slug', async () => {
    const list = await inject('GET', '/api/studios')
    expect(list.statusCode).toBe(200)
    expect(list.json().data[0]).toMatchObject({ name: 'Test Studio', slug: 'test-studio', count: 1 })

    const anime = await inject('GET', '/api/studios/test-studio')
    expect(anime.statusCode).toBe(200)
    expect(anime.json().data.items[0]).toMatchObject({ id: 910001, studios: ['Test Studio'] })

    const missing = await inject('GET', '/api/studios/does-not-exist')
    expect(missing.json().data.items).toEqual([])
  })
})