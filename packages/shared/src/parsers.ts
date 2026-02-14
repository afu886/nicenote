/**
 * parsers.ts — 字符串解析
 */

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
