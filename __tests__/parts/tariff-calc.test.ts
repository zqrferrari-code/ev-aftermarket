import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ sb: {} }))

import { calculateTariff } from '@/lib/db/parts'

describe('calculateTariff', () => {
  it('calculates 0% duty with GST only (AU standard)', () => {
    const result = calculateTariff({
      partPrice: 200,
      shipping: 30,
      dutyRate: 0,
      vatRate: 10,
    })
    expect(result.cif).toBe(230)
    expect(result.duty).toBe(0)
    expect(result.vat).toBe(23)
    expect(result.total).toBe(253)
  })

  it('calculates with non-zero duty rate', () => {
    const result = calculateTariff({
      partPrice: 200,
      shipping: 30,
      dutyRate: 5,
      vatRate: 10,
    })
    expect(result.cif).toBe(230)
    expect(result.duty).toBe(11.5)
    expect(result.vat).toBe(24.15)
    expect(result.total).toBe(265.65)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateTariff({
      partPrice: 199.99,
      shipping: 25.5,
      dutyRate: 0,
      vatRate: 10,
    })
    expect(result.total.toString()).toMatch(/^\d+\.\d{1,2}$/)
  })
})
