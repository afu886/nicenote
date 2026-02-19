import { beforeEach, describe, expect, it, vi } from 'vitest'

const { drizzleMock, eqMock, descMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
  eqMock: vi.fn((left, right) => ({ left, right })),
  descMock: vi.fn((value) => ({ value })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: drizzleMock,
}))

vi.mock('drizzle-orm/sql/expressions/conditions', () => ({
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  eq: eqMock,
  lt: vi.fn((left: unknown, right: unknown) => ({ op: 'lt', left, right })),
  or: vi.fn((...args: unknown[]) => ({ op: 'or', args })),
}))

vi.mock('drizzle-orm/sql/expressions/select', () => ({
  desc: descMock,
}))

import { notes } from '../db/schema'

import { createNoteService } from './note-service'

function createDbMock() {
  const selectQuery = {
    from: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    all: vi.fn(),
    get: vi.fn(),
  }
  selectQuery.from.mockReturnValue(selectQuery)
  selectQuery.orderBy.mockReturnValue(selectQuery)
  selectQuery.where.mockReturnValue(selectQuery)
  selectQuery.limit.mockReturnValue(selectQuery)

  const insertQuery = {
    values: vi.fn(),
    returning: vi.fn(),
    get: vi.fn(),
  }
  insertQuery.values.mockReturnValue(insertQuery)
  insertQuery.returning.mockReturnValue(insertQuery)

  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(),
    get: vi.fn(),
  }
  updateQuery.set.mockReturnValue(updateQuery)
  updateQuery.where.mockReturnValue(updateQuery)
  updateQuery.returning.mockReturnValue(updateQuery)

  const deleteQuery = {
    where: vi.fn(),
    returning: vi.fn(),
    get: vi.fn(),
  }
  deleteQuery.where.mockReturnValue(deleteQuery)
  deleteQuery.returning.mockReturnValue(deleteQuery)

  const db = {
    select: vi.fn(() => selectQuery),
    insert: vi.fn(() => insertQuery),
    update: vi.fn(() => updateQuery),
    delete: vi.fn(() => deleteQuery),
  }

  return { db, selectQuery, insertQuery, updateQuery, deleteQuery }
}

describe('createNoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('lists notes ordered by updatedAt desc', async () => {
    const { db, selectQuery } = createDbMock()
    selectQuery.all.mockResolvedValue([{ id: 'n1' }])
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    const result = await service.list({ limit: 50 })

    expect(descMock).toHaveBeenCalledWith(notes.updatedAt)
    expect(selectQuery.orderBy).toHaveBeenCalled()
    expect(result).toEqual({
      data: [{ id: 'n1', summary: null }],
      nextCursor: null,
      nextCursorId: null,
    })
  })

  it('gets note by id and maps missing to null', async () => {
    const { db, selectQuery } = createDbMock()
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })

    selectQuery.get.mockResolvedValue({ id: 'n1' })
    await expect(service.getById('n1')).resolves.toEqual({ id: 'n1' })

    selectQuery.get.mockResolvedValue(undefined)
    await expect(service.getById('n2')).resolves.toBeNull()

    expect(eqMock).toHaveBeenCalledWith(notes.id, 'n1')
  })

  it('creates note with default title/content fallback', async () => {
    const { db, insertQuery } = createDbMock()
    drizzleMock.mockReturnValue(db)
    insertQuery.get.mockResolvedValue({ id: 'n1', title: 'Untitled', content: '' })

    const service = createNoteService({ DB: {} as never })
    await service.create({ title: undefined, content: undefined })

    expect(insertQuery.values).toHaveBeenCalledWith({
      title: 'Untitled',
      content: '',
    })
  })

  it('updates only provided fields and always updates timestamp', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-14T10:00:00.000Z'))

    const { db, updateQuery } = createDbMock()
    drizzleMock.mockReturnValue(db)
    updateQuery.get.mockResolvedValue({ id: 'n1' })

    const service = createNoteService({ DB: {} as never })
    await service.update('n1', { content: 'Updated content' })

    expect(updateQuery.set).toHaveBeenCalledWith({
      updatedAt: '2026-02-14T10:00:00.000Z',
      content: 'Updated content',
    })
    expect(eqMock).toHaveBeenCalledWith(notes.id, 'n1')
  })

  it('removes note by id and returns true when found', async () => {
    const { db, deleteQuery } = createDbMock()
    deleteQuery.get.mockResolvedValue({ id: 'n1' })
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    const result = await service.remove('n1')

    expect(result).toBe(true)
    expect(deleteQuery.where).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith(notes.id, 'n1')
  })

  it('returns false when removing non-existent note', async () => {
    const { db, deleteQuery } = createDbMock()
    deleteQuery.get.mockResolvedValue(undefined)
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    const result = await service.remove('nonexistent')

    expect(result).toBe(false)
  })
})
