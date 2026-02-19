import { describe, expect, it } from 'vitest'

import { toKebabCase } from '../parsers'

describe('toKebabCase', () => {
  it('converts simple camelCase', () => {
    expect(toKebabCase('backgroundColor')).toBe('background-color')
  })

  it('converts consecutive uppercase letters (acronym)', () => {
    expect(toKebabCase('myHTTPClient')).toBe('my-http-client')
  })

  it('converts a single-word acronym', () => {
    expect(toKebabCase('XMLParser')).toBe('xml-parser')
  })

  it('handles a single lowercase word unchanged', () => {
    expect(toKebabCase('simple')).toBe('simple')
  })

  it('handles an already kebab-case string unchanged', () => {
    expect(toKebabCase('already-kebab')).toBe('already-kebab')
  })

  it('returns empty string for empty input', () => {
    expect(toKebabCase('')).toBe('')
  })

  it('lowercases the entire result', () => {
    expect(toKebabCase('ABC')).toBe('abc')
  })

  it('handles mixed digits and letters', () => {
    expect(toKebabCase('h264Encoder')).toBe('h264-encoder')
  })
})
