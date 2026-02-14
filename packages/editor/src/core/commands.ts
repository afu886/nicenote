import type { Editor } from '@tiptap/react'

export const NOTE_COMMAND_IDS = [
  'undo',
  'redo',
  'bold',
  'italic',
  'strike',
  'code',
  'heading1',
  'heading2',
  'heading3',
  'bulletList',
  'orderedList',
  'blockquote',
] as const

export type NoteCommandId = (typeof NOTE_COMMAND_IDS)[number]

const NOTE_COMMAND_SET = new Set<NoteCommandId>(NOTE_COMMAND_IDS)
type NoteCommandHandler = (editor: Editor) => boolean

const NOTE_COMMAND_HANDLERS: Record<NoteCommandId, NoteCommandHandler> = {
  undo: (editor) => editor.chain().focus().undo().run(),
  redo: (editor) => editor.chain().focus().redo().run(),
  bold: (editor) => editor.chain().focus().toggleBold().run(),
  italic: (editor) => editor.chain().focus().toggleItalic().run(),
  strike: (editor) => editor.chain().focus().toggleStrike().run(),
  code: (editor) => editor.chain().focus().toggleCode().run(),
  heading1: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  heading2: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  heading3: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  bulletList: (editor) => editor.chain().focus().toggleBulletList().run(),
  orderedList: (editor) => editor.chain().focus().toggleOrderedList().run(),
  blockquote: (editor) => editor.chain().focus().toggleBlockquote().run(),
}

export function isNoteCommandId(value: unknown): value is NoteCommandId {
  return typeof value === 'string' && NOTE_COMMAND_SET.has(value as NoteCommandId)
}

export function runNoteCommand(editor: Editor | null, command: NoteCommandId): boolean {
  if (!editor || editor.isDestroyed) return false

  return NOTE_COMMAND_HANDLERS[command](editor)
}

export function setLinkHref(editor: Editor | null, href: string): boolean {
  if (!editor || editor.isDestroyed) return false
  const nextHref = href.trim()
  if (!nextHref) return false

  return editor.chain().focus().extendMarkRange('link').setLink({ href: nextHref }).run()
}

export function clearLink(editor: Editor | null): boolean {
  if (!editor || editor.isDestroyed) return false
  return editor.chain().focus().extendMarkRange('link').unsetLink().run()
}
