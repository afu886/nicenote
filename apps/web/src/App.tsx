import { useEffect } from 'react'

import { NoteEditorPane } from './components/NoteEditorPane'
import { NotesSidebar } from './components/NotesSidebar'
import { useDebouncedNoteSave } from './hooks/useDebouncedNoteSave'
import { useSidebarLayout } from './hooks/useSidebarLayout'
import { useTheme } from './hooks/useTheme'
import { useNoteStore } from './store/useNoteStore'

export default function App() {
  useTheme()

  const fetchNotes = useNoteStore((state) => state.fetchNotes)
  const saveNote = useNoteStore((state) => state.saveNote)
  const { scheduleSave, cancelPendingSave } = useDebouncedNoteSave({ saveNote })
  const {
    isSidebarOpen,
    isMobile,
    sidebarWidth,
    isResizing,
    openSidebar,
    toggleSidebar,
    startResizing,
  } = useSidebarLayout()

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  return (
    <div className="flex h-screen overflow-hidden">
      <NotesSidebar
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
        sidebarWidth={sidebarWidth}
        isResizing={isResizing}
        openSidebar={openSidebar}
        toggleSidebar={toggleSidebar}
        startResizing={startResizing}
        cancelPendingSave={cancelPendingSave}
      />
      <NoteEditorPane
        isSidebarOpen={isSidebarOpen}
        sidebarWidth={sidebarWidth}
        scheduleSave={scheduleSave}
      />
    </div>
  )
}
