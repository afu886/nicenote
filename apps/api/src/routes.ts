import { zValidator } from '@hono/zod-validator'
import { type Env, Hono } from 'hono'
import type { Schema } from 'hono/types'

import {
  type NoteContractService,
  noteCreateSchema,
  noteIdParamSchema,
  noteListItemSchema,
  noteListQuerySchema,
  noteSearchQuerySchema,
  noteSearchResultSchema,
  noteSelectSchema,
  noteUpdateSchema,
} from '@nicenote/shared'

import { AppError } from './app-error'
import { registerFolderRoutes } from './folder-routes'
import { registerTagRoutes } from './tag-routes'

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
    .get('/notes/search', zValidator('query', noteSearchQuerySchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const query = c.req.valid('query')
      const results = await service.search(query)
      return c.json({ data: noteSearchResultSchema.array().parse(results) })
    })
    .get('/notes/:id', zValidator('param', noteIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const result = await service.getById(id)
      if (!result) throw new AppError('notFound', 404)
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
        if (!result) throw new AppError('notFound', 404)
        return c.json(noteSelectSchema.parse(result))
      }
    )
    .delete('/notes/:id', zValidator('param', noteIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const deleted = await service.remove(id)
      if (!deleted) throw new AppError('notFound', 404)
      return c.json({ success: true })
    })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 仅用于 AppType 类型推导
function buildContractApp() {
  const noteApp = registerNoteRoutes(new Hono(), () => ({
    list: () => ({ data: [], nextCursor: null, nextCursorId: null }),
    getById: () => null,
    create: () => ({
      id: '',
      title: '',
      content: null,
      folderId: null,
      createdAt: '',
      updatedAt: '',
    }),
    update: () => null,
    remove: () => false,
    search: () => [],
  }))

  const folderApp = registerFolderRoutes(new Hono(), () => ({
    list: () => [],
    getById: () => null,
    create: () => ({
      id: '',
      name: '',
      parentId: null,
      position: 0,
      createdAt: '',
      updatedAt: '',
    }),
    update: () => null,
    remove: () => false,
  }))

  const tagApp = registerTagRoutes(new Hono(), () => ({
    list: () => [],
    getById: () => null,
    create: () => ({ id: '', name: '', color: null, createdAt: '' }),
    update: () => null,
    remove: () => false,
    addTagToNote: () => false,
    removeTagFromNote: () => false,
    getTagsForNote: () => [],
  }))

  return new Hono().route('', noteApp).route('', folderApp).route('', tagApp)
}

export type AppType = ReturnType<typeof buildContractApp>
