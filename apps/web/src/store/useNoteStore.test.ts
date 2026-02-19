import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    notes: {
      $get: vi.fn(),
      $post: vi.fn(),
      ':id': {
        $get: vi.fn(),
        $patch: vi.fn(),
        $delete: vi.fn(),
      },
    },
  },
}))

vi.mock('../lib/api', () => ({
  api: mockApi,
}))

vi.mock('../i18n', () => ({
  default: {
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'status' in opts) return `${key} (${opts.status})`
      return key
    },
  },
}))

import type { NoteListItem } from '@nicenote/shared'

import { useNoteStore } from './useNoteStore'

function makeListItem(overrides: Partial<NoteListItem> & { id: string }): NoteListItem {
  return {
    title: 'Note',
    summary: null,
    createdAt: '2026-02-14T00:00:00.000Z',
    updatedAt: '2026-02-14T00:00:00.000Z',
    ...overrides,
  }
}

function resetStore() {
  useNoteStore.setState({
    notes: [],
    currentNote: null,
    isFetching: false,
    isCreating: false,
    error: null,
    hasMore: false,
    nextCursor: null,
    nextCursorId: null,
    isFetchingMore: false,
  })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('useNoteStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('fetches and normalizes notes list', async () => {
    mockApi.notes.$get.mockResolvedValue(
      jsonResponse({
        data: [
          makeListItem({ id: 'n1', title: 'First' }),
          { id: '', title: 'Invalid — missing required fields' },
        ],
        nextCursor: null,
        nextCursorId: null,
      })
    )

    await useNoteStore.getState().fetchNotes()

    const state = useNoteStore.getState()
    expect(state.isFetching).toBe(false)
    expect(state.error).toBeNull()
    expect(state.notes).toHaveLength(1)
    expect(state.notes[0]?.id).toBe('n1')
  })

  it('fetchNotes stores pagination cursor from response', async () => {
    mockApi.notes.$get.mockResolvedValue(
      jsonResponse({
        data: [makeListItem({ id: 'n1', updatedAt: '2026-02-14T01:00:00.000Z' })],
        nextCursor: '2026-02-14T01:00:00.000Z',
        nextCursorId: 'n1',
      })
    )

    await useNoteStore.getState().fetchNotes()

    const state = useNoteStore.getState()
    expect(state.hasMore).toBe(true)
    expect(state.nextCursor).toBe('2026-02-14T01:00:00.000Z')
    expect(state.nextCursorId).toBe('n1')
  })

  it('creates a note and sets it as current', async () => {
    mockApi.notes.$post.mockResolvedValue(
      jsonResponse({
        id: 'n-new',
        title: 'Untitled',
        content: '',
        createdAt: '2026-02-14T01:02:03.000Z',
        updatedAt: '2026-02-14T01:02:03.000Z',
      })
    )

    await useNoteStore.getState().createNote()

    const state = useNoteStore.getState()
    expect(state.notes[0]?.id).toBe('n-new')
    expect(state.currentNote?.id).toBe('n-new')
    expect(state.isCreating).toBe(false)
  })

  it('updates note locally and patches remote note', async () => {
    useNoteStore.setState({
      notes: [makeListItem({ id: 'n1', title: 'Before' })],
      currentNote: {
        id: 'n1',
        title: 'Before',
        content: 'A',
        createdAt: '2026-02-14T01:02:03.000Z',
        updatedAt: '2026-02-14T01:02:03.000Z',
      },
    })

    useNoteStore.getState().updateNoteLocal('n1', { title: 'After' })

    const localState = useNoteStore.getState()
    expect(localState.notes[0]?.title).toBe('After')
    expect(localState.currentNote?.title).toBe('After')

    mockApi.notes[':id'].$patch.mockResolvedValue(
      jsonResponse({
        id: 'n1',
        title: 'After',
        content: 'A',
        createdAt: '2026-02-14T01:02:03.000Z',
        updatedAt: '2026-02-14T01:02:03.000Z',
      })
    )

    await useNoteStore.getState().saveNote('n1', { title: 'After' })
    expect(mockApi.notes[':id'].$patch).toHaveBeenCalledWith({
      param: { id: 'n1' },
      json: { title: 'After' },
    })
  })

  it('deletes note and clears current note when matched', async () => {
    mockApi.notes[':id'].$delete.mockResolvedValue(new Response(null, { status: 200 }))

    useNoteStore.setState({
      notes: [makeListItem({ id: 'n1', title: 'First' })],
      currentNote: {
        id: 'n1',
        title: 'First',
        content: 'A',
        createdAt: '2026-02-14T01:02:03.000Z',
        updatedAt: '2026-02-14T01:02:03.000Z',
      },
    })

    await useNoteStore.getState().deleteNote('n1')
    const state = useNoteStore.getState()

    expect(state.notes).toHaveLength(0)
    expect(state.currentNote).toBeNull()
  })

  it('removeNoteOptimistic removes note and clears currentNote if matched', () => {
    useNoteStore.setState({
      notes: [
        makeListItem({ id: 'n1', updatedAt: '2026-02-14T01:00:00.000Z' }),
        makeListItem({ id: 'n2', updatedAt: '2026-02-14T00:00:00.000Z' }),
      ],
      currentNote: {
        id: 'n1',
        title: 'Note',
        content: '',
        createdAt: '2026-02-14T00:00:00.000Z',
        updatedAt: '2026-02-14T01:00:00.000Z',
      },
    })

    useNoteStore.getState().removeNoteOptimistic('n1')

    const state = useNoteStore.getState()
    expect(state.notes).toHaveLength(1)
    expect(state.notes[0]?.id).toBe('n2')
    expect(state.currentNote).toBeNull()
  })

  it('removeNoteOptimistic does not clear currentNote when id does not match', () => {
    useNoteStore.setState({
      notes: [makeListItem({ id: 'n1' }), makeListItem({ id: 'n2' })],
      currentNote: {
        id: 'n2',
        title: 'Other',
        content: '',
        createdAt: '2026-02-14T00:00:00.000Z',
        updatedAt: '2026-02-14T00:00:00.000Z',
      },
    })

    useNoteStore.getState().removeNoteOptimistic('n1')

    const state = useNoteStore.getState()
    expect(state.notes).toHaveLength(1)
    expect(state.currentNote?.id).toBe('n2')
  })

  it('restoreNote inserts note in updatedAt-sorted position', () => {
    useNoteStore.setState({
      notes: [
        makeListItem({ id: 'n1', updatedAt: '2026-02-14T02:00:00.000Z' }),
        makeListItem({ id: 'n3', updatedAt: '2026-02-14T00:00:00.000Z' }),
      ],
    })

    useNoteStore
      .getState()
      .restoreNote(makeListItem({ id: 'n2', updatedAt: '2026-02-14T01:00:00.000Z' }))

    const ids = useNoteStore.getState().notes.map((n) => n.id)
    expect(ids).toEqual(['n1', 'n2', 'n3'])
  })

  it('fetchMoreNotes appends notes using cursor and updates hasMore', async () => {
    const item1 = makeListItem({ id: 'n1', updatedAt: '2026-02-14T01:00:00.000Z' })
    const item2 = makeListItem({ id: 'n2', updatedAt: '2026-02-14T00:00:00.000Z' })

    useNoteStore.setState({
      notes: [item1],
      hasMore: true,
      nextCursor: '2026-02-14T01:00:00.000Z',
      nextCursorId: 'n1',
      isFetchingMore: false,
    })

    mockApi.notes.$get.mockResolvedValueOnce(
      jsonResponse({ data: [item2], nextCursor: null, nextCursorId: null })
    )

    await useNoteStore.getState().fetchMoreNotes()

    const state = useNoteStore.getState()
    expect(state.notes).toHaveLength(2)
    expect(state.notes[1]?.id).toBe('n2')
    expect(state.hasMore).toBe(false)
    expect(state.isFetchingMore).toBe(false)
    expect(mockApi.notes.$get).toHaveBeenCalledWith({
      query: { cursor: '2026-02-14T01:00:00.000Z', cursorId: 'n1' },
    })
  })

  it('fetchMoreNotes is no-op when hasMore is false', async () => {
    useNoteStore.setState({ hasMore: false })
    await useNoteStore.getState().fetchMoreNotes()
    expect(mockApi.notes.$get).not.toHaveBeenCalled()
  })

  it('fetchMoreNotes is no-op when already fetching more', async () => {
    useNoteStore.setState({ hasMore: true, isFetchingMore: true })
    await useNoteStore.getState().fetchMoreNotes()
    expect(mockApi.notes.$get).not.toHaveBeenCalled()
  })
})
