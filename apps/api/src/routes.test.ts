import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

import { registerNoteRoutes } from './routes'

function createNote() {
  return {
    id: 'n1',
    title: 'Title',
    content: 'Content',
    createdAt: '2026-02-14T01:02:03.000Z',
    updatedAt: '2026-02-14T01:02:03.000Z',
  }
}

function createListItem() {
  return {
    id: 'n1',
    title: 'Title',
    summary: 'Content',
    createdAt: '2026-02-14T01:02:03.000Z',
    updatedAt: '2026-02-14T01:02:03.000Z',
  }
}

describe('registerNoteRoutes', () => {
  it('handles list, get, create, patch, delete flows', async () => {
    const service = {
      list: vi.fn(async () => ({ data: [createListItem()], nextCursor: null, nextCursorId: null })),
      getById: vi.fn(async () => createNote()),
      create: vi.fn(async () => createNote()),
      update: vi.fn(async () => ({ ...createNote(), title: 'Updated' })),
      remove: vi.fn(async () => true),
    }

    const app = registerNoteRoutes(new Hono<{ Bindings: object }>(), () => service)

    const listRes = await app.request('/notes')
    expect(listRes.status).toBe(200)
    expect(service.list).toHaveBeenCalledOnce()

    const getRes = await app.request('/notes/n1')
    expect(getRes.status).toBe(200)
    expect(service.getById).toHaveBeenCalledWith('n1')

    const createRes = await app.request('/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'New', content: '' }),
    })
    expect(createRes.status).toBe(200)
    expect(service.create).toHaveBeenCalledWith({ title: 'New', content: '' })

    const patchRes = await app.request('/notes/n1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    })
    expect(patchRes.status).toBe(200)
    expect(service.update).toHaveBeenCalledWith('n1', { title: 'Updated' })

    const deleteRes = await app.request('/notes/n1', { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)
    expect(service.remove).toHaveBeenCalledWith('n1')
  })

  it('returns 404 when entity not found', async () => {
    const service = {
      list: vi.fn(async () => ({ data: [], nextCursor: null, nextCursorId: null })),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createNote()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
    }

    const app = registerNoteRoutes(new Hono<{ Bindings: object }>(), () => service)

    const getRes = await app.request('/notes/not-found')
    expect(getRes.status).toBe(404)

    const patchRes = await app.request('/notes/not-found', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    })
    expect(patchRes.status).toBe(404)
  })

  it('rejects invalid request bodies by route validators', async () => {
    const service = {
      list: vi.fn(async () => ({ data: [], nextCursor: null, nextCursorId: null })),
      getById: vi.fn(async () => null),
      create: vi.fn(async () => createNote()),
      update: vi.fn(async () => null),
      remove: vi.fn(async () => false),
    }

    const app = registerNoteRoutes(new Hono<{ Bindings: object }>(), () => service)

    const invalidPatchRes = await app.request('/notes/n1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(invalidPatchRes.status).toBe(400)
    expect(service.update).not.toHaveBeenCalled()

    const invalidCreateRes = await app.request('/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 123, content: '' }),
    })
    expect(invalidCreateRes.status).toBe(400)
    expect(service.create).not.toHaveBeenCalled()
  })
})
