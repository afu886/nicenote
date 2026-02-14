import { create } from 'zustand'

import { api } from '../lib/api'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface NoteStore {
  notes: Note[]
  currentNote: Note | null
  isLoading: boolean
  fetchNotes: () => Promise<void>
  selectNote: (note: Note | null) => void
  createNote: () => Promise<void>
  updateNoteLocal: (id: string, updates: Partial<Note>) => void
  saveNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

function toIsoNow() {
  return new Date().toISOString()
}

function normalizeNote(raw: unknown): Note | null {
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

function normalizeNoteList(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return []

  return raw.reduce<Note[]>((notes, item) => {
    const normalized = normalizeNote(item)
    if (normalized) {
      notes.push(normalized)
    }
    return notes
  }, [])
}

export const useNoteStore = create<NoteStore>((set) => ({
  notes: [],
  currentNote: null,
  isLoading: false,

  fetchNotes: async () => {
    set({ isLoading: true })
    try {
      const res = await api.notes.$get()
      if (res.ok) {
        const data = await res.json()
        set({ notes: normalizeNoteList(data) })
      } else {
        console.error('Failed to fetch notes:', res.status)
      }
    } catch (error) {
      console.error('Network error while fetching notes:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  selectNote: (note) => {
    set({ currentNote: note })
  },

  createNote: async () => {
    set({ isLoading: true })
    try {
      const res = await api.notes.$post({
        json: { title: 'Untitled', content: '' },
      })
      if (res.ok) {
        const newNote = normalizeNote(await res.json())
        if (!newNote) {
          console.error('Failed to normalize created note response')
          return
        }

        set((state) => ({
          notes: [newNote, ...state.notes],
          currentNote: newNote,
        }))
      } else {
        const errorText = await res.text()
        console.error('Failed to create note:', res.status, errorText)
      }
    } catch (error) {
      console.error('Error creating note:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  updateNoteLocal: (id, updates) => {
    set((state) => {
      const newNotes = state.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      )
      const newCurrentNote =
        state.currentNote?.id === id
          ? { ...state.currentNote, ...updates, updatedAt: new Date().toISOString() }
          : state.currentNote

      return { notes: newNotes, currentNote: newCurrentNote }
    })
  },

  saveNote: async (id, updates) => {
    try {
      await api.notes[':id'].$patch({
        param: { id },
        json: updates,
      })
    } catch (error) {
      console.error('Failed to save note:', error)
    }
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
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  },
}))
