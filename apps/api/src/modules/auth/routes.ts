import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { User } from '../../database/schema.js'
import { sendData } from '../../lib/http.js'
import { AppError } from '../../lib/errors.js'
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

  app.get('/auth/google', async (_request, reply) => {
    const clientId = app.env.GOOGLE_CLIENT_ID
    const redirectUri =
      app.env.GOOGLE_REDIRECT_URI || `${app.env.FRONTEND_URL}/api/auth/google/callback`

    if (!clientId) {
      throw new AppError(500, 'GOOGLE_AUTH_NOT_CONFIGURED', 'Google OAuth is not configured')
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    })

    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
  })

  app.get('/auth/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; error?: string }
    if (query.error || !query.code) {
      return reply.redirect(`${app.env.FRONTEND_URL}/login?error=google_auth_failed`)
    }

    const clientId = app.env.GOOGLE_CLIENT_ID
    const clientSecret = app.env.GOOGLE_CLIENT_SECRET
    const redirectUri =
      app.env.GOOGLE_REDIRECT_URI || `${app.env.FRONTEND_URL}/api/auth/google/callback`

    if (!clientId || !clientSecret) {
      throw new AppError(500, 'GOOGLE_AUTH_NOT_CONFIGURED', 'Google OAuth credentials not configured')
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: query.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        const body = await tokenResponse.text()
        console.error('Google token exchange failed', tokenResponse.status, body, { redirectUri })
        return reply.redirect(`${app.env.FRONTEND_URL}/login?error=google_token_failed`)
      }

      const tokenData = (await tokenResponse.json()) as { access_token?: string }
      if (!tokenData.access_token) {
        console.error('Google token missing access_token', tokenData)
        return reply.redirect(`${app.env.FRONTEND_URL}/login?error=google_token_failed`)
      }

      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })

      if (!userinfoResponse.ok) {
        const body = await userinfoResponse.text()
        console.error('Google userinfo failed', userinfoResponse.status, body)
        return reply.redirect(`${app.env.FRONTEND_URL}/login?error=google_userinfo_failed`)
      }

      const profile = (await userinfoResponse.json()) as {
        sub: string
        email: string
        name?: string
        picture?: string
      }

      if (!profile.sub || !profile.email) {
        console.error('Google profile invalid', profile)
        return reply.redirect(`${app.env.FRONTEND_URL}/login?error=google_profile_invalid`)
      }

      const user = await authService.findOrCreateGoogleUser({
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      })

      const token = authService.signToken(user)
      setSessionCookie(reply, token, app.env)
      return reply.redirect(`${app.env.FRONTEND_URL}/`)
    } catch (err) {
      console.error('Google OAuth callback error', err)
      return reply.redirect(`${app.env.FRONTEND_URL}/login?error=google_auth_error`)
    }
  })

  app.post('/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply, app.env)
    return reply.code(204).send()
  })

  app.get('/auth/me', { preHandler: optionalAuth(authService) }, async (request, reply) => {
    const user = request.user
    return sendData(reply, user ? toPublicUser(user as User) : null)
  })
}
