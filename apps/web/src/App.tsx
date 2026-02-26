import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { noteSelectSchema } from '@nicenote/shared'
import { useIsBreakpoint } from '@nicenote/ui'

import { EditorErrorBoundary } from './components/ErrorBoundary'
import { ImportDialog } from './components/ImportDialog'
import { NotesSidebar } from './components/NotesSidebar'
import { SearchDialog } from './components/SearchDialog'
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal'
import { Toasts } from './components/Toasts'
import { useDebouncedNoteSave } from './hooks/useDebouncedNoteSave'
import { useFoldersQuery } from './hooks/useFoldersQuery'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useNoteDetail } from './hooks/useNoteDetail'
import { useCreateNote } from './hooks/useNoteMutations'
import { useNotesQuery } from './hooks/useNotesQuery'
import { api } from './lib/api'
import { downloadBlob, exportAllNotes } from './lib/export'
import { useFolderStore } from './store/useFolderStore'
import { useNoteStore } from './store/useNoteStore'
import { useSidebarStore } from './store/useSidebarStore'
import { useToastStore } from './store/useToastStore'

const NoteEditorPane = lazy(() =>
  import('./components/NoteEditorPane').then((m) => ({ default: m.NoteEditorPane }))
)

export default function App() {
  const { t } = useTranslation()
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId)
  const { data: currentNote } = useNoteDetail(selectedNoteId)
  const { scheduleSave, cancelPendingSave, saveStatus } = useDebouncedNoteSave()

  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  const closeImport = useCallback(() => setImportOpen(false), [])

  const addToast = useToastStore((s) => s.addToast)
  const createMutation = useCreateNote()
  const toggleSidebar = useSidebarStore((s) => s.toggle)

  const shortcutActions = useMemo(
    () => ({
      onSearch: () => setSearchOpen((prev) => !prev),
      onNewNote: () => createMutation.mutate(useFolderStore.getState().selectedFolderId),
      onToggleSidebar: () => toggleSidebar(),
      onShowHelp: () => setShortcutsOpen((prev) => !prev),
    }),
    [createMutation, toggleSidebar]
  )

  useGlobalShortcuts(shortcutActions)

  const { data: notesData } = useNotesQuery()
  const { data: folders = [] } = useFoldersQuery()

  const isMobile = useIsBreakpoint('max', 768)
  const isOpen = useSidebarStore((s) => s.isOpen)
  const width = useSidebarStore((s) => s.width)
  const closeSidebar = useSidebarStore((s) => s.close)

  useEffect(() => {
    document.title = currentNote
      ? `${currentNote.title || t('sidebar.untitled')} - Nicenote`
      : 'Nicenote'
  }, [currentNote, t])

  const mobileOverlayOpen = isMobile && isOpen

  const gridColumns = isMobile ? '0px 1fr' : isOpen ? `${width}px 1fr` : '48px 1fr'

  const handleShowShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const handleImport = useCallback(() => setImportOpen(true), [])

  const handleExportAll = useCallback(async () => {
    const noteIds = notesData?.pages.flatMap((p) => p.data.map((n) => n.id)) ?? []
    if (noteIds.length === 0) return

    try {
      // 并行获取所有笔记完整内容
      const results = await Promise.allSettled(
        noteIds.map(async (id) => {
          const res = await api.notes[':id'].$get({ param: { id } })
          if (!res.ok) return null
          const parsed = noteSelectSchema.safeParse(await res.json())
          return parsed.success ? parsed.data : null
        })
      )

      const fullNotes = results.flatMap((r) =>
        r.status === 'fulfilled' && r.value ? [r.value] : []
      )

      const blob = await exportAllNotes(fullNotes, folders)
      downloadBlob(blob, 'nicenote-export.zip')
    } catch {
      addToast(t('export.exportError'))
    }
  }, [notesData, folders, addToast, t])

  return (
    <div
      className="grid h-screen"
      style={{
        gridTemplateColumns: gridColumns,
        transition: 'grid-template-columns 300ms ease-in-out',
      }}
    >
      <NotesSidebar
        isMobile={isMobile}
        cancelPendingSave={cancelPendingSave}
        onShowShortcuts={handleShowShortcuts}
        onExportAll={() => void handleExportAll()}
        onImport={handleImport}
      />

      <EditorErrorBoundary>
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              {t('editor.loadingEditor')}
            </div>
          }
        >
          <NoteEditorPane
            scheduleSave={scheduleSave}
            saveStatus={saveStatus}
            inert={mobileOverlayOpen}
            isMobile={isMobile}
          />
        </Suspense>
      </EditorErrorBoundary>

      {mobileOverlayOpen && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={closeSidebar} aria-hidden="true" />
      )}

      <SearchDialog open={searchOpen} onClose={closeSearch} />
      <ShortcutsHelpModal open={shortcutsOpen} onClose={closeShortcuts} />
      <ImportDialog open={importOpen} onClose={closeImport} />
      <Toasts />
    </div>
  )
}
