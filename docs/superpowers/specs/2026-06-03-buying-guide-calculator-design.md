# Buying Guide & Tax Calculator — Design Spec

**Date:** 2026-06-03
**Status:** Awaiting implementation
**Route:** `/au/buying-guide/` (AU first, extensible to other markets)

---

## Overview

A client-side purchase cost calculator targeting Australian buyers of Chinese EVs. Fills the "pre-purchase" gap in the current site (which focuses on post-purchase ownership). Two calculation modes:

- **Mode A — Drive-away price:** Stamp duty + Rego + dealer delivery → total on-road cost
- **Mode B — Novated Lease savings:** Given annual salary + vehicle cost → annual tax saving + monthly out-of-pocket

All calculation logic runs in the browser. No database reads. Tax rates and MSRP data are hardcoded TS constants.

---

## Page Route & SEO

**URL:** `/au/buying-guide/`

This is a static page with a `"use client"` calculator component embedded. The page shell (title, description, structured data) is a Server Component for SEO.

**Metadata:**
- Title: `EV Buying Guide Australia — Stamp Duty, Drive-Away Price & Novated Lease Calculator`
- Description: `Calculate the true drive-away price for BYD, MG, GWM Ora and other Chinese EVs in Australia. Includes stamp duty by state, Rego estimate, and Novated Lease FBT tax saving calculator.`

**No `generateStaticParams` needed** — this is a single non-dynamic route.

---

## Data Files (new files to create)

### `lib/buying-guide/vehicles.ts`

Hardcoded MSRP database for AU market. Structure:

```ts
export type Vehicle = {
  brand: string
  model: string
  variant: string
  msrp: number          // AUD, GST-inclusive, excludes on-road costs
  eligible_fbt: boolean // BEV = true, PHEV = false (from 1 Apr 2025)
}

export const AU_VEHICLES: Vehicle[] = [
  // BYD
  { brand: 'BYD', model: 'Atto 3', variant: 'Standard Range', msrp: 44990, eligible_fbt: true },
  { brand: 'BYD', model: 'Atto 3', variant: 'Extended Range', msrp: 47990, eligible_fbt: true },
  { brand: 'BYD', model: 'Dolphin', variant: 'Standard', msrp: 38990, eligible_fbt: true },
  { brand: 'BYD', model: 'Dolphin', variant: 'Extended Range', msrp: 42990, eligible_fbt: true },
  { brand: 'BYD', model: 'Seal', variant: 'Dynamic RWD', msrp: 54990, eligible_fbt: true },
  { brand: 'BYD', model: 'Seal', variant: 'Premium RWD', msrp: 59990, eligible_fbt: true },
  { brand: 'BYD', model: 'Seal', variant: 'Performance AWD', msrp: 69990, eligible_fbt: true },
  { brand: 'BYD', model: 'Sealion 6', variant: 'PHEV', msrp: 54990, eligible_fbt: false },
  // MG
  { brand: 'MG', model: 'MG4', variant: 'Excite 51kWh', msrp: 34990, eligible_fbt: true },
  { brand: 'MG', model: 'MG4', variant: 'Excite 64kWh', msrp: 38990, eligible_fbt: true },
  { brand: 'MG', model: 'MG4', variant: 'Essence 64kWh', msrp: 44990, eligible_fbt: true },
  { brand: 'MG', model: 'MG4', variant: 'XPOWER AWD', msrp: 54990, eligible_fbt: true },
  { brand: 'MG', model: 'ZS EV', variant: 'Excite', msrp: 39990, eligible_fbt: true },
  // GWM
  { brand: 'GWM', model: 'Ora', variant: 'Standard Range', msrp: 39990, eligible_fbt: true },
  { brand: 'GWM', model: 'Ora', variant: 'Extended Range', msrp: 44990, eligible_fbt: true },
]
```

### `lib/buying-guide/tax-rates.ts`

AU stamp duty and Rego data by state:

```ts
export type State = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'ACT' | 'TAS' | 'NT'

export type StampDutyRule = {
  state: State
  ev_exempt: boolean
  // If not exempt, tiered rates apply:
  tiers?: Array<{ upTo: number | null; rate: number }> // rate = decimal e.g. 0.03
  flat_rate?: number
}

export type RegoEstimate = {
  state: State
  annual_min: number
  annual_max: number
}

// Stamp duty: EV exemptions as of 2025
export const STAMP_DUTY_RULES: StampDutyRule[] = [
  { state: 'NSW', ev_exempt: true },
  { state: 'ACT', ev_exempt: true },
  { state: 'QLD', ev_exempt: true },  // under $100k
  { state: 'SA',  ev_exempt: true },  // verify post-June 2025
  { state: 'TAS', ev_exempt: true },
  {
    state: 'VIC', ev_exempt: false,
    tiers: [
      { upTo: 65094, rate: 0.042 },
      { upTo: null,  rate: 0.052 },
    ],
  },
  {
    state: 'WA', ev_exempt: false,
    tiers: [
      { upTo: 25000, rate: 0.0275 },
      { upTo: 50000, rate: 0.0275 },
      { upTo: null,  rate: 0.065 },
    ],
  },
  { state: 'NT', ev_exempt: false, flat_rate: 0.03 },
]

export const REGO_ESTIMATES: RegoEstimate[] = [
  { state: 'NSW', annual_min: 700,  annual_max: 1300 },
  { state: 'VIC', annual_min: 900,  annual_max: 1100 },
  { state: 'QLD', annual_min: 500,  annual_max: 900  },
  { state: 'SA',  annual_min: 600,  annual_max: 900  },
  { state: 'WA',  annual_min: 550,  annual_max: 850  },
  { state: 'ACT', annual_min: 700,  annual_max: 1000 },
  { state: 'TAS', annual_min: 450,  annual_max: 750  },
  { state: 'NT',  annual_min: 500,  annual_max: 750  },
]

export const DEALER_DELIVERY_ESTIMATE = { min: 500, max: 1500 }

export const LCT_THRESHOLD_FUEL_EFFICIENT = 91387 // 2024-25
```

### `lib/buying-guide/calculations.ts`

Pure calculation functions (no React, easily unit-testable):

```ts
// Mode A
export function calcDriveAway(msrp: number, state: State, ev_eligible: boolean): DriveAwayResult

// Mode B
export function calcNovatedLease(
  msrp: number,
  annualSalary: number,
  leaseTerm: 3 | 5,
  eligible_fbt: boolean
): NovatedLeaseResult
```

**Mode A — DriveAwayResult:**
```ts
{
  msrp: number
  stamp_duty: number        // 0 if exempt
  stamp_duty_exempt: boolean
  rego_min: number
  rego_max: number
  dealer_delivery_min: number
  dealer_delivery_max: number
  total_min: number
  total_max: number
}
```

**Mode B — NovatedLeaseResult:**
```ts
{
  annual_lease_cost: number       // estimated: msrp / leaseTerm * 1.15 (running costs factor)
  pre_tax_deduction: number       // = annual_lease_cost (100% pre-tax for eligible EVs)
  marginal_rate: number           // AU progressive tax rate
  annual_tax_saving: number       // pre_tax_deduction * marginal_rate
  monthly_out_of_pocket: number   // (annual_lease_cost - annual_tax_saving) / 12
  rfba_warning: boolean           // always true — remind user about RFBA impact
  fbt_eligible: boolean
}
```

**AU marginal tax rates 2024-25:**
| Income | Rate |
|--------|------|
| 0–$18,200 | 0% |
| $18,201–$45,000 | 19% |
| $45,001–$135,000 | 32.5% |
| $135,001–$190,000 | 37% |
| $190,001+ | 45% |

---

## UI Components

### `app/au/buying-guide/page.tsx` (Server Component)
- Exports metadata for SEO
- Renders page shell: breadcrumb, h1, description
- Embeds `<BuyingGuideCalculator />` client component

### `components/BuyingGuideCalculator.tsx` (Client Component)
Single file, self-contained. Sections:

**Step 1 — Vehicle Selection**
- Grouped `<select>` by brand → variant
- Shows MSRP on selection: `MSRP: A$44,990 (GST incl.)`

**Step 2 — State Selection**
- 8-state dropdown
- Shows stamp duty status immediately on selection: `✓ Stamp duty exempt in NSW` or `Stamp duty applies (VIC): ~A$1,890`

**Step 3 — Mode Tabs: "Drive-Away Price" | "Novated Lease"**

**Mode A output — Drive-Away breakdown table:**
```
MSRP                    A$44,990
Stamp Duty              A$0 (exempt in NSW)
Registration (est.)     A$700 – A$1,300
Dealer Delivery (est.)  A$500 – A$1,500
─────────────────────────────────────────
Drive-Away Total        A$46,190 – A$47,790
```

**Mode B inputs:**
- Annual salary input (number, `$45,000–$300,000`)
- Lease term: 3 years / 5 years (toggle)

**Mode B output:**
```
Annual lease cost (est.)     A$10,350/yr
Pre-tax salary deduction     A$10,350/yr (100% — FBT exempt)
Your marginal tax rate        32.5%
Annual income tax saving      A$3,364/yr
Monthly out-of-pocket         A$582/mo

⚠️ Note: This benefit is reported as a Reportable Fringe
Benefit Amount (RFBA) and may affect Medicare Levy
Surcharge, HECS/HELP repayments, and government
means-tested benefits.
```

If vehicle is not FBT-eligible (PHEV):
```
⚠️ This vehicle (PHEV) lost FBT exemption from 1 April 2025.
Novated lease savings are significantly reduced.
```

---

## Styling

Follow existing site conventions exactly:
- Inline styles using `oklch()` color functions
- Section headers: `background: oklch(97.5% 0.003 60)`
- Content padding: `18px 28px`
- No new CSS classes, no Tailwind utilities not already in use
- Monospace number display for calculated values

---

## Disclaimers (mandatory, shown on page)

Two disclaimer boxes (reuse existing `DisclaimerBox` component if it exists):

1. **Tax rates disclaimer:** "Stamp duty rates and EV exemptions change regularly. Figures are estimates based on publicly available 2025 rates. Always verify with your state revenue office before purchasing."
2. **Novated lease disclaimer:** "Novated lease calculations are indicative only. Actual savings depend on your employer's scheme, exact lease terms, and personal tax situation. Consult a financial adviser."

---

## What's Out of Scope

- UK / UAE / Norway calculators (different tax systems — future work)
- LCT calculation (no current Chinese EV exceeds $91,387 threshold)
- Comparison across multiple vehicles simultaneously
- Admin UI for updating MSRP data
- Real-time price fetching from dealer websites

---

## File Summary

| File | Type | Purpose |
|------|------|---------|
| `app/au/buying-guide/page.tsx` | Server Component | SEO shell + page layout |
| `components/BuyingGuideCalculator.tsx` | Client Component | Interactive calculator UI |
| `lib/buying-guide/vehicles.ts` | Data | AU vehicle MSRP database |
| `lib/buying-guide/tax-rates.ts` | Data | Stamp duty rules + Rego estimates |
| `lib/buying-guide/calculations.ts` | Logic | Pure calculation functions |
