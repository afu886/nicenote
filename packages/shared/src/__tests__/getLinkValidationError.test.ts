import { describe, expect, it } from 'vitest'

import { getLinkValidationError } from '../validators'

describe('getLinkValidationError', () => {
  it('returns linkEmpty for empty string', () => {
    expect(getLinkValidationError('')).toBe('validation.linkEmpty')
  })

  it('returns linkEmpty for whitespace-only string', () => {
    expect(getLinkValidationError('   ')).toBe('validation.linkEmpty')
  })

  it('returns linkTooLong for URLs exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2048)
    expect(getLinkValidationError(longUrl)).toBe('validation.linkTooLong')
  })

  it('returns linkInvalidFormat for plain text', () => {
    expect(getLinkValidationError('not a url')).toBe('validation.linkInvalidFormat')
  })

  it('returns linkInvalidFormat for a partial URL', () => {
    expect(getLinkValidationError('example.com')).toBe('validation.linkInvalidFormat')
  })

  it('returns null for valid http URL', () => {
    expect(getLinkValidationError('http://example.com')).toBeNull()
  })

  it('returns null for valid https URL', () => {
    expect(getLinkValidationError('https://example.com/path?q=1#anchor')).toBeNull()
  })

  it('returns null for mailto URL', () => {
    expect(getLinkValidationError('mailto:user@example.com')).toBeNull()
  })

  it('returns null for tel URL', () => {
    expect(getLinkValidationError('tel:+1234567890')).toBeNull()
  })

  it('returns linkUnsupportedProtocol for javascript: URLs', () => {
    expect(getLinkValidationError('javascript:alert(1)')).toBe('validation.linkUnsupportedProtocol')
  })

  it('returns linkUnsupportedProtocol for data: URLs', () => {
    expect(getLinkValidationError('data:text/html,<h1>hi</h1>')).toBe(
      'validation.linkUnsupportedProtocol'
    )
  })

  it('returns linkUnsupportedProtocol for ftp: URLs', () => {
    expect(getLinkValidationError('ftp://example.com')).toBe('validation.linkUnsupportedProtocol')
  })

  it('trims surrounding whitespace before validation', () => {
    expect(getLinkValidationError('  https://example.com  ')).toBeNull()
  })
})
