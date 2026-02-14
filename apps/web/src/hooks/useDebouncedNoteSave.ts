import { useCallback, useEffect, useRef } from 'react'

import type { Note } from '../store/useNoteStore'

interface UseDebouncedNoteSaveOptions {
  delayMs?: number
  saveNote: (id: string, updates: Partial<Note>) => Promise<void>
}

type PendingSaveEntry = {
  updates: Partial<Note>
  timer: ReturnType<typeof setTimeout>
}

export function useDebouncedNoteSave({ saveNote, delayMs = 1000 }: UseDebouncedNoteSaveOptions) {
  const pendingSavesRef = useRef<Map<string, PendingSaveEntry>>(new Map())

  const cancelPendingSave = useCallback((id: string) => {
    const pending = pendingSavesRef.current.get(id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingSavesRef.current.delete(id)
  }, [])

  const scheduleSave = useCallback(
    (id: string, updates: Partial<Note>) => {
      const previous = pendingSavesRef.current.get(id)
      const mergedUpdates = { ...(previous?.updates ?? {}), ...updates }

      if (previous) {
        clearTimeout(previous.timer)
      }

      const timer = setTimeout(() => {
        const pending = pendingSavesRef.current.get(id)
        if (!pending) return

        pendingSavesRef.current.delete(id)
        if (Object.keys(pending.updates).length === 0) return
        void saveNote(id, pending.updates)
      }, delayMs)

      pendingSavesRef.current.set(id, {
        updates: mergedUpdates,
        timer,
      })
    },
    [delayMs, saveNote]
  )

  useEffect(() => {
    const pendingSaves = pendingSavesRef.current

    return () => {
      for (const [id, pending] of pendingSaves.entries()) {
        clearTimeout(pending.timer)
        if (Object.keys(pending.updates).length === 0) continue
        void saveNote(id, pending.updates)
      }

      pendingSaves.clear()
    }
  }, [saveNote])

  return {
    scheduleSave,
    cancelPendingSave,
  }
}
