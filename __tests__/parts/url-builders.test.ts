import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ sb: {} }))

import { buildPartUrl, buildHsCodeUrl, buildAliexpressSearchUrl } from '@/lib/db/parts'

describe('buildPartUrl', () => {
  it('constructs correct part detail URL', () => {
    expect(buildPartUrl('au', 'byd', 'byd-dolphin', 'front-bumper'))
      .toBe('/au/parts/byd/byd-dolphin/front-bumper')
  })
})

describe('buildHsCodeUrl', () => {
  it('constructs correct HS code URL', () => {
    expect(buildHsCodeUrl('au', '87081000'))
      .toBe('/au/parts/hs/87081000')
  })
})

describe('buildAliexpressSearchUrl', () => {
  it('builds AliExpress search URL with encoded query', () => {
    const url = buildAliexpressSearchUrl('BYD Dolphin front bumper')
    expect(url).toContain('aliexpress.com')
    expect(url).toContain('BYD')
  })
})
