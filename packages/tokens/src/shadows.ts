/**
 * Design Tokens — Shadows
 *
 * 收敛到最小可维护层级：
 *   - none: 无阴影
 *   - sm: 轻微悬浮
 *   - md: 默认浮层
 *   - lg: 强浮层
 */

export const shadowWeb = {
  none: 'none',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
} as const

export const shadowNative = {
  none: {
    elevation: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  md: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  lg: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
} as const

export type ShadowWeb = typeof shadowWeb
export type ShadowWebKey = keyof ShadowWeb
export type ShadowNative = typeof shadowNative
export type ShadowNativeKey = keyof ShadowNative
