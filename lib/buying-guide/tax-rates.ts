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
