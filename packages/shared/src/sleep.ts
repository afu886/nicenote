/**
 * sleep.ts — 延时
 *
 * 基于 Promise 的 await 友好延时工具
 * 支持 AbortSignal 取消，方便在组件卸载时中断
 */

export class SleepAbortError extends Error {
  constructor() {
    super('Sleep was aborted')
    this.name = 'SleepAbortError'
  }
}

/**
 * 延时指定毫秒数
 *
 * @param ms     延时毫秒数
 * @param signal 可选的 AbortSignal，用于取消等待
 *
 * @example
 *   // 基本用法
 *   await sleep(1000); // 等待 1 秒
 *
 *   // 配合 AbortController 使用（如组件卸载时取消）
 *   const controller = new AbortController();
 *   try {
 *     await sleep(5000, controller.signal);
 *   } catch (e) {
 *     if (e instanceof SleepAbortError) {
 *       console.log('sleep was cancelled');
 *     }
 *   }
 *   // 取消:
 *   controller.abort();
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // 如果已经被取消
    if (signal?.aborted) {
      reject(new SleepAbortError())
      return
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      cleanup()
      reject(new SleepAbortError())
    }

    function cleanup() {
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort)
  })
}
