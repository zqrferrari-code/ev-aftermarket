# 购车指南与税费计算器 — 设计文档

**日期：** 2026-06-03
**状态：** 待实现
**路由：** `/au/buying-guide/`（澳大利亚优先，预留多市场扩展）

---

## 概述

面向澳大利亚买家的客户端购车成本计算器，专注中国新能源车型。填补现有站点的"购车前"场景空白（现有功能均为购车后使用指南）。提供两种计算模式：

- **模式 A — 落地价计算：** 印花税 + 注册费（Rego）+ 经销商交付费 → 总到手价
- **模式 B — Novated Lease 节税计算：** 输入年薪和车价 → 年度节税金额 + 每月实际支出

所有计算逻辑在浏览器端运行，无数据库查询。税率和 MSRP 数据全部硬编码为 TypeScript 常量。

---

## 页面路由与 SEO

**URL：** `/au/buying-guide/`

页面结构：Server Component 承载 SEO 元数据和页面框架，`"use client"` 的计算器组件嵌入其中。

**元数据：**
- 标题：`EV Buying Guide Australia — Stamp Duty, Drive-Away Price & Novated Lease Calculator`
- 描述：`Calculate the true drive-away price for BYD, MG, GWM Ora and other Chinese EVs in Australia. Includes stamp duty by state, Rego estimate, and Novated Lease FBT tax saving calculator.`

**无需 `generateStaticParams`** — 固定路由，非动态路由。

---

## 数据文件（新建）

### `lib/buying-guide/vehicles.ts`

澳大利亚市场车型 MSRP 数据库，硬编码为常量：

```ts
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
```

### `lib/buying-guide/tax-rates.ts`

各州印花税规则和注册费估算：

```ts
export type State = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'ACT' | 'TAS' | 'NT'

export type StampDutyRule = {
  state: State
  ev_exempt: boolean
  // 未豁免时适用分级税率：
  tiers?: Array<{ upTo: number | null; rate: number }> // rate 为小数，如 0.03 表示 3%
  flat_rate?: number
}

export type RegoEstimate = {
  state: State
  annual_min: number
  annual_max: number
}

// 印花税：2025年各州 EV 豁免状态
export const STAMP_DUTY_RULES: StampDutyRule[] = [
  { state: 'NSW', ev_exempt: true },           // 豁免至 2027年7月1日
  { state: 'ACT', ev_exempt: true },           // 无限期豁免
  { state: 'QLD', ev_exempt: true },           // 10万以下豁免
  { state: 'SA',  ev_exempt: true },           // 待确认 2025年6月后是否延续
  { state: 'TAS', ev_exempt: true },           // 条件性豁免
  {
    state: 'VIC', ev_exempt: false,            // 2024年7月1日起取消豁免
    tiers: [
      { upTo: 65094, rate: 0.042 },
      { upTo: null,  rate: 0.052 },
    ],
  },
  {
    state: 'WA', ev_exempt: false,             // 无豁免，有 $3,500 返现但非税费减免
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

export const LCT_THRESHOLD_FUEL_EFFICIENT = 91387 // 2024-25 财年，目前所有中国 EV 均低于此门槛
```

### `lib/buying-guide/calculations.ts`

纯计算函数，无 React 依赖，便于单元测试：

```ts
// 模式 A：落地价计算
export function calcDriveAway(msrp: number, state: State, ev_eligible: boolean): DriveAwayResult

// 模式 B：Novated Lease 节税计算
export function calcNovatedLease(
  msrp: number,
  annualSalary: number,
  leaseTerm: 3 | 5,
  eligible_fbt: boolean
): NovatedLeaseResult
```

**模式 A — DriveAwayResult 数据结构：**
```ts
{
  msrp: number
  stamp_duty: number         // 豁免时为 0
  stamp_duty_exempt: boolean
  rego_min: number
  rego_max: number
  dealer_delivery_min: number
  dealer_delivery_max: number
  total_min: number
  total_max: number
}
```

**模式 B — NovatedLeaseResult 数据结构：**
```ts
{
  annual_lease_cost: number       // 估算公式：msrp / leaseTerm * 1.15（含运营成本系数）
  pre_tax_deduction: number       // 等于 annual_lease_cost（FBT 豁免车型 100% 税前扣款）
  marginal_rate: number           // 澳大利亚累进税率
  annual_tax_saving: number       // pre_tax_deduction * marginal_rate
  monthly_out_of_pocket: number   // (annual_lease_cost - annual_tax_saving) / 12
  rfba_warning: boolean           // 始终为 true，提醒用户 RFBA 的影响
  fbt_eligible: boolean
}
```

**澳大利亚个人所得税累进税率（2024-25 财年）：**

| 年收入区间 | 边际税率 |
|-----------|---------|
| $0 – $18,200 | 0% |
| $18,201 – $45,000 | 19% |
| $45,001 – $135,000 | 32.5% |
| $135,001 – $190,000 | 37% |
| $190,001 以上 | 45% |

---

## UI 组件

### `app/au/buying-guide/page.tsx`（Server Component）

- 导出 SEO 元数据
- 渲染页面框架：面包屑导航、H1 标题、描述文字
- 嵌入 `<BuyingGuideCalculator />` 客户端组件

### `components/BuyingGuideCalculator.tsx`（Client Component）

单文件，自包含。页面分三步：

**第一步 — 车型选择**
- 按品牌分组的 `<select>` 下拉框，选择后显示具体型号
- 选中后立即显示：`MSRP: A$44,990（含 GST）`

**第二步 — 州/地区选择**
- 8 个州/地区下拉框
- 选中后立即显示印花税状态：`✓ 新南威尔士州免征印花税` 或 `维多利亚州需缴印花税：约 A$1,890`

**第三步 — 计算模式选项卡：「落地价」| 「Novated Lease」**

**模式 A 输出 — 落地价明细表：**
```
车辆 MSRP                A$44,990
印花税                   A$0（新南威尔士州豁免）
注册费（估算）           A$700 – A$1,300
经销商交付费（估算）     A$500 – A$1,500
─────────────────────────────────────────
落地总价                 A$46,190 – A$47,790
```

**模式 B 输入：**
- 税前年收入（数字输入框，范围 $45,000 – $300,000）
- 租赁期限：3 年 / 5 年（切换按钮）

**模式 B 输出：**
```
年度租赁成本（估算）       A$10,350/年
税前工资扣款               A$10,350/年（100% 税前 — FBT 豁免）
你的边际税率               32.5%
年度节省个人所得税         A$3,364/年
每月实际支出               A$582/月

⚠️ 提示：此福利将作为应报告附加福利金额（RFBA）记录
在你的收入报表中，可能影响 Medicare Levy Surcharge、
HECS/HELP 还款额及政府福利资格核查。
```

若车型不满足 FBT 豁免条件（PHEV）：
```
⚠️ 该车型（PHEV）自 2025年4月1日起不再享有 FBT 豁免。
Novated Lease 节税效果大幅降低。
```

---

## 样式规范

严格遵循现有站点风格：
- 全部使用内联样式 `oklch()` 色彩函数
- 区块标题背景：`background: oklch(97.5% 0.003 60)`
- 内容内边距：`18px 28px`
- 不新增 CSS 类名，不引入当前未使用的 Tailwind 工具类
- 计算结果数字使用等宽字体显示

---

## 免责声明（页面必须展示）

两处免责声明框，复用现有 `DisclaimerBox` 组件（如存在）：

1. **税率免责声明：** "印花税税率及新能源车豁免政策随时可能调整。本页数据基于 2025 年公开信息估算，购车前请向所在州税务局核实最新政策。"
2. **Novated Lease 免责声明：** "Novated Lease 节税计算结果仅供参考，实际节税金额取决于雇主方案、具体租赁条款及个人税务情况，建议咨询持牌财务顾问。"

---

## 不在范围内

- 英国 / 阿联酋 / 挪威计算器（税制不同，留待后续）
- LCT（豪华车税）计算（目前所有中国 EV 均低于 $91,387 门槛）
- 多车型同时横向对比
- MSRP 数据管理后台
- 实时从经销商网站抓取价格

---

## 文件清单

| 文件 | 类型 | 用途 |
|------|------|------|
| `app/au/buying-guide/page.tsx` | Server Component | SEO 框架 + 页面布局 |
| `components/BuyingGuideCalculator.tsx` | Client Component | 交互式计算器 UI |
| `lib/buying-guide/vehicles.ts` | 数据 | 澳大利亚车型 MSRP 数据库 |
| `lib/buying-guide/tax-rates.ts` | 数据 | 印花税规则 + 注册费估算 |
| `lib/buying-guide/calculations.ts` | 逻辑 | 纯计算函数 |
