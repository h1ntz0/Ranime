import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { verify } from 'argon2'
import { and, eq, sql } from 'drizzle-orm'
import { drizzle as createDrizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { loadEnv } from '../src/config/env.js'
import { runMigrations } from '../src/database/migrate.js'
import {
  anime,
  animeGenres,
  genres,
  ratings,
  reviews,
  userAnimeLists,
  users,
} from '../src/database/schema.js'
import { DEMO_USER, runSeed } from '../src/database/seed.js'

const DATABASE_URL = loadEnv().DATABASE_URL
const TEST_DB = 'animelist_test'
const TEST_URL = new URL(DATABASE_URL)
TEST_URL.pathname = `/${TEST_DB}`
const TEST_URL_STRING = TEST_URL.toString()

let pool: pg.Pool
let client: NodePgDatabase

beforeAll(async () => {
  const { Client } = pg
  const admin = new Client({
    connectionString: DATABASE_URL,
  })
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
  client = createDrizzle(pool)
})

afterAll(async () => {
  await pool?.end()
  const admin = new pg.Client({ connectionString: DATABASE_URL })
  await admin.connect()
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB],
  )
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`)
  await admin.end()
})

const factory = {
  user: (n: number) => ({
    username: `user_${n}`,
    email: `user_${n}@example.com`,
    passwordHash: 'hash-placeholder',
  }),
  animeRow: (n: number) => ({
    externalId: 100000 + n,
    titleRomaji: `Test Anime ${n}`,
    averageScore: 70 + (n % 20),
  }),
}

async function insertAnime(n: number) {
  return (await client.insert(anime).values(factory.animeRow(n)).returning())[0]!
}

describe('database migration (from empty)', () => {
  it('creates all expected tables', async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )
    const names = rows.map((r: { table_name: string }) => r.table_name).sort()
    expect(names).toEqual(
      [
        'airing_schedule',
        'anime',
        'anime_characters',
        'anime_genres',
        'anime_relations',
        'anime_staff',
        'anime_studios',
        'characters',
        'genres',
        'ratings',
        'reviews',
        'staff',
        'studios',
        'sync_logs',
        'user_activity',
        'user_anime_lists',
        'users',
      ].sort(),
    )
  })

  it('enforces the ratings unique(user_id, anime_id) and score range', async () => {
    const a = await insertAnime(1)
    const u = (await client.insert(users).values(factory.user(1)).returning())[0]!

    await client.insert(ratings).values({ userId: u.id, animeId: a.id, score: '8.5' })
    await expect(
      client.insert(ratings).values({ userId: u.id, animeId: a.id, score: '9.0' }),
    ).rejects.toThrow()

    await expect(
      client.insert(ratings).values({ userId: u.id, animeId: a.id, score: '15' }),
    ).rejects.toThrow()

    await expect(
      client.insert(ratings).values({ userId: u.id, animeId: a.id, score: '0.5' }),
    ).rejects.toThrow()
  })

  it('enforces review content length and rating range', async () => {
    const a = await insertAnime(2)
    const u = (await client.insert(users).values(factory.user(2)).returning())[0]!

    await expect(
      client.insert(reviews).values({
        userId: u.id,
        animeId: a.id,
        rating: '7',
        title: 'Short',
        content: 'too short',
      }),
    ).rejects.toThrow()

    await expect(
      client.insert(reviews).values({
        userId: u.id,
        animeId: a.id,
        rating: '999',
        title: 'Valid title',
        content: 'x'.repeat(25),
      }),
    ).rejects.toThrow()
  })

  it('enforces episode progress non-negative', async () => {
    const a = await insertAnime(3)
    const u = (await client.insert(users).values(factory.user(3)).returning())[0]!

    await expect(
      client.insert(userAnimeLists).values({
        userId: u.id,
        animeId: a.id,
        status: 'WATCHING',
        currentEpisode: -1,
      }),
    ).rejects.toThrow()
  })

  it('cascades deletes from users to user-owned rows', async () => {
    const a = await insertAnime(4)
    const u = (await client.insert(users).values(factory.user(4)).returning())[0]!

    await client
      .insert(userAnimeLists)
      .values({ userId: u.id, animeId: a.id, status: 'WATCHING' })
    await client.insert(ratings).values({ userId: u.id, animeId: a.id, score: '7.5' })

    await client.delete(users).where(eq(users.id, u.id))

    const lists = await client
      .select()
      .from(userAnimeLists)
      .where(and(eq(userAnimeLists.animeId, a.id)))
    const remainingRatings = await client.select().from(ratings).where(eq(ratings.animeId, a.id))
    expect(lists).toHaveLength(0)
    expect(remainingRatings).toHaveLength(0)
  })

  it('auto-updates updated_at on UPDATE', async () => {
    const createdAt = new Date(Date.now() - 86_400_000)
    const u = (
      await client
        .insert(users)
        .values({ ...factory.user(5), createdAt, updatedAt: createdAt })
        .returning()
    )[0]!

    await client.update(users).set({ username: 'renamed_user_5' }).where(eq(users.id, u.id))
    const [after] = await client.select().from(users).where(eq(users.id, u.id))
    expect(after!.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime())
    expect(after!.username).toBe('renamed_user_5')
  })

  it('maintains anime_genres join integrity', async () => {
    const a = await insertAnime(6)
    const g = (await client.insert(genres).values({ name: 'Test Genre', slug: 'test-genre' }).returning())[0]!

    await client.insert(animeGenres).values({ animeId: a.id, genreId: g.id })

    const duplicated = client.insert(animeGenres).values({ animeId: a.id, genreId: g.id })
    await expect(duplicated).rejects.toThrow()

    const orphan = client.insert(animeGenres).values({ animeId: 999999, genreId: g.id })
    await expect(orphan).rejects.toThrow()
  })
})

describe('seed', () => {
  it('is idempotent and creates an account with a verifiable password', async () => {
    const before = Number(
      (await client.select({ count: sql<number>`count(*)::int` }).from(users))[0]!.count,
    )
    await runSeed(TEST_URL_STRING)
    await runSeed(TEST_URL_STRING)

    const [row] = await client
      .select()
      .from(users)
      .where(eq(users.email, DEMO_USER.email))
    expect(row).toBeDefined()
    expect(row!.username).toBe(DEMO_USER.username)
    expect(await verify(row!.passwordHash, DEMO_USER.password)).toBe(true)

    const count = Number(
      (await client.select({ count: sql<number>`count(*)::int` }).from(users))[0]!.count,
    )
    // runSeed creates demo + admin (arrofi) → +2 when DB was empty, idempotent on second run
    expect(count).toBe(before + 2)
    const [adminRow] = await client.select().from(users).where(eq(users.email, 'arrofi.zein12@gmail.com'))
    expect(adminRow).toBeDefined()
    expect(adminRow!.role).toBe('ADMIN')
  })
})