/**
 * Design Tokens — Colors
 *
 * 单源真相：所有颜色定义在这里
 * - Web 端通过 generate-css.ts 生成 index.css
 * - React Native 端直接 import 使用
 *
 * 命名规则:
 *   - 基础色用数字梯度: 50(最浅) → 900(最深)
 *   - 语义色用用途命名: primary, secondary, error 等
 *   - 状态色附加后缀: hover, active, focus, disabled
 */

// ============================================================
// 基础色板 (Base Colors)
// 数字梯度，不直接使用，供语义色引用
// ============================================================

const gray = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  300: '#D1D5DB',
  500: '#6B7280',
  700: '#374151',
  900: '#111827',
} as const

const blue = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  300: '#93C5FD',
  500: '#3B82F6',
  700: '#1D4ED8',
  900: '#1E3A8A',
} as const

const green = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  300: '#6EE7B7',
  500: '#10B981',
  700: '#047857',
  900: '#064E3B',
} as const

const red = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  300: '#FCA5A5',
  500: '#EF4444',
  700: '#B91C1C',
  900: '#7F1D1D',
} as const

const yellow = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  300: '#FCD34D',
  500: '#F59E0B',
  700: '#B45309',
  900: '#78350F',
} as const

const purple = {
  50: '#F5F3FF',
  100: '#EDE9FE',
  300: '#C4B5FD',
  500: '#8B5CF6',
  700: '#6D28D9',
  900: '#4C1D95',
} as const

// ============================================================
// 语义色 (Semantic Colors)
// 这是实际在组件里使用的颜色
// ============================================================

export const colors = {
  // --- 主色 ---
  primary: blue[700],
  primaryHover: blue[700],
  primaryActive: blue[900],
  primaryFocus: blue[500],
  primaryDisabled: blue[300],
  primaryText: blue[700], // 用于文本链接等场景
  primaryBg: blue[50], // 用于背景高亮等场景

  // --- 副色 ---
  secondary: purple[700],
  secondaryHover: purple[700],
  secondaryActive: purple[900],
  secondaryDisabled: purple[300],
  secondaryText: purple[700],
  secondaryBg: purple[50],

  // --- 背景 ---
  bgBase: '#FFFFFF', // 页面基础背景
  bgMuted: gray[50], // 次级背景（卡片、侧栏等）
  bgHover: gray[100], // 悬停背景
  bgActive: gray[100], // 激活背景

  // --- 文本 ---
  textPrimary: gray[900], // 主文本
  textSecondary: gray[700], // 次文本
  textInverse: '#FFFFFF', // 深色背景上的文本

  // --- 边框 ---
  border: gray[100], // 默认边框
  borderFocus: blue[500], // 聚焦边框

  // --- 状态色: Error ---
  error: red[500],
  errorHover: red[700],
  errorText: red[700],
  errorBg: red[50],
  errorBorder: red[300],

  // --- 状态色: Success ---
  success: green[500],
  successHover: green[700],
  successText: green[700],
  successBg: green[50],
  successBorder: green[300],

  // --- 状态色: Warning ---
  warning: yellow[500],
  warningHover: yellow[700],
  warningText: yellow[700],
  warningBg: yellow[50],
  warningBorder: yellow[300],

  // --- 状态色: Info ---
  info: blue[500],
  infoHover: blue[700],
  infoText: blue[700],
  infoBg: blue[50],
  infoBorder: blue[300],
} as const

// ============================================================
// Dark Mode Colors
// ============================================================

export const darkColors = {
  // --- 主色 (保持一致) ---
  primary: blue[500],
  primaryHover: blue[300],
  primaryActive: blue[300],
  primaryFocus: blue[700],
  primaryDisabled: blue[900],
  primaryText: gray[700],
  primaryBg: '#172554',

  // --- 副色 ---
  secondary: purple[500],
  secondaryHover: purple[300],
  secondaryActive: purple[300],
  secondaryDisabled: purple[900],
  secondaryText: purple[300],
  secondaryBg: '#2e1065',

  // --- 背景 ---
  bgBase: gray[900], // 页面基础背景
  bgMuted: gray[900], // 次级背景
  bgActive: gray[700], // 激活背景
  bgHover: gray[700], // 悬停背景

  // --- 文本 ---
  textPrimary: gray[50], // 主文本
  textSecondary: gray[300], // 次文本
  textInverse: gray[900], // 浅色背景上的文本

  // --- 边框 ---
  border: gray[700], // 默认边框
  borderFocus: blue[500], // 聚焦边框

  // --- 状态色: Error ---
  error: red[500],
  errorHover: red[300],
  errorText: red[300],
  errorBg: '#450a0a',
  errorBorder: red[900],

  // --- 状态色: Success ---
  success: green[500],
  successHover: green[300],
  successText: green[300],
  successBg: '#052e16',
  successBorder: green[900],

  // --- 状态色: Warning ---
  warning: yellow[500],
  warningHover: yellow[300],
  warningText: yellow[300],
  warningBg: '#422006',
  warningBorder: yellow[900],

  // --- 状态色: Info ---
  info: blue[500],
  infoHover: blue[300],
  infoText: blue[300],
  infoBg: '#172554',
  infoBorder: blue[900],
} as const

export type Colors = typeof colors
export type ColorKey = keyof Colors
