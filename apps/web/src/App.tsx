import { Component, lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { ErrorInfo, ReactNode } from 'react'

import { useIsBreakpoint } from '@nicenote/ui'

import { NotesSidebar } from './components/NotesSidebar'
import { Toasts } from './components/Toasts'
import { useDebouncedNoteSave } from './hooks/useDebouncedNoteSave'
import { useNoteStore } from './store/useNoteStore'
import { useSidebarStore } from './store/useSidebarStore'
import i18n from './i18n'

const NoteEditorPane = lazy(() =>
  import('./components/NoteEditorPane').then((m) => ({ default: m.NoteEditorPane }))
)

class EditorErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Editor error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
          <p className="text-lg font-medium">{i18n.t('error.editorCrashed')}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {i18n.t('error.retry')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { t } = useTranslation()
  const fetchNotes = useNoteStore((state) => state.fetchNotes)
  const saveNote = useNoteStore((state) => state.saveNote)
  const { scheduleSave, cancelPendingSave, saveStatus } = useDebouncedNoteSave({ saveNote })

  const isMobile = useIsBreakpoint('max', 768)
  const isOpen = useSidebarStore((s) => s.isOpen)
  const width = useSidebarStore((s) => s.width)
  const closeSidebar = useSidebarStore((s) => s.close)

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const mobileOverlayOpen = isMobile && isOpen

  const gridColumns = isMobile ? '0px 1fr' : isOpen ? `${width}px 1fr` : '48px 1fr'

  return (
    <div
      className="grid h-screen"
      style={{
        gridTemplateColumns: gridColumns,
        transition: 'grid-template-columns 300ms ease-in-out',
      }}
    >
      <NotesSidebar isMobile={isMobile} cancelPendingSave={cancelPendingSave} />

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

      <Toasts />
    </div>
  )
}
