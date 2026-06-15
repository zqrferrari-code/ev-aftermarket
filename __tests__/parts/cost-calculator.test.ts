import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ sb: {} }))

import { calculateTariff } from '@/lib/db/parts'

describe('CostCalculator logic (calculateTariff)', () => {
  it('zero duty - only GST applies', () => {
    const r = calculateTariff({ partPrice: 500, shipping: 80, dutyRate: 0, vatRate: 10 })
    expect(r.duty).toBe(0)
    expect(r.vat).toBe(58)
    expect(r.total).toBe(638)
  })
})
