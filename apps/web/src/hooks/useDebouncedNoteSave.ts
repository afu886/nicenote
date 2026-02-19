import { useCallback, useEffect, useRef, useState } from 'react'

import { debounce, type NoteSelect, type NoteUpdateInput } from '@nicenote/shared'

import i18n from '../i18n'
import { useNoteStore } from '../store/useNoteStore'
import { useToastStore } from '../store/useToastStore'

export const MAX_RETRIES = 3
export const RETRY_DELAYS = [1000, 2000, 4000]
const SAVED_DISPLAY_MS = 2000

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved'

interface UseDebouncedNoteSaveOptions {
  delayMs?: number
  saveNote: (id: string, updates: NoteUpdateInput) => Promise<NoteSelect>
}

type PendingSaveEntry = {
  updates: NoteUpdateInput
  debouncedSave: ReturnType<typeof debounce<() => void>>
  saving: boolean
}

export async function attemptSave(
  saveNote: (id: string, updates: NoteUpdateInput) => Promise<NoteSelect>,
  id: string,
  updates: NoteUpdateInput
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await saveNote(id, updates)
      return true
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      }
    }
  }
  return false
}

export function useDebouncedNoteSave({ saveNote, delayMs = 1000 }: UseDebouncedNoteSaveOptions) {
  const pendingSavesRef = useRef<Map<string, PendingSaveEntry>>(new Map())
  const saveNoteRef = useRef(saveNote)
  const addToast = useToastStore((state) => state.addToast)
  const addToastRef = useRef(addToast)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    saveNoteRef.current = saveNote
  }, [saveNote])

  useEffect(() => {
    addToastRef.current = addToast
  }, [addToast])

  const flushEntry = useCallback(async (id: string) => {
    const pending = pendingSavesRef.current.get(id)
    if (!pending || pending.saving) return

    const updates = pending.updates
    if (Object.keys(updates).length === 0) {
      pendingSavesRef.current.delete(id)
      return
    }

    // Snapshot before save — used for rollback if all retries fail
    const storeState = useNoteStore.getState()
    const snapshotListItem = storeState.notes.find((n) => n.id === id)
    const snapshotCurrentNote =
      storeState.currentNote?.id === id ? { ...storeState.currentNote } : null

    pending.saving = true
    pending.updates = {}
    setSaveStatus('saving')

    const success = await attemptSave(saveNoteRef.current, id, updates)

    if (success) {
      const current = pendingSavesRef.current.get(id)
      if (current && Object.keys(current.updates).length > 0) {
        // New updates accumulated during save — re-trigger debounced save
        current.saving = false
        setSaveStatus('unsaved')
        current.debouncedSave()
      } else if (current) {
        pendingSavesRef.current.delete(id)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        setSaveStatus('saved')
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), SAVED_DISPLAY_MS)
      }
    } else {
      // All retries exhausted — roll back optimistic state to pre-save snapshot
      useNoteStore.setState((state) => ({
        notes: snapshotListItem
          ? state.notes.map((n) => (n.id === id ? snapshotListItem : n))
          : state.notes,
        currentNote:
          snapshotCurrentNote !== null && state.currentNote?.id === id
            ? snapshotCurrentNote
            : state.currentNote,
      }))

      const current = pendingSavesRef.current.get(id)
      if (current) {
        current.updates = { ...updates, ...current.updates }
        current.saving = false
      }
      setSaveStatus('unsaved')
      addToastRef.current(i18n.t('toast.failedToSave'))
    }
  }, [])

  const cancelPendingSave = useCallback((id: string) => {
    const pending = pendingSavesRef.current.get(id)
    if (!pending) return
    pending.debouncedSave.cancel()
    pendingSavesRef.current.delete(id)
    if (pendingSavesRef.current.size === 0) {
      setSaveStatus('idle')
    }
  }, [])

  const scheduleSave = useCallback(
    (id: string, updates: NoteUpdateInput) => {
      const pendingSaves = pendingSavesRef.current
      let entry = pendingSaves.get(id)

      if (!entry) {
        const debouncedSave = debounce(() => {
          void flushEntry(id)
        }, delayMs)

        entry = {
          updates: {},
          debouncedSave,
          saving: false,
        }
        pendingSaves.set(id, entry)
      }

      entry.updates = { ...entry.updates, ...updates }
      setSaveStatus('unsaved')
      entry.debouncedSave()
    },
    [delayMs, flushEntry]
  )

  useEffect(() => {
    const pendingSaves = pendingSavesRef.current

    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

      for (const [id, pending] of pendingSaves.entries()) {
        pending.debouncedSave.cancel()
        if (Object.keys(pending.updates).length === 0) continue
        void attemptSave(saveNoteRef.current, id, pending.updates)
      }

      pendingSaves.clear()
    }
  }, [])

  return {
    scheduleSave,
    cancelPendingSave,
    saveStatus,
  }
}
