import { desc, eq, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { anime, userActivity, users, type UserActivity } from '../../database/schema.js'

export type ActivityType = UserActivity['type']

export interface ActivityItemView {
  id: string
  type: ActivityType
  createdAt: string
  reviewId: string | null
  payload: Record<string, unknown> | null
  anime: {
    id: number
    title: { romaji: string | null; english: string | null; native: string | null }
    coverImage: string | null
  }
}

const MAX_ACTIVITY_PER_USER = 200

export class ActivityService {
  private db: NodePgDatabase<any>

  constructor(private options: { pool: Pool; db?: NodePgDatabase<any> }) {
    this.db = options.db ?? drizzle(options.pool)
  }

  async log(
    userId: string,
    type: ActivityType,
    animeId: number,
    extra: { reviewId?: string; payload?: Record<string, unknown> } = {},
  ): Promise<void> {
    try {
      await this.db.insert(userActivity).values({
        userId,
        type,
        animeId,
        reviewId: extra.reviewId,
        payload: extra.payload,
      })
      await this.prune(userId)
    } catch {
      // activity logging must never break the primary write
    }
  }

  async listByUsername(
    username: string,
    page: number,
    perPage: number,
  ): Promise<{ items: ActivityItemView[]; total: number; page: number; perPage: number; hasNextPage: boolean }> {
    const user = (
      await this.db.select({ id: users.id }).from(users).where(eq(users.username, username))
    )[0]
    if (!user) {
      return { items: [], total: 0, page, perPage, hasNextPage: false }
    }

    const total =
      (await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(userActivity)
        .where(eq(userActivity.userId, user.id)))[0]?.n ?? 0

    const rows = await this.db
      .select({
        id: userActivity.id,
        type: userActivity.type,
        createdAt: userActivity.createdAt,
        reviewId: userActivity.reviewId,
        payload: userActivity.payload,
        animeId: userActivity.animeId,
      })
      .from(userActivity)
      .where(eq(userActivity.userId, user.id))
      .orderBy(desc(userActivity.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage)

    if (rows.length === 0) return { items: [], total, page, perPage, hasNextPage: false }

    const animeIds = [...new Set(rows.map((r) => r.animeId))]
    const animeRows = await this.db
      .select({
        id: anime.id,
        externalId: anime.externalId,
        titleRomaji: anime.titleRomaji,
        titleEnglish: anime.titleEnglish,
        titleNative: anime.titleNative,
        coverImage: anime.coverImage,
      })
      .from(anime)
      .where(inArray(anime.id, animeIds))
    const animeById = new Map<number, any>(animeRows.map((a: any) => [a.id, a]))

    return {
      items: rows.map((r) => {
        const a = animeById.get(r.animeId)
        return {
          id: r.id,
          type: r.type,
          createdAt: r.createdAt.toISOString(),
          reviewId: r.reviewId,
          payload: r.payload as Record<string, unknown> | null,
          anime: {
            id: a?.externalId ?? 0,
            title: {
              romaji: a?.titleRomaji ?? null,
              english: a?.titleEnglish ?? null,
              native: a?.titleNative ?? null,
            },
            coverImage: a?.coverImage ?? null,
          },
        }
      }),
      total,
      page,
      perPage,
      hasNextPage: page * perPage < total,
    }
  }

  private async prune(userId: string): Promise<void> {
    await this.db.execute(sql`
      DELETE FROM user_activity
      WHERE user_id = ${userId}
        AND id NOT IN (
          SELECT id FROM user_activity WHERE user_id = ${userId}
          ORDER BY created_at DESC LIMIT ${MAX_ACTIVITY_PER_USER}
        )
    `)
  }
}
