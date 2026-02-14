import type { Editor } from '@tiptap/react'
import { z } from 'zod'

const markdownSchema = z.string()

export function normalizeMarkdownContent(content: unknown): string {
  const parsed = markdownSchema.safeParse(content)
  return parsed.success ? parsed.data : ''
}

export function readEditorMarkdown(editor: Editor | null): string {
  if (!editor || editor.isDestroyed) return ''
  return editor.getMarkdown()
}

export function writeEditorMarkdown(editor: Editor | null, markdown: string): void {
  if (!editor || editor.isDestroyed) return
  editor.commands.setContent(markdown, { contentType: 'markdown' })
}

export function hasEditorMarkdownChanged(editor: Editor | null, expected: string): boolean {
  return readEditorMarkdown(editor) !== expected
}
