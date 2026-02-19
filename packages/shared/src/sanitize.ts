// Matches Markdown links with dangerous protocols: [text](javascript:...), [text](data:...) (non-image), [text](vbscript:...)
const DANGEROUS_LINK_RE = /\[([^\]]*)\]\((javascript:|vbscript:|data:(?!image\/))[^)]*\)/gi

export function sanitizeContent(content: string): string {
  return content.replace(DANGEROUS_LINK_RE, '[$1](#)')
}
