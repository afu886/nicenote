/**
 * random.ts — 随机数生成
 *
 * ⚠️ 基于 Math.random()，不适用于加密/安全场景
 * 加密级别的随机数请使用 crypto.getRandomValues()
 */

// ============================================================
// 基础随机数
// ============================================================

/**
 * 生成 [min, max] 之间的随机整数（含两端）
 *
 * @example
 *   randomInt(1, 10)   // 1 ~ 10
 *   randomInt(0, 100)  // 0 ~ 100
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成 [min, max) 之间的随机浮点数
 * 可指定小数位数
 *
 * @example
 *   randomFloat(0, 1)       // 0.4521...
 *   randomFloat(0, 100, 2)  // 67.83
 */
export function randomFloat(min: number, max: number, decimals: number = 6): number {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

// ============================================================
// 数组相关
// ============================================================

/**
 * 从数组中随机取一个元素
 *
 * @example
 *   randomPick(['a', 'b', 'c'])  // 'b'
 */
export function randomPick<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error('Cannot pick from an empty array')
  }
  return arr[randomInt(0, arr.length - 1)]
}

/**
 * 从数组中随机取 n 个不重复的元素
 *
 * @example
 *   randomSample([1, 2, 3, 4, 5], 3)  // [3, 1, 5]
 */
export function randomSample<T>(arr: T[], n: number): T[] {
  if (n > arr.length) {
    throw new Error(`Cannot sample ${n} items from array of length ${arr.length}`)
  }
  // 浅拷贝后 shuffle，取前 n 个
  const shuffled = shuffle([...arr])
  return shuffled.slice(0, n)
}

/**
 * Fisher-Yates 洗牌算法，返回新数组（不修改原数组）
 *
 * @example
 *   shuffle([1, 2, 3, 4, 5])  // [3, 1, 5, 2, 4]
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ============================================================
// 带权重的随机
// ============================================================

interface WeightedItem<T> {
  value: T
  weight: number // 权重，数值越大越容易被选中
}

/**
 * 按权重随机选取
 *
 * @example
 *   const items = [
 *     { value: 'common',  weight: 70 },
 *     { value: 'rare',    weight: 25 },
 *     { value: 'legend',  weight: 5  },
 *   ];
 *   weightedRandom(items)  // 大概率返回 'common'
 */
export function weightedRandom<T>(items: WeightedItem<T>[]): T {
  if (items.length === 0) {
    throw new Error('Cannot select from an empty weighted array')
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight

  for (const item of items) {
    random -= item.weight
    if (random <= 0) {
      return item.value
    }
  }

  // 浮点误差兜底，返回最后一个
  return items[items.length - 1].value
}

// ============================================================
// ID 生成
// ============================================================

/**
 * 生成简单的随机 ID
 * 不保证全局唯一，适用于组件 key、临时 ID 等场景
 * 正式业务 ID 请使用服务端生成或 UUID 库
 *
 * @param length  长度，默认 8
 * @param chars   字符集，默认字母+数字
 *
 * @example
 *   randomId()       // 'aB3kF9mX'
 *   randomId(12)     // 'aB3kF9mXpQ2w'
 *   randomId(6, '0123456789')  // '847201'
 */
export function randomId(
  length: number = 8,
  chars: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(0, chars.length - 1))
  }
  return result
}
