/**
 * Design Tokens — Spacing
 */

export const spacing = {
  0.5: 2, // 0.5 * 4
  1: 4, // 1 * 4
  1.25: 5,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  9.5: 38,
  11: 44,
  12: 48,
  16: 64,
  25: 100,
  32: 128,
  40: 160,
} as const

export type Spacing = typeof spacing
export type SpacingKey = keyof Spacing
