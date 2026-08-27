import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sendData, sendPage } from '../../lib/http.js'
import { optionalAuth } from '../auth/helpers.js'
import type { ReviewService } from './service.js'

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })
const reviewIdParamSchema = z.object({ id: z.string().uuid() })

function sanitizeText(str: string): string {
  return str.replace(/[<>]/g, '').trim()
}

const reviewBodySchema = z
  .object({
    rating: z.coerce.number(),
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200)
      .transform(sanitizeText)
      .refine((v) => v.length > 0, 'Title cannot be empty after sanitization'),
    content: z
      .string()
      .trim()
      .min(20, 'Review must be at least 20 characters')
      .max(5000, 'Review must be at most 5000 characters')
      .transform(sanitizeText)
      .refine((v) => v.length >= 20, 'Review content must be at least 20 characters'),
    containsSpoiler: z.boolean().optional().default(false),
  })
  .transform((v) => ({ ...v, rating: Number(v.rating.toFixed(1)) }))
  .refine((v) => v.rating >= 1 && v.rating <= 10 && v.rating % 0.5 === 0, {
    message: 'Rating must be between 1 and 10 in steps of 0.5',
  })

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export async function reviewRoutes(
  app: FastifyInstance,
  reviewService: ReviewService,
): Promise<void> {
  app.post(
    '/anime/:id/reviews',
    {
      preHandler: app.requireAuth,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params)
      const input = reviewBodySchema.parse(request.body)
      const review = await reviewService.create(request.user!.id, id, input)
      return reply.code(201).send({ data: review })
    },
  )

  app.put(
    '/reviews/:id',
    {
      preHandler: app.requireAuth,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { id } = reviewIdParamSchema.parse(request.params)
      const input = reviewBodySchema.parse(request.body)
      const review = await reviewService.update(request.user!.id, id, input)
      return sendData(reply, review)
    },
  )

  app.delete('/reviews/:id', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = reviewIdParamSchema.parse(request.params)
    await reviewService.remove(request.user!.id, id)
    return reply.code(204).send()
  })

  app.get('/anime/:id/reviews', { preHandler: optionalAuth(app.authService) }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const query = pageQuerySchema.parse(request.query)
    const result = await reviewService.listForAnime(id, query.page ?? 1, query.limit ?? 10, {
      hideSpoilers: true,
      excludeUserId: request.user?.id,
    })
    return sendPage(reply, result)
  })

  app.get('/anime/:id/reviews/mine', { preHandler: optionalAuth(app.authService) }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    if (!request.user) return sendData(reply, null)
    const review = await reviewService.myReview(request.user.id, id)
    return sendData(reply, review)
  })

  app.get('/reviews/recent', async (request, reply) => {
    const query = pageQuerySchema.parse(request.query)
    const result = await reviewService.recent(query.page ?? 1, query.limit ?? 10)
    return sendPage(reply, result)
  })

  app.get('/reviews/me', { preHandler: app.requireAuth }, async (request, reply) => {
    const query = pageQuerySchema.parse(request.query)
    const result = await reviewService.myReviews(request.user!.id, query.page ?? 1, query.limit ?? 10)
    return sendPage(reply, result)
  })
}
