import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'

let cachedApp: FastifyInstance | null = null

async function getApp() {
  if (!cachedApp) {
    const { buildApp } = await import('../apps/api/src/app.js')
    const app = await buildApp({ logger: false })
    await app.ready()
    cachedApp = app
  }
  return cachedApp
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp()
    app.server.emit('request', req, res)
  } catch (err: unknown) {
    const error = err as Error | undefined
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: { message: error?.message || 'Server error', stack: error?.stack } }))
  }
}
