import { describe, it, expect } from 'vitest'

// Pure URL-builder functions extracted from sitemap logic — testable without DB
function buildDtcUrl(base: string, market: string, modelSlug: string, dtcCode: string): string {
  return `${base}/${market}/dtc/${modelSlug}/${dtcCode.toLowerCase()}`
}

function buildModelDtcListUrl(base: string, market: string, modelSlug: string): string {
  return `${base}/${market}/dtc/${modelSlug}`
}

function buildMarketUrl(base: string, market: string): string {
  return `${base}/${market}`
}

describe('sitemap URL builders', () => {
  it('builds DTC detail URL in lowercase', () => {
    expect(buildDtcUrl('https://example.com', 'au', 'byd-atto-3', 'B123698')).toBe(
      'https://example.com/au/dtc/byd-atto-3/b123698'
    )
  })

  it('builds model DTC list URL', () => {
    expect(buildModelDtcListUrl('https://example.com', 'au', 'byd-atto-3')).toBe(
      'https://example.com/au/dtc/byd-atto-3'
    )
  })

  it('builds market home URL', () => {
    expect(buildMarketUrl('https://example.com', 'au')).toBe('https://example.com/au')
  })
})
