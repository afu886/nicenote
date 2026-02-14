/**
 * Generate Tailwind CSS theme variables from tokens package
 * Run this script when tokens are updated
 */
import { writeFileSync } from 'node:fs'

import {
  borderRadius,
  colors,
  darkColors,
  duration,
  easing,
  fontSize,
  fontWeight,
  shadowWeb,
  spacing,
} from '@nicenote/tokens'

const FONT_SANS_STACK =
  "'DM Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Noto Sans CJK SC', 'Source Han Sans SC', 'Helvetica Neue', Arial, sans-serif"

const FONT_MONO_STACK =
  "'JetBrainsMono', 'SFMono-Regular', 'SF Mono', 'Cascadia Mono', 'Segoe UI Mono', 'Roboto Mono', 'Noto Sans Mono CJK SC', 'Source Han Mono SC', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"

type Palette = Record<keyof typeof colors, string>
type VarEntry = [name: string, value: string]
type VarSection = {
  title: string
  entries: VarEntry[]
}

const COLOR_SECTIONS: VarSection[] = [
  {
    title: 'Primary colors',
    entries: [
      ['color-primary', 'primary'],
      ['color-primary-hover', 'primaryHover'],
      ['color-primary-active', 'primaryActive'],
      ['color-primary-focus', 'primaryFocus'],
      ['color-primary-disabled', 'primaryDisabled'],
      ['color-primary-text', 'primaryText'],
      ['color-primary-bg', 'primaryBg'],
      ['color-primary-foreground', 'textInverse'],
    ],
  },
  {
    title: 'Secondary colors',
    entries: [
      ['color-secondary', 'secondary'],
      ['color-secondary-hover', 'secondaryHover'],
      ['color-secondary-active', 'secondaryActive'],
      ['color-secondary-disabled', 'secondaryDisabled'],
      ['color-secondary-text', 'secondaryText'],
      ['color-secondary-bg', 'secondaryBg'],
      ['color-secondary-foreground', 'var(--color-foreground)'],
    ],
  },
  {
    title: 'Background and foreground',
    entries: [
      ['color-background', 'bgBase'],
      ['color-foreground', 'textPrimary'],
    ],
  },
  {
    title: 'Muted',
    entries: [
      ['color-muted', 'bgMuted'],
      ['color-muted-foreground', 'textSecondary'],
    ],
  },
  {
    title: 'Border',
    entries: [
      ['color-border', 'border'],
      ['color-ring', 'borderFocus'],
    ],
  },
  {
    title: 'Accent',
    entries: [
      ['color-accent', 'var(--color-hover)'],
      ['color-accent-foreground', 'var(--color-hover-foreground)'],
    ],
  },
  {
    title: 'Active state',
    entries: [
      ['color-active', 'bgActive'],
      ['color-active-foreground', 'var(--color-primary-text)'],
    ],
  },
  {
    title: 'Hover state',
    entries: [
      ['color-hover', 'bgHover'],
      ['color-hover-foreground', 'var(--color-primary-text)'],
    ],
  },
  {
    title: 'Destructive',
    entries: [
      ['color-destructive', 'error'],
      ['color-destructive-hover', 'errorHover'],
      ['color-destructive-foreground', 'var(--color-primary-foreground)'],
      ['color-destructive-text', 'errorText'],
      ['color-destructive-bg', 'errorBg'],
      ['color-destructive-border', 'errorBorder'],
    ],
  },
  {
    title: 'Success',
    entries: [
      ['color-success', 'success'],
      ['color-success-hover', 'successHover'],
      ['color-success-text', 'successText'],
      ['color-success-bg', 'successBg'],
      ['color-success-border', 'successBorder'],
    ],
  },
  {
    title: 'Warning',
    entries: [
      ['color-warning', 'warning'],
      ['color-warning-hover', 'warningHover'],
      ['color-warning-text', 'warningText'],
      ['color-warning-bg', 'warningBg'],
      ['color-warning-border', 'warningBorder'],
    ],
  },
  {
    title: 'Info',
    entries: [
      ['color-info', 'info'],
      ['color-info-hover', 'infoHover'],
      ['color-info-text', 'infoText'],
      ['color-info-bg', 'infoBg'],
      ['color-info-border', 'infoBorder'],
    ],
  },
  {
    title: 'Popover',
    entries: [
      ['color-popover', 'var(--color-background)'],
      ['color-popover-foreground', 'var(--color-foreground)'],
    ],
  },
  {
    title: 'Card',
    entries: [
      ['color-card', 'var(--color-background)'],
      ['color-card-foreground', 'var(--color-foreground)'],
    ],
  },
]

function toKebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function toSpacingTokenKey(value: string): string {
  // Escape decimal point so utilities like p-1.5 resolve to --spacing-1\.5
  return toKebabCase(value).replace(/\./g, '\\.')
}

function toFontWeightTokenKey(value: string): string {
  if (value === 'regular') return 'normal'
  if (value === 'semi-bold') return 'semibold'
  return value
}

function toRem(value: number): string {
  if (value === 0) return '0'
  return `${Number((value / 16).toFixed(4))}rem`
}

function toDurationSeconds(value: number): string {
  if (value === 0) return '0s'
  return `${Number((value / 1000).toFixed(3))}s`
}

function normalizeCssValue(value: string): string {
  return value.replace(/#([0-9A-F]{3,8})\b/g, (match) => match.toLowerCase())
}

function resolveColor(palette: Palette, value: string): string {
  if (value in palette) {
    return palette[value as keyof Palette]
  }

  return value
}

function buildBaseSections(): VarSection[] {
  return [
    {
      title: 'Typography',
      entries: [
        ['font-sans', FONT_SANS_STACK],
        ['font-mono', FONT_MONO_STACK],
        ...Object.entries(fontSize).flatMap(([key, value]): VarEntry[] => [
          [`text-${toKebabCase(key)}`, toRem(value.size)],
          [`text-${toKebabCase(key)}--line-height`, toRem(value.lineHeight)],
        ]),
        ...Object.entries(fontWeight).map(
          ([key, value]): VarEntry => [
            `font-weight-${toFontWeightTokenKey(toKebabCase(key))}`,
            String(value),
          ]
        ),
      ],
    },
    {
      title: 'Radius',
      entries: Object.entries(borderRadius).map(
        ([key, value]): VarEntry => [`radius-${toKebabCase(key)}`, toRem(value)]
      ),
    },
    {
      title: 'Spacing',
      entries: [
        ['spacing', toRem(spacing[1])],
        ...Object.entries(spacing).map(
          ([key, value]): VarEntry => [`spacing-${toSpacingTokenKey(key)}`, toRem(value)]
        ),
      ],
    },
    {
      title: 'Shadows',
      entries: Object.entries(shadowWeb).map(
        ([key, value]): VarEntry => [`shadow-${toKebabCase(key)}`, value]
      ),
    },
    {
      title: 'Motion',
      entries: [
        ...Object.entries(duration).map(
          ([key, value]): VarEntry => [
            `motion-duration-${toKebabCase(key)}`,
            toDurationSeconds(value),
          ]
        ),
        ...Object.entries(easing).map(
          ([key, value]): VarEntry => [`motion-easing-${toKebabCase(key)}`, value]
        ),
      ],
    },
  ]
}

function buildColorSections(palette: Palette): VarSection[] {
  return COLOR_SECTIONS.map((section) => ({
    title: section.title,
    entries: section.entries.map(([name, value]): VarEntry => [name, resolveColor(palette, value)]),
  }))
}

function buildThemeBlock(
  selector: string,
  palette: Palette,
  options: { includeBase?: boolean; comment?: string } = {}
): string {
  const { includeBase = false, comment } = options
  const sections = [...(includeBase ? buildBaseSections() : []), ...buildColorSections(palette)]
  const lines: string[] = [`${selector} {`]

  if (comment) {
    lines.push(`  /* ${comment} */`, '')
  }

  for (const section of sections) {
    lines.push(`  /* ${section.title} */`)
    for (const [name, value] of section.entries) {
      lines.push(`  --${name}: ${normalizeCssValue(value)};`)
    }
    lines.push('')
  }

  lines.push('}')

  return lines.join('\n')
}

const themeCSS = buildThemeBlock('@theme', colors, {
  includeBase: true,
  comment: 'Auto-generated from @nicenote/tokens',
})
const darkThemeCSS = buildThemeBlock('.dark', darkColors)

const indexCssContent = `@import 'tailwindcss';
@plugin "@tailwindcss/typography";
@source "../../packages";
@config "../tailwind.config.ts";

/* Nicenote Editor Required Styles */
@import '@nicenote/editor/styles/editor.css';

${themeCSS}

/* Dark mode */
${darkThemeCSS}

@layer base {
  input,
  textarea,
  select {
    @apply border border-border rounded-md;
  }

  input:focus,
  textarea:focus,
  select:focus,
  button:focus {
    @apply focus:ring-1 focus:ring-ring focus:outline-none;
  }

  body {
    font-family: var(--font-sans);
    @apply bg-background text-foreground;
  }
}
`

writeFileSync(new URL('../src/index.css', import.meta.url), indexCssContent, 'utf-8')

console.log('✅ Theme CSS generated successfully in index.css')
