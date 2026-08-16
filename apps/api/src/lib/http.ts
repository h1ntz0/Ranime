import type { FastifyReply } from 'fastify'
import type { PagedResult } from '../services/anime.service.js'

export function sendData<T>(reply: FastifyReply, data: T, meta?: Record<string, unknown>) {
  return reply.send(meta ? { data, meta } : { data })
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
