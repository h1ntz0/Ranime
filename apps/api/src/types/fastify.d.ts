import type { Env } from '../config/env.js'
import type { Pool } from 'pg'
import type { FastifyReply } from 'fastify'
import type { AnimeService } from '../services/anime.service.js'
import type { AuthService } from '../modules/auth/service.js'
import type { User } from '../database/schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    env: Env
    pool: Pool
    animeService: AnimeService
    authService: AuthService
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    user?: User
  }
}
