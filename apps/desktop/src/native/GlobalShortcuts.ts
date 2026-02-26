/**
 * Global keyboard shortcut registration (fires even when app is in background)
 *
 * macOS:   DDHotKey or MASShortcut-style Objective-C binding
 * Windows: RegisterHotKey Win32 API
 *
 * Native module lives in:
 *   macos/NiceNoteDesktop/GlobalShortcutsModule.{h,mm}
 *   windows/NiceNoteDesktop/GlobalShortcutsModule.{h,cpp}
 */

import { NativeEventEmitter, NativeModules } from 'react-native'

const { NNGlobalShortcuts } = NativeModules as {
  NNGlobalShortcuts?: {
    register(id: string, modifiers: string[], key: string): void
    unregister(id: string): void
    unregisterAll(): void
  }
}

export const GlobalShortcuts = {
  isAvailable: !!NNGlobalShortcuts,

  /** Register a global shortcut. Fires 'shortcut' event with the registered id. */
  register(id: string, modifiers: ('cmd' | 'ctrl' | 'alt' | 'shift')[], key: string): void {
    NNGlobalShortcuts?.register(id, modifiers, key)
  },

  unregister(id: string): void {
    NNGlobalShortcuts?.unregister(id)
  },

  unregisterAll(): void {
    NNGlobalShortcuts?.unregisterAll()
  },
}

export const GlobalShortcutEvents = NNGlobalShortcuts
  ? new NativeEventEmitter(NativeModules.NNGlobalShortcuts)
  : null

// Pre-defined shortcut ids used by the app
export const SHORTCUT_ID = {
  NEW_NOTE: 'new_note',
  QUICK_CAPTURE: 'quick_capture',
  SEARCH: 'search',
} as const
