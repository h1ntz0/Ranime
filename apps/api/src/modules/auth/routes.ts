import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { User } from '../../database/schema.js'
import { sendData } from '../../lib/http.js'
import { optionalAuth, setSessionCookie, clearSessionCookie, toPublicUser } from './helpers.js'
import type { AuthService } from './service.js'

const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(32),
  email: z.string().trim().toLowerCase().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email required'),
  password: z.string().min(1).max(200),
})

export async function authRoutes(app: FastifyInstance, authService: AuthService): Promise<void> {
  app.post(
    '/auth/register',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = registerSchema.parse(request.body)
      const user = await authService.register(input)
      const token = authService.signToken(user)
      setSessionCookie(reply, token, app.env)
      return reply.code(201).send({ data: toPublicUser(user) })
    },
  )

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = loginSchema.parse(request.body)
      const user = await authService.login(input.email, input.password)
      const token = authService.signToken(user)
      setSessionCookie(reply, token, app.env)
      return sendData(reply, toPublicUser(user))
    },
  )

  app.post('/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply)
    return reply.code(204).send()
  })

  app.get('/auth/me', { preHandler: optionalAuth(authService) }, async (request, reply) => {
    const user = request.user
    return sendData(reply, user ? toPublicUser(user as User) : null)
  })
}
