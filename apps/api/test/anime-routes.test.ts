import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import pg from 'pg'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { runMigrations } from '../src/database/migrate.js'
import { AppError } from '../src/lib/errors.js'
import type { AnimeService } from '../src/services/anime.service.js'
import { AniListError } from '../src/integrations/anilist/client.js'

const DATABASE_URL = loadEnv().DATABASE_URL
const TEST_DB = 'animelist_test_routes'
const TEST_URL = new URL(DATABASE_URL)
TEST_URL.pathname = `/${TEST_DB}`

let pool: pg.Pool
let app: ReturnType<typeof buildApp> extends Promise<infer T> ? T : never

const card = {
  id: 1,
  title: { romaji: 'One Piece', english: null, native: null },
  coverImage: 'https://img/x.jpg',
  bannerImage: null,
  format: 'TV',
  status: 'FINISHED',
  episodes: 1085,
  duration: 24,
  season: 'WINTER',
  seasonYear: 2024,
  averageScore: 80,
  popularity: 1000,
  trending: 100,
  startDate: '2024-01-01',
  endDate: null,
  source: 'MANGA',
  country: 'JP',
  genres: ['Action'],
  studios: ['Studio X'],
  nextAiring: null,
}

function paged() {
  return { items: [card], total: 1, page: 1, perPage: 20, hasNextPage: false }
}

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: DATABASE_URL })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`)
  await admin.query(`CREATE DATABASE ${TEST_DB}`)
  await admin.end()
  await runMigrations(TEST_URL.toString())
  pool = new pg.Pool({ connectionString: TEST_URL.toString(), max: 5 })

  const service = {
    list: vi.fn().mockResolvedValue(paged()),
    detail: vi.fn().mockResolvedValue({ ...card, description: 'desc', communityRating: { average: null, count: 0 }, charactersTotal: 0, staffTotal: 0 }),
    characters: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 25, hasNextPage: false }),
    staff: vi.fn().mockResolvedValue([]),
    relations: vi.fn().mockResolvedValue([]),
    recommendations: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 15, hasNextPage: false }),
    genresList: vi.fn().mockResolvedValue([{ id: 1, name: 'Action', slug: 'action' }]),
    airing: vi.fn().mockResolvedValue(paged()),
  } as unknown as AnimeService

  app = await buildApp({
    env: { ...loadEnv(), NODE_ENV: 'test' },
    pool,
    logger: false,
    animeService: service,
  })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('anime routes', () => {
  it('GET /api/anime lists with query params', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/anime?q=naruto&sort=SCORE&page=1&limit=20' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.items).toHaveLength(1)
    expect(body.data.total).toBe(1)
    expect(body.data.page).toBe(1)
  })

  it('rejects invalid pagination', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/anime?limit=500' })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('GET /api/anime/:id returns detail', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/anime/1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.title.romaji).toBe('One Piece')
  })

  it('GET /api/anime/:id/characters|staff|relations|recommendations', async () => {
    for (const path of ['characters', 'staff', 'relations', 'recommendations']) {
      const res = await app.inject({ method: 'GET', url: `/api/anime/1/${path}` })
      expect(res.statusCode).toBe(200)
    }
  })

  it('GET /api/genres lists genres', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/genres' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data[0].slug).toBe('action')

  })

  it('GET /api/genres/:slug finds genre and lists', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/genres/action' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.items[0].id).toBe(1)
  })

  it('GET /api/genres/:slug 404 for unknown genre', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/genres/mecha' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })

  it('GET /api/season validates year and season', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/season?year=2024&season=WINTER' })
    expect(res.statusCode).toBe(200)
    const bad = await app.inject({ method: 'GET', url: '/api/season?year=2024&season=AUTUMN' })
    expect(bad.statusCode).toBe(422)
  })

  it('GET /api/top maps categories to sorts', async () => {
    for (const category of ['top-rated', 'popular', 'trending']) {
      const res = await app.inject({ method: 'GET', url: `/api/top?category=${category}` })
      expect(res.statusCode).toBe(200)
    }
    const bad = await app.inject({ method: 'GET', url: '/api/top?category=watched' })
    expect(bad.statusCode).toBe(422)
  })

  it('GET /api/airing returns list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/airing' })
    expect(res.statusCode).toBe(200)
  })

  it('maps AppError to error contract', async () => {
    ;(app.animeService.detail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new AppError(503, 'UPSTREAM_UNAVAILABLE', 'Anime data is temporarily unavailable. Please try again later.'),
    )
    const res = await app.inject({ method: 'GET', url: '/api/anime/999999' })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.message).toMatch(/temporarily unavailable/)
  })

  it('maps AniListError to 503 friendly error', async () => {
    ;(app.animeService.detail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new AniListError('upstream exploded', 500),
    )
    const res = await app.inject({ method: 'GET', url: '/api/anime/2' })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('UPSTREAM_UNAVAILABLE')
    expect(res.json().error.message).not.toMatch(/exploded/)
  })

  it('returns 404 for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })
})
