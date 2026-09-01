import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { forbidden, notFound } from '../../lib/errors.js'
import { sendData, sendPage } from '../../lib/http.js'
import { toPublicUser } from '../auth/helpers.js'
import type { AuthService } from '../auth/service.js'

export function requireAdmin() {
  return async function (request: FastifyRequest): Promise<void> {
    if (!request.user || request.user.role !== 'ADMIN') {
      throw forbidden('Admin privileges required')
    }
  }
}

export async function adminRoutes(app: FastifyInstance, authService: AuthService): Promise<void> {
  app.post('/admin/cleanup-test-users-exec', async (request, reply) => {
    const { key } = z.object({ key: z.string() }).parse(request.body)
    if (key !== app.env.JWT_SECRET) {
      throw forbidden('Invalid secret key')
    }
    const adminEmail = 'arrofi.zein12@gmail.com'
    const deletedActivities = await app.pool.query(
      `DELETE FROM user_activity WHERE user_id IN (SELECT id FROM users WHERE email != $1)`,
      [adminEmail],
    )
    const deletedReviews = await app.pool.query(
      `DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email != $1)`,
      [adminEmail],
    )
    const deletedRatings = await app.pool.query(
      `DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE email != $1)`,
      [adminEmail],
    )
    const deletedLists = await app.pool.query(
      `DELETE FROM user_anime_lists WHERE user_id IN (SELECT id FROM users WHERE email != $1)`,
      [adminEmail],
    )
    const deletedTokens = await app.pool.query(
      `DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email != $1)`,
      [adminEmail],
    )
    const deletedUsers = await app.pool.query(
      `DELETE FROM users WHERE email != $1 RETURNING email`,
      [adminEmail],
    )

    return sendData(reply, {
      deletedUsersCount: deletedUsers.rowCount,
      deletedUsers: deletedUsers.rows.map((r: any) => r.email),
      deletedActivitiesCount: deletedActivities.rowCount,
      deletedReviewsCount: deletedReviews.rowCount,
      deletedRatingsCount: deletedRatings.rowCount,
      deletedListsCount: deletedLists.rowCount,
      deletedTokensCount: deletedTokens.rowCount,
    })
  })

  // All admin endpoints require authenticated admin
  app.register(async (adminScope) => {
    adminScope.addHook('preHandler', app.requireAuth)
    adminScope.addHook('preHandler', requireAdmin())

    adminScope.get('/admin/stats', async (_request, reply) => {
    const [counts] = (
      await app.pool.query<{
        total_users: number
        total_admins: number
        total_anime: number
        total_reviews: number
        total_ratings: number
        total_watchlist: number
        total_activities: number
      }>(`
        SELECT
          (SELECT count(*)::int FROM users) AS total_users,
          (SELECT count(*)::int FROM users WHERE role = 'ADMIN') AS total_admins,
          (SELECT count(*)::int FROM anime) AS total_anime,
          (SELECT count(*)::int FROM reviews) AS total_reviews,
          (SELECT count(*)::int FROM ratings) AS total_ratings,
          (SELECT count(*)::int FROM user_anime_lists) AS total_watchlist,
          (SELECT count(*)::int FROM user_activity) AS total_activities
      `)
    ).rows

    const userGrowth = (
      await app.pool.query<{ date: string; count: number }>(`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
          count(*)::int AS count
        FROM users
        WHERE created_at >= now() - interval '14 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `)
    ).rows

    const recentUsers = (
      await app.pool.query<{
        id: string
        username: string
        email: string
        role: string
        avatar_url: string | null
        created_at: Date
      }>(`
        SELECT id, username, email, role, avatar_url, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
      `)
    ).rows

    const recentActivities = (
      await app.pool.query<{
        id: string
        type: string
        created_at: Date
        username: string
        anime_title: string | null
      }>(`
        SELECT
          a.id,
          a.type,
          a.created_at,
          u.username,
          coalesce(an.title_romaji, an.title_english) AS anime_title
        FROM user_activity a
        JOIN users u ON u.id = a.user_id
        LEFT JOIN anime an ON an.id = a.anime_id
        ORDER BY a.created_at DESC
        LIMIT 15
      `)
    ).rows

    return sendData(reply, {
      overview: {
        totalUsers: counts?.total_users ?? 0,
        totalAdmins: counts?.total_admins ?? 0,
        totalAnime: counts?.total_anime ?? 0,
        totalReviews: counts?.total_reviews ?? 0,
        totalRatings: counts?.total_ratings ?? 0,
        totalWatchlistEntries: counts?.total_watchlist ?? 0,
        totalActivities: counts?.total_activities ?? 0,
      },
      userGrowth,
      recentUsers: recentUsers.map((u) => ({
        ...toPublicUser({ ...u, avatarUrl: u.avatar_url, createdAt: new Date(u.created_at) }),
      })),
      recentActivities: recentActivities.map((act) => ({
        id: act.id,
        type: act.type,
        createdAt: new Date(act.created_at).toISOString(),
        username: act.username,
        animeTitle: act.anime_title,
      })),
      systemStatus: {
        database: 'connected',
        uptime: process.uptime(),
        serverTime: new Date().toISOString(),
      },
    })
  })

  app.get('/admin/users', async (request, reply) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(20),
        q: z.string().trim().optional(),
      })
      .parse(request.query)

    const offset = (query.page - 1) * query.limit
    const searchPattern = query.q ? `%${query.q}%` : null

    const total = (
      await app.pool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM users WHERE ($1::text IS NULL OR username ILIKE $1 OR email ILIKE $1)`,
        [searchPattern],
      )
    ).rows[0]?.count ?? 0

    const rows = (
      await app.pool.query<{
        id: string
        username: string
        email: string
        role: string
        avatar_url: string | null
        created_at: Date
      }>(
        `SELECT id, username, email, role, avatar_url, created_at
         FROM users
         WHERE ($1::text IS NULL OR username ILIKE $1 OR email ILIKE $1)
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchPattern, query.limit, offset],
      )
    ).rows

    return sendPage(reply, {
      items: rows.map((u) => ({
        ...toPublicUser({ ...u, avatarUrl: u.avatar_url, createdAt: new Date(u.created_at) }),
      })),
      total,
      page: query.page,
      perPage: query.limit,
      hasNextPage: offset + rows.length < total,
    })
  })

  app.patch('/admin/users/:id/role', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const { role } = z.object({ role: z.enum(['USER', 'ADMIN']) }).parse(request.body)

    const user = await authService.getUserById(id)
    if (!user) throw notFound('User not found')

    const updated = (
      await app.pool.query<{
        id: string
        username: string
        email: string
        role: string
        avatar_url: string | null
        created_at: Date
      }>(`UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING *`, [
        role,
        id,
      ])
    ).rows[0]

      return sendData(
        reply,
        toPublicUser({
          ...updated!,
          avatarUrl: updated!.avatar_url,
          createdAt: new Date(updated!.created_at),
        }),
      )
    })
  })
}
