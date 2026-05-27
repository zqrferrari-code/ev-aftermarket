import { describe, it, expect } from 'vitest'

function buildDtcPageTitle(dtcCode: string, modelName: string): string {
  return `${modelName} ${dtcCode.toUpperCase()} Fault Code — Meaning, Causes & What To Do`
}

describe('DTC page title', () => {
  it('should match target SEO template', () => {
    const title = buildDtcPageTitle('p0a1f', 'BYD Atto 3')
    expect(title).toBe('BYD Atto 3 P0A1F Fault Code — Meaning, Causes & What To Do')
  })
})

function buildBreadcrumbSchema(
  baseUrl: string,
  market: string,
  modelSlug: string,
  modelName: string,
  dtcCode: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: market.toUpperCase(),
        item: `${baseUrl}/${market}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${modelName} Fault Codes`,
        item: `${baseUrl}/${market}/dtc/${modelSlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: dtcCode.toUpperCase(),
        item: `${baseUrl}/${market}/dtc/${modelSlug}/${dtcCode.toLowerCase()}`,
      },
    ],
  }
}

describe('BreadcrumbList schema', () => {
  it('has 3 items with correct positions', () => {
    const schema = buildBreadcrumbSchema(
      'https://example.com',
      'au',
      'byd-atto-3',
      'BYD Atto 3',
      'B123698'
    )
    expect(schema.itemListElement).toHaveLength(3)
    expect(schema.itemListElement[0].position).toBe(1)
    expect(schema.itemListElement[2].name).toBe('B123698')
    expect(schema.itemListElement[2].item).toBe(
      'https://example.com/au/dtc/byd-atto-3/b123698'
    )
  })
})
