import { buildApp } from './app.js'

const app = await buildApp()

const port = app.env.PORT
const host = '0.0.0.0'

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
