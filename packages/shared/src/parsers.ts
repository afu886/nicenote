/**
 * parsers.ts — 字符串解析
 *
 * URL、query string、格式转换等常用解析工具
 */

// ============================================================
// Query String 解析
// ============================================================

/**
 * 解析 URL query string 为对象
 * 自动处理数组参数（同名 key 多次出现）
 *
 * @example
 *   parseQuery('?name=tom&age=25')
 *   // { name: 'tom', age: '25' }
 *
 *   parseQuery('?tag=js&tag=ts')
 *   // { tag: ['js', 'ts'] }
 */
export function parseQuery(search: string): Record<string, string | string[]> {
  const query = search.startsWith('?') ? search.slice(1) : search
  if (!query) return {}

  const result: Record<string, string | string[]> = {}

  for (const pair of query.split('&')) {
    const [rawKey, rawValue = ''] = pair.split('=')
    const key = decodeURIComponent(rawKey)
    const value = decodeURIComponent(rawValue.replace(/\+/g, ' '))

    if (key in result) {
      // 已存在同名 key，转换为数组
      const existing = result[key]
      result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * 将对象序列化为 query string
 * 自动处理数组值和 null/undefined（跳过）
 *
 * @example
 *   toQuery({ name: 'tom', age: 25 })
 *   // 'name=tom&age=25'
 *
 *   toQuery({ tag: ['js', 'ts'], empty: null })
 *   // 'tag=js&tag=ts'
 */
export function toQuery(
  params: Record<string, string | number | boolean | string[] | null | undefined>
): string {
  const parts: string[] = []

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }

  return parts.join('&')
}

// ============================================================
// URL 解析
// ============================================================

export interface ParsedUrl {
  protocol: string // 'https:'
  host: string // 'example.com:8080'
  hostname: string // 'example.com'
  port: string // '8080'
  pathname: string // '/path/to/page'
  search: string // '?key=value'
  hash: string // '#section'
  query: Record<string, string | string[]>
}

/**
 * 解析完整 URL
 *
 * @example
 *   parseUrl('https://example.com:8080/path?key=value#section')
 *   // { protocol: 'https:', hostname: 'example.com', port: '8080', ... }
 */
export function parseUrl(url: string): ParsedUrl {
  // Web 和 Node.js 都有 URL 构造函数
  const parsed = new URL(url)

  return {
    protocol: parsed.protocol,
    host: parsed.host,
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    query: parseQuery(parsed.search),
  }
}

// ============================================================
// 命名格式转换
// ============================================================

/**
 * camelCase → kebab-case
 *
 * @example
 *   toKebabCase('backgroundColor')  // 'background-color'
 *   toKebabCase('myHTTPClient')     // 'my-http-client'
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // aB → a-B
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // ABc → A-Bc (连续大写)
    .toLowerCase()
}

/**
 * kebab-case → camelCase
 *
 * @example
 *   toCamelCase('background-color')  // 'backgroundColor'
 *   toCamelCase('my-http-client')    // 'myHttpClient'
 */
export function toCamelCase(str: string): string {
  return str.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())
}

/**
 * 任意格式 → PascalCase
 *
 * @example
 *   toPascalCase('my-component')     // 'MyComponent'
 *   toPascalCase('backgroundColor')  // 'BackgroundColor'
 */
export function toPascalCase(str: string): string {
  const camel = toCamelCase(toKebabCase(str))
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * 任意格式 → SCREAMING_SNAKE_CASE
 *
 * @example
 *   toConstantCase('backgroundColor')  // 'BACKGROUND_COLOR'
 *   toConstantCase('my-api-key')       // 'MY_API_KEY'
 */
export function toConstantCase(str: string): string {
  return toKebabCase(str).replace(/-/g, '_').toUpperCase()
}

// ============================================================
// 安全解析
// ============================================================

/**
 * 安全的 JSON.parse，解析失败返回默认值而不是抛错
 *
 * @example
 *   safeJsonParse('{"a":1}')              // { a: 1 }
 *   safeJsonParse('invalid', { fallback: [] })  // []
 *   safeJsonParse('invalid')              // null
 */
export function safeJsonParse<T>(json: string, options: { fallback?: T } = {}): T | null {
  try {
    return JSON.parse(json) as T
  } catch {
    return options.fallback ?? null
  }
}

/**
 * 截断字符串，超长时添加省略号
 * 不会在单词中间截断（按空格分词）
 *
 * @example
 *   truncate('Hello World Foo Bar', 12)  // 'Hello World...'
 *   truncate('Hello World Foo Bar', 12, { suffix: '…' })  // 'Hello World…'
 */
export function truncate(
  str: string,
  maxLength: number,
  options: { suffix?: string; wordBoundary?: boolean } = {}
): string {
  const { suffix = '...', wordBoundary = true } = options

  if (str.length <= maxLength) return str

  let truncated = str.slice(0, maxLength - suffix.length)

  if (wordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace)
    }
  }

  return truncated + suffix
}
