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

function buildItemListSchema(
  baseUrl: string,
  market: string,
  modelSlug: string,
  dtcs: Array<{ dtc_code: string; description_en: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: dtcs.map((dtc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${dtc.dtc_code} — ${dtc.description_en}`,
      url: `${baseUrl}/${market}/dtc/${modelSlug}/${dtc.dtc_code.toLowerCase()}`,
    })),
  }
}

describe('ItemList schema', () => {
  it('maps DTC rows to ListItems with 1-based positions', () => {
    const schema = buildItemListSchema('https://example.com', 'au', 'byd-atto-3', [
      { dtc_code: 'B123698', description_en: 'Battery voltage fault' },
      { dtc_code: 'P0A0D', description_en: 'Drive motor temperature too high' },
    ])
    expect(schema.itemListElement[0].position).toBe(1)
    expect(schema.itemListElement[1].position).toBe(2)
    expect(schema.itemListElement[0].url).toBe(
      'https://example.com/au/dtc/byd-atto-3/b123698'
    )
  })
})

describe('related DTCs', () => {
  it('excludes the current DTC code from related list', () => {
    const allCodes = [
      { dtc_id: 1, dtc_code: 'B123698', description_en: 'Battery voltage fault', severity: 'WARNING' },
      { dtc_id: 2, dtc_code: 'P0A0D', description_en: 'Drive motor temp', severity: 'CRITICAL' },
      { dtc_id: 3, dtc_code: 'U0100', description_en: 'CAN bus lost', severity: 'INFO' },
    ]
    const currentId = 1
    const related = allCodes.filter((d) => d.dtc_id !== currentId)
    expect(related).toHaveLength(2)
    expect(related.find((d) => d.dtc_id === 1)).toBeUndefined()
  })
})
