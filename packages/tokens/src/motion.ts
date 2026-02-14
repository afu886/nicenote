/**
 * Design Tokens — Motion
 */

export const duration = {
  fast: 120,
  base: 200,
} as const

export const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export type Duration = typeof duration
export type DurationKey = keyof Duration
export type Easing = typeof easing
export type EasingKey = keyof Easing
