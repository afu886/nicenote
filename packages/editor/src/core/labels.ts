export interface EditorToolbarLabels {
  undo: string
  redo: string
  heading: string
  heading1: string
  heading2: string
  heading3: string
  list: string
  bulletList: string
  orderedList: string
  bold: string
  italic: string
  strike: string
  code: string
  blockquote: string
  link: string
  sourceMode: string
  cancel: string
  apply: string
}

export interface EditorContentLabels {
  editorPlaceholder: string
  sourcePlaceholder: string
  sourceLabel: string
}

import type { LinkValidationErrorKey } from '@nicenote/shared'

export interface EditorLabels {
  toolbar: EditorToolbarLabels
  content: EditorContentLabels
  translateValidationError?: (key: LinkValidationErrorKey) => string
}

export const DEFAULT_EDITOR_LABELS: EditorLabels = {
  toolbar: {
    undo: 'Undo',
    redo: 'Redo',
    heading: 'Heading',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    list: 'List',
    bulletList: 'Bullet List',
    orderedList: 'Ordered List',
    bold: 'Bold',
    italic: 'Italic',
    strike: 'Strikethrough',
    code: 'Inline Code',
    blockquote: 'Blockquote',
    link: 'Link',
    sourceMode: 'Source',
    cancel: 'Cancel',
    apply: 'Apply',
  },
  content: {
    editorPlaceholder: 'Start writing your thoughts',
    sourcePlaceholder: 'Enter Markdown content',
    sourceLabel: 'Note content',
  },
}
