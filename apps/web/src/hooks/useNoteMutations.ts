import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  DEFAULT_NOTE_TITLE,
  generateSummary,
  type NoteListItem,
  type NoteSelect,
  noteSelectSchema,
  type NoteUpdateInput,
} from '@nicenote/shared'

import i18n from '../i18n'
import { api, throwApiError } from '../lib/api'
import { useFolderStore } from '../store/useFolderStore'
import { useNoteStore } from '../store/useNoteStore'
import { useTagFilterStore } from '../store/useTagFilterStore'
import { useToastStore } from '../store/useToastStore'

import { noteDetailQueryKey } from './useNoteDetail'
import { NOTES_QUERY_KEY, notesQueryKey } from './useNotesQuery'

// ── Cache types ──

type NotesPage = {
  data: NoteListItem[]
  nextCursor: string | null
  nextCursorId: string | null
}

type NotesInfiniteData = InfiniteData<NotesPage>

// ── Cache helpers (exported for useDebouncedNoteSave & NotesSidebar) ──

/** Search all notes query caches (across folder filters) for a note */
export function getNoteFromListCache(
  queryClient: QueryClient,
  id: string
): NoteListItem | undefined {
  const allCaches = queryClient.getQueriesData<NotesInfiniteData>({ queryKey: NOTES_QUERY_KEY })
  for (const [, data] of allCaches) {
    if (!data) continue
    for (const page of data.pages) {
      const note = page.data.find((n) => n.id === id)
      if (note) return note
    }
  }
  return undefined
}

/** Update a note in all matching notes query caches */
export function updateNoteInListCache(
  queryClient: QueryClient,
  id: string,
  updater: (note: NoteListItem) => NoteListItem
) {
  queryClient.setQueriesData<NotesInfiniteData>({ queryKey: NOTES_QUERY_KEY }, (old) => {
    if (!old) return old
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((note) => (note.id === id ? updater(note) : note)),
      })),
    }
  })
}

/** Remove a note from all matching notes query caches */
export function removeNoteFromListCache(queryClient: QueryClient, id: string) {
  queryClient.setQueriesData<NotesInfiniteData>({ queryKey: NOTES_QUERY_KEY }, (old) => {
    if (!old) return old
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.filter((note) => note.id !== id),
      })),
    }
  })
}

/** Restore a note to the currently active notes query cache */
export function restoreNoteToListCache(queryClient: QueryClient, note: NoteListItem) {
  const folderId = useFolderStore.getState().selectedFolderId
  const tagId = useTagFilterStore.getState().selectedTagId
  const key = notesQueryKey(folderId, tagId)
  queryClient.setQueryData<NotesInfiniteData>(key, (old) => {
    if (!old || old.pages.length === 0) return old
    const firstPage = old.pages[0]
    if (!firstPage) return old
    const allNotes = [...firstPage.data, note].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    const updatedPage: NotesPage = {
      data: allNotes,
      nextCursor: firstPage.nextCursor,
      nextCursorId: firstPage.nextCursorId,
    }
    return { ...old, pages: [updatedPage, ...old.pages.slice(1)] }
  })
}

export function updateNoteLocal(queryClient: QueryClient, id: string, updates: NoteUpdateInput) {
  const now = new Date().toISOString()

  queryClient.setQueryData<NoteSelect>(noteDetailQueryKey(id), (old) => {
    if (!old) return old
    const patch: Partial<NoteSelect> = { updatedAt: now }
    if (updates.title !== undefined) patch.title = updates.title
    if (updates.content !== undefined) patch.content = updates.content
    return { ...old, ...patch }
  })

  updateNoteInListCache(queryClient, id, (note) => {
    const patch: Partial<NoteListItem> = { updatedAt: now }
    if (updates.title !== undefined) patch.title = updates.title
    if (updates.content !== undefined) patch.summary = generateSummary(updates.content)
    return { ...note, ...patch }
  })
}

// ── Save helper (used by useDebouncedNoteSave) ──

export async function saveNoteToServer(id: string, updates: NoteUpdateInput): Promise<NoteSelect> {
  const res = await api.notes[':id'].$patch({ param: { id }, json: updates })
  if (!res.ok) await throwApiError(res, `Save failed: ${res.status}`)
  const json = await res.json()
  const parsed = noteSelectSchema.safeParse(json)
  if (!parsed.success) throw new Error('Save returned invalid data')
  return parsed.data
}

// ── Mutations ──

export function useCreateNote() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (folderId?: string | null) => {
      const res = await api.notes.$post({
        json: { title: DEFAULT_NOTE_TITLE, content: '', folderId: folderId ?? null },
      })
      if (!res.ok) await throwApiError(res, `Create failed: ${res.status}`)
      const body = await res.json()
      const parsed = noteSelectSchema.safeParse(body)
      if (!parsed.success) throw new Error('Invalid note data')
      return parsed.data
    },
    onSuccess: (newNote) => {
      queryClient.setQueryData(noteDetailQueryKey(newNote.id), newNote)

      const listItem: NoteListItem = {
        id: newNote.id,
        title: newNote.title,
        summary: generateSummary(newNote.content),
        folderId: newNote.folderId,
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt,
      }

      // Add to the currently active list cache
      const activeFolderId = useFolderStore.getState().selectedFolderId
      const activeTagId = useTagFilterStore.getState().selectedTagId
      const key = notesQueryKey(activeFolderId, activeTagId)
      queryClient.setQueryData<NotesInfiniteData>(key, (old) => {
        if (!old || old.pages.length === 0) return old
        const firstPage = old.pages[0]
        if (!firstPage) return old
        const updatedPage: NotesPage = {
          data: [listItem, ...firstPage.data],
          nextCursor: firstPage.nextCursor,
          nextCursorId: firstPage.nextCursorId,
        }
        return { ...old, pages: [updatedPage, ...old.pages.slice(1)] }
      })

      useNoteStore.getState().selectNote(newNote.id)
    },
    onError: () => {
      addToast(i18n.t('store.networkErrorCreateNote'))
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.notes[':id'].$delete({ param: { id } })
      if (!res.ok) await throwApiError(res, `Delete failed: ${res.status}`)
    },
    onSuccess: (_, id) => {
      removeNoteFromListCache(queryClient, id)
      queryClient.removeQueries({ queryKey: noteDetailQueryKey(id) })
    },
    onError: () => {
      addToast(i18n.t('store.networkErrorDeleteNote'))
    },
  })
}
