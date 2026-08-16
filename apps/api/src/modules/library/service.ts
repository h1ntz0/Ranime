import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { anime, animeGenres, genres, userAnimeLists, type Anime } from '../../database/schema.js'
import { notFound } from '../../lib/errors.js'

export type ListStatus = 'PLANNING' | 'WATCHING' | 'COMPLETED' | 'PAUSED' | 'DROPPED'
export const LIST_STATUSES: ListStatus[] = ['PLANNING', 'WATCHING', 'COMPLETED', 'PAUSED', 'DROPPED']

export interface LibraryEntryView {
  id: string
  status: ListStatus
  currentEpisode: number
  totalEpisodes: number | null
  progress: number | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  anime: {
    id: number
    title: { romaji: string | null; english: string | null; native: string | null }
    coverImage: string | null
    format: string | null
    averageScore: number | null
    genres: string[]
  }
}

export interface LibraryListParams {
  status?: ListStatus
  q?: string
  genre?: string
  minScore?: number
  sort?: 'RECENTLY_ADDED' | 'RECENTLY_UPDATED' | 'RATING' | 'TITLE' | 'PROGRESS'
  page?: number
  perPage?: number
}

export class LibraryService {
  private db: NodePgDatabase<Record<string, unknown>>

  constructor(private options: { pool: Pool; db?: NodePgDatabase<Record<string, unknown>> }) {
    this.db = options.db ?? drizzle(options.pool)
  }

  async upsert(
    userId: string,
    externalId: number,
    input: { status: ListStatus; currentEpisode: number },
  ): Promise<void> {
    const local = await this.findLocalAnime(externalId)
    if (!local) throw notFound('Anime not found')

    const now = sql`now()`
    await this.db
      .insert(userAnimeLists)
      .values({
        userId,
        animeId: local.id,
        status: input.status,
        currentEpisode: input.currentEpisode,
        startedAt: input.status === 'WATCHING' ? sql`now()` : undefined,
        completedAt: input.status === 'COMPLETED' ? sql`now()` : undefined,
      })
      .onConflictDoUpdate({
        target: [userAnimeLists.userId, userAnimeLists.animeId],
        set: {
          status: input.status,
          currentEpisode: input.currentEpisode,
          startedAt: input.status === 'WATCHING' ? sql`coalesce(${userAnimeLists.startedAt}, now())` : undefined,
          completedAt:
            input.status === 'COMPLETED'
              ? sql`now()`
              : input.status === 'WATCHING'
                ? sql`null`
                : undefined,
          updatedAt: now,
        },
      })
  }

  async remove(userId: string, externalId: number): Promise<void> {
    const local = await this.findLocalAnime(externalId)
    if (!local) throw notFound('Anime not found')
    await this.db
      .delete(userAnimeLists)
      .where(
        and(eq(userAnimeLists.userId, userId), eq(userAnimeLists.animeId, local.id)),
      )
  }

  async getEntry(userId: string, externalId: number): Promise<LibraryEntryView | null> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return null
    const [row] = await this.db
      .select()
      .from(userAnimeLists)
      .where(and(eq(userAnimeLists.userId, userId), eq(userAnimeLists.animeId, local.id)))
    if (!row) return null
    const [animeRow] = await this.db.select().from(anime).where(eq(anime.id, local.id))
    return animeRow ? this.toView(row, animeRow, []) : null
  }

  async list(
    userId: string,
    params: LibraryListParams,
  ): Promise<{ items: LibraryEntryView[]; total: number; page: number; perPage: number; hasNextPage: boolean }> {
    const page = params.page ?? 1
    const perPage = Math.min(params.perPage ?? 20, 50)

    const conditions = [eq(userAnimeLists.userId, userId)]
    if (params.status) conditions.push(eq(userAnimeLists.status, params.status))
    if (params.q) {
      conditions.push(
        sql`(${anime.titleRomaji} ILIKE ${`%${params.q}%`} OR ${anime.titleEnglish} ILIKE ${`%${params.q}%`} OR ${anime.titleNative} ILIKE ${`%${params.q}%`})`,
      )
    }
    if (params.minScore) conditions.push(gte(anime.averageScore, params.minScore * 10))
    if (params.genre) {
      conditions.push(
        sql`${anime.id} IN (SELECT ag.anime_id FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id WHERE g.slug = ${params.genre})`,
      )
    }

    const sort = params.sort ?? 'RECENTLY_UPDATED'

    const joined = this.db
      .selectDistinct({
        id: userAnimeLists.id,
        createdAt: userAnimeLists.createdAt,
        updatedAt: userAnimeLists.updatedAt,
        score: anime.averageScore,
        title: anime.titleRomaji,
        episode: userAnimeLists.currentEpisode,
      })
      .from(userAnimeLists)
      .innerJoin(anime, eq(anime.id, userAnimeLists.animeId))
      .where(conditions.length ? and(...conditions) : undefined)

    const total =
      (await this.db.select({ n: sql<number>`count(*)::int` }).from(joined.as('j')))[0]?.n ?? 0

    const j = joined.as('j')
    const orderBy: Record<string, ReturnType<typeof desc> | ReturnType<typeof sql>> = {
      RECENTLY_ADDED: desc(j.createdAt),
      RECENTLY_UPDATED: desc(j.updatedAt),
      RATING: desc(j.score),
      TITLE: sql`${j.title} ASC NULLS LAST`,
      PROGRESS: desc(j.episode),
    }

    const paged = await this.db
      .select({ id: j.id })
      .from(j)
      .orderBy(orderBy[sort] ?? desc(j.updatedAt))
      .limit(perPage)
      .offset((page - 1) * perPage)

    if (paged.length === 0) return { items: [], total, page, perPage, hasNextPage: false }

    const rows = await this.db
      .select()
      .from(userAnimeLists)
      .where(inArray(userAnimeLists.id, paged.map((p) => p.id)))

    const animeIds = rows.map((r) => r.animeId)
    const [animeRows, genreRows] = await Promise.all([
      this.db.select().from(anime).where(inArray(anime.id, animeIds)),
      this.db
        .select({ animeId: animeGenres.animeId, name: genres.name })
        .from(animeGenres)
        .innerJoin(genres, eq(genres.id, animeGenres.genreId))
        .where(inArray(animeGenres.animeId, animeIds)),
    ])
    const animeById = new Map(animeRows.map((a) => [a.id, a]))
    const genresByAnime = new Map<number, string[]>()
    for (const g of genreRows) {
      const list = genresByAnime.get(g.animeId) ?? []
      list.push(g.name)
      genresByAnime.set(g.animeId, list)
    }

    return {
      items: rows.map((r) => {
        const a = animeById.get(r.animeId)!
        return this.toView(r, a, genresByAnime.get(a.id) ?? [])
      }),
      total,
      page,
      perPage,
      hasNextPage: page * perPage < total,
    }
  }

  private toView(
    row: (typeof userAnimeLists.$inferSelect),
    a: Anime,
    genreNames: string[],
  ): LibraryEntryView {
    const total = a.episodes
    const progress =
      total && total > 0 ? Math.min(100, Math.round((row.currentEpisode / total) * 100)) : null
    return {
      id: row.id,
      status: row.status as ListStatus,
      currentEpisode: row.currentEpisode,
      totalEpisodes: total,
      progress,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      anime: {
        id: a.externalId,
        title: { romaji: a.titleRomaji, english: a.titleEnglish, native: a.titleNative },
        coverImage: a.coverImage,
        format: a.format,
        averageScore: a.averageScore,
        genres: genreNames,
      },
    }
  }

  async myStatusCounts(userId: string): Promise<Record<ListStatus, number>> {
    const rows = await this.db
      .select({ status: userAnimeLists.status, n: sql<number>`count(*)::int` })
      .from(userAnimeLists)
      .where(eq(userAnimeLists.userId, userId))
      .groupBy(userAnimeLists.status)
    const counts: Record<ListStatus, number> = {
      PLANNING: 0,
      WATCHING: 0,
      COMPLETED: 0,
      PAUSED: 0,
      DROPPED: 0,
    }
    for (const r of rows) counts[r.status as ListStatus] = r.n
    return counts
  }

  private async findLocalAnime(externalId: number): Promise<Anime | undefined> {
    return (await this.db.select().from(anime).where(eq(anime.externalId, externalId)))[0]
  }
}