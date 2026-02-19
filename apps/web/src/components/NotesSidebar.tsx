import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Locale } from 'date-fns'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRightFromLine, FileText, Plus, Search, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import type { NoteListItem as NoteListItemType } from '@nicenote/shared'

import { useMinuteTicker } from '../hooks/useMinuteTicker'
import { WEB_ICON_MD_CLASS, WEB_ICON_SM_CLASS, WEB_ROW_WITH_ICON_CLASS } from '../lib/class-names'
import { getDateLocale } from '../lib/date-locale'
import { useNoteStore } from '../store/useNoteStore'
import { useToastStore } from '../store/useToastStore'

import { SettingsDropdown } from './SettingsDropdown'

interface NotesSidebarProps {
  isSidebarOpen: boolean
  isMobile: boolean
  sidebarWidth: number
  isResizing: boolean
  openSidebar: () => void
  toggleSidebar: () => void
  startResizing: (event: React.PointerEvent<HTMLDivElement>) => void
  cancelPendingSave: (id: string) => void
}

interface NoteListItemProps {
  note: NoteListItemType
  isActive: boolean
  onSelect: (note: NoteListItemType) => void
  onDelete: (id: string) => void
  untitledLabel: string
  deleteLabel: string
  dateLocale: Locale
}

const NoteListItem = memo(function NoteListItem({
  note,
  isActive,
  onSelect,
  onDelete,
  untitledLabel,
  deleteLabel,
  dateLocale,
}: NoteListItemProps) {
  return (
    <li
      role="listitem"
      className={`group relative flex flex-col rounded-md p-3 transition-all ${
        isActive
          ? 'bg-accent shadow-sm'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      }`}
    >
      <button
        onClick={() => onSelect(note)}
        className="w-full cursor-pointer text-left focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div className="flex items-center gap-2 pr-8">
          <div className={`${WEB_ROW_WITH_ICON_CLASS} overflow-hidden`}>
            <FileText className={`${WEB_ICON_SM_CLASS} shrink-0 opacity-50`} />
            <span className="truncate font-medium text-muted-foreground">
              {note.title || untitledLabel}
            </span>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-caption whitespace-nowrap opacity-50">
            {formatDistanceToNow(new Date(note.updatedAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        </div>
      </button>
      <button
        aria-label={deleteLabel.replace('{{title}}', note.title || untitledLabel)}
        onClick={() => onDelete(note.id)}
        className={`absolute top-3 right-3 shrink-0 rounded-md p-1.5 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-primary/50 ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        }`}
      >
        <Trash2 className={WEB_ICON_SM_CLASS} />
      </button>
    </li>
  )
})

export function NotesSidebar({
  isSidebarOpen,
  isMobile,
  sidebarWidth,
  isResizing,
  openSidebar,
  toggleSidebar,
  startResizing,
  cancelPendingSave,
}: NotesSidebarProps) {
  const { t, i18n } = useTranslation()
  useMinuteTicker()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const {
    notes,
    isFetching,
    isCreating,
    error,
    currentNoteId,
    selectNote,
    createNote,
    deleteNote,
  } = useNoteStore(
    useShallow((state) => ({
      notes: state.notes,
      isFetching: state.isFetching,
      isCreating: state.isCreating,
      error: state.error,
      currentNoteId: state.currentNote?.id ?? null,
      selectNote: state.selectNote,
      createNote: state.createNote,
      deleteNote: state.deleteNote,
    }))
  )
  const addToast = useToastStore((state) => state.addToast)

  const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language])
  const untitledLabel = t('sidebar.untitled')
  const deleteLabel = t('sidebar.deleteNote', { title: '{{title}}' })

  const pendingDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const handleDeleteWithUndo = useCallback(
    (id: string) => {
      cancelPendingSave(id)

      const noteToDelete = notes.find((n) => n.id === id)
      if (!noteToDelete) return

      // Optimistically remove from UI
      useNoteStore.setState((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
      }))

      // Start a grace period before actually sending the DELETE to the server
      const deleteTimer = setTimeout(() => {
        pendingDeleteTimers.current.delete(id)
        void deleteNote(id)
      }, 5000)

      pendingDeleteTimers.current.set(id, deleteTimer)

      addToast(t('sidebar.noteDeleted'), {
        duration: 5000,
        action: {
          label: t('sidebar.undo'),
          onClick: () => {
            const timer = pendingDeleteTimers.current.get(id)
            if (timer) {
              clearTimeout(timer)
              pendingDeleteTimers.current.delete(id)
            }
            // Restore the note in the store
            useNoteStore.setState((state) => ({
              notes: [...state.notes, noteToDelete],
            }))
          },
        },
      })
    },
    [cancelPendingSave, notes, deleteNote, addToast, t]
  )

  // #25: Stabilize sort — only re-sort when updatedAt ordering actually changes
  const sortedNoteIds = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((n) => n.id)
  }, [notes])

  const notesById = useMemo(() => {
    const map = new Map<string, NoteListItemType>()
    for (const note of notes) {
      map.set(note.id, note)
    }
    return map
  }, [notes])

  const filteredNotes = useMemo(() => {
    const normalizedSearch = deferredSearch.toLowerCase()
    return sortedNoteIds
      .map((id) => notesById.get(id)!)
      .filter((note) => note && note.title.toLowerCase().includes(normalizedSearch))
  }, [deferredSearch, sortedNoteIds, notesById])

  return (
    <>
      {!isSidebarOpen && (
        <button
          onClick={openSidebar}
          aria-label={t('sidebar.openSidebar')}
          className="fixed top-4 left-4 z-50 rounded-md bg-background p-2 shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <ArrowRightFromLine className={WEB_ICON_MD_CLASS} />
        </button>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-background transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className={WEB_ROW_WITH_ICON_CLASS}>
              <button
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? t('sidebar.closeSidebar') : t('sidebar.openSidebar')}
                className="rounded-md p-1.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <ArrowRightFromLine
                  className={`${WEB_ICON_MD_CLASS} transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <h1 className="text-xl font-semibold">Nicenote</h1>
            </div>
            <div className={WEB_ROW_WITH_ICON_CLASS}>
              <SettingsDropdown />
              <button
                onClick={() => void createNote()}
                disabled={isCreating}
                aria-label={t('sidebar.newNote')}
                className="rounded-md bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className={WEB_ICON_SM_CLASS} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search
              className={`absolute top-2.5 left-2.5 ${WEB_ICON_SM_CLASS} text-muted-foreground`}
            />
            <input
              type="search"
              placeholder={t('sidebar.searchNotes')}
              aria-label={t('sidebar.searchNotesLabel')}
              className="w-full py-2 pr-4 pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ul role="list" className="flex-1 space-y-1 overflow-y-auto p-2">
          {isFetching && notes.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="animate-pulse space-y-2 rounded-md p-3">
                  <div className={WEB_ROW_WITH_ICON_CLASS}>
                    <div className={`${WEB_ICON_SM_CLASS} rounded bg-muted`} />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                  </div>
                  <div className="ml-6 h-3 w-1/2 rounded bg-muted" />
                </li>
              ))
            : filteredNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isActive={currentNoteId === note.id}
                  onSelect={selectNote}
                  onDelete={handleDeleteWithUndo}
                  untitledLabel={untitledLabel}
                  deleteLabel={deleteLabel}
                  dateLocale={dateLocale}
                />
              ))}
          {!isFetching && error && notes.length === 0 && (
            <li className="py-12 text-center text-destructive">
              <p className="text-sm">{error}</p>
            </li>
          )}
          {!isFetching && !error && filteredNotes.length === 0 && (
            <li className="py-12 text-center text-muted-foreground">
              <p className="text-sm">{t('sidebar.noNotesFound')}</p>
            </li>
          )}
        </ul>
        {!isMobile && (
          <div
            className={`absolute top-0 right-0 z-50 h-full cursor-col-resize bg-border transition-all duration-100 hover:bg-primary ${
              isResizing ? 'w-0.75' : 'w-px hover:w-0.75'
            }`}
            onPointerDown={startResizing}
            style={{
              right: isResizing ? '-1.5px' : '-0.5px',
            }}
          />
        )}
      </aside>
    </>
  )
}
