# 购车指南与税费计算器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/au/buying-guide/` 新增一个客户端购车成本计算器，支持落地价计算（印花税+注册费）和 Novated Lease 节税计算两种模式。

**Architecture:** 纯客户端计算，Server Component 承载 SEO 框架，Client Component 处理交互。税率和 MSRP 数据硬编码为 TS 常量，无数据库依赖。计算逻辑抽取为纯函数便于单元测试。

**Tech Stack:** Next.js 15 App Router, TypeScript, React useState/useMemo, inline styles (oklch)

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `lib/buying-guide/vehicles.ts` | 新建 | 澳大利亚车型 MSRP 常量数据库 |
| `lib/buying-guide/tax-rates.ts` | 新建 | 各州印花税规则 + 注册费估算常量 |
| `lib/buying-guide/calculations.ts` | 新建 | 纯计算函数（calcDriveAway, calcNovatedLease） |
| `__tests__/buying-guide/calculations.test.ts` | 新建 | 计算函数单元测试 |
| `app/au/buying-guide/page.tsx` | 新建 | Server Component：SEO 元数据 + 页面框架 |
| `components/BuyingGuideCalculator.tsx` | 新建 | Client Component：交互式计算器 UI |

---

## Task 1: 车型数据库

**Files:**
- Create: `lib/buying-guide/vehicles.ts`

- [ ] **Step 1: 创建车型数据文件**

```ts
// lib/buying-guide/vehicles.ts

export type Vehicle = {
  brand: string
  model: string
  variant: string
  msrp: number          // 澳元，含 GST，不含上路费用
  eligible_fbt: boolean // 纯电 BEV = true，PHEV = false（2025年4月1日起）
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

/** 返回所有品牌名（去重，保持顺序） */
export function getBrands(): string[] {
  return [...new Set(AU_VEHICLES.map(v => v.brand))]
}

/** 返回指定品牌下的所有车型变体 */
export function getVehiclesByBrand(brand: string): Vehicle[] {
  return AU_VEHICLES.filter(v => v.brand === brand)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/buying-guide/vehicles.ts
git commit -m "feat: add AU vehicle MSRP database"
```

---

## Task 2: 税率数据

**Files:**
- Create: `lib/buying-guide/tax-rates.ts`

- [ ] **Step 1: 创建税率数据文件**

```ts
// lib/buying-guide/tax-rates.ts

export type State = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'ACT' | 'TAS' | 'NT'

export const STATE_LABELS: Record<State, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  ACT: 'Australian Capital Territory',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
}

export type StampDutyRule = {
  state: State
  ev_exempt: boolean
  // 百分比分级税率（VIC / WA）
  tiers?: Array<{ upTo: number | null; rate: number }>
  // 固定百分比（NT）
  flat_rate?: number
  // SA 专用固定金额阶梯
  sa_tiered?: true
}

export type RegoEstimate = {
  state: State
  annual_min: number
  annual_max: number
}

export const STAMP_DUTY_RULES: StampDutyRule[] = [
  { state: 'NSW', ev_exempt: true },   // 豁免至 2027年7月1日
  { state: 'ACT', ev_exempt: true },   // 无限期豁免
  { state: 'QLD', ev_exempt: true },   // $100k 以下豁免
  { state: 'TAS', ev_exempt: true },   // 条件性豁免
  {
    // SA 豁免已于 2024年7月到期，按官网标准阶梯税率
    // ≤$1,000: $1/$100（最低$5）
    // $1,001–$2,000: $10 + $2/$100 超出$1,000
    // $2,001–$3,000: $30 + $3/$100 超出$2,000
    // >$3,000: $60 + $4/$100 超出$3,000（超出部分向上取整至$100）
    state: 'SA', ev_exempt: false, sa_tiered: true,
  },
  {
    state: 'VIC', ev_exempt: false,  // 2024年7月1日起取消豁免
    tiers: [
      { upTo: 65094, rate: 0.042 },
      { upTo: null,  rate: 0.052 },
    ],
  },
  {
    state: 'WA', ev_exempt: false,   // 无豁免，另有 $3,500 返现（非税费减免）
    tiers: [
      { upTo: 25000, rate: 0.0275 },
      { upTo: 50000, rate: 0.0275 },
      { upTo: null,  rate: 0.065  },
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

export const DEALER_DELIVERY = { min: 500, max: 1500 }

// 2024-25 财年燃油效率车辆 LCT 门槛，目前所有中国 EV 均低于此值
export const LCT_THRESHOLD = 91387

// 澳大利亚个人所得税累进税率（2024-25 财年）
export const AU_TAX_BRACKETS: Array<{ upTo: number | null; rate: number }> = [
  { upTo: 18200,  rate: 0      },
  { upTo: 45000,  rate: 0.19   },
  { upTo: 135000, rate: 0.325  },
  { upTo: 190000, rate: 0.37   },
  { upTo: null,   rate: 0.45   },
]
```

- [ ] **Step 2: Commit**

```bash
git add lib/buying-guide/tax-rates.ts
git commit -m "feat: add AU stamp duty and rego rate data"
```

---

## Task 3: 计算函数（TDD）

**Files:**
- Create: `lib/buying-guide/calculations.ts`
- Create: `__tests__/buying-guide/calculations.test.ts`

- [ ] **Step 1: 先写失败测试**

```ts
// __tests__/buying-guide/calculations.test.ts
import { calcDriveAway, calcNovatedLease, calcSaStampDuty, getMarginalRate } from '@/lib/buying-guide/calculations'

describe('calcSaStampDuty', () => {
  it('$44,990 → $1,740', () => {
    // $60 + ceil(41990/100)*4 = $60 + 420*4 = $1,740
    expect(calcSaStampDuty(44990)).toBe(1740)
  })
  it('$34,990 → $1,340', () => {
    // $60 + ceil(31990/100)*4 = $60 + 320*4 = $1,340
    expect(calcSaStampDuty(34990)).toBe(1340)
  })
  it('$2,500 → $45', () => {
    // $30 + ceil(500/100)*3 = $30 + 5*3 = $45
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
  it('NSW EV: 印花税为 0', () => {
    const result = calcDriveAway(44990, 'NSW', true)
    expect(result.stamp_duty).toBe(0)
    expect(result.stamp_duty_exempt).toBe(true)
    expect(result.total_min).toBe(44990 + 0 + 700 + 500)
    expect(result.total_max).toBe(44990 + 0 + 1300 + 1500)
  })
  it('VIC EV $44,990: 印花税 = 44990 * 0.042 = 1889.58 → 取整 1890', () => {
    const result = calcDriveAway(44990, 'VIC', true)
    expect(result.stamp_duty).toBe(1890)
    expect(result.stamp_duty_exempt).toBe(false)
  })
  it('SA EV $44,990: 印花税 = 1740', () => {
    const result = calcDriveAway(44990, 'SA', true)
    expect(result.stamp_duty).toBe(1740)
  })
  it('NT EV $44,990: 印花税 = 44990 * 0.03 = 1349.7 → 取整 1350', () => {
    const result = calcDriveAway(44990, 'NT', true)
    expect(result.stamp_duty).toBe(1350)
  })
})

describe('calcNovatedLease', () => {
  it('$100,000 年薪, $44,990 车, 5年, FBT豁免', () => {
    const result = calcNovatedLease(44990, 100000, 5, true)
    // annual_lease_cost = 44990 / 5 * 1.15 = 10347.7
    expect(result.annual_lease_cost).toBeCloseTo(10347.7, 0)
    expect(result.marginal_rate).toBe(0.325)
    // annual_tax_saving = 10347.7 * 0.325 ≈ 3363
    expect(result.annual_tax_saving).toBeCloseTo(3363, 0)
    expect(result.fbt_eligible).toBe(true)
    expect(result.rfba_warning).toBe(true)
  })
  it('PHEV 不满足 FBT 豁免', () => {
    const result = calcNovatedLease(54990, 100000, 3, false)
    expect(result.fbt_eligible).toBe(false)
    expect(result.annual_tax_saving).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试，确认全部失败**

```bash
pnpm test __tests__/buying-guide/calculations.test.ts
```

期望：FAIL — `calcSaStampDuty` 等函数未定义

- [ ] **Step 3: 实现计算函数**

```ts
// lib/buying-guide/calculations.ts
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

/** SA 固定金额阶梯印花税（官网标准，非豁免） */
export function calcSaStampDuty(msrp: number): number {
  if (msrp <= 1000) return Math.max(5, Math.ceil(msrp / 100))
  if (msrp <= 2000) return 10 + Math.ceil((msrp - 1000) / 100) * 2
  if (msrp <= 3000) return 30 + Math.ceil((msrp - 2000) / 100) * 3
  return 60 + Math.ceil((msrp - 3000) / 100) * 4
}

/** 根据年收入返回边际税率 */
export function getMarginalRate(annualSalary: number): number {
  for (const bracket of AU_TAX_BRACKETS) {
    if (bracket.upTo === null || annualSalary <= bracket.upTo) {
      return bracket.rate
    }
  }
  return 0.45
}

/** 模式 A：计算落地价明细 */
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
    // 找到适用档位（适用整体车价，非累进）
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

/** 模式 B：计算 Novated Lease 节税 */
export function calcNovatedLease(
  msrp: number,
  annualSalary: number,
  leaseTerm: 3 | 5,
  eligible_fbt: boolean
): NovatedLeaseResult {
  // 年度租赁成本估算：车价 / 租期 * 1.15（含保险/维保/注册/电费等运营成本）
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

  // FBT 豁免车型：100% 税前扣款
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
```

- [ ] **Step 4: 运行测试，确认全部通过**

```bash
pnpm test __tests__/buying-guide/calculations.test.ts
```

期望：全部 PASS

- [ ] **Step 5: Commit**

```bash
git add lib/buying-guide/calculations.ts __tests__/buying-guide/calculations.test.ts
git commit -m "feat: add drive-away and novated lease calculation functions with tests"
```

---

## Task 4: 页面 Server Component

**Files:**
- Create: `app/au/buying-guide/page.tsx`

- [ ] **Step 1: 创建页面文件**

```tsx
// app/au/buying-guide/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { BuyingGuideCalculator } from '@/components/BuyingGuideCalculator'

export const metadata: Metadata = {
  title: 'EV Buying Guide Australia — Stamp Duty, Drive-Away Price & Novated Lease Calculator',
  description:
    'Calculate the true drive-away price for BYD, MG, GWM Ora and other Chinese EVs in Australia. Includes stamp duty by state, Rego estimate, and Novated Lease FBT tax saving calculator.',
  alternates: { canonical: `${BASE_URL}/au/buying-guide` },
}

export default function BuyingGuidePage() {
  return (
    <main className="page-wrapper">
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'EV Buying Guide Australia',
          description: metadata.description as string,
          url: `${BASE_URL}/au/buying-guide`,
        }}
      />
      <div className="dtc-card">
        {/* 面包屑 */}
        <nav style={{ padding: '12px 28px', fontSize: '13px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-soft)' }}>
          <Link href="/au" style={{ color: 'var(--text-muted)' }}>Australia</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>Buying Guide</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '28px 28px 20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            EV Buying Guide — Australia
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '600px' }}>
            Calculate the true drive-away price for Chinese EVs in Australia, including stamp duty by state and registration fees.
            Or model your Novated Lease tax savings based on your salary.
          </p>
        </div>

        {/* 计算器（客户端组件） */}
        <BuyingGuideCalculator />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 验证页面可访问**

运行开发服务器并访问 `http://localhost:3000/au/buying-guide`，确认页面正常渲染（计算器组件此时尚未创建，会报错，属正常）。

- [ ] **Step 3: Commit**

```bash
git add app/au/buying-guide/page.tsx
git commit -m "feat: add buying guide page shell with SEO metadata"
```

---

## Task 5: 计算器 Client Component

**Files:**
- Create: `components/BuyingGuideCalculator.tsx`

- [ ] **Step 1: 创建计算器组件**

```tsx
// components/BuyingGuideCalculator.tsx
'use client'

import { useState, useMemo } from 'react'
import { AU_VEHICLES, getBrands, getVehiclesByBrand } from '@/lib/buying-guide/vehicles'
import { STATE_LABELS, type State } from '@/lib/buying-guide/tax-rates'
import { calcDriveAway, calcNovatedLease } from '@/lib/buying-guide/calculations'

const STATES = Object.keys(STATE_LABELS) as State[]

function fmt(n: number) {
  return 'A$' + Math.round(n).toLocaleString('en-AU')
}

function pct(r: number) {
  return (r * 100).toFixed(1) + '%'
}

export function BuyingGuideCalculator() {
  const brands = getBrands()
  const [brand, setBrand] = useState(brands[0])
  const [variantIdx, setVariantIdx] = useState(0)
  const [state, setState] = useState<State>('NSW')
  const [mode, setMode] = useState<'driveaway' | 'novated'>('driveaway')
  const [salary, setSalary] = useState(90000)
  const [leaseTerm, setLeaseTerm] = useState<3 | 5>(5)

  const vehicles = getVehiclesByBrand(brand)
  const vehicle = vehicles[variantIdx] ?? vehicles[0]

  const driveAway = useMemo(
    () => calcDriveAway(vehicle.msrp, state, vehicle.eligible_fbt),
    [vehicle, state]
  )

  const novated = useMemo(
    () => calcNovatedLease(vehicle.msrp, salary, leaseTerm, vehicle.eligible_fbt),
    [vehicle, salary, leaseTerm]
  )

  const sectionHeader = {
    padding: '10px 28px',
    background: 'oklch(97.5% 0.003 60)',
    borderTop: '1px solid var(--border-soft)',
    borderBottom: '1px solid var(--border-soft)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'oklch(36% 0.01 60)',
  }

  return (
    <div>
      {/* Step 1: 车型选择 */}
      <div style={sectionHeader}>1 — 选择车型</div>
      <div style={{ padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>品牌</label>
            <select
              value={brand}
              onChange={e => { setBrand(e.target.value); setVariantIdx(0) }}
              style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px' }}
            >
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>车型 / 配置</label>
            <select
              value={variantIdx}
              onChange={e => setVariantIdx(Number(e.target.value))}
              style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px' }}
            >
              {vehicles.map((v, i) => (
                <option key={i} value={i}>{v.model} — {v.variant}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          MSRP：<span style={{ fontWeight: 700, color: 'oklch(22% 0.01 60)', fontFamily: 'monospace' }}>{fmt(vehicle.msrp)}</span>
          <span style={{ marginLeft: '6px', fontSize: '12px' }}>（含 GST，不含上路费）</span>
          {!vehicle.eligible_fbt && (
            <span style={{ marginLeft: '10px', color: 'var(--amber)', fontSize: '12px' }}>⚠ PHEV — 不满足 FBT 豁免</span>
          )}
        </div>
      </div>

      {/* Step 2: 州选择 */}
      <div style={sectionHeader}>2 — 选择州 / 地区</div>
      <div style={{ padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>居住州</label>
          <select
            value={state}
            onChange={e => setState(e.target.value as State)}
            style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px' }}
          >
            {STATES.map(s => <option key={s} value={s}>{s} — {STATE_LABELS[s]}</option>)}
          </select>
        </div>
        <div style={{ fontSize: '13px' }}>
          {driveAway.stamp_duty_exempt ? (
            <span style={{ color: 'var(--green)' }}>✓ {STATE_LABELS[state]}免征印花税</span>
          ) : (
            <span style={{ color: 'oklch(36% 0.01 60)' }}>
              {STATE_LABELS[state]}印花税约：
              <span style={{ fontWeight: 700, fontFamily: 'monospace', marginLeft: '4px' }}>{fmt(driveAway.stamp_duty)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Step 3: 计算模式 */}
      <div style={sectionHeader}>3 — 计算模式</div>
      <div style={{ padding: '18px 28px 0' }}>
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-soft)', marginBottom: '0' }}>
          {(['driveaway', 'novated'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: mode === m ? 700 : 400,
                border: 'none',
                borderBottom: mode === m ? '2px solid oklch(36% 0.01 60)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                color: mode === m ? 'oklch(22% 0.01 60)' : 'var(--text-muted)',
                marginBottom: '-2px',
              }}
            >
              {m === 'driveaway' ? '落地价' : 'Novated Lease 节税'}
            </button>
          ))}
        </div>
      </div>

      {/* 模式 A：落地价 */}
      {mode === 'driveaway' && (
        <div style={{ padding: '18px 28px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              {[
                ['车辆 MSRP', fmt(driveAway.msrp)],
                [
                  '印花税',
                  driveAway.stamp_duty_exempt
                    ? `${fmt(0)}（${STATE_LABELS[state]}豁免）`
                    : fmt(driveAway.stamp_duty),
                ],
                ['注册费（估算）', `${fmt(driveAway.rego_min)} – ${fmt(driveAway.rego_max)}`],
                ['经销商交付费（估算）', `${fmt(driveAway.dealer_delivery_min)} – ${fmt(driveAway.dealer_delivery_max)}`],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '10px 0', color: 'var(--text-muted)' }}>{label}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace' }}>{value}</td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: '14px 0 6px', fontWeight: 700 }}>落地总价</td>
                <td style={{ padding: '14px 0 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: 'oklch(22% 0.01 60)' }}>
                  {fmt(driveAway.total_min)} – {fmt(driveAway.total_max)}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            ⚠ 印花税税率及 EV 豁免政策随时可能调整。本页数据基于 2025 年公开信息估算，购车前请向所在州税务局核实最新政策。
          </p>
        </div>
      )}

      {/* 模式 B：Novated Lease */}
      {mode === 'novated' && (
        <div style={{ padding: '18px 28px' }}>
          {/* 输入 */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>税前年收入（澳元）</label>
              <input
                type="number"
                min={18200}
                max={500000}
                step={1000}
                value={salary}
                onChange={e => setSalary(Number(e.target.value))}
                style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px', width: '140px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>租赁期限</label>
              <div style={{ display: 'flex', gap: '0' }}>
                {([3, 5] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setLeaseTerm(t)}
                    style={{
                      padding: '7px 16px',
                      border: '1px solid var(--border-soft)',
                      borderRadius: t === 3 ? '5px 0 0 5px' : '0 5px 5px 0',
                      fontSize: '13px',
                      background: leaseTerm === t ? 'oklch(22% 0.01 60)' : 'transparent',
                      color: leaseTerm === t ? '#fff' : 'oklch(36% 0.01 60)',
                      cursor: 'pointer',
                    }}
                  >
                    {t} 年
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 结果 */}
          {!vehicle.eligible_fbt ? (
            <div style={{ padding: '14px', background: 'oklch(97% 0.01 60)', borderRadius: '6px', fontSize: '13px', color: 'var(--amber)' }}>
              ⚠ 该车型（PHEV）自 2025年4月1日起不再享有 FBT 豁免，Novated Lease 节税效果大幅降低，建议直接购买。
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  {[
                    ['年度租赁成本（估算）', `${fmt(novated.annual_lease_cost)} / 年`],
                    ['税前工资扣款', `${fmt(novated.pre_tax_deduction)} / 年（100% 税前 — FBT 豁免）`],
                    ['边际税率', pct(novated.marginal_rate)],
                    ['年度节省个人所得税', `${fmt(novated.annual_tax_saving)} / 年`],
                    ['每月实际支出', `${fmt(novated.monthly_out_of_pocket)} / 月`],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '10px 0', color: 'var(--text-muted)' }}>{label}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '14px', padding: '12px 14px', background: 'oklch(97.5% 0.003 60)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                ⚠ <strong>RFBA 提示：</strong>此福利将作为应报告附加福利金额（RFBA）记录在收入报表中，可能影响 Medicare Levy Surcharge、HECS/HELP 还款额及政府福利资格核查。<br />
                Novated Lease 节税计算仅供参考，实际节税金额取决于雇主方案及个人税务情况，建议咨询持牌财务顾问。
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 运行开发服务器，访问页面验证**

```bash
pnpm dev
```

访问 `http://localhost:3000/au/buying-guide`，检查：
- 车型下拉框正常显示所有品牌和变体
- 切换州后印花税状态即时更新
- 落地价表格数字正确
- Novated Lease 模式输入年薪后节税金额即时更新
- PHEV 车型显示警告

- [ ] **Step 3: Commit**

```bash
git add components/BuyingGuideCalculator.tsx
git commit -m "feat: add BuyingGuideCalculator client component"
```

---

## Task 6: 收尾与链接

**Files:**
- Modify: `app/au/page.tsx`

- [ ] **Step 1: 在澳大利亚首页加入购车指南入口**

在 `app/au/page.tsx` 中，找到 dealer links 区域（market === 'au' 的条件块），在其后加入购车指南链接：

```tsx
<Link
  href="/au/buying-guide"
  style={{
    display: 'inline-block',
    padding: '7px 12px',
    border: '1px solid var(--border-soft)',
    borderRadius: '5px',
    fontSize: '12px',
    fontFamily: 'var(--font-cond)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'oklch(36% 0.01 60)',
    textDecoration: 'none',
  }}
>
  Buying Guide & Tax Calculator
</Link>
```

- [ ] **Step 2: 运行开发服务器验证链接正常**

访问 `http://localhost:3000/au`，确认购车指南链接显示并可点击跳转。

- [ ] **Step 3: Commit**

```bash
git add app/au/page.tsx
git commit -m "feat: add buying guide link on AU market home page"
```

---

## 自查清单

- [x] **Spec 覆盖：** 落地价计算 ✓ | Novated Lease 节税 ✓ | 车型数据库 ✓ | 州印花税 ✓ | SA 官网税率 ✓ | FBT 豁免/警告 ✓ | RFBA 提示 ✓ | 免责声明 ✓ | SEO 元数据 ✓
- [x] **无占位符**
- [x] **类型一致：** `State`、`Vehicle`、`DriveAwayResult`、`NovatedLeaseResult` 在所有 Task 中命名一致
- [x] **测试覆盖：** SA 特殊计算、边际税率、落地价、Novated Lease 全部有单元测试
