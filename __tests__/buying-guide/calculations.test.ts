import { calcDriveAway, calcNovatedLease, calcSaStampDuty, getMarginalRate } from '@/lib/buying-guide/calculations'

describe('calcSaStampDuty', () => {
  it('$44,990 → $1,740', () => {
    expect(calcSaStampDuty(44990)).toBe(1740)
  })
  it('$34,990 → $1,340', () => {
    expect(calcSaStampDuty(34990)).toBe(1340)
  })
  it('$2,500 → $45', () => {
    expect(calcSaStampDuty(2500)).toBe(45)
  })
})

describe('getMarginalRate', () => {
  it('$45,000 income → 19%', () => expect(getMarginalRate(45000)).toBe(0.19))
  it('$80,000 income → 32.5%', () => expect(getMarginalRate(80000)).toBe(0.325))
  it('$140,000 income → 37%', () => expect(getMarginalRate(140000)).toBe(0.37))
  it('$200,000 income → 45%', () => expect(getMarginalRate(200000)).toBe(0.45))
})

describe('calcDriveAway', () => {
  it('NSW EV: stamp duty is 0', () => {
    const result = calcDriveAway(44990, 'NSW', true)
    expect(result.stamp_duty).toBe(0)
    expect(result.stamp_duty_exempt).toBe(true)
    expect(result.total_min).toBe(44990 + 0 + 700 + 500)
    expect(result.total_max).toBe(44990 + 0 + 1300 + 1500)
  })
  it('VIC EV $44,990: stamp duty = 44990 * 0.042 = 1889.58 → rounded 1890', () => {
    const result = calcDriveAway(44990, 'VIC', true)
    expect(result.stamp_duty).toBe(1890)
    expect(result.stamp_duty_exempt).toBe(false)
  })
  it('SA EV $44,990: stamp duty = 1740', () => {
    const result = calcDriveAway(44990, 'SA', true)
    expect(result.stamp_duty).toBe(1740)
  })
  it('NT EV $44,990: stamp duty = 44990 * 0.03 = 1349.7 → rounded 1350', () => {
    const result = calcDriveAway(44990, 'NT', true)
    expect(result.stamp_duty).toBe(1350)
  })
})

describe('calcNovatedLease', () => {
  it('$100,000 salary, $44,990 car, 5yr, FBT eligible', () => {
    const result = calcNovatedLease(44990, 100000, 5, true)
    expect(result.annual_lease_cost).toBeCloseTo(10347.7, 0)
    expect(result.marginal_rate).toBe(0.325)
    expect(result.annual_tax_saving).toBeCloseTo(3363, 0)
    expect(result.fbt_eligible).toBe(true)
    expect(result.rfba_warning).toBe(true)
  })
  it('PHEV not FBT eligible', () => {
    const result = calcNovatedLease(54990, 100000, 3, false)
    expect(result.fbt_eligible).toBe(false)
    expect(result.annual_tax_saving).toBe(0)
  })
})
