/**
 * validators.ts — 通用校验
 *
 * 每个校验函数返回 ValidationResult 对象
 * 而不是单纯 boolean，方便直接接上表单的错误信息
 */

// ============================================================
// 返回值类型
// ============================================================

export interface ValidationResult {
  valid: boolean
  message?: string // valid=false 时的错误信息
}

/** 校验通过 */
function pass(): ValidationResult {
  return { valid: true }
}

/** 校验失败 */
function fail(message: string): ValidationResult {
  return { valid: false, message }
}

// ============================================================
// 基础校验
// ============================================================

/** 必填校验 */
export function required(value: unknown, message = '此字段不能为空'): ValidationResult {
  if (value === null || value === undefined) return fail(message)
  if (typeof value === 'string' && value.trim() === '') return fail(message)
  if (Array.isArray(value) && value.length === 0) return fail(message)
  return pass()
}

/** 最小长度 */
export function minLength(value: string, min: number, message?: string): ValidationResult {
  if (value.length < min) {
    return fail(message ?? `最少需要 ${min} 个字符`)
  }
  return pass()
}

/** 最大长度 */
export function maxLength(value: string, max: number, message?: string): ValidationResult {
  if (value.length > max) {
    return fail(message ?? `最多 ${max} 个字符`)
  }
  return pass()
}

/** 长度范围 */
export function lengthRange(
  value: string,
  min: number,
  max: number,
  message?: string
): ValidationResult {
  if (value.length < min || value.length > max) {
    return fail(message ?? `长度需在 ${min} ~ ${max} 个字符之间`)
  }
  return pass()
}

// ============================================================
// 格式校验
// ============================================================

/** Email */
export function email(value: string, message = '请输入有效的邮箱地址'): ValidationResult {
  const re =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return re.test(value) ? pass() : fail(message)
}

/**
 * Phone — 手机号校验
 * 默认校验中国大陆手机号，可传入自定义正则
 */
export function phone(
  value: string,
  re: RegExp = /^1[3-9]\d{9}$/,
  message = '请输入有效的手机号'
): ValidationResult {
  return re.test(value) ? pass() : fail(message)
}

/** URL */
export function url(value: string, message = '请输入有效的链接地址'): ValidationResult {
  const re =
    /^https?:\/\/(?:[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b)?(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/
  return re.test(value) ? pass() : fail(message)
}

/** 正整数 */
export function positiveInteger(value: string, message = '请输入正整数'): ValidationResult {
  return /^\d+$/.test(value) && parseInt(value, 10) > 0 ? pass() : fail(message)
}

/** 数字（含负数和小数） */
export function numeric(value: string, message = '请输入有效的数字'): ValidationResult {
  return /^-?\d+(\.\d+)?$/.test(value) ? pass() : fail(message)
}

// ============================================================
// 密码校验
// ============================================================

export interface PasswordStrength {
  valid: boolean
  strength: 'weak' | 'medium' | 'strong'
  message?: string
  hints: string[] // 还需要满足的条件
}

/**
 * 密码强度校验
 * 返回强度等级和未满足的条件列表
 */
export function password(value: string): PasswordStrength {
  const checks = [
    { test: value.length >= 8, hint: '至少 8 个字符' },
    { test: /[a-z]/.test(value), hint: '包含小写字母' },
    { test: /[A-Z]/.test(value), hint: '包含大写字母' },
    { test: /\d/.test(value), hint: '包含数字' },
    { test: /[^a-zA-Z0-9]/.test(value), hint: '包含特殊字符' },
  ]

  const passed = checks.filter((c) => c.test).length
  const hints = checks.filter((c) => !c.test).map((c) => c.hint)

  if (passed <= 2) {
    return { valid: false, strength: 'weak', message: '密码强度弱', hints }
  }
  if (passed <= 3) {
    return { valid: false, strength: 'medium', message: '密码强度中等', hints }
  }
  return { valid: true, strength: 'strong', hints: [] }
}

// ============================================================
// 组合校验
// ============================================================

/**
 * 运行一组校验规则，返回第一个失败的结果
 * 全部通过则返回 pass
 *
 * @example
 *   const result = validate(
 *     required(value),
 *     minLength(value, 6),
 *     email(value),
 *   );
 */
export function validate(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) return result
  }
  return pass()
}
