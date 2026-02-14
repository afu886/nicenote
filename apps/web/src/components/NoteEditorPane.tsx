import { formatDistanceToNow } from 'date-fns'
import { FileText, Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { NicenoteEditor } from '@nicenote/editor'

import { useMinuteTicker } from '../hooks/useMinuteTicker'
import { WEB_ICON_SM_CLASS } from '../lib/class-names'
import type { Note } from '../store/useNoteStore'
import { useNoteStore } from '../store/useNoteStore'

interface NoteEditorPaneProps {
  isSidebarOpen: boolean
  sidebarWidth: number
  scheduleSave: (id: string, updates: Partial<Note>) => void
}

export function NoteEditorPane({ isSidebarOpen, sidebarWidth, scheduleSave }: NoteEditorPaneProps) {
  useMinuteTicker()
  const currentNote = useNoteStore((state) => state.currentNote)
  const { createNote, updateNoteLocal } = useNoteStore(
    useShallow((state) => ({
      createNote: state.createNote,
      updateNoteLocal: state.updateNoteLocal,
    }))
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentNote) return
    const newTitle = e.target.value
    updateNoteLocal(currentNote.id, { title: newTitle })
    scheduleSave(currentNote.id, { title: newTitle })
  }

  const handleContentChange = (newContent: string) => {
    if (!currentNote) return
    updateNoteLocal(currentNote.id, { content: newContent })
    scheduleSave(currentNote.id, { content: newContent })
  }

  return (
    <main
      className="flex flex-1 flex-col transition-all duration-300"
      style={{ marginLeft: isSidebarOpen ? `${sidebarWidth}px` : 0 }}
    >
      {currentNote ? (
        <>
          <div className="px-8 pt-12 pb-4">
            <input
              type="text"
              className="w-full border-none text-4xl font-bold placeholder:text-muted-foreground/30 focus:ring-0"
              placeholder="Note Title"
              value={currentNote.title}
              onChange={handleTitleChange}
            />
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Updated {formatDistanceToNow(new Date(currentNote.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden px-8 pb-8">
            <NicenoteEditor value={currentNote.content} onChange={handleContentChange} />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 opacity-20" />
          </div>
          <p className="text-lg font-medium">Select a note to view or edit</p>
          <p className="text-sm opacity-70">Choose from the sidebar or create a new one</p>
          <button
            onClick={() => void createNote()}
            className="mt-6 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className={WEB_ICON_SM_CLASS} />
            Create New Note
          </button>
        </div>
      )}
    </main>
  )
}
