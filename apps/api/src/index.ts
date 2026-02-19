import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { createNoteService, type NoteServiceBindings } from './services/note-service'
import { resolveLocale, t } from './i18n'
import { registerNoteRoutes } from './routes'

const app = new Hono<{ Bindings: NoteServiceBindings }>()

// 中间件配置
app.use('*', (c, next) => {
  if (c.req.path === '/health') return next()
  return logger()(c, next)
})
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://nicenote.app',
  'https://nicenote.pages.dev',
]

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  return /^https:\/\/[a-z0-9-]+\.nicenote-web\.pages\.dev$/.test(origin)
}

app.use(
  '*',
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    exposeHeaders: [
      'Content-Length',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 600,
  })
)

// Per-isolate sliding window rate limiter — not globally consistent across
// Cloudflare Workers isolates, but sufficient as a per-instance safeguard.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

const rateLimitMap = new Map<string, number[]>()

app.use('*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  let timestamps = rateLimitMap.get(ip)
  if (timestamps) {
    timestamps = timestamps.filter((t) => t > windowStart)
    if (timestamps.length === 0) {
      rateLimitMap.delete(ip)
    } else {
      rateLimitMap.set(ip, timestamps)
    }
  } else {
    timestamps = []
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX - timestamps.length)
  const resetTime = Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS) / 1000)

  const setRateLimitHeaders = () => {
    c.header('X-RateLimit-Limit', RATE_LIMIT_MAX.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', resetTime.toString())
  }

  if (timestamps.length >= RATE_LIMIT_MAX) {
    setRateLimitHeaders()
    const locale = resolveLocale(c.req.header('accept-language'))
    return c.json({ error: t('tooManyRequests', locale) }, 429)
  }

  timestamps.push(now)
  await next()
  setRateLimitHeaders()
})

// 全局错误处理
app.onError((err, c) => {
  console.error(err)
  const locale = resolveLocale(c.req.header('accept-language'))
  return c.json({ error: t('internalServerError', locale) }, 500)
})

app.get('/', (c) => c.json({ status: 'ok', message: 'Nicenote API is running' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

registerNoteRoutes(app, createNoteService)

export type { AppType } from './routes'
export default app
