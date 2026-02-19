import { zValidator } from '@hono/zod-validator'
import { type Env, Hono } from 'hono'
import type { Schema } from 'hono/types'

import {
  type NoteContractService,
  noteCreateSchema,
  noteIdParamSchema,
  noteListItemSchema,
  noteListQuerySchema,
  noteSelectSchema,
  noteUpdateSchema,
} from '@nicenote/shared'

import { resolveLocale, t } from './i18n'

export type NoteContractFactory<E extends Env> = (bindings: E['Bindings']) => NoteContractService

export function registerNoteRoutes<E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  createService: NoteContractFactory<E>
) {
  return app
    .get('/notes', zValidator('query', noteListQuerySchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const query = c.req.valid('query')
      const { data, nextCursor, nextCursorId } = await service.list(query)
      return c.json({ data: noteListItemSchema.array().parse(data), nextCursor, nextCursorId })
    })
    .get('/notes/:id', zValidator('param', noteIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const result = await service.getById(id)

      if (!result) {
        const locale = resolveLocale(c.req.header('accept-language'))
        return c.json({ error: t('notFound', locale) }, 404)
      }
      return c.json(noteSelectSchema.parse(result))
    })
    .post('/notes', zValidator('json', noteCreateSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const body = c.req.valid('json')
      let result: Awaited<ReturnType<typeof service.create>>
      try {
        result = await service.create(body)
      } catch (e: unknown) {
        const err = e as Error & { cause?: unknown }
        return c.json(
          {
            error: 'service.create failed',
            message: err?.message,
            cause: String(err?.cause ?? 'none'),
          },
          500
        )
      }
      try {
        return c.json(noteSelectSchema.parse(result))
      } catch (e) {
        return c.json({ error: 'schema parse failed', result, detail: String(e) }, 500)
      }
    })
    .patch(
      '/notes/:id',
      zValidator('param', noteIdParamSchema),
      zValidator('json', noteUpdateSchema),
      async (c) => {
        const service = createService(c.env as E['Bindings'])
        const { id } = c.req.valid('param')
        const body = c.req.valid('json')
        const result = await service.update(id, body)

        if (!result) {
          const locale = resolveLocale(c.req.header('accept-language'))
          return c.json({ error: t('notFound', locale) }, 404)
        }
        return c.json(noteSelectSchema.parse(result))
      }
    )
    .delete('/notes/:id', zValidator('param', noteIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const deleted = await service.remove(id)
      if (!deleted) {
        const locale = resolveLocale(c.req.header('accept-language'))
        return c.json({ error: t('notFound', locale) }, 404)
      }
      return c.json({ success: true })
    })
}

function _createContractAppForType() {
  const app = new Hono()

  return registerNoteRoutes(app, () => ({
    list: () => ({ data: [], nextCursor: null, nextCursorId: null }),
    getById: () => null,
    create: () => ({
      id: '',
      title: '',
      content: null,
      createdAt: '',
      updatedAt: '',
    }),
    update: () => null,
    remove: () => false,
  }))
}

export type AppType = ReturnType<typeof _createContractAppForType>
