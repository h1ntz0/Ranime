import { describe, expect, it } from 'vitest'
import { parseEnv } from '../src/config/env.js'

describe('parseEnv', () => {
  it('parses a valid environment', () => {
    const env = parseEnv({
      NODE_ENV: 'development',
      PORT: '4000',
      DATABASE_URL: 'postgres://anime:anime@localhost:5432/animelist',
      ANILIST_API_URL: 'https://graphql.anilist.co',
      JWT_SECRET: 'a-secret-that-is-long-enough',
      FRONTEND_URL: 'http://localhost:3000',
    })

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      DATABASE_URL: 'postgres://anime:anime@localhost:5432/animelist',
      DATABASE_SSL: 'true',
      ANILIST_API_URL: 'https://graphql.anilist.co',
      JWT_SECRET: 'a-secret-that-is-long-enough',
      FRONTEND_URL: 'http://localhost:3000',
      SMTP_FROM: 'Ranime <onboarding@resend.dev>',
    })
  })

  it('applies defaults', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://anime:anime@localhost:5432/animelist',
      JWT_SECRET: 'a-secret-that-is-long-enough',
    })

    expect(env.PORT).toBe(4000)
    expect(env.NODE_ENV).toBe('development')
    expect(env.DATABASE_SSL).toBe('true')
    expect(env.ANILIST_API_URL).toBe('https://graphql.anilist.co')
    expect(env.FRONTEND_URL).toBe('http://localhost:3000')
  })

  it('accepts an explicit TLS setting for providers without PostgreSQL TLS', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://anime:anime@localhost:5432/animelist',
      DATABASE_SSL: 'false',
      JWT_SECRET: 'a-secret-that-is-long-enough',
    })

    expect(env.DATABASE_SSL).toBe('false')
  })

  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseEnv({ JWT_SECRET: 'a-secret-that-is-long-enough' })).toThrow(/DATABASE_URL/)
  })

  it('rejects a short JWT_SECRET', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://anime:anime@localhost:5432/animelist',
        JWT_SECRET: 'short',
      }),
    ).toThrow(/JWT_SECRET/)
  })
})
