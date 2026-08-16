import type { FastifyInstance } from 'fastify'
import { sendData } from '../../lib/http.js'
import type { StatisticsService } from './service.js'

export async function statisticsRoutes(
  app: FastifyInstance,
  statisticsService: StatisticsService,
): Promise<void> {
  app.get('/statistics', { preHandler: app.requireAuth }, async (request, reply) => {
    const stats = await statisticsService.get(request.user!.id)
    return sendData(reply, stats)
  })
}
