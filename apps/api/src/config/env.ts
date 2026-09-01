import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../')
const envFile = join(projectRoot, '.env')

if (existsSync(envFile)) {
  dotenv.config({ path: envFile, quiet: true })
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ANILIST_API_URL: z.string().url().default('https://graphql.anilist.co'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Ranime <onboarding@resend.dev>'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    const details = Object.entries(result.error.flatten().fieldErrors)
      .map(([key, messages]) => `${key}: ${messages?.join(', ')}`)
      .join('; ')
    throw new Error(`Invalid environment configuration. ${details}`)
  }
  return result.data
}

export function loadEnv(): Env {
  return parseEnv(process.env)
}
