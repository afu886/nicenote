import type { Editor } from '@tiptap/react'

export interface NoteEditorStateSnapshot {
  canUndo: boolean
  canRedo: boolean
  marks: {
    bold: boolean
    italic: boolean
    strike: boolean
    code: boolean
    link: boolean
  }
  nodes: {
    heading1: boolean
    heading2: boolean
    heading3: boolean
    bulletList: boolean
    orderedList: boolean
    blockquote: boolean
  }
}

export function createEmptyEditorStateSnapshot(): NoteEditorStateSnapshot {
  return {
    canUndo: false,
    canRedo: false,
    marks: {
      bold: false,
      italic: false,
      strike: false,
      code: false,
      link: false,
    },
    nodes: {
      heading1: false,
      heading2: false,
      heading3: false,
      bulletList: false,
      orderedList: false,
      blockquote: false,
    },
  }
}

function readCanState(editor: Editor, key: 'undo' | 'redo'): boolean {
  try {
    return key === 'undo'
      ? editor.can().chain().focus().undo().run()
      : editor.can().chain().focus().redo().run()
  } catch {
    return false
  }
}

export function getNoteEditorStateSnapshot(editor: Editor | null): NoteEditorStateSnapshot {
  if (!editor || editor.isDestroyed) {
    return createEmptyEditorStateSnapshot()
  }

  return {
    canUndo: readCanState(editor, 'undo'),
    canRedo: readCanState(editor, 'redo'),
    marks: {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
    },
    nodes: {
      heading1: editor.isActive('heading', { level: 1 }),
      heading2: editor.isActive('heading', { level: 2 }),
      heading3: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
    },
  }
}
