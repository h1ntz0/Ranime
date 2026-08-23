import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sendData, sendPage } from '../../lib/http.js'

const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  genre: z.string().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  season: z.enum(['WINTER', 'SPRING', 'SUMMER', 'FALL']).optional(),
  format: z.enum(['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC']).optional(),
  status: z.string().max(50).optional(),
  minScore: z.coerce.number().min(1).max(10).optional(),
  sort: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })
const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const CACHE_HEADER = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'

export async function animeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/anime', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const query = listQuerySchema.parse(request.query)
    const result = await app.animeService.list(query)
    return sendPage(reply, result)
  })

  app.get('/anime/:id', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const { id } = idParamSchema.parse(request.params)
    const result = await app.animeService.detail(id)
    return sendData(reply, result)
  })

  app.get('/anime/:id/characters', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const { id } = idParamSchema.parse(request.params)
    const query = pageQuerySchema.parse(request.query)
    const result = await app.animeService.characters(id, query.page ?? 1, query.limit ?? 25)
    return sendPage(reply, result)
  })

  app.get('/anime/:id/staff', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const { id } = idParamSchema.parse(request.params)
    const result = await app.animeService.staff(id)
    return sendData(reply, result)
  })

  app.get('/anime/:id/relations', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const { id } = idParamSchema.parse(request.params)
    const result = await app.animeService.relations(id)
    return sendData(reply, result)
  })

  app.get('/anime/:id/recommendations', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const { id } = idParamSchema.parse(request.params)
    const query = pageQuerySchema.parse(request.query)
    const result = await app.animeService.recommendations(id, query.page ?? 1, query.limit ?? 15)
    return sendPage(reply, result)
  })

  app.get('/anime/compare', async (request, reply) => {
    const compareQuerySchema = z.object({
      ids: z.string().transform((val) =>
        val
          .split(',')
          .map((n) => Number(n.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
          .slice(0, 4),
      ),
    })
    const { ids } = compareQuerySchema.parse(request.query)
    if (ids.length === 0) {
      return sendData(reply, [])
    }
    const list = await app.animeService.compare(ids)
    return sendData(reply, list)
  })

  app.get('/anime/roulette', async (request, reply) => {
    const rouletteQuerySchema = z.object({
      genre: z.string().max(100).optional(),
      format: z.enum(['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC']).optional(),
      minScore: z.coerce.number().min(1).max(10).optional(),
      year: z.coerce.number().int().min(1900).max(2200).optional(),
    })
    const query = rouletteQuerySchema.parse(request.query)
    const result = await app.animeService.list({
      ...query,
      sort: 'POPULARITY',
      limit: 50,
    })
    if (!result.items.length) {
      return sendData(reply, null)
    }
    const randomIndex = Math.floor(Math.random() * result.items.length)
    const randomAnime = result.items[randomIndex]
    if (!randomAnime) {
      return sendData(reply, null)
    }
    const detail = await app.animeService.detail(randomAnime.id).catch(() => null)
    return sendData(reply, detail ?? randomAnime)
  })
}
