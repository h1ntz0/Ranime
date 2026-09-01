import type { FastifyInstance } from 'fastify'
import { AppError } from '../lib/errors.js'
import { AniListError } from '../integrations/anilist/client.js'
import { ZodError } from 'zod'

export function errorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      })
    }

    if (error instanceof ZodError) {
      const first = error.issues[0]
      const message = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input'
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message },
      })
    }

    if ((error as any).statusCode === 429) {
      return reply.code(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      })
    }

    if (error instanceof AniListError) {
      if (error.statusCode === 404 || error.graphqlErrors?.some((e: any) => typeof e?.message === 'string' && /not found/i.test(e.message))) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Anime not found',
          },
        })
      }
      request.log.warn({ error: error.message }, 'AniList upstream error')
      return reply.code(503).send({
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'Anime data is temporarily unavailable. Please try again later.',
        },
      })
    }

    request.log.error({ error }, 'Unhandled error')
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    })
  })
}
