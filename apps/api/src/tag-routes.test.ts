import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

import { handleAppError } from './app-error'
import { registerTagRoutes } from './tag-routes'

function createTag() {
  return {
    id: 't1',
    name: 'work',
    color: '#ff0000',
    createdAt: '2026-02-14T01:02:03.000Z',
  }
}

function createTestApp(
  createService: () => {
    list: ReturnType<typeof vi.fn>
    getById: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    addTagToNote: ReturnType<typeof vi.fn>
    removeTagFromNote: ReturnType<typeof vi.fn>
    getTagsForNote: ReturnType<typeof vi.fn>
  }
) {
  const app = new Hono<{ Bindings: object }>()
  app.onError(handleAppError)
  registerTagRoutes(app, createService)
  return app
}

describe('registerTagRoutes', () => {
  it('handles list, create, patch, delete flows', async () => {
    const service = {
      list: vi.fn(async () => [createTag()]),
      getById: vi.fn(async () => createTag()),
      create: vi.fn(async () => createTag()),
      update: vi.fn(async () => ({ ...createTag(), name: 'personal' })),
      remove: vi.fn(async () => true),
      addTagToNote: vi.fn(async () => true),
      removeTagFromNote: vi.fn(async () => true),
      getTagsForNote: vi.fn(async () => [createTag()]),
    }

    const app = createTestApp(() => service)

    const listRes = await app.request('/tags')
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json()
    expect(listBody).toEqual({ data: [createTag()] })
    expect(service.list).toHaveBeenCalledOnce()

    const createRes = await app.request('/tags', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'work', color: '#ff0000' }),
    })
    expect(createRes.status).toBe(200)
    expect(service.create).toHaveBeenCalledWith({ name: 'work', color: '#ff0000' })

    const getRes = await app.request('/tags/t1')
    expect(getRes.status).toBe(200)
    const getBody = await getRes.json()
    expect(getBody).toEqual(createTag())
    expect(service.getById).toHaveBeenCalledWith('t1')

    const patchRes = await app.request('/tags/t1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'personal' }),
    })
    expect(patchRes.status).toBe(200)
    expect(service.update).toHaveBeenCalledWith('t1', { name: 'personal' })

    const deleteRes = await app.request('/tags/t1', { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)
    expect(service.remove).toHaveBeenCalledWith('t1')
  })

  it('handles note-tag association routes', async () => {
    const service = {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createTag()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
      addTagToNote: vi.fn(async () => true),
      removeTagFromNote: vi.fn(async () => true),
      getTagsForNote: vi.fn(async () => [createTag()]),
    }

    const app = createTestApp(() => service)

    const getTagsRes = await app.request('/notes/n1/tags')
    expect(getTagsRes.status).toBe(200)
    const body = await getTagsRes.json()
    expect(body).toEqual({ data: [createTag()] })
    expect(service.getTagsForNote).toHaveBeenCalledWith('n1')

    const addRes = await app.request('/notes/n1/tags/t1', { method: 'POST' })
    expect(addRes.status).toBe(200)
    expect(service.addTagToNote).toHaveBeenCalledWith('n1', 't1')

    const removeRes = await app.request('/notes/n1/tags/t1', { method: 'DELETE' })
    expect(removeRes.status).toBe(200)
    expect(service.removeTagFromNote).toHaveBeenCalledWith('n1', 't1')
  })

  it('addTagToNote is idempotent: returns 200 whether new or already exists', async () => {
    // addTagToNote 经修复后，新增（true）和已存在（true）均返回 200
    const service = {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createTag()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
      addTagToNote: vi.fn(async () => true),
      removeTagFromNote: vi.fn(async () => false),
      getTagsForNote: vi.fn(async () => []),
    }

    const app = createTestApp(() => service)

    const res = await app.request('/notes/n1/tags/t1', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })
  })

  it('returns 404 for tag not found on get, patch and delete', async () => {
    const service = {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createTag()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
      addTagToNote: vi.fn(async () => true),
      removeTagFromNote: vi.fn(async () => false),
      getTagsForNote: vi.fn(async () => []),
    }

    const app = createTestApp(() => service)

    const getRes = await app.request('/tags/not-found')
    expect(getRes.status).toBe(404)

    const patchRes = await app.request('/tags/not-found', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'new-name' }),
    })
    expect(patchRes.status).toBe(404)

    const deleteRes = await app.request('/tags/not-found', { method: 'DELETE' })
    expect(deleteRes.status).toBe(404)

    // removeTagFromNote 返回 false → 404
    const removeTagRes = await app.request('/notes/n1/tags/t1', { method: 'DELETE' })
    expect(removeTagRes.status).toBe(404)
  })

  it('rejects invalid tag creation and update', async () => {
    const service = {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createTag()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
      addTagToNote: vi.fn(async () => true),
      removeTagFromNote: vi.fn(async () => false),
      getTagsForNote: vi.fn(async () => []),
    }

    const app = createTestApp(() => service)

    // 空名称
    const emptyNameRes = await app.request('/tags', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect(emptyNameRes.status).toBe(400)
    expect(service.create).not.toHaveBeenCalled()

    // 非法颜色格式（非 #RRGGBB）
    const badColorRes = await app.request('/tags', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test', color: 'red' }),
    })
    expect(badColorRes.status).toBe(400)
    expect(service.create).not.toHaveBeenCalled()

    // PATCH 不含任何字段（refine 校验）
    const emptyPatchRes = await app.request('/tags/t1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(emptyPatchRes.status).toBe(400)
    expect(service.update).not.toHaveBeenCalled()
  })
})
