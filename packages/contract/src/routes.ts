import { zValidator } from '@hono/zod-validator'
import { type Env, Hono } from 'hono'
import type { Schema } from 'hono/types'

import {
  type NoteCreateInput,
  noteCreateSchema,
  noteIdParamSchema,
  type NoteSelect,
  noteSelectSchema,
  type NoteUpdateInput,
  noteUpdateSchema,
} from './schemas'

export interface NoteContractService {
  list: () => Promise<NoteSelect[]> | NoteSelect[]
  getById: (id: string) => Promise<NoteSelect | null> | NoteSelect | null
  create: (input: NoteCreateInput) => Promise<NoteSelect> | NoteSelect
  update: (id: string, input: NoteUpdateInput) => Promise<NoteSelect | null> | NoteSelect | null
  remove: (id: string) => Promise<void> | void
}

export type NoteContractFactory<E extends Env> = (bindings: E['Bindings']) => NoteContractService

export function registerNoteRoutes<E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  createService: NoteContractFactory<E>
) {
  return app
    .get('/notes', async (c) => {
      const service = createService(c.env as E['Bindings'])
      const result = await service.list()
      return c.json(noteSelectSchema.array().parse(result))
    })
    .get('/notes/:id', zValidator('param', noteIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const result = await service.getById(id)

      if (!result) return c.json({ error: 'Not found' }, 404)
      return c.json(noteSelectSchema.parse(result))
    })
    .post('/notes', zValidator('json', noteCreateSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const body = c.req.valid('json')
      const result = await service.create(body)
      return c.json(noteSelectSchema.parse(result))
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

        if (!result) return c.json({ error: 'Not found' }, 404)
        return c.json(noteSelectSchema.parse(result))
      }
    )
    .delete('/notes/:id', zValidator('param', noteIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      await service.remove(id)
      return c.json({ success: true })
    })
}

function _createContractAppForType() {
  const app = new Hono()

  return registerNoteRoutes(app, () => ({
    list: () => [],
    getById: () => null,
    create: () => ({
      id: '',
      title: '',
      content: null,
      createdAt: '',
      updatedAt: '',
    }),
    update: () => null,
    remove: () => undefined,
  }))
}

export type AppType = ReturnType<typeof _createContractAppForType>
