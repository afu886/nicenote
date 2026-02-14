/**
 * validators.ts — 通用校验
 */

const LINK_ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * 链接地址校验（基于 URL 解析）
 * 返回错误信息字符串，通过返回 null
 */
export function getLinkValidationError(rawHref: string): string | null {
  const href = rawHref.trim()

  if (!href) return '请输入链接地址'
  if (href.length > 2048) return '链接地址过长'

  let parsedUrl: URL
  try {
    parsedUrl = new URL(href)
  } catch {
    return '链接格式无效，请输入完整地址'
  }

  if (!LINK_ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return '仅支持 http、https、mailto、tel 协议'
  }

  return null
}
