interface ShortcutEvent {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
}

function usesModKey(event: ShortcutEvent): boolean {
  return event.metaKey || event.ctrlKey
}

export function isToggleSourceModeShortcut(event: ShortcutEvent): boolean {
  return usesModKey(event) && event.shiftKey && !event.altKey && event.key.toLowerCase() === 'm'
}
