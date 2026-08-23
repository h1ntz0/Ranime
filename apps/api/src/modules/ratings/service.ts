import { and, desc, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { anime, ratings } from '../../database/schema.js'
import { AppError, notFound } from '../../lib/errors.js'

export interface RatingAggregate {
  average: number | null
  count: number
  distribution: { score: number; count: number }[]
}

export class RatingService {
  private db: NodePgDatabase<any>

  constructor(
    private options: {
      pool: Pool
      db?: NodePgDatabase<any>
      onActivity?: (userId: string, type: 'RATED', animeId: number, payload?: Record<string, unknown>) => void
    },
  ) {
    this.db = options.db ?? drizzle(options.pool)
  }

  async upsert(userId: string, externalId: number, score: number): Promise<number> {
    if (!Number.isFinite(score) || score < 1 || score > 10 || score % 0.5 !== 0) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Score must be between 1 and 10 in steps of 0.5')
    }
    const local = await this.findLocalAnime(externalId)
    if (!local) throw notFound('Anime not found')

    const previous = (
      await this.db
        .select({ score: ratings.score })
        .from(ratings)
        .where(and(eq(ratings.userId, userId), eq(ratings.animeId, local.id)))
    )[0]

    await this.db
      .insert(ratings)
      .values({ userId, animeId: local.id, score: String(score), updatedAt: sql`now()` })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.animeId],
        set: { score: String(score), updatedAt: sql`now()` },
      })

    if (this.options.onActivity && Number(previous?.score) !== score) {
      this.options.onActivity(userId, 'RATED', local.id, { score })
    }
    return score
  }

  async remove(userId: string, externalId: number): Promise<void> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return
    await this.db
      .delete(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.animeId, local.id)))
  }

  async getMyRating(userId: string, externalId: number): Promise<number | null> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return null
    const [row] = await this.db
      .select({ score: ratings.score })
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.animeId, local.id)))
    return row?.score !== null && row?.score !== undefined ? Number(row.score) : null
  }

  async aggregate(externalId: number): Promise<RatingAggregate> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return { average: null, count: 0, distribution: [] }

    const [agg] = await this.db
      .select({
        average: sql<string>`round(avg(${ratings.score})::numeric, 2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(ratings)
      .where(eq(ratings.animeId, local.id))

    const dist = await this.db
      .select({ score: ratings.score, n: sql<number>`count(*)::int` })
      .from(ratings)
      .where(eq(ratings.animeId, local.id))
      .groupBy(ratings.score)
      .orderBy(desc(ratings.score))

    return {
      average: agg?.average !== null && agg?.average !== undefined ? Number(agg.average) : null,
      count: agg?.count ?? 0,
      distribution: dist.map((d) => ({ score: Number(d.score), count: d.n })),
    }
  }

  async listWithUsers(externalId: number, page: number, perPage: number) {
    const local = await this.findLocalAnime(externalId)
    if (!local) return { items: [], total: 0, page, perPage, hasNextPage: false }

    const total = (
      await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(ratings)
        .where(eq(ratings.animeId, local.id))
    )[0]?.n ?? 0

    const rows = await this.db
      .select({
        id: ratings.id,
        score: ratings.score,
        createdAt: ratings.createdAt,
        username: sql<string>`(SELECT username FROM users WHERE id = ${ratings.userId})`,
      })
      .from(ratings)
      .where(eq(ratings.animeId, local.id))
      .orderBy(desc(ratings.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage)

    return {
      items: rows.map((r) => ({ id: r.id, score: Number(r.score), username: r.username, createdAt: r.createdAt })),
      total,
      page,
      perPage,
      hasNextPage: page * perPage < total,
    }
  }

  async myRatings(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<{
    items: {
      id: string
      score: number
      createdAt: string
      anime: { id: number; title: { romaji: string | null; english: string | null; native: string | null }; coverImage: string | null; format: string | null; averageScore: number | null }
    }[]
    total: number
    page: number
    perPage: number
    hasNextPage: boolean
  }> {
    const total =
      (await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(ratings)
        .where(eq(ratings.userId, userId)))[0]?.n ?? 0

    const rows = await this.db
      .select({
        id: ratings.id,
        score: ratings.score,
        createdAt: ratings.createdAt,
        externalId: anime.externalId,
        titleRomaji: anime.titleRomaji,
        titleEnglish: anime.titleEnglish,
        titleNative: anime.titleNative,
        coverImage: anime.coverImage,
        format: anime.format,
        averageScore: anime.averageScore,
      })
      .from(ratings)
      .innerJoin(anime, eq(anime.id, ratings.animeId))
      .where(eq(ratings.userId, userId))
      .orderBy(desc(ratings.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage)

    return {
      items: rows.map((r) => ({
        id: r.id,
        score: Number(r.score),
        createdAt: r.createdAt.toISOString(),
        anime: {
          id: r.externalId,
          title: { romaji: r.titleRomaji, english: r.titleEnglish, native: r.titleNative },
          coverImage: r.coverImage,
          format: r.format,
          averageScore: r.averageScore,
        },
      })),
      total,
      page,
      perPage,
      hasNextPage: page * perPage < total,
    }
  }

  private async findLocalAnime(externalId: number): Promise<{ id: number } | undefined> {
    return (await this.db.select({ id: anime.id }).from(anime).where(eq(anime.externalId, externalId)))[0]
  }
}
