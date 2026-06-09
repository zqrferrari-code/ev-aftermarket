import { describe, it, expect } from 'vitest'

function buildChargingPageTitle(modelName: string, market: string): string {
  return `${modelName} Charging Guide — ${market.toUpperCase()} | Chinese EV Aftermarket`
}

describe('charging page metadata', () => {
  it('should include model name and market', () => {
    const title = buildChargingPageTitle('BYD Atto 3', 'au')
    expect(title).toContain('BYD Atto 3')
    expect(title).toContain('AU')
  })
})
