import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../apps/api/src/app.js'

let appPromise: ReturnType<typeof buildApp> | null = null

async function getApp() {
  if (!appPromise) {
    appPromise = buildApp({
      logger: false,
    }).then(async (app) => {
      await app.ready()
      return app
    })
  }
  return appPromise
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp()
  app.server.emit('request', req, res)
}
