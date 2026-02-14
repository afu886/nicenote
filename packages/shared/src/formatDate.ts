/**
 * formatDate.ts — 日期格式化
 *
 * 不引入 dayjs/moment 等大库，纯手写覆盖日常 90% 的场景
 * 如果以后需要更复杂的时区处理，再考虑引入 date-fns-tz
 *
 * 支持的占位符:
 *   YYYY  — 四位年份        2024
 *   YY    — 两位年份        24
 *   MM    — 两位月份        01 ~ 12
 *   M     — 月份            1 ~ 12
 *   DD    — 两位日期        01 ~ 31
 *   D     — 日期            1 ~ 31
 *   HH    — 24小时制        00 ~ 23
 *   hh    — 12小时制        01 ~ 12
 *   mm    — 分钟            00 ~ 59
 *   ss    — 秒              00 ~ 59
 *   A     — 上下午           AM / PM
 *   a     — 上下午           am / pm
 */

type DateInput = Date | string | number

/**
 * 将各种输入统一为 Date 对象
 */
function toDate(input: DateInput): Date {
  if (input instanceof Date) return input
  const date = new Date(input)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${input}`)
  }
  return date
}

/** 两位补零 */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * 按格式字符串格式化日期
 *
 * @example
 *   format(new Date(), 'YYYY-MM-DD')           // '2024-01-15'
 *   format('2024-01-15T10:30:00', 'HH:mm')     // '10:30'
 *   format(Date.now(), 'YYYY/MM/DD hh:mm A')   // '2024/01/15 10:30 AM'
 */
export function format(input: DateInput, template: string): string {
  const d = toDate(input)

  const hours24 = d.getHours()
  const hours12 = hours24 % 12 || 12

  const tokens: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    YY: String(d.getFullYear()).slice(-2),
    MM: pad(d.getMonth() + 1),
    M: String(d.getMonth() + 1),
    DD: pad(d.getDate()),
    D: String(d.getDate()),
    HH: pad(hours24),
    hh: pad(hours12),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    A: hours24 < 12 ? 'AM' : 'PM',
    a: hours24 < 12 ? 'am' : 'pm',
  }

  // 按 token 长度降序替换，避免 M 先匹配到 MM 里的 M
  const sorted = Object.keys(tokens).sort((a, b) => b.length - a.length)
  let result = template
  for (const token of sorted) {
    result = result.replace(new RegExp(token, 'g'), tokens[token])
  }

  return result
}

// ============================================================
// 预置格式 (Presets)
// 常用场景直接调用，不用每次写 template
// ============================================================

/** 2024-01-15 */
export function formatDate(input: DateInput): string {
  return format(input, 'YYYY-MM-DD')
}

/** 10:30:45 */
export function formatTime(input: DateInput): string {
  return format(input, 'HH:mm:ss')
}

/** 2024-01-15 10:30 */
export function formatDateTime(input: DateInput): string {
  return format(input, 'YYYY-MM-DD HH:mm')
}

/** 01/15/2024 */
export function formatDateUS(input: DateInput): string {
  return format(input, 'MM/DD/YYYY')
}

/** 2024年01月15日 */
export function formatDateCN(input: DateInput): string {
  return format(input, 'YYYY年MM月DD日')
}

// ============================================================
// 相对时间 (Relative Time)
// "刚刚" / "2分钟前" / "1小时前" 等
// ============================================================

interface RelativeTimeOptions {
  /** 超过这个毫秒数后不再显示相对时间，直接返回绝对时间 */
  maxAge?: number
  /** 超过 maxAge 时使用的格式，默认 'YYYY-MM-DD HH:mm' */
  fallbackFormat?: string
}

/**
 * 生成相对时间描述
 *
 * @example
 *   timeAgo(Date.now() - 30000)          // '刚刚'
 *   timeAgo(Date.now() - 120000)         // '2分钟前'
 *   timeAgo(Date.now() - 7200000)        // '2小时前'
 */
export function timeAgo(input: DateInput, options: RelativeTimeOptions = {}): string {
  const {
    maxAge = 7 * 24 * 60 * 60 * 1000, // 默认一周后显示绝对时间
    fallbackFormat = 'YYYY-MM-DD HH:mm',
  } = options

  const now = Date.now()
  const diff = now - toDate(input).getTime()

  if (diff > maxAge) {
    return format(input, fallbackFormat)
  }

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return format(input, fallbackFormat)
}

// ============================================================
// 工具函数
// ============================================================

/** 判断是否是有效日期 */
export function isValidDate(input: DateInput): boolean {
  try {
    const d = toDate(input)
    return !isNaN(d.getTime())
  } catch {
    return false
  }
}

/** 获取两个日期之间的天数差 */
export function diffDays(a: DateInput, b: DateInput): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / msPerDay)
}

/** 判断是否是今天 */
export function isToday(input: DateInput): boolean {
  const d = toDate(input)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}
