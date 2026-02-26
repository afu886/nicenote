import { zValidator } from '@hono/zod-validator'
import type { Env } from 'hono'
import { Hono } from 'hono'
import type { Schema } from 'hono/types'

import {
  noteIdParamSchema,
  noteTagParamSchema,
  type TagContractService,
  tagCreateSchema,
  tagIdParamSchema,
  tagSelectSchema,
  tagUpdateSchema,
} from '@nicenote/shared'

import { AppError } from './app-error'

export type TagContractFactory<E extends Env> = (bindings: E['Bindings']) => TagContractService

export function registerTagRoutes<E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  createService: TagContractFactory<E>
) {
  return app
    .get('/tags', async (c) => {
      const service = createService(c.env as E['Bindings'])
      const data = await service.list()
      return c.json({ data: tagSelectSchema.array().parse(data) })
    })
    .get('/tags/:id', zValidator('param', tagIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const result = await service.getById(id)
      if (!result) throw new AppError('notFound', 404)
      return c.json(tagSelectSchema.parse(result))
    })
    .post('/tags', zValidator('json', tagCreateSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const body = c.req.valid('json')
      const result = await service.create(body)
      return c.json(tagSelectSchema.parse(result))
    })
    .patch(
      '/tags/:id',
      zValidator('param', tagIdParamSchema),
      zValidator('json', tagUpdateSchema),
      async (c) => {
        const service = createService(c.env as E['Bindings'])
        const { id } = c.req.valid('param')
        const body = c.req.valid('json')
        const result = await service.update(id, body)
        if (!result) throw new AppError('notFound', 404)
        return c.json(tagSelectSchema.parse(result))
      }
    )
    .delete('/tags/:id', zValidator('param', tagIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const deleted = await service.remove(id)
      if (!deleted) throw new AppError('notFound', 404)
      return c.json({ success: true })
    })
    .get('/notes/:id/tags', zValidator('param', noteIdParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id } = c.req.valid('param')
      const data = await service.getTagsForNote(id)
      return c.json({ data: tagSelectSchema.array().parse(data) })
    })
    .post('/notes/:id/tags/:tagId', zValidator('param', noteTagParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id, tagId } = c.req.valid('param')
      // addTagToNote 已幂等：新增或已存在均返回 true，真实错误向上抛出
      await service.addTagToNote(id, tagId)
      return c.json({ success: true })
    })
    .delete('/notes/:id/tags/:tagId', zValidator('param', noteTagParamSchema), async (c) => {
      const service = createService(c.env as E['Bindings'])
      const { id, tagId } = c.req.valid('param')
      const removed = await service.removeTagFromNote(id, tagId)
      if (!removed) throw new AppError('notFound', 404)
      return c.json({ success: true })
    })
}
