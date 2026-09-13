import type { FastifyReply } from 'fastify'
import type { PagedResult } from '../services/anime.service.js'

export function sendData<T>(reply: FastifyReply, data: T, meta?: Record<string, unknown>) {
  return reply.send(meta ? { data, meta } : { data })
}

/**
 * Rate-limit key for a request behind the Vercel proxy. Behind a proxy every socket shares one
 * address, so without reading the forwarding headers the global limit throttles the whole site.
 * The right-most hop is the one the edge appended: client-supplied entries sit to its left and
 * cannot be used to forge a fresh bucket.
 */
export function clientKey(headers: Record<string, string | string[] | undefined>, fallback: string): string {
  const forwarded = headers['x-forwarded-for']
  const last = (Array.isArray(forwarded) ? forwarded[forwarded.length - 1] : forwarded)?.split(',').pop()?.trim()
  const real = headers['x-real-ip']
  return last || (Array.isArray(real) ? real[0] : real) || fallback
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

export function parsePagination(query: {
  page?: unknown
  limit?: unknown
}): { page: number; limit: number } {
  const page = Number(query.page)
  const limit = Number(query.limit)
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20,
  }
}
