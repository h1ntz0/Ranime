import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { anime, reviews, users } from '../../database/schema.js'
import { AppError, forbidden, notFound } from '../../lib/errors.js'

export interface ReviewInput {
  rating: number
  title: string
  content: string
  containsSpoiler: boolean
}

export interface ReviewView {
  id: string
  rating: number
  title: string
  content: string
  containsSpoiler: boolean
  createdAt: string
  updatedAt: string
  user: { id: string; username: string; avatarUrl: string | null }
}

export class ReviewService {
  private db: NodePgDatabase<Record<string, unknown>>

  constructor(private options: { pool: Pool; db?: NodePgDatabase<Record<string, unknown>> }) {
    this.db = options.db ?? drizzle(options.pool)
  }

  async create(userId: string, externalId: number, input: ReviewInput): Promise<ReviewView> {
    const local = await this.findLocalAnime(externalId)
    if (!local) throw notFound('Anime not found')
    if (input.rating % 0.5 !== 0) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Rating must be in steps of 0.5')
    }

    const existing = await this.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.animeId, local.id)))
    if (existing.length > 0) {
      throw new AppError(409, 'CONFLICT', 'You already have a review for this anime')
    }

    const [row] = await this.db
      .insert(reviews)
      .values({
        userId,
        animeId: local.id,
        rating: String(input.rating),
        title: input.title.trim(),
        content: input.content.trim(),
        containsSpoiler: input.containsSpoiler,
      })
      .returning()
    return this.toView(row!)
  }

  async update(userId: string, reviewId: string, input: ReviewInput): Promise<ReviewView> {
    const row = await this.getRow(reviewId)
    if (!row) throw notFound('Review not found')
    if (row.userId !== userId) throw forbidden('You can only edit your own reviews')
    if (input.rating % 0.5 !== 0) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Rating must be in steps of 0.5')
    }

    const [updated] = await this.db
      .update(reviews)
      .set({
        rating: String(input.rating),
        title: input.title.trim(),
        content: input.content.trim(),
        containsSpoiler: input.containsSpoiler,
        updatedAt: sql`now()`,
      })
      .where(eq(reviews.id, reviewId))
      .returning()
    return this.toView(updated!)
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    const row = await this.getRow(reviewId)
    if (!row) throw notFound('Review not found')
    if (row.userId !== userId) throw forbidden('You can only delete your own reviews')
    await this.db.delete(reviews).where(eq(reviews.id, reviewId))
  }

  async listForAnime(
    externalId: number,
    page: number,
    perPage: number,
    opts: { hideSpoilers: boolean; excludeUserId?: string },
  ): Promise<{
    items: ReviewView[]
    total: number
    page: number
    perPage: number
    hasNextPage: boolean
  }> {
    const local = await this.findLocalAnime(externalId)
    if (!local) {
      return { items: [], total: 0, page, perPage, hasNextPage: false }
    }

    const filters = and(
      eq(reviews.animeId, local.id),
      opts.excludeUserId ? ne(reviews.userId, opts.excludeUserId) : undefined,
    )

    const total = (
      await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(reviews)
        .where(filters)
    )[0]?.n ?? 0

    const rows = await this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        content: reviews.content,
        containsSpoiler: reviews.containsSpoiler,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        userId: reviews.userId,
      })
      .from(reviews)
      .where(filters)
      .orderBy(desc(reviews.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage)

    const userIds = [...new Set(rows.map((r) => r.userId))]
    const userRows = userIds.length
      ? await this.db
          .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.id, userIds))
      : []
    const userById = new Map(userRows.map((u) => [u.id, u]))

    return {
      items: rows.map((r) => ({
        id: r.id,
        rating: Number(r.rating),
        title: r.title,
        content: opts.hideSpoilers && r.containsSpoiler ? '[Spoiler hidden]' : r.content,
        containsSpoiler: r.containsSpoiler,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: {
          id: r.userId,
          username: userById.get(r.userId)?.username ?? 'unknown',
          avatarUrl: userById.get(r.userId)?.avatarUrl ?? null,
        },
      })),
      total,
      page,
      perPage,
      hasNextPage: page * perPage < total,
    }
  }

  async myReview(userId: string, externalId: number): Promise<ReviewView | null> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return null
    const [row] = await this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.animeId, local.id)))
    if (!row) return null
    return this.toView(row)
  }

  private async getRow(reviewId: string) {
    return (await this.db.select().from(reviews).where(eq(reviews.id, reviewId)))[0]
  }

  private async toView(row: {
    id: string
    userId: string
    rating: string | number
    title: string
    content: string
    containsSpoiler: boolean
    createdAt: Date
    updatedAt: Date
  }): Promise<ReviewView> {
    const user = (
      await this.db
        .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, row.userId))
    )[0]
    return {
      id: row.id,
      rating: Number(row.rating),
      title: row.title,
      content: row.content,
      containsSpoiler: row.containsSpoiler,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      user: {
        id: row.userId,
        username: user?.username ?? 'unknown',
        avatarUrl: user?.avatarUrl ?? null,
      },
    }
  }

  private async findLocalAnime(externalId: number): Promise<{ id: number } | undefined> {
    return (await this.db.select({ id: anime.id }).from(anime).where(eq(anime.externalId, externalId)))[0]
  }
}
