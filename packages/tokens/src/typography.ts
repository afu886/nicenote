/**
 * Design Tokens — Typography
 */

export const fontFamily = {
  sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'].join(
    ', '
  ),
  mono: ["'JetBrains Mono'", "'Fira Code'", "'Consolas'", 'monospace'].join(', '),
} as const

export const fontSize = {
  caption: { size: 10, lineHeight: 14 },
  meta: { size: 11, lineHeight: 16 },
  xs: { size: 12, lineHeight: 16 },
  sm: { size: 14, lineHeight: 20 },
  button: { size: 15, lineHeight: 20 },
  base: { size: 16, lineHeight: 24 },
  md: { size: 18, lineHeight: 24 },
  lg: { size: 20, lineHeight: 28 },
  xl: { size: 24, lineHeight: 32 },
} as const

export const fontWeight = {
  regular: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
} as const

export type FontFamily = typeof fontFamily
export type FontSize = typeof fontSize
export type FontWeight = typeof fontWeight
