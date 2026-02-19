import { useEffect, useState } from 'react'

import type { Editor } from '@tiptap/react'
import { Link2, Link2Off } from 'lucide-react'

import type { LinkValidationErrorKey } from '@nicenote/shared'
import { getLinkValidationError } from '@nicenote/shared'
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@nicenote/ui'

import { clearLink, setLinkHref } from '../core/commands'
import type { NoteEditorStateSnapshot } from '../core/state'

function getLinkIcon(linkActive: boolean) {
  const LinkIcon = linkActive ? Link2Off : Link2
  return <LinkIcon className="nn-editor-toolbar-icon" />
}

export function LinkToolbarButton({
  editor,
  snapshot,
  isSourceMode,
  isMobile,
  label,
  shortcut,
  cancelLabel = 'Cancel',
  applyLabel = 'Apply',
  translateValidationError,
}: {
  editor: Editor | null
  snapshot: NoteEditorStateSnapshot
  isSourceMode: boolean
  isMobile: boolean
  label: string
  shortcut?: string
  cancelLabel?: string | undefined
  applyLabel?: string | undefined
  translateValidationError?: ((key: LinkValidationErrorKey) => string) | undefined
}) {
  const [open, setOpen] = useState(false)
  const [hrefInput, setHrefInput] = useState('https://')
  const linkActive = snapshot.marks.link
  const disabled = !editor || isSourceMode
  const validationErrorKey = getLinkValidationError(hrefInput)
  const validationError = validationErrorKey
    ? (translateValidationError?.(validationErrorKey) ?? validationErrorKey)
    : null

  useEffect(() => {
    if (!open || !editor) return
    const currentHref = editor.getAttributes('link').href
    setHrefInput(typeof currentHref === 'string' && currentHref.trim() ? currentHref : 'https://')
  }, [open, editor])

  if (linkActive) {
    return (
      <Button
        type="button"
        aria-label={label}
        data-style="ghost"
        data-active-state="on"
        disabled={disabled}
        onClick={() => {
          clearLink(editor)
        }}
        showTooltip={!isMobile}
        {...(!isMobile ? { tooltip: label } : {})}
        {...(shortcut ? { shortcutKeys: shortcut } : {})}
      >
        {getLinkIcon(true)}
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label={label}
          data-style="ghost"
          data-active-state="off"
          disabled={disabled}
          showTooltip={!isMobile}
          {...(!isMobile ? { tooltip: label } : {})}
          {...(shortcut ? { shortcutKeys: shortcut } : {})}
        >
          {getLinkIcon(false)}
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={8} align="start" className="z-popover w-80 space-y-3 p-3">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!editor || validationErrorKey) return
            setLinkHref(editor, hrefInput.trim())
            setOpen(false)
          }}
        >
          <Input
            type="url"
            value={hrefInput}
            onChange={(event) => {
              setHrefInput(event.target.value)
            }}
            placeholder="https://example.com"
            autoFocus
            aria-invalid={validationError ? 'true' : 'false'}
          />
          <div className="min-h-5 text-xs text-destructive" aria-live="polite">
            {validationError ?? ''}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              data-style="ghost"
              showTooltip={false}
              onClick={() => {
                setOpen(false)
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              data-style="primary"
              showTooltip={false}
              disabled={Boolean(validationErrorKey)}
            >
              {applyLabel}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
