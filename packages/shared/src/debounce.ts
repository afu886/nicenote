/**
 * debounce.ts — 防抖 / 防滑
 *
 * debounce  — 防抖: 连续触发时只执行最后一次（如搜索输入）
 * throttle  — 防滑: 每隔固定时间最多执行一次（如滚动监听）
 */

// ============================================================
// Debounce — 防抖
// ============================================================

interface DebounceOptions {
  /** 是否立即执行第一次调用，默认 false */
  leading?: boolean
  /** 是否执行最后一次调用，默认 true */
  trailing?: boolean
}

/**
 * 防抖函数
 * 泛型保持原函数的参数和返回值类型
 *
 * @param fn       需要防抖的函数
 * @param wait     延迟毫秒数
 * @param options  配置项
 *
 * @example
 *   const search = debounce((query: string) => {
 *     fetchResults(query);
 *   }, 300);
 *
 *   // 返回的函数带 .cancel() 和 .flush() 方法
 *   search('hello');
 *   search.cancel();  // 取消待执行的调用
 *   search.flush();   // 立即执行待执行的调用
 */

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: DebounceOptions = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true } = options

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
    // eslint-disable-next-line
    lastContext = this

    const callNow = leading && timer === null

    if (timer !== null) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      if (trailing && lastArgs !== null) {
        invokeFunc(lastContext, lastArgs)
      }
    }, wait)

    if (callNow) {
      invokeFunc(lastContext, lastArgs!)
    }

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

  /** 立即执行待执行的调用 */
  debounced.flush = function () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (trailing && lastArgs !== null) {
      invokeFunc(lastContext, lastArgs)
    }
  }

  return debounced as T & { cancel: () => void; flush: () => void }
}

// ============================================================
// Throttle — 防滑
// ============================================================

interface ThrottleOptions {
  /** 是否在开始时立即执行，默认 true */
  leading?: boolean
  /** 是否在结束时执行最后一次，默认 true */
  trailing?: boolean
}

/**
 * 防滑函数
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
      } else {
        lastTime = now
      }
    } else if (trailing && timer === null) {
      // 窗口内，设置 trailing 定时器
      // 需要捕捉当前调用的 this 和 args，用立即执行闭包隔离
      // eslint-disable-next-line
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
