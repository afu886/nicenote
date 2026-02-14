import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Editor } from '@tiptap/react'
import { EditorContext, useEditor } from '@tiptap/react'

import { useIsBreakpoint } from '@nicenote/ui'

import {
  hasEditorMarkdownChanged,
  normalizeMarkdownContent,
  readEditorMarkdown,
  writeEditorMarkdown,
} from '../core/serialization'
import {
  createEmptyEditorStateSnapshot,
  getNoteEditorStateSnapshot,
  type NoteEditorStateSnapshot,
} from '../core/state'
import { NOTE_BEHAVIOR_POLICY } from '../preset-note/behavior-policy'
import { createMinimalExtensions } from '../preset-note/minimal-extensions'
import { isToggleSourceModeShortcut } from '../preset-note/shortcuts'

import { NicenoteEditorContent } from './editor-content'
import { MinimalToolbar } from './toolbar'

export interface NicenoteEditorProps {
  value?: string
  onChange?: (markdown: string) => void
  isSourceMode?: boolean
  onSourceModeChange?: (enabled: boolean) => void
  className?: string
}

function useSourceModeState(props: {
  isSourceMode?: boolean | undefined
  onSourceModeChange?: ((enabled: boolean) => void) | undefined
}) {
  const { isSourceMode: controlledSourceMode, onSourceModeChange } = props
  const [internalSourceMode, setInternalSourceMode] = useState(
    NOTE_BEHAVIOR_POLICY.defaultSourceMode
  )

  const isControlled = controlledSourceMode !== undefined
  const isSourceMode = isControlled ? controlledSourceMode : internalSourceMode

  const setSourceMode = useCallback(
    (nextValue: boolean) => {
      onSourceModeChange?.(nextValue)
      if (!isControlled) {
        setInternalSourceMode(nextValue)
      }
    },
    [isControlled, onSourceModeChange]
  )

  return {
    isSourceMode,
    setSourceMode,
  }
}

export function NicenoteEditor({
  value,
  onChange,
  isSourceMode: controlledSourceMode,
  onSourceModeChange,
  className,
}: NicenoteEditorProps) {
  const initialMarkdown = useMemo(() => normalizeMarkdownContent(value), [value])
  const isMobile = useIsBreakpoint()
  const isApplyingExternalContent = useRef(false)
  const lastEmittedMarkdown = useRef(initialMarkdown)

  const [sourceValue, setSourceValue] = useState(initialMarkdown)
  const [snapshot, setSnapshot] = useState<NoteEditorStateSnapshot>(
    createEmptyEditorStateSnapshot()
  )

  const { isSourceMode, setSourceMode } = useSourceModeState({
    isSourceMode: controlledSourceMode,
    onSourceModeChange,
  })

  const extensions = useMemo(
    () =>
      createMinimalExtensions({
        placeholder: NOTE_BEHAVIOR_POLICY.placeholder,
      }),
    []
  )

  const updateSnapshot = useCallback((nextEditor: Editor | null) => {
    if (!nextEditor) return
    setSnapshot(getNoteEditorStateSnapshot(nextEditor))
  }, [])

  const editor = useEditor({
    immediatelyRender: NOTE_BEHAVIOR_POLICY.immediatelyRender,
    extensions,
    content: '',
    editorProps: {
      attributes: {
        class: 'nn-editor-prosemirror',
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
      },
    },
    onCreate: ({ editor: createdEditor }) => {
      isApplyingExternalContent.current = true
      writeEditorMarkdown(createdEditor, initialMarkdown)
      setSourceValue(initialMarkdown)
      lastEmittedMarkdown.current = initialMarkdown
      updateSnapshot(createdEditor)
      isApplyingExternalContent.current = false
    },
    onUpdate: ({ editor: nextEditor }) => {
      updateSnapshot(nextEditor)
      const markdown = readEditorMarkdown(nextEditor)
      setSourceValue(markdown)

      if (isApplyingExternalContent.current) {
        return
      }

      lastEmittedMarkdown.current = markdown
      onChange?.(markdown)
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      updateSnapshot(nextEditor)
    },
  })

  useEffect(() => {
    if (!editor) return

    if (!hasEditorMarkdownChanged(editor, initialMarkdown)) {
      setSourceValue(initialMarkdown)
      return
    }

    if (lastEmittedMarkdown.current === initialMarkdown) {
      setSourceValue(initialMarkdown)
      return
    }

    isApplyingExternalContent.current = true
    writeEditorMarkdown(editor, initialMarkdown)
    setSourceValue(initialMarkdown)
    updateSnapshot(editor)
    isApplyingExternalContent.current = false
  }, [editor, initialMarkdown, updateSnapshot])

  useEffect(() => {
    if (!editor || !isSourceMode) return
    setSourceValue(readEditorMarkdown(editor))
  }, [editor, isSourceMode])

  const toggleSourceMode = useCallback(() => {
    if (!NOTE_BEHAVIOR_POLICY.sourceModeEnabled) return
    setSourceMode(!isSourceMode)
  }, [isSourceMode, setSourceMode])

  const commitSourceValue = useCallback(() => {
    if (!editor) return
    const nextMarkdown = normalizeMarkdownContent(sourceValue)
    writeEditorMarkdown(editor, nextMarkdown)
    setSourceValue(nextMarkdown)
    updateSnapshot(editor)
  }, [editor, sourceValue, updateSnapshot])

  const handleContainerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!NOTE_BEHAVIOR_POLICY.sourceModeEnabled) return
      if (!isToggleSourceModeShortcut(event.nativeEvent)) return
      event.preventDefault()
      toggleSourceMode()
    },
    [toggleSourceMode]
  )

  return (
    <section
      className={`nn-editor-shell ${className ?? ''}`.trim()}
      onKeyDown={handleContainerKeyDown}
    >
      <EditorContext.Provider value={{ editor }}>
        <MinimalToolbar
          editor={editor}
          snapshot={snapshot}
          isSourceMode={isSourceMode}
          isMobile={isMobile}
          onToggleSourceMode={toggleSourceMode}
        />
        <NicenoteEditorContent
          editor={editor}
          isSourceMode={isSourceMode}
          sourceValue={sourceValue}
          onSourceChange={setSourceValue}
          onSourceBlur={commitSourceValue}
        />
      </EditorContext.Provider>
    </section>
  )
}
