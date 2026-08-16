import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sendData, sendPage } from '../../lib/http.js'
import { optionalAuth } from '../auth/helpers.js'
import type { LibraryService, ListStatus } from '../library/service.js'
import { LIST_STATUSES } from '../library/service.js'

const listStatusEnum = z.enum(LIST_STATUSES as [ListStatus, ...ListStatus[]])

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

const watchlistBodySchema = z.object({
  status: listStatusEnum,
  currentEpisode: z.coerce.number().int().min(0).max(10_000).optional().default(0),
})

const listQuerySchema = z.object({
  status: listStatusEnum.optional(),
  q: z.string().max(200).optional(),
  genre: z.string().max(100).optional(),
  minScore: z.coerce.number().min(1).max(10).optional(),
  sort: z
    .enum(['RECENTLY_ADDED', 'RECENTLY_UPDATED', 'RATING', 'TITLE', 'PROGRESS'])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export async function watchlistRoutes(
  app: FastifyInstance,
  libraryService: LibraryService,
): Promise<void> {
  app.post('/anime/:id/watchlist', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const input = watchlistBodySchema.parse(request.body)
    await libraryService.upsert(request.user!.id, id, input)
    return reply.code(201).send({ data: { added: true } })
  })

  app.put('/anime/:id/watchlist', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const input = watchlistBodySchema.parse(request.body)
    await libraryService.upsert(request.user!.id, id, input)
    return sendData(reply, { updated: true })
  })

  app.delete('/anime/:id/watchlist', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    await libraryService.remove(request.user!.id, id)
    return reply.code(204).send()
  })

  app.get(
    '/anime/:id/watchlist',
    { preHandler: optionalAuth(app.authService) },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params)
      const entry = request.user
        ? await libraryService.getEntry(request.user.id, id)
        : null
      return sendData(reply, entry)
    },
  )

  app.get('/watchlist', { preHandler: app.requireAuth }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const result = await libraryService.list(request.user!.id, {
      status: query.status,
      q: query.q,
      genre: query.genre,
      minScore: query.minScore,
      sort: query.sort,
      page: query.page,
      perPage: query.limit,
    })
    return sendPage(reply, result)
  })

  app.get('/library', { preHandler: app.requireAuth }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const result = await libraryService.list(request.user!.id, {
      status: query.status,
      q: query.q,
      genre: query.genre,
      minScore: query.minScore,
      sort: query.sort,
      page: query.page,
      perPage: query.limit,
    })
    return sendPage(reply, result)
  })

  app.get('/watchlist/status-counts', { preHandler: app.requireAuth }, async (request, reply) => {
    const counts = await libraryService.myStatusCounts(request.user!.id)
    return sendData(reply, counts)
  })
}