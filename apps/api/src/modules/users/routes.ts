import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import argon2 from 'argon2'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppError, notFound, unauthorized } from '../../lib/errors.js'
import { sendData } from '../../lib/http.js'
import { toPublicUser } from '../auth/helpers.js'
import type { AuthService } from '../auth/service.js'

const UPLOAD_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../uploads/avatars')

const updateProfileSchema = z
  .object({
    username: z.string().trim().min(3).max(32).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
  })
  .refine((v) => v.username !== undefined || v.email !== undefined, {
    message: 'Nothing to update',
  })

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
})

export async function usersRoutes(app: FastifyInstance, authService: AuthService): Promise<void> {
  app.get('/users/:username', async (request, reply) => {
    const { username } = z.object({ username: z.string().min(1).max(32) }).parse(request.params)
    const user = await authService.getUserByUsername(username)
    if (!user) throw notFound(`User "${username}" not found`)

    const statsResult = await app.pool.query<{
      anime_count: number
      completed_count: number
      average_rating: number | null
      episodes_watched: number
    }>(
      `SELECT
          count(DISTINCT l.anime_id)::int AS anime_count,
          count(*) FILTER (WHERE l.status = 'COMPLETED')::int AS completed_count,
          round(avg(r.score)::numeric, 2) AS average_rating,
          coalesce(sum(l.current_episode), 0)::int AS episodes_watched
        FROM user_anime_lists l
        LEFT JOIN ratings r ON r.user_id = l.user_id
        WHERE l.user_id = $1`,
      [user.id],
    )
    const stats = statsResult.rows[0]

    return sendData(reply, {
      ...toPublicUser(user),
      stats: {
        animeCount: stats?.anime_count ?? 0,
        completedCount: stats?.completed_count ?? 0,
        averageRating: stats?.average_rating !== null && stats?.average_rating !== undefined ? Number(stats.average_rating) : null,
        episodesWatched: stats?.episodes_watched ?? 0,
      },
    })
  })

  app.patch('/users/me', { preHandler: app.requireAuth }, async (request, reply) => {
    const input = updateProfileSchema.parse(request.body)
    const user = request.user!

    if (input.username !== undefined) {
      const taken = (
        await app.pool.query<{ exists: boolean }>(
          `SELECT 1 FROM users WHERE username = $1 AND id <> $2`,
          [input.username, user.id],
        )
      ).rows[0]
      if (taken) throw new AppError(409, 'CONFLICT', 'Username already taken')
    }
    if (input.email !== undefined) {
      const taken = (
        await app.pool.query<{ exists: boolean }>(
          `SELECT 1 FROM users WHERE email = $1 AND id <> $2`,
          [input.email, user.id],
        )
      ).rows[0]
      if (taken) throw new AppError(409, 'CONFLICT', 'Email already registered')
    }

    const updated = (
      await app.pool.query<{
        id: string
        username: string
        email: string
        avatar_url: string | null
        created_at: Date
      }>(
        `UPDATE users SET username = coalesce($1, username), email = coalesce($2, email), updated_at = now() WHERE id = $3 RETURNING *`,
        [input.username ?? null, input.email ?? null, user.id],
      )
    ).rows[0] as {
      id: string
      username: string
      email: string
      avatar_url: string | null
      created_at: Date
    }

    return sendData(reply, toPublicUser({ ...updated, avatarUrl: updated.avatar_url, createdAt: new Date(updated.created_at) }))
  })

  app.post('/users/me/avatar', { preHandler: app.requireAuth }, async (request, reply) => {
    const user = request.user!
    const part = await request.file()
    if (!part) throw new AppError(422, 'VALIDATION_ERROR', 'Image file is required')

    if (
      part.mimetype !== 'image/jpeg' &&
      part.mimetype !== 'image/png' &&
      part.mimetype !== 'image/webp'
    ) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Avatar must be a JPEG, PNG or WebP image')
    }

    const buffer = await part.toBuffer()
    if (buffer.length === 0) throw new AppError(422, 'VALIDATION_ERROR', 'Avatar file is empty')
    if (buffer.length > 2 * 1024 * 1024) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Avatar must be under 2 MB')
    }

    const ext = part.mimetype === 'image/png' ? 'png' : part.mimetype === 'image/webp' ? 'webp' : 'jpg'
    const filename = `${user.id}-${randomUUID()}.${ext}`
    await mkdir(UPLOAD_DIR, { recursive: true })
    await writeFile(join(UPLOAD_DIR, filename), buffer)

    const old = (
      await app.pool.query<{ avatar_url: string | null }>(`SELECT avatar_url FROM users WHERE id = $1`, [
        user.id,
      ])
    ).rows[0]

    await app.pool.query(`UPDATE users SET avatar_url = $1, updated_at = now() WHERE id = $2`, [
      `/uploads/avatars/${filename}`,
      user.id,
    ])

    if (old?.avatar_url?.startsWith('/uploads/avatars/')) {
      rm(join(UPLOAD_DIR, old.avatar_url.split('/').pop()!), { force: true }).catch(() => {})
    }

    return sendData(reply, { avatarUrl: `/uploads/avatars/${filename}` })
  })

  app.patch('/users/me/password', { preHandler: app.requireAuth }, async (request, reply) => {
    const input = changePasswordSchema.parse(request.body)
    const user = request.user!
    const row = (
      await app.pool.query<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [
        user.id,
      ])
    ).rows[0]
    const valid = row && (await argon2.verify(row.password_hash, input.currentPassword))
    if (!valid) throw unauthorized('Current password is incorrect')

    const hash = await argon2.hash(input.newPassword, { type: argon2.argon2id })
    await app.pool.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      hash,
      user.id,
    ])
    return reply.code(204).send()
  })
}