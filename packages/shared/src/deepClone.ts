/**
 * deepClone.ts — 深拷贝
 *
 * 覆盖所有常见类型，包括:
 *   - 基本类型 (直接返回)
 *   - Date, RegExp
 *   - Map, Set
 *   - ArrayBuffer, TypedArray (如 Uint8Array)
 *   - 循环引用 (通过 WeakMap 缓存已拷贝的对象)
 *   - 普通对象和数组
 */

/**
 * 深拷贝任意值
 *
 * @example
 *   const original = { a: 1, b: { c: [1, 2, 3] } };
 *   const clone = deepClone(original);
 *   clone.b.c.push(4);
 *   console.log(original.b.c); // [1, 2, 3] — 未受影响
 *
 *   // 循环引用也能处理
 *   const obj: any = { name: 'circular' };
 *   obj.self = obj;
 *   const cloned = deepClone(obj);
 *   console.log(cloned.self === cloned); // true
 */
export function deepClone<T>(value: T): T {
  return clone(value, new Map())
}

function clone<T>(value: T, cache: Map<object, any>): T {
  // --- 基本类型和 null 直接返回 ---
  if (value === null || typeof value !== 'object') {
    return value
  }

  // --- 循环引用检查 ---
  if (cache.has(value as any)) {
    return cache.get(value as any)
  }

  // --- Date ---
  if (value instanceof Date) {
    const cloned = new Date(value.getTime()) as any
    cache.set(value as any, cloned)
    return cloned
  }

  // --- RegExp ---
  if (value instanceof RegExp) {
    const cloned = new RegExp(value.source, value.flags) as any
    cache.set(value as any, cloned)
    return cloned
  }

  // --- Map ---
  if (value instanceof Map) {
    const cloned = new Map()
    cache.set(value as any, cloned)
    value.forEach((v, k) => {
      cloned.set(clone(k, cache), clone(v, cache))
    })
    return cloned as any
  }

  // --- Set ---
  if (value instanceof Set) {
    const cloned = new Set()
    cache.set(value as any, cloned)
    value.forEach((v) => {
      cloned.add(clone(v, cache))
    })
    return cloned as any
  }

  // --- ArrayBuffer ---
  if (value instanceof ArrayBuffer) {
    const cloned = value.slice(0)
    cache.set(value as any, cloned)
    return cloned as any
  }

  // --- TypedArray (Uint8Array, Int32Array 等) ---
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const TypedArrayCtor = value.constructor as new (buffer: ArrayBuffer) => typeof value
    const cloned = new TypedArrayCtor((value.buffer as ArrayBuffer).slice(0))
    cache.set(value as any, cloned)
    return cloned as any
  }

  // --- Array ---
  if (Array.isArray(value)) {
    const cloned: any[] = []
    cache.set(value as any, cloned)
    for (let i = 0; i < value.length; i++) {
      cloned[i] = clone(value[i], cache)
    }
    return cloned as any
  }

  // --- 普通对象 ---
  const proto = Object.getPrototypeOf(value)
  const cloned = Object.create(proto)
  cache.set(value as any, cloned)

  const keys = [...Object.keys(value), ...Object.getOwnPropertySymbols(value)]
  for (const key of keys) {
    cloned[key] = clone((value as any)[key], cache)
  }

  return cloned
}
