import { useSyncExternalStore } from 'react'

const MINUTE_TICK_INTERVAL_MS = 60000

let tick = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function emitTick() {
  tick += 1
  listeners.forEach((listener) => listener())
}

function startTicker() {
  if (timer !== null) return
  timer = setInterval(emitTick, MINUTE_TICK_INTERVAL_MS)
}

function stopTicker() {
  if (timer === null) return
  clearInterval(timer)
  timer = null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  startTicker()

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      stopTicker()
    }
  }
}

function getSnapshot() {
  return tick
}

export function useMinuteTicker() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
