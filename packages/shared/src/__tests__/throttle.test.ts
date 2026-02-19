import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { throttle } from '../debounce'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('executes immediately on the first call (leading=true default)', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    expect(fn).toHaveBeenCalledWith('a')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignores subsequent calls within the window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('executes trailing call after the window closes', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    vi.advanceTimersByTime(50)
    throttled('trailing')
    vi.advanceTimersByTime(50)

    // trailing fires at end of window
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(2, 'trailing')
  })

  it('allows a new call after the window closes', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    vi.advanceTimersByTime(100)
    throttled('second')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(2, 'second')
  })

  it('leading=false defers the first call to trailing', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { leading: false })

    throttled('a')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('cancel() clears a pending trailing call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    vi.advanceTimersByTime(50)
    throttled('trailing')
    throttled.cancel()
    vi.advanceTimersByTime(50)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')
  })

  it('trailing=false suppresses the trailing call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { trailing: false })

    throttled('first')
    vi.advanceTimersByTime(50)
    throttled('second')
    vi.advanceTimersByTime(50)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')
  })
})
