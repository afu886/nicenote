import { create } from 'zustand'

import type { NoteListItem, NoteSelect, NoteUpdateInput } from '@nicenote/shared'
import { generateSummary } from '@nicenote/shared'

import i18n from '../i18n'
import { api } from '../lib/api'

import { useToastStore } from './useToastStore'

interface NoteStore {
  notes: NoteListItem[]
  currentNote: NoteSelect | null
  isFetching: boolean
  isCreating: boolean
  error: string | null
  fetchNotes: () => Promise<void>
  selectNote: (note: NoteListItem | null) => Promise<void>
  createNote: () => Promise<void>
  updateNoteLocal: (id: string, updates: NoteUpdateInput) => void
  saveNote: (id: string, updates: NoteUpdateInput) => Promise<NoteSelect>
  deleteNote: (id: string) => Promise<void>
}

function toIsoNow() {
  return new Date().toISOString()
}

function normalizeListItem(raw: unknown): NoteListItem | null {
  if (typeof raw !== 'object' || raw === null) return null

  const data = raw as Record<string, unknown>
  const id = typeof data.id === 'string' ? data.id : ''
  if (!id) return null

  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : toIsoNow()
  const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : createdAt

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    summary: typeof data.summary === 'string' ? data.summary : null,
    createdAt,
    updatedAt,
  }
}

function normalizeNote(raw: unknown): NoteSelect | null {
  if (typeof raw !== 'object' || raw === null) return null

  const data = raw as Record<string, unknown>
  const id = typeof data.id === 'string' ? data.id : ''
  if (!id) return null

  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : toIsoNow()
  const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : createdAt

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    content: typeof data.content === 'string' ? data.content : '',
    createdAt,
    updatedAt,
  }
}

function normalizeNoteList(raw: unknown): NoteListItem[] {
  if (!Array.isArray(raw)) return []

  return raw.reduce<NoteListItem[]>((notes, item) => {
    const normalized = normalizeListItem(item)
    if (normalized) {
      notes.push(normalized)
    }
    return notes
  }, [])
}

let selectNoteSeq = 0

export const useNoteStore = create<NoteStore>((set) => ({
  notes: [],
  currentNote: null,
  isFetching: false,
  isCreating: false,
  error: null,

  fetchNotes: async () => {
    set({ isFetching: true, error: null })
    try {
      const res = await api.notes.$get({ query: {} })
      if (res.ok) {
        const json = await res.json()
        set({ notes: normalizeNoteList(json.data) })
      } else {
        set({ error: i18n.t('store.failedToFetchNotes', { status: res.status }) })
      }
    } catch {
      set({ error: i18n.t('store.networkErrorFetchNotes') })
    } finally {
      set({ isFetching: false })
    }
  },

  selectNote: async (note) => {
    if (!note) {
      selectNoteSeq++
      set({ currentNote: null })
      return
    }
    const seq = ++selectNoteSeq
    try {
      const res = await api.notes[':id'].$get({ param: { id: note.id } })
      if (seq !== selectNoteSeq) return
      if (res.ok) {
        const full = normalizeNote(await res.json())
        set({ currentNote: full })
      } else {
        useToastStore.getState().addToast(i18n.t('store.failedToFetchNote', { status: res.status }))
      }
    } catch {
      if (seq !== selectNoteSeq) return
      useToastStore.getState().addToast(i18n.t('store.networkErrorFetchNote'))
    }
  },

  createNote: async () => {
    set({ isCreating: true })
    try {
      const res = await api.notes.$post({
        json: { title: 'Untitled', content: '' },
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
          summary: generateSummary(newNote.content),
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
      if (updates.content !== undefined) listUpdates.summary = generateSummary(updates.content)
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
      const res = await api.notes[':id'].$delete({
        param: { id },
      })
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
}))
