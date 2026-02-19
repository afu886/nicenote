import { describe, expect, it } from 'vitest'

import { sanitizeContent } from '../sanitize'

describe('sanitizeContent', () => {
  it('returns unchanged content with no dangerous links', () => {
    const safe = 'Hello world with [a link](https://example.com)'
    expect(sanitizeContent(safe)).toBe(safe)
  })

  it('replaces javascript: protocol links', () => {
    expect(sanitizeContent('[click](javascript:alert(1))')).toBe('[click](#)')
  })

  it('replaces vbscript: protocol links', () => {
    expect(sanitizeContent('[run](vbscript:msgbox(1))')).toBe('[run](#)')
  })

  it('replaces data:text/html links', () => {
    expect(sanitizeContent('[xss](data:text/html,<h1>hi</h1>)')).toBe('[xss](#)')
  })

  it('preserves data:image/ links (safe for img src)', () => {
    const safe = '![img](data:image/png;base64,abc123)'
    expect(sanitizeContent(safe)).toBe(safe)
  })

  it('replaces multiple dangerous links in the same string', () => {
    const input = '[a](javascript:1) and [b](vbscript:2)'
    expect(sanitizeContent(input)).toBe('[a](#) and [b](#)')
  })

  it('preserves https:// links', () => {
    const safe = '[visit](https://example.com)'
    expect(sanitizeContent(safe)).toBe(safe)
  })

  it('preserves http:// links', () => {
    const safe = '[visit](http://example.com)'
    expect(sanitizeContent(safe)).toBe(safe)
  })

  it('is case-insensitive for protocol matching', () => {
    expect(sanitizeContent('[x](JAVASCRIPT:alert(1))')).toBe('[x](#)')
    expect(sanitizeContent('[x](JavaScript:alert(1))')).toBe('[x](#)')
  })

  it('returns empty string unchanged', () => {
    expect(sanitizeContent('')).toBe('')
  })

  it('preserves link display text in the replacement', () => {
    expect(sanitizeContent('[My Script](javascript:evil())')).toBe('[My Script](#)')
  })
})
