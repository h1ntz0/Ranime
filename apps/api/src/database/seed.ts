import { randomBytes } from 'node:crypto'
import { hash } from 'argon2'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createPool } from './pool.js'
import { genres, users } from './schema.js'

/**
 * Demo credentials come from the environment. A literal here would be published the moment this
 * repository is public, and the same value would then work against every deployed environment.
 * With nothing configured the password is random, which keeps a fresh checkout usable without
 * shipping a known credential.
 */
export const DEMO_USER = {
  username: process.env.SEED_DEMO_USERNAME?.trim() || 'demo',
  email: (process.env.SEED_DEMO_EMAIL?.trim() || 'demo@example.local').toLowerCase(),
  password: process.env.SEED_DEMO_PASSWORD || randomBytes(18).toString('base64url'),
}

/** Canonical AniList genre list used to seed the genre catalog. */
export const SEED_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function runSeed(
  databaseUrl: string,
  opts: { db?: NodePgDatabase } = {},
): Promise<string[]> {
  const pool = opts.db ? undefined : createPool(databaseUrl)
  try {
    const client = opts.db ?? drizzle(pool!)
    const created: string[] = []

    const passwordHash = await hash(DEMO_USER.password)
    await client
      .insert(users)
      .values({
        username: DEMO_USER.username,
        email: DEMO_USER.email,
        passwordHash,
      })
      .onConflictDoNothing({ target: users.email })

    // Existing rows are never rewritten: re-running the seed used to reset a live account's
    // password back to a committed literal, which silently handed that account away.
    await client
      .insert(genres)
      .values(SEED_GENRES.map((name) => ({ name, slug: slugify(name) })))
      .onConflictDoNothing({ target: genres.slug })

    const userCount = (await client.select({ count: sql<number>`count(*)::int` }).from(users))[0]
      ?.count
    const genreCount = (await client.select({ count: sql<number>`count(*)::int` }).from(genres))[0]
      ?.count

    created.push(`users: ${userCount}`, `genres: ${genreCount}`)
    return created
  } finally {
    await pool?.end()
  }
}
