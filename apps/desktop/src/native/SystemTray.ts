/**
 * System Tray native module bridge
 *
 * macOS:   Implemented via Objective-C/Swift using NSStatusBar
 * Windows: Implemented via C++ using Shell_NotifyIcon
 *
 * Platform-specific implementations live in:
 *   macos/NiceNoteDesktop/SystemTray/SystemTrayModule.{h,mm}
 *   windows/NiceNoteDesktop/SystemTrayModule.{h,cpp}
 *
 * JS usage:
 *   SystemTray.show('NiceNote', 'icon_tray')
 *   SystemTray.hide()
 *   SystemTray.setMenu([{ label: 'Open', action: 'open' }])
 */

import { NativeEventEmitter, NativeModules } from 'react-native'

const { NNSystemTray } = NativeModules as {
  NNSystemTray?: {
    show(tooltip: string, iconName: string): void
    hide(): void
    setMenu(items: SystemTrayMenuItem[]): void
  }
}

export interface SystemTrayMenuItem {
  label: string
  action: string
  enabled?: boolean
  separator?: boolean
}

export const SystemTray = {
  isAvailable: !!NNSystemTray,

  show(tooltip = 'NiceNote', iconName = 'icon_tray'): void {
    NNSystemTray?.show(tooltip, iconName)
  },

  hide(): void {
    NNSystemTray?.hide()
  },

  setMenu(items: SystemTrayMenuItem[]): void {
    NNSystemTray?.setMenu(items)
  },
}

export const SystemTrayEvents = NNSystemTray
  ? new NativeEventEmitter(NativeModules.NNSystemTray)
  : null
