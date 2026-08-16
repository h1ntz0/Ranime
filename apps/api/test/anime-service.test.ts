import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { loadEnv } from '../src/config/env.js'
import { runMigrations } from '../src/database/migrate.js'
import { AniListClient, AniListError } from '../src/integrations/anilist/client.js'
import { AnimeService } from '../src/services/anime.service.js'
import { anime, genres } from '../src/database/schema.js'

const DATABASE_URL = loadEnv().DATABASE_URL
const TEST_DB = 'animelist_test_m3'
const TEST_URL = new URL(DATABASE_URL)
TEST_URL.pathname = `/${TEST_DB}`
const TEST_URL_STRING = TEST_URL.toString()

let pool: pg.Pool
let db: ReturnType<typeof drizzle>

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
  await runMigrations(TEST_URL_STRING)
  pool = new pg.Pool({ connectionString: TEST_URL_STRING, max: 5 })
  db = drizzle(pool)
})

afterAll(async () => {
  await pool.end()
  const admin = new pg.Client({ connectionString: DATABASE_URL })
  await admin.connect()
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB],
  )
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`)
  await admin.end()
})

function fakeMedia(id: number, title: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: { romaji: title, english: null, native: null },
    coverImage: { extraLarge: `https://img/c${id}.jpg`, large: `https://img/c${id}.jpg` },
    bannerImage: null,
    startDate: { year: 2024, month: 1, day: 1 },
    endDate: { year: 2024, month: 3, day: 31 },
    season: 'WINTER',
    seasonYear: 2024,
    format: 'TV',
    status: 'FINISHED',
    episodes: 12,
    duration: 24,
    averageScore: 80,
    popularity: 1000 + id,
    trending: 500 - id,
    source: 'MANGA',
    countryOfOrigin: 'JP',
    genres: ['Action', 'Fantasy'],
    studios: { nodes: [{ id: 1, name: 'Studio X' }] },
    nextAiringEpisode: null,
    ...extra,
  }
}

const clientMock = { query: vi.fn() } as unknown as AniListClient

function makeService(ttl?: { detail?: number }) {
  return new AnimeService({
    client: clientMock,
    pool,
    db,
    ttl: { search: 5000, trending: 5000, top: 5000, seasonal: 5000, airing: 5000, recs: 5000, detail: ttl?.detail ?? 60_000 },
  })
}

describe('AnimeService', () => {
  it('fetches a page, persists it locally and caches the result', async () => {
    clientMock.query = vi.fn().mockResolvedValue({
      Page: {
        pageInfo: { total: 1, perPage: 20, currentPage: 1, lastPage: 1, hasNextPage: false },
        media: [fakeMedia(900001, 'Cached Anime')],
      },
    })
    const service = makeService()

    const first = await service.list({ sort: 'TRENDING', page: 1, limit: 20 })
    const second = await service.list({ sort: 'TRENDING', page: 1, limit: 20 })

    expect(first.items).toHaveLength(1)
    expect(first.items[0]!.title.romaji).toBe('Cached Anime')
    expect(first.items[0]!.genres).toEqual(['Action', 'Fantasy'])
    expect(second).toEqual(first)
    expect(clientMock.query).toHaveBeenCalledTimes(1)

    const persisted = await db.select().from(anime).where(eq(anime.externalId, 900001))
    expect(persisted).toHaveLength(1)
    expect(persisted[0]!.titleRomaji).toBe('Cached Anime')
    const genreRows = await db.select().from(genres)
    expect(genreRows.map((g) => g.slug)).toContain('action')
  })

  it('falls back to local data when the upstream fails (non-search lists)', async () => {
    clientMock.query = vi.fn().mockRejectedValue(new AniListError('boom', 503))
    const service = makeService()

    const result = await service.list({ sort: 'TRENDING', page: 1, limit: 20 })

    expect(result.items.length).toBeGreaterThanOrEqual(1)
    expect(result.items[0]!.id).toBe(900001)
  })

  it('rethrows when search fails upstream and no local fallback is possible', async () => {
    clientMock.query = vi.fn().mockRejectedValue(new AniListError('boom', 503))
    const service = makeService()

    await expect(service.list({ q: 'naruto', page: 1, limit: 20 })).rejects.toThrow(/temporarily unavailable/)
  })

  it('persists detail with characters, staff, relations and serves from cache', async () => {
    clientMock.query = vi.fn().mockResolvedValue({
      Media: {
        ...fakeMedia(900002, 'Detail Anime', { description: 'A detailed description.' }),
        siteUrl: 'https://anilist.co/anime/900002',
        characters: {
          pageInfo: { total: 1, perPage: 25, currentPage: 1, lastPage: 1, hasNextPage: false },
          edges: [
            {
              role: 'MAIN',
              node: { id: 8001, name: { full: 'Hero', native: 'ヒーロー' }, image: { large: 'https://img/hero.jpg' } },
              voiceActors: [{ id: 7001, name: { full: 'VA San', native: null }, image: { large: null } }],
            },
          ],
        },
        staff: {
          pageInfo: { total: 1 },
          edges: [{ role: 'Director', node: { id: 7002, name: { full: 'Dir San', native: null }, image: { large: null } } }],
        },
        relations: {
          edges: [
            {
              relationType: 'SEQUEL',
              node: { id: 900003, title: { romaji: 'Detail Anime 2', english: null, native: null }, format: 'TV', status: 'FINISHED', episodes: 12, averageScore: 85, coverImage: { large: 'https://img/c.jpg' } },
            },
          ],
        },
        recommendations: {
          pageInfo: { total: 0 },
          nodes: [],
        },
      },
    })
    const service = makeService()

    const first = await service.detail(900002)
    expect(first.title.romaji).toBe('Detail Anime')
    expect(first.description).toBe('A detailed description.')
    expect(first.charactersTotal).toBe(1)
    expect(first.communityRating.count).toBe(0)

    clientMock.query = vi.fn()
    const second = await service.detail(900002)
    expect(second.id).toBe(900002)
    expect(clientMock.query).not.toHaveBeenCalled()

    const chars = await service.characters(900002)
    expect(chars.items[0]!.name).toBe('Hero')
    expect(chars.items[0]!.voiceActor?.name).toBe('VA San')
    expect(chars.items[0]!.voiceActor?.language).toBe('Japanese')

    const staffList = await service.staff(900002)
    expect(staffList[0]!.role).toBe('Director')

    const rels = await service.relations(900002)
    expect(rels[0]!.relationType).toBe('SEQUEL')
    expect(rels[0]!.anime.title.romaji).toBe('Detail Anime 2')
  })

  it('re-syncs a stale detail', async () => {
    clientMock.query = vi.fn().mockResolvedValue({
      Media: { ...fakeMedia(900004, 'Stale Anime'), siteUrl: null, description: null, characters: { pageInfo: { total: 0, perPage: 25, currentPage: 1, lastPage: 1, hasNextPage: false }, edges: [] }, staff: { pageInfo: { total: 0 }, edges: [] }, relations: { edges: [] }, recommendations: { pageInfo: { total: 0 }, nodes: [] } },
    })
    const service = makeService({ detail: -1 })
    await service.detail(900004)
    expect(clientMock.query).toHaveBeenCalledTimes(1)

    await service.detail(900004)
    expect(clientMock.query).toHaveBeenCalledTimes(2)
  })

  it('serves stale local detail when upstream fails', async () => {
    clientMock.query = vi.fn().mockResolvedValue({
      Media: { ...fakeMedia(900005, 'Survivor Anime'), siteUrl: null, description: 'old', characters: { pageInfo: { total: 0, perPage: 25, currentPage: 1, lastPage: 1, hasNextPage: false }, edges: [] }, staff: { pageInfo: { total: 0 }, edges: [] }, relations: { edges: [] }, recommendations: { pageInfo: { total: 0 }, nodes: [] } },
    })
    const service = makeService({ detail: -1 })
    await service.detail(900005)

    clientMock.query = vi.fn().mockRejectedValue(new AniListError('down', 503))
    const result = await service.detail(900005)
    expect(result.title.romaji).toBe('Survivor Anime')
  })
})