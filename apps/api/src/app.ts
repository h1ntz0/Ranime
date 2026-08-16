import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import type { Pool } from 'pg'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv, type Env } from './config/env.js'
import { createPool } from './database/pool.js'
import { healthRoutes } from './modules/health/routes.js'
import { animeRoutes } from './modules/anime/routes.js'
import { catalogRoutes } from './modules/catalog/routes.js'
import { authRoutes } from './modules/auth/routes.js'
import { usersRoutes } from './modules/users/routes.js'
import { watchlistRoutes } from './modules/watchlist/routes.js'
import { ratingRoutes } from './modules/ratings/routes.js'
import { reviewRoutes } from './modules/reviews/routes.js'
import { statisticsRoutes } from './modules/statistics/routes.js'
import { requireAuth, optionalAuth } from './modules/auth/helpers.js'
import { AuthService } from './modules/auth/service.js'
import { LibraryService } from './modules/library/service.js'
import { RatingService } from './modules/ratings/service.js'
import { ReviewService } from './modules/reviews/service.js'
import { StatisticsService } from './modules/statistics/service.js'
import { errorHandler } from './plugins/errors.js'
import { AnimeService } from './services/anime.service.js'
import { AniListClient } from './integrations/anilist/client.js'
import type { FastifyReply, FastifyRequest } from 'fastify'

const UPLOAD_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../uploads')

export interface BuildAppOptions {
  env?: Env
  pool?: Pool
  logger?: boolean
  animeService?: AnimeService
  authService?: AuthService
  libraryService?: LibraryService
  ratingService?: RatingService
  reviewService?: ReviewService
  statisticsService?: StatisticsService
}

export async function buildApp(options: BuildAppOptions = {}) {
  const env = options.env ?? loadEnv()
  const pool = options.pool ?? createPool(env.DATABASE_URL)

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV !== 'test',
  })

  app.decorate('env', env)
  app.decorate('pool', pool)
  app.decorate(
    'animeService',
    options.animeService ??
      new AnimeService({
        client: new AniListClient({ endpoint: env.ANILIST_API_URL }),
        pool,
      }),
  )
  const authService =
    options.authService ??
    new AuthService({ pool, jwtSecret: env.JWT_SECRET, tokenTtl: '30d' })
  app.decorate('authService', authService)
  app.decorate('requireAuth', (request: FastifyRequest, reply: FastifyReply) =>
    requireAuth(authService)(request, reply),
  )
  app.decorate('optionalAuth', (request: FastifyRequest, reply: FastifyReply) =>
    optionalAuth(authService)(request, reply),
  )

  errorHandler(app)

  app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  })
  app.register(cookie)
  app.register(multipart)
  app.register(staticFiles, {
    root: UPLOAD_ROOT,
    prefix: '/uploads/',
  })

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
    })
  })

  app.register(healthRoutes, { prefix: '/api' })
  app.register(animeRoutes, { prefix: '/api' })
  app.register(catalogRoutes, { prefix: '/api' })
  app.register(async (instance) => authRoutes(instance, authService), { prefix: '/api' })
  app.register(async (instance) => usersRoutes(instance, authService), { prefix: '/api' })
  app.register(
    async (instance) =>
      watchlistRoutes(instance, options.libraryService ?? new LibraryService({ pool })),
    { prefix: '/api' },
  )
  app.register(
    async (instance) =>
      ratingRoutes(instance, options.ratingService ?? new RatingService({ pool })),
    { prefix: '/api' },
  )
  app.register(
    async (instance) =>
      reviewRoutes(instance, options.reviewService ?? new ReviewService({ pool })),
    { prefix: '/api' },
  )
  app.register(
    async (instance) =>
      statisticsRoutes(instance, options.statisticsService ?? new StatisticsService({ pool })),
    { prefix: '/api' },
  )

  app.addHook('onClose', async () => {
    await pool.end()
  })

  return app
}
