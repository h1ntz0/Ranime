import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '../../database/schema.js'
import { unauthorized } from '../../lib/errors.js'
import type { AuthService } from './service.js'

export const SESSION_COOKIE = 'animelist_session'

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false,
  path: '/',
}

export function setSessionCookie(reply: FastifyReply, token: string, env: { NODE_ENV: string }): void {
  reply.setCookie(SESSION_COOKIE, token, {
    ...COOKIE_OPTIONS,
    secure: env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
}

export function toPublicUser(user: {
  id: string
  username: string
  email: string
  avatarUrl?: string | null
  createdAt: Date
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
  }
}

export function requireAuth(authService: AuthService) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = await authenticateRequest(authService, request, reply)
    if (!user) throw unauthorized()
    request.user = user
  }
}

export function optionalAuth(authService: AuthService) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = await authenticateRequest(authService, request, reply)
    if (user) request.user = user
  }
}

async function authenticateRequest(
  authService: AuthService,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<User | undefined> {
  const token = request.cookies?.[SESSION_COOKIE]
  if (!token) return undefined
  const userId = authService.verifyToken(token)
  if (!userId) {
    clearSessionCookie(reply)
    return undefined
  }
  return authService.getUserById(userId)
}
