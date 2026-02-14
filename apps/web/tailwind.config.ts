import typographyPlugin from '@tailwindcss/typography'
import type { Config } from 'tailwindcss'

import { colors } from '@nicenote/tokens'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/editor/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: {
          DEFAULT: colors.primary,
          hover: colors.primaryHover,
          active: colors.primaryActive,
          focus: colors.primaryFocus,
          disabled: colors.primaryDisabled,
          text: colors.primaryText,
          bg: colors.primaryBg,
          foreground: colors.textInverse,
        },
        // Secondary colors
        secondary: {
          DEFAULT: colors.secondary,
          hover: colors.secondaryHover,
          active: colors.secondaryActive,
          disabled: colors.secondaryDisabled,
          text: colors.secondaryText,
          bg: colors.secondaryBg,
          foreground: colors.textPrimary,
        },
        // Background colors
        background: colors.bgBase,
        muted: {
          DEFAULT: colors.bgMuted,
          foreground: colors.textSecondary,
        },
        // Foreground/text colors
        foreground: colors.textPrimary,
        // Border colors
        border: colors.border,
        ring: colors.borderFocus,
        // Accent (hover states)
        accent: {
          DEFAULT: colors.bgHover,
          foreground: colors.textPrimary,
        },
        // Status colors - Error
        destructive: {
          DEFAULT: colors.error,
          hover: colors.errorHover,
          foreground: colors.textInverse,
          text: colors.errorText,
          bg: colors.errorBg,
          border: colors.errorBorder,
        },
        // Status colors - Success
        success: {
          DEFAULT: colors.success,
          hover: colors.successHover,
          text: colors.successText,
          bg: colors.successBg,
          border: colors.successBorder,
        },
        // Status colors - Warning
        warning: {
          DEFAULT: colors.warning,
          hover: colors.warningHover,
          text: colors.warningText,
          bg: colors.warningBg,
          border: colors.warningBorder,
        },
        // Status colors - Info
        info: {
          DEFAULT: colors.info,
          hover: colors.infoHover,
          text: colors.infoText,
          bg: colors.infoBg,
          border: colors.infoBorder,
        },
        // Popover colors (inherit from background)
        popover: {
          DEFAULT: colors.bgBase,
          foreground: colors.textPrimary,
        },
        // Card colors
        card: {
          DEFAULT: colors.bgBase,
          foreground: colors.textPrimary,
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
    },
  },
  plugins: [typographyPlugin],
} satisfies Config
