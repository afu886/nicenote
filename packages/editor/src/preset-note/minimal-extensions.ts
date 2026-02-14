import type { AnyExtension } from '@tiptap/core'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Markdown } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

import { NOTE_BEHAVIOR_POLICY } from './behavior-policy'

interface MinimalExtensionOptions {
  placeholder?: string
}

export function createMinimalExtensions(options: MinimalExtensionOptions = {}): AnyExtension[] {
  const placeholder = options.placeholder ?? NOTE_BEHAVIOR_POLICY.placeholder

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
        protocols: ['http', 'https', 'mailto', 'tel'],
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
