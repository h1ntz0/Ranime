import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '../../database/schema.js'
import { unauthorized } from '../../lib/errors.js'
import type { AuthService } from './service.js'

export const SESSION_COOKIE = 'animelist_session'

export function setSessionCookie(reply: FastifyReply, token: string, env: { NODE_ENV: string }): void {
  const isProd = env.NODE_ENV === 'production'
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSessionCookie(reply: FastifyReply, env?: { NODE_ENV: string }): void {
  const isProd = env?.NODE_ENV === 'production' || process.env.NODE_ENV === 'production'
  reply.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  })
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
