import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { registerNoteRoutes } from '@nicenote/contract'

import { createNoteService, type NoteServiceBindings } from './services/note-service'

const app = new Hono<{ Bindings: NoteServiceBindings }>()

// 中间件配置
app.use('*', (c, next) => {
  if (c.req.path === '/health') return next()
  return logger()(c, next)
})
app.use(
  '*',
  cors({
    origin: ['https://nicenote.app', 'https://nicenote.pages.dev', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
)

// 全局错误处理
app.onError((err, c) => {
  console.error(`Error: ${err.message}`)
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  )
})

app.get('/', (c) => c.json({ status: 'ok', message: 'Nicenote API is running' }))

export type {
  NoteInsertSchemaMatchesDrizzle,
  NoteSelectSchemaMatchesDrizzle,
} from './services/note-service'

registerNoteRoutes(app, createNoteService)
export default app
