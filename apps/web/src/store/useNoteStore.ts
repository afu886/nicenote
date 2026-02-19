import { create } from 'zustand'

import {
  DEFAULT_NOTE_TITLE,
  generateSummary,
  type NoteListItem,
  noteListItemSchema,
  type NoteSelect,
  noteSelectSchema,
  type NoteUpdateInput,
} from '@nicenote/shared'

import i18n from '../i18n'
import { api } from '../lib/api'

import { useToastStore } from './useToastStore'

interface NoteStore {
  notes: NoteListItem[]
  currentNote: NoteSelect | null
  isFetching: boolean
  isCreating: boolean
  error: string | null
  hasMore: boolean
  nextCursor: string | null
  nextCursorId: string | null
  isFetchingMore: boolean
  fetchNotes: () => Promise<void>
  fetchMoreNotes: () => Promise<void>
  selectNote: (note: NoteListItem | null) => Promise<void>
  createNote: () => Promise<void>
  updateNoteLocal: (id: string, updates: NoteUpdateInput) => void
  saveNote: (id: string, updates: NoteUpdateInput) => Promise<NoteSelect>
  deleteNote: (id: string) => Promise<void>
  removeNoteOptimistic: (id: string) => void
  restoreNote: (note: NoteListItem) => void
}

function normalizeNote(raw: unknown): NoteSelect | null {
  const result = noteSelectSchema.safeParse(raw)
  if (result.success) return result.data
  console.warn('[useNoteStore] normalizeNote parse failed', result.error)
  return null
}

function normalizeListItem(raw: unknown): NoteListItem | null {
  const result = noteListItemSchema.safeParse(raw)
  if (result.success) return result.data
  console.warn('[useNoteStore] normalizeListItem parse failed', result.error)
  return null
}

function normalizeNoteList(raw: unknown): NoteListItem[] {
  if (!Array.isArray(raw)) return []
  return raw.reduce<NoteListItem[]>((acc, item) => {
    const normalized = normalizeListItem(item)
    if (normalized) acc.push(normalized)
    return acc
  }, [])
}

let selectAbortController: AbortController | null = null
let selectNoteSeq = 0

export const useNoteStore = create<NoteStore>((set) => ({
  notes: [],
  currentNote: null,
  isFetching: false,
  isCreating: false,
  error: null,
  hasMore: false,
  nextCursor: null,
  nextCursorId: null,
  isFetchingMore: false,

  fetchNotes: async () => {
    set({ isFetching: true, error: null })
    try {
      const res = await api.notes.$get({ query: {} })
      if (res.ok) {
        const json = await res.json()
        set({
          notes: normalizeNoteList(json.data),
          hasMore: json.nextCursor !== null,
          nextCursor: json.nextCursor,
          nextCursorId: json.nextCursorId,
        })
      } else {
        set({
          error: i18n.t('store.failedToFetchNotes', { status: res.status }),
          hasMore: false,
          nextCursor: null,
          nextCursorId: null,
        })
      }
    } catch {
      set({ error: i18n.t('store.networkErrorFetchNotes') })
    } finally {
      set({ isFetching: false })
    }
  },

  fetchMoreNotes: async () => {
    const { nextCursor, nextCursorId, isFetchingMore, hasMore } = useNoteStore.getState()
    if (!hasMore || isFetchingMore) return
    set({ isFetchingMore: true })
    try {
      const query: Record<string, string> = {}
      if (nextCursor) query.cursor = nextCursor
      if (nextCursorId) query.cursorId = nextCursorId
      const res = await api.notes.$get({ query })
      if (res.ok) {
        const json = await res.json()
        set((state) => ({
          notes: [...state.notes, ...normalizeNoteList(json.data)],
          hasMore: json.nextCursor !== null,
          nextCursor: json.nextCursor,
          nextCursorId: json.nextCursorId,
        }))
      }
    } catch {
      // silently fail — user can scroll up and back to retry
    } finally {
      set({ isFetchingMore: false })
    }
  },

  selectNote: async (note) => {
    if (!note) {
      selectAbortController?.abort()
      selectAbortController = null
      selectNoteSeq++
      set({ currentNote: null })
      return
    }
    selectAbortController?.abort()
    selectAbortController = new AbortController()
    const signal = selectAbortController.signal
    const seq = ++selectNoteSeq
    try {
      const res = await api.notes[':id'].$get({ param: { id: note.id } }, { init: { signal } })
      if (seq !== selectNoteSeq) return
      if (res.ok) {
        const full = normalizeNote(await res.json())
        set({ currentNote: full })
      } else {
        useToastStore.getState().addToast(i18n.t('store.failedToFetchNote', { status: res.status }))
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (seq !== selectNoteSeq) return
      useToastStore.getState().addToast(i18n.t('store.networkErrorFetchNote'))
    }
  },

  createNote: async () => {
    set({ isCreating: true })
    try {
      const res = await api.notes.$post({
        json: { title: DEFAULT_NOTE_TITLE, content: '' },
      })
      if (res.ok) {
        const newNote = normalizeNote(await res.json())
        if (!newNote) {
          useToastStore.getState().addToast(i18n.t('store.failedToParseNote'))
          return
        }
        const listItem: NoteListItem = {
          id: newNote.id,
          title: newNote.title,
          summary: generateSummary(newNote.content ?? ''),
          createdAt: newNote.createdAt,
          updatedAt: newNote.updatedAt,
        }
        set((state) => ({
          notes: [listItem, ...state.notes],
          currentNote: newNote,
        }))
      } else {
        useToastStore
          .getState()
          .addToast(i18n.t('store.failedToCreateNote', { status: res.status }))
      }
    } catch {
      useToastStore.getState().addToast(i18n.t('store.networkErrorCreateNote'))
    } finally {
      set({ isCreating: false })
    }
  },

  updateNoteLocal: (id, updates) => {
    const now = new Date().toISOString()
    set((state) => {
      const listUpdates: Partial<NoteListItem> = { updatedAt: now }
      if (updates.title !== undefined) listUpdates.title = updates.title
      if (updates.content !== undefined)
        listUpdates.summary = generateSummary(updates.content ?? '')
      const newNotes = state.notes.map((n) => (n.id === id ? { ...n, ...listUpdates } : n))
      const noteFieldUpdates: Partial<NoteSelect> = { updatedAt: now }
      if (updates.title !== undefined) noteFieldUpdates.title = updates.title
      if (updates.content !== undefined) noteFieldUpdates.content = updates.content
      const newCurrentNote =
        state.currentNote?.id === id
          ? { ...state.currentNote, ...noteFieldUpdates }
          : state.currentNote
      return { notes: newNotes, currentNote: newCurrentNote }
    })
  },

  saveNote: async (id, updates) => {
    const res = await api.notes[':id'].$patch({
      param: { id },
      json: updates,
    })
    if (!res.ok) {
      throw new Error(`Save failed: ${res.status}`)
    }
    const saved = normalizeNote(await res.json())
    if (!saved) {
      throw new Error('Save returned invalid data')
    }
    set((state) => {
      const serverFields = { updatedAt: saved.updatedAt, createdAt: saved.createdAt }
      const notes = state.notes.map((n) => (n.id === saved.id ? { ...n, ...serverFields } : n))
      const currentNote =
        state.currentNote?.id === saved.id
          ? { ...state.currentNote, ...serverFields }
          : state.currentNote
      return { notes, currentNote }
    })
    return saved
  },

  deleteNote: async (id) => {
    try {
      const res = await api.notes[':id'].$delete({ param: { id } })
      if (res.ok) {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
          currentNote: state.currentNote?.id === id ? null : state.currentNote,
        }))
      } else {
        useToastStore
          .getState()
          .addToast(i18n.t('store.failedToDeleteNote', { status: res.status }))
      }
    } catch {
      useToastStore.getState().addToast(i18n.t('store.networkErrorDeleteNote'))
    }
  },

  removeNoteOptimistic: (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      currentNote: state.currentNote?.id === id ? null : state.currentNote,
    }))
  },

  restoreNote: (note) => {
    set((state) => {
      const notes = [...state.notes, note].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      return { notes }
    })
  },
}))
