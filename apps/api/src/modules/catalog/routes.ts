import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { notFound } from '../../lib/errors.js'
import { sendData, sendPage } from '../../lib/http.js'

const seasonQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200),
  season: z.enum(['WINTER', 'SPRING', 'SUMMER', 'FALL']),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const topQuerySchema = z.object({
  category: z.enum(['top-rated', 'popular', 'trending']).default('top-rated'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const genreSlugSchema = z.object({ slug: z.string().min(1).max(100) })

const TOP_SORT: Record<string, string> = {
  'top-rated': 'SCORE',
  popular: 'POPULARITY',
  trending: 'TRENDING',
}

const CACHE_HEADER = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/genres', async (_request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const result = await app.animeService.genresList()
    return sendData(reply, result)
  })

  app.get('/genres/:slug', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const { slug } = genreSlugSchema.parse(request.params)
    const query = topQuerySchema.omit({ category: true }).parse(request.query)
    const genre = (await app.animeService.genresList()).find((g) => g.slug === slug)
    if (!genre) throw notFound(`Genre "${slug}" not found`)
    const result = await app.animeService.list({
      genre: genre.name,
      sort: 'POPULARITY',
      page: query.page,
      limit: query.limit,
    })
    return sendPage(reply, result)
  })

  app.get('/season', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const query = seasonQuerySchema.parse(request.query)
    const result = await app.animeService.list({
      season: query.season,
      year: query.year,
      sort: 'SCORE',
      page: query.page,
      limit: query.limit,
    })
    return sendPage(reply, result)
  })

  app.get('/top', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const query = topQuerySchema.parse(request.query)
    const result = await app.animeService.list({
      sort: TOP_SORT[query.category] ?? 'SCORE',
      page: query.page,
      limit: query.limit,
    })
    return sendPage(reply, result)
  })

  app.get('/airing', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const query = topQuerySchema.omit({ category: true }).parse(request.query)
    const result = await app.animeService.airing(query.page ?? 1, query.limit ?? 20)
    return sendPage(reply, result)
  })

  app.get('/studios', async (_request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const result = await app.animeService.studiosList()
    return sendData(reply, result)
  })

  app.get('/studios/:slug', async (request, reply) => {
    reply.header('Cache-Control', CACHE_HEADER)
    const { slug } = genreSlugSchema.parse(request.params)
    const query = topQuerySchema.omit({ category: true }).parse(request.query)
    const result = await app.animeService.studioAnime(slug, query.page ?? 1, query.limit ?? 20)
    return sendPage(reply, result)
  })
}
