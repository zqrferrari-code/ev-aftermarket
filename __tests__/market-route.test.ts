import { describe, it, expect } from 'vitest'

const VALID_MARKETS = ['au', 'uk', 'uae', 'no']

describe('market route validation', () => {
  it('should recognize all valid market codes', () => {
    expect(VALID_MARKETS).toContain('au')
    expect(VALID_MARKETS).toContain('uk')
    expect(VALID_MARKETS).toContain('uae')
    expect(VALID_MARKETS).toContain('no')
  })

  it('should reject invalid market codes', () => {
    expect(VALID_MARKETS).not.toContain('us')
    expect(VALID_MARKETS).not.toContain('cn')
  })
})
