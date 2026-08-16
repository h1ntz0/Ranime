import type { FastifyInstance } from 'fastify'
import type { HealthResponse } from '@animelist/shared'
import { z } from 'zod'

const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  database: z.enum(['up', 'down']),
  uptime: z.number(),
  timestamp: z.string(),
})

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (request, reply) => {
    let database: 'up' | 'down' = 'down'

    try {
      await app.pool.query('SELECT 1')
      database = 'up'
    } catch (error) {
      request.log.error({ error }, 'Database health check failed')
    }

    const data = healthResponseSchema.parse({
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'animelist-api',
      database,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }) satisfies HealthResponse

    return reply.code(database === 'up' ? 200 : 503).send({ data })
  })
}
