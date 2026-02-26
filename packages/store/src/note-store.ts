import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { NoteListRow, NoteRow } from '@nicenote/database'
import { getDatabase, NoteService } from '@nicenote/database'
import { debounce } from '@nicenote/shared'

// ──────────────────────────────────────────────────────────────────────────────
// State & actions
// ──────────────────────────────────────────────────────────────────────────────

export interface NoteStoreState {
  notes: Record<string, NoteListRow>
  noteIds: string[]
  activeNote: NoteRow | null
  selectedNoteId: string | null
  nextCursor: string | null
  isLoading: boolean
  isSaving: boolean
}

export interface NoteStoreActions {
  fetchNotes: (opts?: { folderId?: string | null; reset?: boolean }) => void
  fetchMore: () => void
  selectNote: (id: string | null) => void
  createNote: (opts?: { folderId?: string | null }) => NoteListRow
  updateNoteContent: (id: string, content: string) => void
  updateNoteTitle: (id: string, title: string) => void
  deleteNote: (id: string) => void
  searchNotes: (query: string) => NoteListRow[]
}

export type NoteStore = NoteStoreState & NoteStoreActions

// ──────────────────────────────────────────────────────────────────────────────
// Lazy service accessor — database must be initialised before calling
// ──────────────────────────────────────────────────────────────────────────────

function svc(): NoteService {
  return new NoteService(getDatabase())
}

// ──────────────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────────────

export const useNoteStore = create<NoteStore>()(
  immer((set, get) => {
    // 1-second debounced persist — runs outside Immer so it only touches DB
    const persistContent = debounce((id: string, content: string) => {
      set((s) => {
        s.isSaving = true
      })
      const summary = content.slice(0, 140).replace(/\s+/g, ' ').trim() || null
      svc().update(id, { content, summary })
      set((s) => {
        s.isSaving = false
        if (s.notes[id]) s.notes[id].summary = summary
      })
    }, 1000)

    return {
      notes: {},
      noteIds: [],
      activeNote: null,
      selectedNoteId: null,
      nextCursor: null,
      isLoading: false,
      isSaving: false,

      fetchNotes(opts = {}) {
        set((s) => {
          s.isLoading = true
          if (opts.reset) {
            s.notes = {}
            s.noteIds = []
            s.nextCursor = null
          }
        })
        const { data, nextCursor } = svc().list({ folderId: opts.folderId })
        set((s) => {
          for (const n of data) {
            s.notes[n.id] = n
            if (!s.noteIds.includes(n.id)) s.noteIds.push(n.id)
          }
          s.nextCursor = nextCursor
          s.isLoading = false
        })
      },

      fetchMore() {
        const { nextCursor, isLoading } = get()
        if (!nextCursor || isLoading) return
        const [updatedAt, id] = nextCursor.split('__')
        set((s) => {
          s.isLoading = true
        })
        const { data, nextCursor: nc } = svc().list({ cursor: { updatedAt, id } })
        set((s) => {
          for (const n of data) {
            s.notes[n.id] = n
            if (!s.noteIds.includes(n.id)) s.noteIds.push(n.id)
          }
          s.nextCursor = nc
          s.isLoading = false
        })
      },

      selectNote(id) {
        if (!id) {
          set((s) => {
            s.selectedNoteId = null
            s.activeNote = null
          })
          return
        }
        const full = svc().getById(id)
        set((s) => {
          s.selectedNoteId = id
          s.activeNote = full
        })
      },

      createNote(opts = {}) {
        const note = svc().create({ folderId: opts.folderId })
        const listRow: NoteListRow = {
          id: note.id,
          title: note.title,
          summary: null,
          folderId: note.folderId,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        }
        set((s) => {
          s.notes[note.id] = listRow
          s.noteIds.unshift(note.id)
          s.selectedNoteId = note.id
          s.activeNote = note
        })
        return listRow
      },

      updateNoteContent(id, content) {
        set((s) => {
          if (s.activeNote?.id === id) s.activeNote.content = content
        })
        persistContent(id, content)
      },

      updateNoteTitle(id, title) {
        set((s) => {
          if (s.activeNote?.id === id) s.activeNote.title = title
          if (s.notes[id]) s.notes[id].title = title
        })
        svc().update(id, { title })
      },

      deleteNote(id) {
        svc().delete(id)
        set((s) => {
          delete s.notes[id]
          s.noteIds = s.noteIds.filter((nid) => nid !== id)
          if (s.selectedNoteId === id) {
            s.selectedNoteId = null
            s.activeNote = null
          }
        })
      },

      searchNotes(query) {
        return svc().search({ query })
      },
    }
  })
)
