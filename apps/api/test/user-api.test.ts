import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { runMigrations } from '../src/database/migrate.js'
import { anime } from '../src/database/schema.js'
import { AniListClient, AniListError } from '../src/integrations/anilist/client.js'
import { AnimeService } from '../src/services/anime.service.js'

const DATABASE_URL = loadEnv().DATABASE_URL
const TEST_DB = 'animelist_test_users'
const TEST_URL = new URL(DATABASE_URL)
TEST_URL.pathname = `/${TEST_DB}`

let pool: pg.Pool
let db: ReturnType<typeof drizzle>
let app: Awaited<ReturnType<typeof buildApp>>

function cookies(res: { headers: Record<string, unknown> }): string {
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
  db = drizzle(pool)

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
    { externalId: 900001, titleRomaji: 'Catalog Anime', episodes: 12, format: 'TV', status: 'FINISHED', averageScore: 80, popularity: 100, trending: 50, description: 'synopsis' },
    { externalId: 900002, titleRomaji: 'Second Anime', episodes: 24, format: 'TV', status: 'FINISHED', averageScore: 90, popularity: 200, trending: 100 },
  ])
})

afterAll(async () => {
  await app.close()
})

describe('auth', () => {
  it('registers a user and sets the session cookie', async () => {
    const res = await inject('POST', '/api/auth/register', {
      body: { username: 'alice', email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.username).toBe('alice')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('rejects duplicate registration', async () => {
    const res = await inject('POST', '/api/auth/register', {
      body: { username: 'alice', email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('CONFLICT')
  })

  it('validates password length', async () => {
    const res = await inject('POST', '/api/auth/register', {
      body: { username: 'bob', email: 'bob@example.com', password: 'short' },
    })
    expect(res.statusCode).toBe(422)
  })

  it('logs in with correct credentials', async () => {
    const res = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.username).toBe('alice')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('rejects wrong password', async () => {
    const res = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'nope-nope' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.message).toBe('Invalid email or password')
  })

  it('returns current user via /auth/me', async () => {
    const login = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'password123' },
    })
    const token = cookies(login)
    const res = await inject('GET', '/api/auth/me', { token })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.username).toBe('alice')

    const anon = await inject('GET', '/api/auth/me')
    expect(anon.json().data).toBeNull()
  })

  it('logs out and clears the session cookie', async () => {
    const login = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'password123' },
    })
    const token = cookies(login)
    const logout = await inject('POST', '/api/auth/logout', { token })
    expect(logout.statusCode).toBe(204)
    const cleared = String(logout.headers['set-cookie'])
    expect(cleared).toMatch(/Max-Age=0|01 Jan 1970/)
  })

  it('blocks authenticated routes without a session', async () => {
    const res = await inject('GET', '/api/library')
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })

  it('returns a public profile with stats', async () => {
    const res = await inject('GET', '/api/users/alice')
    expect(res.statusCode).toBe(200)
    expect(res.json().data.stats.animeCount).toBe(0)
    const missing = await inject('GET', '/api/users/ghost')
    expect(missing.statusCode).toBe(404)
  })
})

describe('watchlist + library', () => {
  let token: string

  it('requires auth then adds to watchlist', async () => {
    const blocked = await inject('POST', '/api/anime/900001/watchlist', {
      body: { status: 'WATCHING', currentEpisode: 3 },
    })
    expect(blocked.statusCode).toBe(401)

    const login = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'password123' },
    })
    token = cookies(login)
    const res = await inject('POST', '/api/anime/900001/watchlist', {
      token,
      body: { status: 'WATCHING', currentEpisode: 3 },
    })
    expect(res.statusCode).toBe(201)
  })

  it('returns the entry with dynamic progress', async () => {
    const res = await inject('GET', '/api/anime/900001/watchlist', { token })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('WATCHING')
    expect(res.json().data.currentEpisode).toBe(3)
    expect(res.json().data.progress).toBe(25)
    const guest = await inject('GET', '/api/anime/900001/watchlist')
    expect(guest.json().data).toBeNull()
  })

  it('updates episode progress via PUT', async () => {
    const res = await inject('PUT', '/api/anime/900001/watchlist', {
      token,
      body: { status: 'WATCHING', currentEpisode: 6 },
    })
    expect(res.statusCode).toBe(200)
    const entry = await inject('GET', '/api/anime/900001/watchlist', { token })
    expect(entry.json().data.progress).toBe(50)
  })

  it('lists library with status counts', async () => {
    await inject('PUT', '/api/anime/900002/watchlist', {
      token,
      body: { status: 'COMPLETED', currentEpisode: 24 },
    })
    const res = await inject('GET', '/api/library?status=COMPLETED', { token })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.items[0].anime.title.romaji).toBe('Second Anime')
    const counts = await inject('GET', '/api/watchlist/status-counts', { token })
    expect(counts.json().data.WATCHING).toBe(1)
    expect(counts.json().data.COMPLETED).toBe(1)
  })

  it('filters library by genre slug', async () => {
    const res = await inject('GET', '/api/library?genre=action', { token })
    expect(res.statusCode).toBe(200)
  })
})

describe('ratings', () => {
  let token: string

  it('creates a rating', async () => {
    const login = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'password123' },
    })
    token = cookies(login)
    const res = await inject('POST', '/api/anime/900001/rating', { token, body: { score: 8.5 } })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.score).toBe(8.5)
  })

  it('updates instead of duplicating', async () => {
    const res = await inject('PUT', '/api/anime/900001/rating', { token, body: { score: 7 } })
    expect(res.json().data.score).toBe(7)

    const other = await inject('POST', '/api/auth/register', {
      body: { username: 'carol', email: 'carol@example.com', password: 'password123' },
    })
    const otherToken = cookies(other)
    await inject('POST', '/api/anime/900001/rating', { token: otherToken, body: { score: 9 } })

    const agg = await inject('GET', '/api/anime/900001/ratings', { token })
    expect(agg.statusCode).toBe(200)
    expect(agg.json().data.average).toBe(8)
    expect(agg.json().data.count).toBe(2)
    expect(agg.json().data.myScore).toBe(7)
    expect(agg.json().data.distribution).toHaveLength(2)
  })

  it('rejects invalid scores', async () => {
    const res = await inject('POST', '/api/anime/900001/rating', { token, body: { score: 10.3 } })
    expect(res.statusCode).toBe(422)
  })

  it('deletes a rating', async () => {
    const res = await inject('DELETE', '/api/anime/900002/rating', { token })
    expect(res.statusCode).toBe(204)
  })
})

describe('reviews', () => {
  let token: string
  let otherToken: string
  let reviewId: string

  const validReview = {
    rating: 8,
    title: 'A solid watch',
    content: 'The animation is fantastic, the pacing is great, and the characters are memorable.',
    containsSpoiler: false,
  }

  it('creates a review', async () => {
    const login = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'password123' },
    })
    token = cookies(login)
    const res = await inject('POST', '/api/anime/900001/reviews', { token, body: validReview })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.user.username).toBe('alice')
    reviewId = res.json().data.id
  })

  it('rejects short content and duplicate reviews', async () => {
    const short = await inject('POST', '/api/anime/900001/reviews', {
      token,
      body: { ...validReview, content: 'too short' },
    })
    expect(short.statusCode).toBe(422)

    const dup = await inject('POST', '/api/anime/900001/reviews', { token, body: validReview })
    expect(dup.statusCode).toBe(409)
  })

  it('hides spoilers from the public list', async () => {
    const reg = await inject('POST', '/api/auth/register', {
      body: { username: 'dave', email: 'dave@example.com', password: 'password123' },
    })
    otherToken = cookies(reg)
    await inject('POST', '/api/anime/900001/reviews', {
      token: otherToken,
      body: { ...validReview, containsSpoiler: true, title: 'Spoiler review' },
    })
    const res = await inject('GET', '/api/anime/900001/reviews')
    expect(res.statusCode).toBe(200)
    expect(res.json().data.items).toHaveLength(2)
    const spoiler = res.json().data.items.find((r: { title: string }) => r.title === 'Spoiler review')
    expect(spoiler.content).toContain('[Spoiler hidden]')
  })

  it('allows editing only the own review', async () => {
    const mine = await inject('GET', '/api/anime/900001/reviews/mine', { token })
    expect(mine.json().data.id).toBe(reviewId)

    const updated = await inject('PUT', `/api/reviews/${reviewId}`, {
      token,
      body: { ...validReview, title: 'Edited title' },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().data.title).toBe('Edited title')

    const stolen = await inject('PUT', `/api/reviews/${reviewId}`, {
      token: otherToken,
      body: { ...validReview, title: 'Hijacked' },
    })
    expect(stolen.statusCode).toBe(403)
  })

  it('deletes own review and 404s after', async () => {
    const res = await inject('DELETE', `/api/reviews/${reviewId}`, { token })
    expect(res.statusCode).toBe(204)
    const gone = await inject('PUT', `/api/reviews/${reviewId}`, { token, body: validReview })
    expect(gone.statusCode).toBe(404)
  })
})

describe('statistics', () => {
  it('reflects real user data', async () => {
    const login = await inject('POST', '/api/auth/login', {
      body: { email: 'alice@example.com', password: 'password123' },
    })
    const token = cookies(login)
    const res = await inject('GET', '/api/statistics', { token })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.totalAnime).toBeGreaterThanOrEqual(2)
    expect(res.json().data.episodesWatched).toBeGreaterThanOrEqual(30)
    expect(res.json().data.statusDistribution.length).toBeGreaterThanOrEqual(2)
    expect(res.json().data.ratingDistribution.length).toBeGreaterThanOrEqual(1)

    const anon = await inject('GET', '/api/statistics')
    expect(anon.statusCode).toBe(401)
  })
})