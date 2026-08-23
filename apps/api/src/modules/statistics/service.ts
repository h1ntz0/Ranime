import { eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { animeGenres, genres, ratings, reviews, userAnimeLists } from '../../database/schema.js'
import type { ListStatus } from '../library/service.js'

export interface StatisticsView {
  totalAnime: number
  watching: number
  completed: number
  planning: number
  paused: number
  dropped: number
  episodesWatched: number
  averageRating: number | null
  reviews: number
  genres: { name: string; count: number }[]
  ratingDistribution: { score: number; count: number }[]
  statusDistribution: { status: string; count: number }[]
}

export class StatisticsService {
  private db: NodePgDatabase<any>

  constructor(private options: { pool: Pool; db?: NodePgDatabase<any> }) {
    this.db = options.db ?? drizzle(options.pool)
  }

  async get(userId: string): Promise<StatisticsView> {
    const [statusRows, genreRows, ratingRows, reviewCount, episodeCount] = await Promise.all([
      this.db
        .select({ status: userAnimeLists.status, count: sql<number>`count(*)::int` })
        .from(userAnimeLists)
        .where(eq(userAnimeLists.userId, userId))
        .groupBy(userAnimeLists.status),
      this.db
        .select({ name: genres.name, count: sql<number>`count(*)::int` })
        .from(userAnimeLists)
        .innerJoin(animeGenres, eq(animeGenres.animeId, userAnimeLists.animeId))
        .innerJoin(genres, eq(genres.id, animeGenres.genreId))
        .where(eq(userAnimeLists.userId, userId))
        .groupBy(genres.name)
        .orderBy(sql`count(*) DESC`)
        .limit(12),
      this.db
        .select({ score: ratings.score, count: sql<number>`count(*)::int` })
        .from(ratings)
        .where(eq(ratings.userId, userId))
        .groupBy(ratings.score)
        .orderBy(sql`${ratings.score} DESC`),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviews)
        .where(eq(reviews.userId, userId)),
      this.db
        .select({ count: sql<number>`coalesce(sum(${userAnimeLists.currentEpisode}), 0)::int` })
        .from(userAnimeLists)
        .where(eq(userAnimeLists.userId, userId)),
    ])

    const counts: Record<ListStatus, number> = {
      PLANNING: 0,
      WATCHING: 0,
      COMPLETED: 0,
      PAUSED: 0,
      DROPPED: 0,
    }
    for (const r of statusRows) counts[r.status as ListStatus] = r.count

    const [avgRow] = await this.db
      .select({ average: sql<string>`round(avg(${ratings.score})::numeric, 2)` })
      .from(ratings)
      .where(eq(ratings.userId, userId))

    return {
      totalAnime: Object.values(counts).reduce((a, b) => a + b, 0),
      watching: counts.WATCHING,
      completed: counts.COMPLETED,
      planning: counts.PLANNING,
      paused: counts.PAUSED,
      dropped: counts.DROPPED,
      episodesWatched: episodeCount[0]?.count ?? 0,
      averageRating: avgRow?.average !== null && avgRow?.average !== undefined ? Number(avgRow.average) : null,
      reviews: reviewCount[0]?.count ?? 0,
      genres: genreRows.map((g) => ({ name: g.name, count: g.count })),
      ratingDistribution: ratingRows.map((r) => ({ score: Number(r.score), count: r.count })),
      statusDistribution: statusRows.map((r) => ({ status: r.status as string, count: r.count })),
    }
  }
}
