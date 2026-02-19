import { describe, expect, it } from 'vitest'

import { generateSummary } from '../summary'

describe('generateSummary', () => {
  it('returns null for null input', () => {
    expect(generateSummary(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(generateSummary(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(generateSummary('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(generateSummary('   \n\n   ')).toBeNull()
  })

  it('returns null for Markdown-only content with no visible text', () => {
    expect(generateSummary('# \n## ')).toBeNull()
  })

  it('strips code blocks', () => {
    const result = generateSummary('```\nconst x = 1\n```\nHello world')
    expect(result).toBe('Hello world')
    expect(result).not.toContain('const x')
  })

  it('strips headers', () => {
    const result = generateSummary('# Title\n## Subtitle\nBody text')
    expect(result).not.toContain('# Title')
    expect(result).toContain('Title')
    expect(result).toContain('Body text')
  })

  it('strips bold markers', () => {
    const result = generateSummary('This is **bold** text')
    expect(result).toBe('This is bold text')
  })

  it('strips italic markers', () => {
    const result = generateSummary('This is *italic* text')
    expect(result).toBe('This is italic text')
  })

  it('strips inline code', () => {
    const result = generateSummary('Use `const` here')
    expect(result).toBe('Use const here')
  })

  it('strips link syntax and keeps display text', () => {
    const result = generateSummary('See [documentation](https://example.com)')
    expect(result).toBe('See documentation')
    expect(result).not.toContain('https://example.com')
  })

  it('strips image syntax entirely', () => {
    const result = generateSummary('![logo](image.png) Some text')
    expect(result).not.toContain('logo')
    expect(result).not.toContain('image.png')
    expect(result).toContain('Some text')
  })

  it('strips blockquote markers', () => {
    const result = generateSummary('> This is a quote')
    expect(result).toContain('This is a quote')
    expect(result).not.toContain('>')
  })

  it('strips unordered list markers', () => {
    const result = generateSummary('- Item 1\n* Item 2\n+ Item 3')
    expect(result).toContain('Item 1')
    expect(result).not.toContain('- ')
  })

  it('strips ordered list markers', () => {
    const result = generateSummary('1. First\n2. Second')
    expect(result).toContain('First')
    expect(result).not.toContain('1.')
  })

  it('truncates content longer than maxLength', () => {
    const long = 'a'.repeat(300)
    const result = generateSummary(long)
    expect(result).toHaveLength(200)
  })

  it('respects a custom maxLength', () => {
    const result = generateSummary('Hello world this is some content', 10)
    expect(result).toHaveLength(10)
  })

  it('does not truncate content shorter than maxLength', () => {
    const result = generateSummary('Short content')
    expect(result).toBe('Short content')
  })

  it('collapses multiple blank lines', () => {
    const result = generateSummary('Line 1\n\n\n\nLine 2')
    expect(result).toBe('Line 1\nLine 2')
  })

  it('returns plain text for complex mixed Markdown', () => {
    const content = `# My Note\n\nThis is **bold** and *italic* with \`code\`.\n\n- List item\n\n[link](https://x.com)`
    const result = generateSummary(content)
    expect(result).toBe('My Note\nThis is bold and italic with code.\nList item\nlink')
  })
})
