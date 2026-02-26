import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

import { handleAppError } from './app-error'
import { registerFolderRoutes } from './folder-routes'

function createFolder() {
  return {
    id: 'f1',
    name: 'Folder One',
    parentId: null,
    position: 0,
    createdAt: '2026-02-14T01:02:03.000Z',
    updatedAt: '2026-02-14T01:02:03.000Z',
  }
}

function createTestApp(
  createService: () => {
    list: ReturnType<typeof vi.fn>
    getById: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }
) {
  const app = new Hono<{ Bindings: object }>()
  app.onError(handleAppError)
  registerFolderRoutes(app, createService)
  return app
}

describe('registerFolderRoutes', () => {
  it('handles list, get, create, patch, delete flows', async () => {
    const service = {
      list: vi.fn(async () => [createFolder()]),
      getById: vi.fn(async () => createFolder()),
      create: vi.fn(async () => createFolder()),
      update: vi.fn(async () => ({ ...createFolder(), name: 'Updated' })),
      remove: vi.fn(async () => true),
    }

    const app = createTestApp(() => service)

    const listRes = await app.request('/folders')
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json()
    expect(listBody).toEqual({ data: [createFolder()] })
    expect(service.list).toHaveBeenCalledOnce()

    const getRes = await app.request('/folders/f1')
    expect(getRes.status).toBe(200)
    expect(service.getById).toHaveBeenCalledWith('f1')

    const createRes = await app.request('/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Folder One' }),
    })
    expect(createRes.status).toBe(200)
    expect(service.create).toHaveBeenCalledWith({ name: 'Folder One' })

    const patchRes = await app.request('/folders/f1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(patchRes.status).toBe(200)
    expect(service.update).toHaveBeenCalledWith('f1', { name: 'Updated' })

    const deleteRes = await app.request('/folders/f1', { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)
    expect(service.remove).toHaveBeenCalledWith('f1')
  })

  it('returns 404 when folder not found', async () => {
    const service = {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createFolder()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
    }

    const app = createTestApp(() => service)

    const getRes = await app.request('/folders/not-found')
    expect(getRes.status).toBe(404)

    const patchRes = await app.request('/folders/not-found', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(patchRes.status).toBe(404)

    const deleteRes = await app.request('/folders/not-found', { method: 'DELETE' })
    expect(deleteRes.status).toBe(404)
  })

  it('rejects invalid request bodies', async () => {
    const service = {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createFolder()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
    }

    const app = createTestApp(() => service)

    // POST 缺少必填 name 字段
    const noNameRes = await app.request('/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(noNameRes.status).toBe(400)
    expect(service.create).not.toHaveBeenCalled()

    // POST name 为空字符串（min(1) 校验）
    const emptyNameRes = await app.request('/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect(emptyNameRes.status).toBe(400)
    expect(service.create).not.toHaveBeenCalled()

    // PATCH 不含任何有效字段（refine 校验）
    const emptyPatchRes = await app.request('/folders/f1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(emptyPatchRes.status).toBe(400)
    expect(service.update).not.toHaveBeenCalled()
  })

  it('supports nested folder creation via parentId', async () => {
    const child = { ...createFolder(), id: 'f2', parentId: 'f1' }
    const service = {
      list: vi.fn(async () => [createFolder(), child]),
      getById: vi.fn(async () => child),
      create: vi.fn(async () => child),
      update: vi.fn(async () => child),
      remove: vi.fn(async () => true),
    }

    const app = createTestApp(() => service)

    const createRes = await app.request('/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Sub Folder', parentId: 'f1' }),
    })
    expect(createRes.status).toBe(200)
    expect(service.create).toHaveBeenCalledWith({ name: 'Sub Folder', parentId: 'f1' })
  })
})
