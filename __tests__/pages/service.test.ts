import { describe, it, expect } from 'vitest'

function buildServiceTitle(modelName: string, market: string): string {
  return `${modelName} Service Cost & Centres — ${market.toUpperCase()}`
}

describe('service page', () => {
  it('should include service cost info in title', () => {
    const title = buildServiceTitle('BYD Atto 3', 'au')
    expect(title).toContain('Service Cost')
    expect(title).toContain('AU')
  })
})
