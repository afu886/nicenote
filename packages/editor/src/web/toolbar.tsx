import { Fragment } from 'react'

import type { Editor } from '@tiptap/react'
import {
  Bold,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  type LucideIcon,
  MessageSquareQuote,
  Redo2,
  RotateCcw,
  Strikethrough,
  Text,
} from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
  Toolbar,
  ToolbarGroup,
} from '@nicenote/ui'

import {
  clearLink,
  isNoteCommandId,
  type NoteCommandId,
  runNoteCommand,
  setLinkHref,
} from '../core/commands'
import type { NoteEditorStateSnapshot } from '../core/state'
import {
  HEADING_MENU_ITEMS,
  LIST_MENU_ITEMS,
  NOTE_TOOLBAR_GROUPS,
  type NoteToolbarItem,
  type NoteToolbarItemId,
} from '../preset-note/toolbar-config'

interface MinimalToolbarProps {
  editor: Editor | null
  snapshot: NoteEditorStateSnapshot
  isSourceMode: boolean
  isMobile: boolean
  onToggleSourceMode: () => void
}

interface ToolbarItemRenderState {
  active: boolean
  disabled: boolean
  onClick: () => void
  icon: ReactNode
}

const COMMAND_ICON_MAP: Record<NoteCommandId, LucideIcon> = {
  undo: RotateCcw,
  redo: Redo2,
  bold: Bold,
  italic: Italic,
  strike: Strikethrough,
  code: Code,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  blockquote: MessageSquareQuote,
}

const COMMAND_ACTIVE_SELECTOR: Partial<
  Record<NoteCommandId, (snapshot: NoteEditorStateSnapshot) => boolean>
> = {
  bold: (snapshot) => snapshot.marks.bold,
  italic: (snapshot) => snapshot.marks.italic,
  strike: (snapshot) => snapshot.marks.strike,
  code: (snapshot) => snapshot.marks.code,
  heading1: (snapshot) => snapshot.nodes.heading1,
  heading2: (snapshot) => snapshot.nodes.heading2,
  heading3: (snapshot) => snapshot.nodes.heading3,
  bulletList: (snapshot) => snapshot.nodes.bulletList,
  orderedList: (snapshot) => snapshot.nodes.orderedList,
  blockquote: (snapshot) => snapshot.nodes.blockquote,
}

const COMMAND_DISABLED_SELECTOR: Partial<
  Record<NoteCommandId, (snapshot: NoteEditorStateSnapshot) => boolean>
> = {
  undo: (snapshot) => !snapshot.canUndo,
  redo: (snapshot) => !snapshot.canRedo,
}

const DROPDOWN_ITEM_CLASS =
  'flex w-full min-w-40 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm outline-none cursor-pointer data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground'

function getHeadingMenuIcon(snapshot: NoteEditorStateSnapshot): ReactNode {
  if (snapshot.nodes.heading3) return <Heading3 className="nn-editor-toolbar-icon" />
  if (snapshot.nodes.heading2) return <Heading2 className="nn-editor-toolbar-icon" />
  return <Heading1 className="nn-editor-toolbar-icon" />
}

function getListMenuIcon(snapshot: NoteEditorStateSnapshot): ReactNode {
  if (snapshot.nodes.orderedList) return <ListOrdered className="nn-editor-toolbar-icon" />
  return <List className="nn-editor-toolbar-icon" />
}

function getToolbarItemIcon(id: NoteToolbarItemId, linkActive: boolean): ReactNode {
  if (isNoteCommandId(id)) {
    const Icon = COMMAND_ICON_MAP[id]
    return <Icon className="nn-editor-toolbar-icon" />
  }

  if (id === 'link') {
    const LinkIcon = linkActive ? Link2Off : Link2
    return <LinkIcon className="nn-editor-toolbar-icon" />
  }

  return <Text className="nn-editor-toolbar-icon" />
}

function getCommandRenderState(
  commandId: NoteCommandId,
  editor: Editor,
  snapshot: NoteEditorStateSnapshot
): Pick<ToolbarItemRenderState, 'active' | 'disabled' | 'onClick'> {
  const isActive = COMMAND_ACTIVE_SELECTOR[commandId]?.(snapshot) ?? false
  const isDisabled = COMMAND_DISABLED_SELECTOR[commandId]?.(snapshot) ?? false

  return {
    active: isActive,
    disabled: isDisabled,
    onClick: () => {
      runNoteCommand(editor, commandId)
    },
  }
}

function isCommandActive(commandId: NoteCommandId, snapshot: NoteEditorStateSnapshot): boolean {
  return COMMAND_ACTIVE_SELECTOR[commandId]?.(snapshot) ?? false
}

function isHeadingMenuActive(snapshot: NoteEditorStateSnapshot): boolean {
  return snapshot.nodes.heading1 || snapshot.nodes.heading2 || snapshot.nodes.heading3
}

function isListMenuActive(snapshot: NoteEditorStateSnapshot): boolean {
  return snapshot.nodes.bulletList || snapshot.nodes.orderedList
}

function getHeadingMenuLabel(snapshot: NoteEditorStateSnapshot): string {
  if (snapshot.nodes.heading3) return '标题3'
  if (snapshot.nodes.heading2) return '标题2'
  if (snapshot.nodes.heading1) return '标题1'
  return '标题'
}

function getListMenuLabel(snapshot: NoteEditorStateSnapshot): string {
  if (snapshot.nodes.orderedList) return '有序列表'
  if (snapshot.nodes.bulletList) return '无序列表'
  return '列表'
}

function getToolbarItemRenderState(
  item: NoteToolbarItem,
  options: {
    editor: Editor | null
    snapshot: NoteEditorStateSnapshot
    isSourceMode: boolean
    onToggleSourceMode: () => void
  }
): ToolbarItemRenderState {
  const { editor, snapshot, isSourceMode, onToggleSourceMode } = options

  if (item.id === 'headingMenu') {
    return {
      active: isHeadingMenuActive(snapshot),
      disabled: !editor || isSourceMode,
      onClick: () => undefined,
      icon: getHeadingMenuIcon(snapshot),
    }
  }

  if (item.id === 'listMenu') {
    return {
      active: isListMenuActive(snapshot),
      disabled: !editor || isSourceMode,
      onClick: () => undefined,
      icon: getListMenuIcon(snapshot),
    }
  }

  if (item.id === 'sourceMode') {
    return {
      active: isSourceMode,
      disabled: !editor,
      onClick: onToggleSourceMode,
      icon: getToolbarItemIcon(item.id, snapshot.marks.link),
    }
  }

  if (!editor || isSourceMode) {
    return {
      active: false,
      disabled: true,
      onClick: () => undefined,
      icon: getToolbarItemIcon(item.id, snapshot.marks.link),
    }
  }

  if (item.id === 'link') {
    return {
      active: snapshot.marks.link,
      disabled: false,
      onClick: () => {
        if (snapshot.marks.link) {
          clearLink(editor)
          return
        }

        const currentLink = editor.getAttributes('link').href
        const rawHref = window.prompt('输入链接地址', currentLink ?? 'https://')
        if (rawHref === null) return
        const nextHref = rawHref.trim()
        if (!nextHref) {
          clearLink(editor)
          return
        }
        setLinkHref(editor, nextHref)
      },
      icon: getToolbarItemIcon(item.id, snapshot.marks.link),
    }
  }

  if (!isNoteCommandId(item.id)) {
    return {
      active: false,
      disabled: true,
      onClick: () => undefined,
      icon: getToolbarItemIcon(item.id, snapshot.marks.link),
    }
  }

  const { active, disabled, onClick } = getCommandRenderState(item.id, editor, snapshot)

  return {
    active,
    disabled,
    onClick,
    icon: getToolbarItemIcon(item.id, snapshot.marks.link),
  }
}

function CommandDropdownMenu({
  triggerLabel,
  triggerIcon,
  triggerActive,
  triggerDisabled,
  isMobile,
  editor,
  snapshot,
  options,
}: {
  triggerLabel: string
  triggerIcon: ReactNode
  triggerActive: boolean
  triggerDisabled: boolean
  isMobile: boolean
  editor: Editor | null
  snapshot: NoteEditorStateSnapshot
  options: readonly NoteToolbarItem[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          aria-label={triggerLabel}
          data-style="ghost"
          data-active-state={triggerActive ? 'on' : 'off'}
          disabled={triggerDisabled}
          showTooltip={false}
          title={!isMobile ? triggerLabel : undefined}
        >
          {triggerIcon}
          <ChevronDown className="nn-editor-toolbar-icon opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent portal sideOffset={6} className="z-70 p-1">
        {options.map((option) => {
          if (!isNoteCommandId(option.id) || !editor) {
            return null
          }

          const commandId: NoteCommandId = option.id
          const OptionIcon = COMMAND_ICON_MAP[commandId]
          const isActive = isCommandActive(commandId, snapshot)
          const isDisabled = COMMAND_DISABLED_SELECTOR[commandId]?.(snapshot) ?? false

          return (
            <DropdownMenuItem
              key={commandId}
              disabled={isDisabled}
              onSelect={() => {
                runNoteCommand(editor, commandId)
              }}
              className={cn(DROPDOWN_ITEM_CLASS, isActive && 'bg-accent text-accent-foreground')}
            >
              <span className="flex items-center gap-2">
                <OptionIcon className="nn-editor-toolbar-icon" />
                <span>{option.label}</span>
              </span>
              {option.shortcut ? (
                <span className="text-meta text-muted-foreground">{option.shortcut}</span>
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MinimalToolbar({
  editor,
  snapshot,
  isSourceMode,
  isMobile,
  onToggleSourceMode,
}: MinimalToolbarProps) {
  return (
    <Toolbar variant="floating" className="nn-editor-toolbar">
      {NOTE_TOOLBAR_GROUPS.map((group, groupIndex) => (
        <Fragment key={groupIndex}>
          <ToolbarGroup>
            {group.map((item) => {
              const { active, disabled, onClick, icon } = getToolbarItemRenderState(item, {
                editor,
                snapshot,
                isSourceMode,
                onToggleSourceMode,
              })

              if (item.id === 'headingMenu') {
                return (
                  <CommandDropdownMenu
                    key={item.id}
                    triggerLabel={getHeadingMenuLabel(snapshot)}
                    triggerIcon={icon}
                    triggerActive={active}
                    triggerDisabled={disabled}
                    isMobile={isMobile}
                    editor={editor}
                    snapshot={snapshot}
                    options={HEADING_MENU_ITEMS}
                  />
                )
              }

              if (item.id === 'listMenu') {
                return (
                  <CommandDropdownMenu
                    key={item.id}
                    triggerLabel={getListMenuLabel(snapshot)}
                    triggerIcon={icon}
                    triggerActive={active}
                    triggerDisabled={disabled}
                    isMobile={isMobile}
                    editor={editor}
                    snapshot={snapshot}
                    options={LIST_MENU_ITEMS}
                  />
                )
              }

              return (
                <Button
                  key={item.id}
                  type="button"
                  onClick={onClick}
                  aria-label={item.label}
                  data-style="ghost"
                  data-active-state={active ? 'on' : 'off'}
                  disabled={disabled}
                  showTooltip={!isMobile}
                  {...(!isMobile ? { tooltip: item.label } : {})}
                  {...(item.shortcut ? { shortcutKeys: item.shortcut } : {})}
                >
                  {icon}
                </Button>
              )
            })}
          </ToolbarGroup>
          {groupIndex < NOTE_TOOLBAR_GROUPS.length - 1 ? <Separator /> : null}
        </Fragment>
      ))}
    </Toolbar>
  )
}
