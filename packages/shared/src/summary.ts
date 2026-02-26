const MAX_SUMMARY_LENGTH = 200

export function generateSummary(
  content: string | null | undefined,
  maxLength = MAX_SUMMARY_LENGTH
): string | null {
  if (!content) return null

  const plain = content
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/^#{1,6}\s+/gm, '') // headers
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '') // horizontal rules (---, ***, ___)
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/`(.+?)`/g, '$1') // inline code
    .replace(/!\[.*?\]\(.+?\)/g, '') // images（必须在 links 之前，否则 link 正则会先消耗掉 ![alt] 部分）
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/>\s+/g, '') // blockquotes
    .replace(/[-*+]\s+/gm, '') // list markers
    .replace(/\d+\.\s+/gm, '') // numbered list markers
    .replace(/\n{2,}/g, '\n') // collapse blank lines
    .trim()

  if (!plain) return null
  return plain.length > maxLength ? plain.slice(0, maxLength) : plain
}
