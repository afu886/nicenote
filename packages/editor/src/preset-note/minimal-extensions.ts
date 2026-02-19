import type { AnyExtension } from '@tiptap/core'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Markdown } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

import { DEFAULT_EDITOR_LABELS } from '../core/labels'

interface MinimalExtensionOptions {
  placeholder?: string
}

export function createMinimalExtensions(options: MinimalExtensionOptions = {}): AnyExtension[] {
  const placeholder = options.placeholder ?? DEFAULT_EDITOR_LABELS.content.editorPlaceholder

  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: {
        openOnClick: false,
        enableClickSelection: true,
        autolink: true,
        defaultProtocol: 'https',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Typography,
    Placeholder.configure({
      placeholder,
    }),
    // Markdown must be the last extension.
    Markdown,
  ]
}
