import {
  STAMP_DUTY_RULES,
  REGO_ESTIMATES,
  DEALER_DELIVERY,
  AU_TAX_BRACKETS,
  type State,
} from './tax-rates'

export type DriveAwayResult = {
  msrp: number
  stamp_duty: number
  stamp_duty_exempt: boolean
  rego_min: number
  rego_max: number
  dealer_delivery_min: number
  dealer_delivery_max: number
  total_min: number
  total_max: number
}

export type NovatedLeaseResult = {
  annual_lease_cost: number
  pre_tax_deduction: number
  marginal_rate: number
  annual_tax_saving: number
  monthly_out_of_pocket: number
  rfba_warning: boolean
  fbt_eligible: boolean
}

/** SA fixed-amount tiered stamp duty (from RevenueSA official rates) */
export function calcSaStampDuty(msrp: number): number {
  if (msrp <= 1000) return Math.max(5, Math.ceil(msrp / 100))
  if (msrp <= 2000) return 10 + Math.ceil((msrp - 1000) / 100) * 2
  if (msrp <= 3000) return 30 + Math.ceil((msrp - 2000) / 100) * 3
  return 60 + Math.ceil((msrp - 3000) / 100) * 4
}

/** Returns marginal tax rate for given annual salary (AU 2024-25) */
export function getMarginalRate(annualSalary: number): number {
  for (const bracket of AU_TAX_BRACKETS) {
    if (bracket.upTo === null || annualSalary <= bracket.upTo) {
      return bracket.rate
    }
  }
  return 0.45
}

/** Mode A: Calculate drive-away price breakdown */
export function calcDriveAway(
  msrp: number,
  state: State,
  ev_eligible: boolean
): DriveAwayResult {
  const rule = STAMP_DUTY_RULES.find(r => r.state === state)!
  const rego = REGO_ESTIMATES.find(r => r.state === state)!

  let stamp_duty = 0
  let stamp_duty_exempt = false

  if (rule.ev_exempt && ev_eligible) {
    stamp_duty_exempt = true
    stamp_duty = 0
  } else if (rule.sa_tiered) {
    stamp_duty = calcSaStampDuty(msrp)
  } else if (rule.flat_rate) {
    stamp_duty = Math.round(msrp * rule.flat_rate)
  } else if (rule.tiers) {
    const tier = rule.tiers.find(t => t.upTo === null || msrp <= t.upTo)!
    stamp_duty = Math.round(msrp * tier.rate)
  }

  return {
    msrp,
    stamp_duty,
    stamp_duty_exempt,
    rego_min: rego.annual_min,
    rego_max: rego.annual_max,
    dealer_delivery_min: DEALER_DELIVERY.min,
    dealer_delivery_max: DEALER_DELIVERY.max,
    total_min: msrp + stamp_duty + rego.annual_min + DEALER_DELIVERY.min,
    total_max: msrp + stamp_duty + rego.annual_max + DEALER_DELIVERY.max,
  }
}

/** Mode B: Calculate Novated Lease tax savings */
export function calcNovatedLease(
  msrp: number,
  annualSalary: number,
  leaseTerm: 3 | 5,
  eligible_fbt: boolean
): NovatedLeaseResult {
  const annual_lease_cost = (msrp / leaseTerm) * 1.15
  const marginal_rate = getMarginalRate(annualSalary)

  if (!eligible_fbt) {
    return {
      annual_lease_cost,
      pre_tax_deduction: 0,
      marginal_rate,
      annual_tax_saving: 0,
      monthly_out_of_pocket: annual_lease_cost / 12,
      rfba_warning: false,
      fbt_eligible: false,
    }
  }

  const pre_tax_deduction = annual_lease_cost
  const annual_tax_saving = pre_tax_deduction * marginal_rate
  const monthly_out_of_pocket = (annual_lease_cost - annual_tax_saving) / 12

  return {
    annual_lease_cost,
    pre_tax_deduction,
    marginal_rate,
    annual_tax_saving,
    monthly_out_of_pocket,
    rfba_warning: true,
    fbt_eligible: true,
  }
}
