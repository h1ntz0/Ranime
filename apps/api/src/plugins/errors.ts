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

    if (error instanceof AniListError) {
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
