import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDistanceToNow } from 'date-fns'
import { FileText, Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import type { EditorLabels } from '@nicenote/editor'
import { NicenoteEditor } from '@nicenote/editor'
import type { NoteUpdateInput } from '@nicenote/shared'

import type { SaveStatus } from '../hooks/useDebouncedNoteSave'
import { useMinuteTicker } from '../hooks/useMinuteTicker'
import { WEB_ICON_SM_CLASS } from '../lib/class-names'
import { getDateLocale } from '../lib/date-locale'
import { useNoteStore } from '../store/useNoteStore'

interface NoteEditorPaneProps {
  scheduleSave: (id: string, updates: NoteUpdateInput) => void
  saveStatus: SaveStatus
  inert?: boolean
  isMobile: boolean
}

export function NoteEditorPane({ scheduleSave, saveStatus, inert, isMobile }: NoteEditorPaneProps) {
  const { t, i18n } = useTranslation()
  const tick = useMinuteTicker()
  const { currentNote, createNote, updateNoteLocal } = useNoteStore(
    useShallow((state) => ({
      currentNote: state.currentNote,
      createNote: state.createNote,
      updateNoteLocal: state.updateNoteLocal,
    }))
  )

  const saveStatusLabel: Record<SaveStatus, string | null> = useMemo(
    () => ({
      idle: null,
      unsaved: t('saveStatus.unsaved'),
      saving: t('saveStatus.saving'),
      saved: t('saveStatus.saved'),
    }),
    [t]
  )

  const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language])

  const editorLabels: EditorLabels = useMemo(
    () => ({
      toolbar: {
        undo: t('toolbar.undo'),
        redo: t('toolbar.redo'),
        heading: t('toolbar.heading'),
        heading1: t('toolbar.heading1'),
        heading2: t('toolbar.heading2'),
        heading3: t('toolbar.heading3'),
        list: t('toolbar.list'),
        bulletList: t('toolbar.bulletList'),
        orderedList: t('toolbar.orderedList'),
        bold: t('toolbar.bold'),
        italic: t('toolbar.italic'),
        strike: t('toolbar.strike'),
        code: t('toolbar.code'),
        blockquote: t('toolbar.blockquote'),
        link: t('toolbar.link'),
        sourceMode: t('toolbar.sourceMode'),
        cancel: t('toolbar.cancel'),
        apply: t('toolbar.apply'),
      },
      content: {
        editorPlaceholder: t('editorContent.editorPlaceholder'),
        sourcePlaceholder: t('editorContent.sourcePlaceholder'),
        sourceLabel: t('editorContent.sourceLabel'),
      },
      translateValidationError: (key) => t(key),
    }),
    [t]
  )

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!currentNote) return
      const newTitle = e.target.value
      updateNoteLocal(currentNote.id, { title: newTitle })
      scheduleSave(currentNote.id, { title: newTitle })
    },
    [currentNote, updateNoteLocal, scheduleSave]
  )

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!currentNote) return
      updateNoteLocal(currentNote.id, { content: newContent })
      scheduleSave(currentNote.id, { content: newContent })
    },
    [currentNote, updateNoteLocal, scheduleSave]
  )

  const updatedAt = currentNote?.updatedAt ?? null
  const updatedAtLabel = useMemo(() => {
    if (!updatedAt) return null
    const time = formatDistanceToNow(new Date(updatedAt), {
      addSuffix: true,
      locale: dateLocale,
    })
    return t('editor.updated', { time })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces re-evaluation of formatDistanceToNow
  }, [updatedAt, dateLocale, t, tick])

  return (
    <main className="flex min-w-0 flex-1 flex-col" {...(inert ? { inert: true } : {})}>
      {currentNote ? (
        <>
          <div className="px-8 pt-12 pb-4">
            <input
              type="text"
              className="w-full border-none text-4xl font-bold ring-0 outline-none placeholder:text-muted-foreground/30"
              placeholder={t('editor.noteTitle')}
              aria-label={t('editor.noteTitleLabel')}
              value={currentNote.title}
              onChange={handleTitleChange}
            />
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{updatedAtLabel}</span>
              {saveStatusLabel[saveStatus] && (
                <span className="text-muted-foreground/70">{saveStatusLabel[saveStatus]}</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden px-8 pb-8">
            <NicenoteEditor
              key={currentNote.id}
              value={currentNote.content ?? ''}
              onChange={handleContentChange}
              labels={editorLabels}
              isMobile={isMobile}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 opacity-20" />
          </div>
          <p className="text-lg font-medium">{t('editor.selectNote')}</p>
          <p className="text-sm opacity-70">{t('editor.selectNoteHint')}</p>
          <button
            onClick={() => void createNote()}
            aria-label={t('editor.createNewNoteLabel')}
            className="mt-6 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className={WEB_ICON_SM_CLASS} />
            {t('editor.createNewNote')}
          </button>
        </div>
      )}
    </main>
  )
}
