import { create } from 'zustand'

const MIN_WIDTH = 260
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 320
const WIDTH_STORAGE_KEY = 'nicenote-sidebar-width'
const OPEN_STORAGE_KEY = 'nicenote-sidebar-open'

function loadWidth(): number {
  try {
    const stored = localStorage.getItem(WIDTH_STORAGE_KEY)
    if (stored) {
      const parsed = Number(stored)
      if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH
}

function loadIsOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function saveIsOpen(value: boolean) {
  try {
    localStorage.setItem(OPEN_STORAGE_KEY, String(value))
  } catch {
    // ignore
  }
}

interface SidebarStore {
  isOpen: boolean
  width: number
  isResizing: boolean
  open: () => void
  close: () => void
  toggle: () => void
  setWidth: (width: number) => void
  startResize: () => void
  stopResize: () => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: loadIsOpen(),
  width: loadWidth(),
  isResizing: false,

  open: () => {
    saveIsOpen(true)
    set({ isOpen: true })
  },
  close: () => {
    saveIsOpen(false)
    set({ isOpen: false })
  },
  toggle: () =>
    set((s) => {
      saveIsOpen(!s.isOpen)
      return { isOpen: !s.isOpen }
    }),

  setWidth: (width: number) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
    set({ width: clamped })
    try {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped))
    } catch {
      // ignore
    }
  },

  startResize: () => set({ isResizing: true }),
  stopResize: () => set({ isResizing: false }),
}))
