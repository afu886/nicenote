import type { Editor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'

interface NicenoteEditorContentProps {
  editor: Editor | null
  isSourceMode: boolean
  sourceValue: string
  onSourceChange: (nextValue: string) => void
  onSourceBlur: () => void
}

export function NicenoteEditorContent({
  editor,
  isSourceMode,
  sourceValue,
  onSourceChange,
  onSourceBlur,
}: NicenoteEditorContentProps) {
  if (isSourceMode) {
    return (
      <textarea
        className="nn-editor-source"
        spellCheck={false}
        value={sourceValue}
        onChange={(event) => onSourceChange(event.target.value)}
        onBlur={onSourceBlur}
        placeholder="请输入 Markdown 内容"
      />
    )
  }

  return <EditorContent editor={editor} className="nn-editor-content" role="presentation" />
}
