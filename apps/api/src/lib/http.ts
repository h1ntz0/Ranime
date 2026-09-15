import { z } from 'zod'
import type { FastifyReply } from 'fastify'
import type { PagedResult } from '../services/anime.service.js'

/**
 * AniList ids are mirrored into Postgres `integer` columns. Anything above int4 max reaches the
 * driver and raises "value out of range for type integer", which surfaced as an HTTP 500 on
 * every /anime/:id route. Reject it at the edge instead.
 */
export const PG_INT_MAX = 2_147_483_647

/** Depth cap: OFFSET still walks the index, so an unbounded page is a free table scan. */
export const MAX_PAGE = 10_000

export const animeIdParamSchema = z.object({
  id: z.coerce.number().int().positive().max(PG_INT_MAX),
})

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export function sendData<T>(reply: FastifyReply, data: T, meta?: Record<string, unknown>) {
  return reply.send(meta ? { data, meta } : { data })
}

/**
 * Rate-limit key for a request behind the Vercel proxy. Behind a proxy every socket shares one
 * address, so without reading the forwarding headers the global limit throttles the whole site.
 * `x-real-ip` is the value the edge sets itself and overwrites any client copy of, so it is
 * preferred; the forwarded chain stays as the fallback it already was, because its right-most hop
 * is the edge value when the edge appends and the previous behaviour is otherwise preserved.
 */
export function clientKey(
  headers: Record<string, string | string[] | undefined>,
  fallback: string,
): string {
  const real = headers['x-real-ip']
  if (real) return (Array.isArray(real) ? real[0] : real) ?? fallback
  const forwarded = headers['x-forwarded-for']
  const last = (Array.isArray(forwarded) ? forwarded[forwarded.length - 1] : forwarded)
    ?.split(',')
    .pop()
    ?.trim()
  return last || fallback
}

export function sendPage<T>(reply: FastifyReply, page: PagedResult<T>) {
  return reply.send({
    data: {
      items: page.items,
      total: page.total,
      page: page.page,
      perPage: page.perPage,
      hasNextPage: page.hasNextPage,
    },
  })
}

export function parsePagination(query: { page?: unknown; limit?: unknown }): {
  page: number
  limit: number
} {
  const page = Number(query.page)
  const limit = Number(query.limit)
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20,
  }
}
