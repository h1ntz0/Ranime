import { hash } from 'argon2'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createPool } from './pool.js'
import { genres, users } from './schema.js'

export const DEMO_USER = {
  username: 'demo',
  email: 'demo@example.local',
  password: 'password123',
}

/** Canonical AniList genre list used to seed the genre catalog. */
export const SEED_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Hentai',
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

export async function runSeed(databaseUrl: string, opts: { db?: NodePgDatabase } = {}): Promise<string[]> {
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

    await client
      .insert(genres)
      .values(SEED_GENRES.map((name) => ({ name, slug: slugify(name) })))
      .onConflictDoNothing({ target: genres.slug })

    const userCount = (
      await client.select({ count: sql<number>`count(*)::int` }).from(users)
    )[0]?.count
    const genreCount = (
      await client.select({ count: sql<number>`count(*)::int` }).from(genres)
    )[0]?.count

    created.push(`users: ${userCount}`, `genres: ${genreCount}`)
    return created
  } finally {
    await pool?.end()
  }
}