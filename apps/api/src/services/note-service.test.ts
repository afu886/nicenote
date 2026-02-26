import { beforeEach, describe, expect, it, vi } from 'vitest'

const { drizzleMock, eqMock, descMock, ltMock, orMock, andMock, inArrayMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
  eqMock: vi.fn((left, right) => ({ left, right })),
  descMock: vi.fn((value) => ({ value })),
  ltMock: vi.fn((left: unknown, right: unknown) => ({ op: 'lt', left, right })),
  orMock: vi.fn((...args: unknown[]) => ({ op: 'or', args })),
  andMock: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  inArrayMock: vi.fn((col: unknown, vals: unknown) => ({ op: 'inArray', col, vals })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: drizzleMock,
}))

vi.mock('drizzle-orm/sql/expressions/conditions', () => ({
  and: andMock,
  eq: eqMock,
  inArray: inArrayMock,
  lt: ltMock,
  or: orMock,
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
    run: vi.fn().mockResolvedValue(undefined), // FTS 操作使用
    all: vi.fn().mockResolvedValue([]), // search 原始 SQL 查询使用
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
    selectQuery.all.mockResolvedValue([{ id: 'n1', summary: null }])
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

  it('returns hasMore true and cursor when limit+1 rows exist', async () => {
    const { db, selectQuery } = createDbMock()
    const rows = [
      { id: 'n1', updatedAt: '2026-02-14T02:00:00.000Z', summary: null },
      { id: 'n2', updatedAt: '2026-02-14T01:00:00.000Z', summary: null },
    ]
    selectQuery.all.mockResolvedValue(rows)
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    const result = await service.list({ limit: 1 })

    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual(rows[0])
    expect(result.nextCursor).toBe('2026-02-14T02:00:00.000Z')
    expect(result.nextCursorId).toBe('n1')
  })

  it('applies composite cursor condition when cursor and cursorId provided', async () => {
    const { db, selectQuery } = createDbMock()
    selectQuery.all.mockResolvedValue([])
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    await service.list({ cursor: '2026-02-14T01:00:00.000Z', cursorId: 'n1', limit: 50 })

    expect(ltMock).toHaveBeenCalledWith(notes.updatedAt, '2026-02-14T01:00:00.000Z')
    expect(eqMock).toHaveBeenCalledWith(notes.updatedAt, '2026-02-14T01:00:00.000Z')
    expect(orMock).toHaveBeenCalled()
    expect(andMock).toHaveBeenCalled()
  })

  it('applies simple lt condition when only cursor provided', async () => {
    const { db, selectQuery } = createDbMock()
    selectQuery.all.mockResolvedValue([])
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    await service.list({ cursor: '2026-02-14T01:00:00.000Z', limit: 50 })

    expect(ltMock).toHaveBeenCalledWith(notes.updatedAt, '2026-02-14T01:00:00.000Z')
    expect(orMock).not.toHaveBeenCalled()
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

  it('creates note with sanitized content and computed summary', async () => {
    const { db, insertQuery } = createDbMock()
    drizzleMock.mockReturnValue(db)
    insertQuery.get.mockResolvedValue({ id: 'n1', title: 'Untitled', content: '' })

    const service = createNoteService({ DB: {} as never })
    await service.create({ title: undefined, content: undefined })

    expect(insertQuery.values).toHaveBeenCalledWith({
      title: 'Untitled',
      content: '',
      summary: null,
      folderId: null,
    })
  })

  it('sanitizes dangerous links in content on create', async () => {
    const { db, insertQuery } = createDbMock()
    drizzleMock.mockReturnValue(db)
    insertQuery.get.mockResolvedValue({ id: 'n1', title: 'T', content: '[click](#)' })

    const service = createNoteService({ DB: {} as never })
    await service.create({ title: 'T', content: '[click](javascript:evil())' })

    const calledWith = insertQuery.values.mock.calls[0][0] as {
      title: string
      content: string
      summary: string | null
    }
    expect(calledWith.content).toBe('[click](#)')
  })

  it('updates content with sanitized value and recomputed summary', async () => {
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
      summary: 'Updated content',
    })
    expect(eqMock).toHaveBeenCalledWith(notes.id, 'n1')
  })

  it('title-only update does not include summary or content', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-14T10:00:00.000Z'))

    const { db, updateQuery } = createDbMock()
    drizzleMock.mockReturnValue(db)
    updateQuery.get.mockResolvedValue({ id: 'n1' })

    const service = createNoteService({ DB: {} as never })
    await service.update('n1', { title: 'New Title' })

    const calledWith = updateQuery.set.mock.calls[0][0] as Record<string, unknown>
    expect(calledWith.title).toBe('New Title')
    expect(calledWith.updatedAt).toBe('2026-02-14T10:00:00.000Z')
    expect(calledWith).not.toHaveProperty('summary')
    expect(calledWith).not.toHaveProperty('content')
  })

  it('update returns null when note not found', async () => {
    const { db, updateQuery } = createDbMock()
    drizzleMock.mockReturnValue(db)
    updateQuery.get.mockResolvedValue(undefined)

    const service = createNoteService({ DB: {} as never })
    const result = await service.update('missing', { title: 'x' })

    expect(result).toBeNull()
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

  it('search returns empty array when sanitized query is empty', async () => {
    const { db } = createDbMock()
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    // 全为元字符，sanitize 后为空字符串，不应发起 FTS 查询
    const result = await service.search({ q: '()"\'', limit: 10 })

    expect(result).toEqual([])
    expect(db.all).not.toHaveBeenCalled()
  })

  it('search sanitizes FTS operators via toLowerCase', async () => {
    const { db } = createDbMock()
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    // AND/OR/NOT/NEAR 大写时是 FTS5 运算符；toLowerCase 后变为小写，不再触发运算符解析
    await service.search({ q: 'AND OR NOT NEAR', limit: 10 })

    expect(db.all).toHaveBeenCalled()
  })

  it('search returns results from db.all', async () => {
    const mockRows = [
      {
        id: 'n1',
        title: 'Hello',
        folderId: null,
        createdAt: '2026-02-14T01:00:00.000Z',
        updatedAt: '2026-02-14T01:00:00.000Z',
        summary: null,
        snippet: 'Hello <mark>world</mark>',
      },
    ]
    const { db } = createDbMock()
    db.all.mockResolvedValue(mockRows)
    drizzleMock.mockReturnValue(db)

    const service = createNoteService({ DB: {} as never })
    const result = await service.search({ q: 'world', limit: 5 })

    expect(db.all).toHaveBeenCalled()
    expect(result).toEqual(mockRows)
  })
})
