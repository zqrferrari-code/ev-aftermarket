import { describe, it, expect } from 'vitest'

describe('Market type', () => {
  it('should have required fields', () => {
    const market = {
      market_code: 'AU',
      country_name: 'Australia',
      currency: 'AUD',
      drive_side: 'RHD',
      climate_zone: 'temperate',
      active: true,
    }
    expect(market.market_code).toBe('AU')
    expect(market.currency).toBe('AUD')
  })
})

describe('DTC type', () => {
  it('should have severity field', () => {
    const dtc = {
      dtc_id: 1,
      dtc_code: 'P0A1F',
      dtc_type: 'STANDARD',
      description_en: 'Battery Energy Control Module Requested MIL On',
      severity: 'CRITICAL',
      related_system: 'HV Battery',
      safety_warning: 'Do not drive. Contact authorised dealer immediately.',
    }
    expect(['INFO', 'WARNING', 'CRITICAL']).toContain(dtc.severity)
  })
})
