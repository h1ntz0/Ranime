import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sendData, sendPage } from '../../lib/http.js'
import { optionalAuth } from '../auth/helpers.js'
import type { RatingService } from './service.js'

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

const ratingBodySchema = z
  .object({ score: z.coerce.number() })
  .transform((v) => ({ score: Number(v.score.toFixed(1)) }))
  .refine((v) => v.score >= 1 && v.score <= 10 && v.score % 0.5 === 0, {
    message: 'Score must be between 1 and 10 in steps of 0.5',
  })

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export async function ratingRoutes(
  app: FastifyInstance,
  ratingService: RatingService,
): Promise<void> {
  app.post('/anime/:id/rating', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { score } = ratingBodySchema.parse(request.body)
    const result = await ratingService.upsert(request.user!.id, id, score)
    return reply.code(201).send({ data: { score: result } })
  })

  app.put('/anime/:id/rating', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { score } = ratingBodySchema.parse(request.body)
    const result = await ratingService.upsert(request.user!.id, id, score)
    return sendData(reply, { score: result })
  })

  app.delete('/anime/:id/rating', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    await ratingService.remove(request.user!.id, id)
    return reply.code(204).send()
  })

  app.get(
    '/anime/:id/ratings',
    { preHandler: optionalAuth(app.authService) },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params)
      const query = pageQuerySchema.parse(request.query)
      const aggregate = await ratingService.aggregate(id)
      const myScore = request.user ? await ratingService.getMyRating(request.user.id, id) : null
      const list = await ratingService.listWithUsers(id, query.page ?? 1, query.limit ?? 20)
      return reply.send({
        data: {
          ...aggregate,
          myScore,
          recent: list.items,
        },
        meta: {
          total: list.total,
          page: list.page,
          perPage: list.perPage,
          hasNextPage: list.hasNextPage,
        },
      })
    },
  )

  app.get('/ratings/me', { preHandler: app.requireAuth }, async (request, reply) => {
    const query = pageQuerySchema.parse(request.query)
    const result = await ratingService.myRatings(request.user!.id, query.page ?? 1, query.limit ?? 20)
    return sendPage(reply, result)
  })
}
