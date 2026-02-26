/**
 * debounce.ts — 防抖 / 节流
 */

// ============================================================
// Debounce — 防抖
// ============================================================

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastContext: unknown = null
  let result: ReturnType<T>

  function invokeFunc(context: unknown, args: Parameters<T>) {
    result = fn.apply(context, args)
    lastArgs = null
    lastContext = null
  }

  function debounced(this: unknown, ...args: Parameters<T>) {
    lastArgs = args
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this

    if (timer !== null) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      if (lastArgs !== null) {
        invokeFunc(lastContext, lastArgs)
      }
    }, wait)

    return result
  }

  /** 取消待执行的调用 */
  debounced.cancel = function () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    lastArgs = null
    lastContext = null
  }

  return debounced as T & { cancel: () => void }
}

// ============================================================
// Throttle — 节流
// ============================================================

interface ThrottleOptions {
  /** 是否在开始时立即执行，默认 true */
  leading?: boolean
  /** 是否在结束时执行最后一次，默认 true */
  trailing?: boolean
}

/**
 * 节流函数
 * 在固定时间窗口内最多执行一次
 *
 * @example
 *   const onScroll = throttle(() => {
 *     updatePosition();
 *   }, 100);
 *
 *   window.addEventListener('scroll', onScroll);
 *   // 卸载时记得取消
 *   onScroll.cancel();
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options

  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let result: ReturnType<T>

  function throttled(this: unknown, ...args: Parameters<T>) {
    const now = Date.now()
    const remaining = wait - (now - lastTime)

    if (remaining <= 0 || remaining > wait) {
      // 超过时间窗口，执行
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      if (leading || lastTime !== 0) {
        lastTime = now
        result = fn.apply(this, args)
      } else if (trailing) {
        // leading=false 且首次调用：不立即执行，通过 trailing 定时器延迟
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this
        const capturedArgs = args
        timer = setTimeout(() => {
          lastTime = Date.now()
          timer = null
          result = fn.apply(ctx, capturedArgs)
        }, wait)
      }
    } else if (trailing && timer === null) {
      // 窗口内，设置 trailing 定时器
      // 需要捕捉当前调用的 this 和 args，用立即执行闭包隔离
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const ctx = this
      const capturedArgs = args
      timer = setTimeout(() => {
        lastTime = Date.now()
        timer = null
        result = fn.apply(ctx, capturedArgs)
      }, remaining)
    }

    return result
  }

  /** 取消待执行的调用 */
  throttled.cancel = function () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    lastTime = 0
  }

  return throttled as T & { cancel: () => void }
}
