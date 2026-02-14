/**
 * Design Tokens — Border Radius
 */

export const borderRadius = {
  xs: 4,
  sm: 8,
} as const

export type BorderRadius = typeof borderRadius
export type BorderRadiusKey = keyof BorderRadius
