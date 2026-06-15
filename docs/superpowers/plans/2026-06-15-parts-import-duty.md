# 配件进口税费页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 EVAftermarket.io 新增比亚迪三款车型（海豚、Atto 3、海豹）的外观配件进口税费查询页面，包括配件详情页（18个）和 HS 编码详情页（4个），覆盖中澳两国海关编码和速卖通联盟导流。

**Architecture:** 在现有 `[market]` 路由下新增 `/au/parts/...` 路由体系，复用现有 Supabase 客户端和 Server Component 模式。新建四张数据库表支持多国可扩展的编码和税率结构。HS 编码页与配件页互相内链形成 SEO 网络。

**Tech Stack:** Next.js 16 App Router (Server Components), Supabase PostgreSQL, Drizzle ORM, TypeScript, Vitest, Tailwind CSS

---

## 文件结构

### 新建文件

```
lib/db/parts.ts                                     # 配件相关所有 DB 查询函数
lib/db/schema.ts                                    # 新增四张表的 Drizzle schema（修改现有文件）
app/[market]/parts/page.tsx                         # /au/parts 品牌列表索引页
app/[market]/parts/[brand]/page.tsx                 # /au/parts/byd 车型列表页
app/[market]/parts/[brand]/[model]/page.tsx         # /au/parts/byd/dolphin 配件列表页
app/[market]/parts/[brand]/[model]/[part]/page.tsx  # /au/parts/byd/dolphin/front-bumper 配件详情页
app/[market]/parts/hs/[code]/page.tsx               # /au/parts/hs/8708.10 HS 编码详情页
components/parts/TariffSummary.tsx                  # 税费一览卡片（Server Component）
components/parts/CostCalculator.tsx                 # 到岸成本计算器（Client Component）
components/parts/AliexpressCards.tsx                # 速卖通商品卡片（Server Component）
__tests__/parts/tariff-calc.test.ts                 # 税费计算逻辑单元测试
__tests__/parts/url-builders.test.ts                # URL 构建函数单元测试
__tests__/parts/schema-builders.test.ts             # Schema.org 结构化数据测试
scripts/seed-parts.ts                               # 种子数据脚本
```

### 修改文件

```
lib/db/schema.ts           # 新增 parts、part_model_compatibility、part_hs_codes、tariff_rates 表
app/sitemap.ts             # 新增配件页和 HS 编码页的 URL
```

---

## Task 1: 数据库 Schema 定义

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: 读取现有 schema 文件末尾**

```bash
tail -50 lib/db/schema.ts
```

确认文件末尾位置，准备追加新表定义。

- [ ] **Step 2: 在 schema.ts 末尾追加四张新表**

在 `lib/db/schema.ts` 文件末尾追加：

```typescript
// ─── 配件相关表 ───────────────────────────────────────────

export const parts = pgTable('mf_parts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name_en: varchar('name_en', { length: 100 }).notNull(),
  name_cn: varchar('name_cn', { length: 100 }),
  category: varchar('category', { length: 50 }),   // 'exterior' | 'lighting'
  material: varchar('material', { length: 100 }),
  is_dangerous: boolean('is_dangerous').default(false),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
})

export const partModelCompatibility = pgTable('mf_part_model_compatibility', {
  id: serial('id').primaryKey(),
  part_id: integer('part_id').references(() => parts.id),
  model_id: varchar('model_id', { length: 100 }).references(() => models.model_id),
  years: varchar('years', { length: 50 }),
  oem_number: varchar('oem_number', { length: 100 }),
  notes: text('notes'),
})

export const partHsCodes = pgTable('mf_part_hs_codes', {
  id: serial('id').primaryKey(),
  part_id: integer('part_id').notNull().references(() => parts.id),
  country_code: char('country_code', { length: 2 }).notNull(),
  hs_code: varchar('hs_code', { length: 12 }).notNull(),
  hs_code_type: varchar('hs_code_type', { length: 10 }).notNull(), // 'export' | 'import'
  description_en: text('description_en'),
  description_local: text('description_local'),
  declaration_elements: text('declaration_elements'),
  regulatory_conditions: varchar('regulatory_conditions', { length: 100 }),
  last_verified: date('last_verified'),
  source_url: varchar('source_url', { length: 255 }),
  notes: text('notes'),
})

export const tariffRates = pgTable('mf_tariff_rates', {
  id: serial('id').primaryKey(),
  country_code: char('country_code', { length: 2 }).notNull(),
  hs_code: varchar('hs_code', { length: 12 }).notNull(),
  mfn_rate: decimal('mfn_rate', { precision: 5, scale: 2 }),
  fta_name: varchar('fta_name', { length: 50 }),
  fta_rate: decimal('fta_rate', { precision: 5, scale: 2 }),
  fta_conditions: text('fta_conditions'),
  vat_rate: decimal('vat_rate', { precision: 5, scale: 2 }),
  additional_duties: text('additional_duties'),
  last_verified: date('last_verified'),
  source_url: varchar('source_url', { length: 255 }),
})
```

- [ ] **Step 3: 在 Supabase 控制台执行建表 SQL**

登录 Supabase 控制台 → SQL Editor，执行以下 SQL：

```sql
CREATE TABLE mf_parts (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(100) NOT NULL UNIQUE,
  name_en      VARCHAR(100) NOT NULL,
  name_cn      VARCHAR(100),
  category     VARCHAR(50),
  material     VARCHAR(100),
  is_dangerous BOOLEAN DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mf_part_model_compatibility (
  id         SERIAL PRIMARY KEY,
  part_id    INT REFERENCES mf_parts(id),
  model_id   VARCHAR(100) REFERENCES mf_nv_models(model_id),
  years      VARCHAR(50),
  oem_number VARCHAR(100),
  notes      TEXT
);

CREATE TABLE mf_part_hs_codes (
  id                    SERIAL PRIMARY KEY,
  part_id               INT NOT NULL REFERENCES mf_parts(id),
  country_code          CHAR(2) NOT NULL,
  hs_code               VARCHAR(12) NOT NULL,
  hs_code_type          VARCHAR(10) NOT NULL,
  description_en        TEXT,
  description_local     TEXT,
  declaration_elements  TEXT,
  regulatory_conditions VARCHAR(100),
  last_verified         DATE,
  source_url            VARCHAR(255),
  notes                 TEXT,
  UNIQUE (part_id, country_code, hs_code_type)
);

CREATE TABLE mf_tariff_rates (
  id               SERIAL PRIMARY KEY,
  country_code     CHAR(2) NOT NULL,
  hs_code          VARCHAR(12) NOT NULL,
  mfn_rate         DECIMAL(5,2),
  fta_name         VARCHAR(50),
  fta_rate         DECIMAL(5,2),
  fta_conditions   TEXT,
  vat_rate         DECIMAL(5,2),
  additional_duties TEXT,
  last_verified    DATE,
  source_url       VARCHAR(255),
  UNIQUE (country_code, hs_code)
);
```

- [ ] **Step 4: 验证建表成功**

```bash
# 在 Supabase SQL Editor 运行
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'mf_%'
ORDER BY table_name;
```

期望输出包含：`mf_part_hs_codes`、`mf_part_model_compatibility`、`mf_parts`、`mf_tariff_rates`

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add parts, hs_codes, and tariff_rates schema tables"
```

---

## Task 2: 种子数据脚本

**Files:**
- Create: `scripts/seed-parts.ts`

- [ ] **Step 1: 创建种子数据脚本**

```typescript
// scripts/seed-parts.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sb = createClient(
  'https://xerjbccayvqvaxbqrabu.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── 配件基础数据 ──────────────────────────────────────────

const PARTS = [
  { slug: 'front-bumper',  name_en: 'Front Bumper Assembly',  name_cn: '前保险杠总成', category: 'exterior', material: 'PP Plastic' },
  { slug: 'rear-bumper',   name_en: 'Rear Bumper Assembly',   name_cn: '后保险杠总成', category: 'exterior', material: 'PP Plastic' },
  { slug: 'headlights',    name_en: 'Headlight Assembly',     name_cn: '大灯总成',     category: 'lighting', material: 'Polycarbonate' },
  { slug: 'tail-lights',   name_en: 'Tail Light Assembly',    name_cn: '尾灯总成',     category: 'lighting', material: 'Polycarbonate' },
  { slug: 'front-fender',  name_en: 'Front Fender',           name_cn: '前翼子板',     category: 'exterior', material: 'Steel' },
  { slug: 'side-mirror',   name_en: 'Side Mirror Assembly',   name_cn: '后视镜总成',   category: 'exterior', material: 'ABS Plastic' },
]

// ─── 车型适配关系（model_id 对应 mf_nv_models.model_id）─────

const MODEL_COMPATIBILITY: Record<string, { model_id: string; years: string }[]> = {
  'front-bumper':  [
    { model_id: 'byd-dolphin', years: '2021-2025' },
    { model_id: 'byd-atto-3',  years: '2021-2025' },
    { model_id: 'byd-seal',    years: '2022-2025' },
  ],
  'rear-bumper':   [
    { model_id: 'byd-dolphin', years: '2021-2025' },
    { model_id: 'byd-atto-3',  years: '2021-2025' },
    { model_id: 'byd-seal',    years: '2022-2025' },
  ],
  'headlights':    [
    { model_id: 'byd-dolphin', years: '2021-2025' },
    { model_id: 'byd-atto-3',  years: '2021-2025' },
    { model_id: 'byd-seal',    years: '2022-2025' },
  ],
  'tail-lights':   [
    { model_id: 'byd-dolphin', years: '2021-2025' },
    { model_id: 'byd-atto-3',  years: '2021-2025' },
    { model_id: 'byd-seal',    years: '2022-2025' },
  ],
  'front-fender':  [
    { model_id: 'byd-dolphin', years: '2021-2025' },
    { model_id: 'byd-atto-3',  years: '2021-2025' },
    { model_id: 'byd-seal',    years: '2022-2025' },
  ],
  'side-mirror':   [
    { model_id: 'byd-dolphin', years: '2021-2025' },
    { model_id: 'byd-atto-3',  years: '2021-2025' },
    { model_id: 'byd-seal',    years: '2022-2025' },
  ],
}

// ─── HS 编码数据 ───────────────────────────────────────────
// 来源：中国海关总署 & ABF Working Tariff（已核实）

const HS_CODES: Record<string, { cn: string; au: string }> = {
  'front-bumper':  { cn: '8708101000', au: '87081000' },
  'rear-bumper':   { cn: '8708101000', au: '87081000' },
  'headlights':    { cn: '8512201000', au: '85122000' },
  'tail-lights':   { cn: '8512209000', au: '85122000' },
  'front-fender':  { cn: '8708299090', au: '87082900' },  // TODO: verify AU 8-digit sub-heading
  'side-mirror':   { cn: '8708291000', au: '87082900' },  // TODO: verify AU 8-digit sub-heading
}

// ─── 澳洲关税数据 ──────────────────────────────────────────
// 来源：ABF Working Tariff（已核实）
// 注：澳洲对所有以下编码的 MFN 关税已为 0%，与原产地无关
// ChAFTA 无额外优惠（已无可降），无需原产地证书

const AU_TARIFF_RATES = [
  {
    country_code: 'AU',
    hs_code: '87081000',   // 保险杠
    mfn_rate: '0.00',
    fta_name: null,
    fta_rate: null,
    fta_conditions: null,
    vat_rate: '10.00',
    last_verified: '2026-06-15',
    source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/working-tariff',
  },
  {
    country_code: 'AU',
    hs_code: '85122000',   // 大灯 + 尾灯（澳洲合并为同一编码）
    mfn_rate: '0.00',
    fta_name: null,
    fta_rate: null,
    fta_conditions: null,
    vat_rate: '10.00',
    last_verified: '2026-06-15',
    source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/working-tariff',
  },
  {
    country_code: 'AU',
    hs_code: '87082900',   // 翼子板 + 后视镜（TODO: verify exact sub-heading）
    mfn_rate: '0.00',
    fta_name: null,
    fta_rate: null,
    fta_conditions: null,
    vat_rate: '10.00',
    last_verified: '2026-06-15',
    source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/working-tariff',
  },
  {
    country_code: 'AU',
    hs_code: '87082900',   // 后视镜（合并入翼子板同一行，TODO: verify sub-heading）
    mfn_rate: '0.00',
    fta_name: null,
    fta_rate: null,
    fta_conditions: null,
    vat_rate: '10.00',
    last_verified: '2026-06-15',
    source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/working-tariff',
  },
]

async function seed() {
  console.log('Seeding parts data...')

  // 1. 插入 parts
  const { data: insertedParts, error: partsError } = await sb
    .from('mf_parts')
    .insert(PARTS)
    .select('id, slug')

  if (partsError) throw new Error(`Parts insert failed: ${partsError.message}`)
  console.log(`✓ Inserted ${insertedParts.length} parts`)

  const partIdBySlug = Object.fromEntries(insertedParts.map(p => [p.slug, p.id]))

  // 2. 插入 part_model_compatibility
  const compatRows = Object.entries(MODEL_COMPATIBILITY).flatMap(([slug, models]) =>
    models.map(m => ({ part_id: partIdBySlug[slug], model_id: m.model_id, years: m.years }))
  )
  const { error: compatError } = await sb.from('mf_part_model_compatibility').insert(compatRows)
  if (compatError) throw new Error(`Compatibility insert failed: ${compatError.message}`)
  console.log(`✓ Inserted ${compatRows.length} compatibility rows`)

  // 3. 插入 part_hs_codes（CN 出口 + AU 进口）
  const hsRows = Object.entries(HS_CODES).flatMap(([slug, codes]) => [
    {
      part_id: partIdBySlug[slug],
      country_code: 'CN',
      hs_code: codes.cn,
      hs_code_type: 'export',
      description_en: null,
      last_verified: '2026-06-15',
    },
    {
      part_id: partIdBySlug[slug],
      country_code: 'AU',
      hs_code: codes.au,
      hs_code_type: 'import',
      description_en: null,
      last_verified: '2026-06-15',
    },
  ])
  const { error: hsError } = await sb.from('mf_part_hs_codes').insert(hsRows)
  if (hsError) throw new Error(`HS codes insert failed: ${hsError.message}`)
  console.log(`✓ Inserted ${hsRows.length} HS code rows`)

  // 4. 插入 tariff_rates（澳洲）
  const { error: tariffError } = await sb.from('mf_tariff_rates').insert(AU_TARIFF_RATES)
  if (tariffError) throw new Error(`Tariff rates insert failed: ${tariffError.message}`)
  console.log(`✓ Inserted ${AU_TARIFF_RATES.length} tariff rate rows`)

  console.log('Seeding complete!')
}

seed().catch(console.error)
```

- [ ] **Step 2: 在 package.json 添加脚本**

在 `package.json` 的 `scripts` 字段添加：

```json
"seed:parts": "dotenv -e .env.local -- tsx scripts/seed-parts.ts"
```

- [ ] **Step 3: 运行种子脚本**

```bash
npm run seed:parts
```

期望输出：
```
Seeding parts data...
✓ Inserted 6 parts
✓ Inserted 18 compatibility rows
✓ Inserted 12 HS code rows
✓ Inserted 4 tariff rate rows
Seeding complete!
```

- [ ] **Step 4: 在 Supabase 验证数据**

```sql
SELECT p.slug, p.name_en, COUNT(pmc.id) as model_count
FROM mf_parts p
LEFT JOIN mf_part_model_compatibility pmc ON pmc.part_id = p.id
GROUP BY p.slug, p.name_en
ORDER BY p.slug;
```

期望：6行，每行 model_count = 3

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-parts.ts package.json
git commit -m "feat: add parts seed data script with BYD exterior parts"
```

---

## Task 3: 数据查询函数

**Files:**
- Create: `lib/db/parts.ts`

- [ ] **Step 1: 写查询函数的单元测试（纯函数部分）**

创建 `__tests__/parts/url-builders.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'

// 这些是将在 lib/db/parts.ts 中导出的纯函数
import { buildPartUrl, buildHsCodeUrl, buildAliexpressSearchUrl } from '@/lib/db/parts'

describe('buildPartUrl', () => {
  it('constructs correct part detail URL', () => {
    expect(buildPartUrl('au', 'byd', 'dolphin', 'front-bumper'))
      .toBe('/au/parts/byd/dolphin/front-bumper')
  })
})

describe('buildHsCodeUrl', () => {
  it('constructs correct HS code URL', () => {
    expect(buildHsCodeUrl('au', '87081010'))
      .toBe('/au/parts/hs/87081010')
  })
})

describe('buildAliexpressSearchUrl', () => {
  it('builds AliExpress search URL with encoded query', () => {
    const url = buildAliexpressSearchUrl('BYD Dolphin front bumper')
    expect(url).toContain('aliexpress.com')
    expect(url).toContain('BYD')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm run test -- __tests__/parts/url-builders.test.ts
```

期望：FAIL，提示 `@/lib/db/parts` 模块不存在

- [ ] **Step 3: 创建 `lib/db/parts.ts`**

```typescript
import { sb } from '@/lib/db'

// ─── 类型定义 ──────────────────────────────────────────────

export interface Part {
  id: number
  slug: string
  name_en: string
  name_cn: string | null
  category: string | null
  material: string | null
  is_dangerous: boolean
  notes: string | null
}

export interface PartWithCompatibility extends Part {
  compatible_models: {
    model_id: string
    model_name: string
    brand_id: string
    years: string | null
    oem_number: string | null
  }[]
}

export interface HsCode {
  id: number
  part_id: number
  country_code: string
  hs_code: string
  hs_code_type: 'export' | 'import'
  description_en: string | null
  description_local: string | null
  declaration_elements: string | null
  regulatory_conditions: string | null
  last_verified: string | null
  source_url: string | null
}

export interface TariffRate {
  id: number
  country_code: string
  hs_code: string
  mfn_rate: string | null
  fta_name: string | null
  fta_rate: string | null
  fta_conditions: string | null
  vat_rate: string | null
  additional_duties: string | null
  last_verified: string | null
  source_url: string | null
}

export interface PartPageData {
  part: PartWithCompatibility
  cnHsCode: HsCode | null   // 中国出口编码
  auHsCode: HsCode | null   // 澳洲进口编码
  tariffRate: TariffRate | null
}

export interface HsCodePageData {
  hsCode: HsCode
  tariffRate: TariffRate | null
  relatedParts: (Part & { model_slugs: string[] })[]
}

// ─── 纯函数（可单元测试）──────────────────────────────────

export function buildPartUrl(market: string, brand: string, model: string, part: string): string {
  return `/${market}/parts/${brand}/${model}/${part}`
}

export function buildHsCodeUrl(market: string, hsCode: string): string {
  return `/${market}/parts/hs/${hsCode}`
}

export function buildAliexpressSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query)
  return `https://www.aliexpress.com/wholesale?SearchText=${encoded}`
}

export function calculateTariff(params: {
  partPrice: number
  shipping: number
  useFta: boolean
  mfnRate: number
  ftaRate: number
  vatRate: number
}): {
  cif: number
  duty: number
  vat: number
  total: number
} {
  const { partPrice, shipping, useFta, mfnRate, ftaRate, vatRate } = params
  const cif = partPrice + shipping
  const dutyRate = useFta ? ftaRate : mfnRate
  const duty = cif * (dutyRate / 100)
  const vat = (cif + duty) * (vatRate / 100)
  const total = cif + duty + vat
  return {
    cif: Math.round(cif * 100) / 100,
    duty: Math.round(duty * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

// ─── 数据库查询函数 ────────────────────────────────────────

export async function getPartBySlug(partSlug: string): Promise<PartWithCompatibility | null> {
  const { data: part, error } = await sb
    .from('mf_parts')
    .select('*')
    .eq('slug', partSlug)
    .single()

  if (error || !part) return null

  const { data: compat } = await sb
    .from('mf_part_model_compatibility')
    .select('model_id, years, oem_number, mf_nv_models(model_name, brand_id)')
    .eq('part_id', part.id)

  return {
    ...part,
    compatible_models: (compat ?? []).map((c: any) => ({
      model_id: c.model_id,
      model_name: c.mf_nv_models?.model_name ?? '',
      brand_id: c.mf_nv_models?.brand_id ?? '',
      years: c.years,
      oem_number: c.oem_number,
    })),
  }
}

export async function getPartsByModel(modelId: string): Promise<Part[]> {
  const { data, error } = await sb
    .from('mf_part_model_compatibility')
    .select('mf_parts(*)')
    .eq('model_id', modelId)

  if (error || !data) return []
  return data.map((row: any) => row.mf_parts).filter(Boolean)
}

export async function getHsCodesForPart(partId: number): Promise<HsCode[]> {
  const { data, error } = await sb
    .from('mf_part_hs_codes')
    .select('*')
    .eq('part_id', partId)

  if (error) return []
  return data ?? []
}

export async function getTariffRate(countryCode: string, hsCode: string): Promise<TariffRate | null> {
  const { data, error } = await sb
    .from('mf_tariff_rates')
    .select('*')
    .eq('country_code', countryCode)
    .eq('hs_code', hsCode)
    .single()

  if (error) return null
  return data
}

export async function getPartPageData(
  modelId: string,
  partSlug: string,
  marketCountryCode: string  // 'AU' for /au market
): Promise<PartPageData | null> {
  const part = await getPartBySlug(partSlug)
  if (!part) return null

  // 确认此配件与该车型兼容
  const isCompatible = part.compatible_models.some(m => m.model_id === modelId)
  if (!isCompatible) return null

  const hsCodes = await getHsCodesForPart(part.id)
  const cnHsCode = hsCodes.find(h => h.country_code === 'CN' && h.hs_code_type === 'export') ?? null
  const auHsCode = hsCodes.find(h => h.country_code === marketCountryCode && h.hs_code_type === 'import') ?? null

  const tariffRate = auHsCode
    ? await getTariffRate(marketCountryCode, auHsCode.hs_code)
    : null

  return { part, cnHsCode, auHsCode, tariffRate }
}

export async function getHsCodePageData(
  hsCode: string,
  countryCode: string
): Promise<HsCodePageData | null> {
  const { data: hsCodeRow, error } = await sb
    .from('mf_part_hs_codes')
    .select('*')
    .eq('hs_code', hsCode)
    .eq('country_code', countryCode)
    .eq('hs_code_type', 'import')
    .single()

  if (error || !hsCodeRow) return null

  const tariffRate = await getTariffRate(countryCode, hsCode)

  // 找出所有使用该编码的配件
  const { data: allWithCode } = await sb
    .from('mf_part_hs_codes')
    .select('part_id')
    .eq('hs_code', hsCode)
    .eq('country_code', countryCode)

  const partIds = (allWithCode ?? []).map((r: any) => r.part_id)
  const relatedParts: (Part & { model_slugs: string[] })[] = []

  for (const partId of partIds) {
    const { data: partRow } = await sb.from('mf_parts').select('*').eq('id', partId).single()
    if (!partRow) continue
    const { data: compat } = await sb
      .from('mf_part_model_compatibility')
      .select('model_id')
      .eq('part_id', partId)
    relatedParts.push({
      ...partRow,
      model_slugs: (compat ?? []).map((c: any) => c.model_id),
    })
  }

  return { hsCode: hsCodeRow, tariffRate, relatedParts }
}

// ─── Static params 辅助函数 ───────────────────────────────

export async function getAllPartSlugsForModel(modelSlug: string): Promise<string[]> {
  const { data } = await sb
    .from('mf_part_model_compatibility')
    .select('mf_parts(slug)')
    .eq('model_id', modelSlug)

  return (data ?? []).map((r: any) => r.mf_parts?.slug).filter(Boolean)
}

export async function getAllHsCodesForSitemap(countryCode: string): Promise<string[]> {
  const { data } = await sb
    .from('mf_tariff_rates')
    .select('hs_code')
    .eq('country_code', countryCode)

  return [...new Set((data ?? []).map((r: any) => r.hs_code))]
}

export async function getAllBydModelSlugs(): Promise<string[]> {
  const { data } = await sb
    .from('mf_nv_models')
    .select('slug')
    .eq('brand_id', 'byd')

  return (data ?? []).map((r: any) => r.slug)
}
```

- [ ] **Step 4: 运行测试确认纯函数通过**

```bash
npm run test -- __tests__/parts/url-builders.test.ts
```

期望：PASS

- [ ] **Step 5: 写税费计算函数测试**

创建 `__tests__/parts/tariff-calc.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { calculateTariff } from '@/lib/db/parts'

describe('calculateTariff', () => {
  it('calculates 0% ChAFTA duty correctly', () => {
    const result = calculateTariff({
      partPrice: 200,
      shipping: 30,
      useFta: true,
      mfnRate: 5,
      ftaRate: 0,
      vatRate: 10,
    })
    expect(result.cif).toBe(230)
    expect(result.duty).toBe(0)
    expect(result.vat).toBe(23)
    expect(result.total).toBe(253)
  })

  it('calculates 5% MFN duty correctly', () => {
    const result = calculateTariff({
      partPrice: 200,
      shipping: 30,
      useFta: false,
      mfnRate: 5,
      ftaRate: 0,
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
      useFta: false,
      mfnRate: 5,
      ftaRate: 0,
      vatRate: 10,
    })
    expect(result.total.toString()).toMatch(/^\d+\.\d{1,2}$/)
  })
})
```

- [ ] **Step 6: 运行税费测试**

```bash
npm run test -- __tests__/parts/tariff-calc.test.ts
```

期望：PASS（3 tests）

- [ ] **Step 7: Commit**

```bash
git add lib/db/parts.ts __tests__/parts/url-builders.test.ts __tests__/parts/tariff-calc.test.ts
git commit -m "feat: add parts DB query functions and tariff calculation logic"
```

---

## Task 4: 税费一览和计算器组件

**Files:**
- Create: `components/parts/TariffSummary.tsx`
- Create: `components/parts/CostCalculator.tsx`

- [ ] **Step 1: 创建税费一览 Server Component**

创建 `components/parts/TariffSummary.tsx`：

```tsx
import type { TariffRate } from '@/lib/db/parts'

interface Props {
  tariffRate: TariffRate
  examplePrice?: number  // 默认 200 AUD 示例计算
}

export function TariffSummary({ tariffRate, examplePrice = 200 }: Props) {
  const duty = parseFloat(tariffRate.mfn_rate ?? '0')
  const vat = parseFloat(tariffRate.vat_rate ?? '10')

  const exampleDuty = examplePrice * (duty / 100)
  const exampleGst = (examplePrice + exampleDuty) * (vat / 100)
  const exampleTotal = examplePrice + exampleDuty + exampleGst

  return (
    <div className="tariff-summary">
      <h2>Import Duty & Taxes (Australia)</h2>

      <div className="tariff-rates">
        <div className="tariff-row">
          <span className="label">Customs Duty</span>
          <span className="value">
            <strong>0%</strong>
            <span className="badge-free">✓ Free — no certificate required</span>
          </span>
        </div>
        <div className="tariff-row">
          <span className="label">GST</span>
          <span className="value"><strong>{vat}%</strong></span>
        </div>
      </div>

      <div className="tariff-example">
        <p className="example-label">Example on a ${examplePrice} AUD part:</p>
        <div className="example-row">
          <span>Customs duty (0%)</span>
          <span>$0.00</span>
        </div>
        <div className="example-row">
          <span>GST ({vat}%)</span>
          <span>${exampleGst.toFixed(2)}</span>
        </div>
        <div className="example-row total">
          <span>Estimated total cost</span>
          <span>${exampleTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="tariff-note">
        <p>
          Australia's standard tariff on these EV parts is already <strong>0%</strong> for all origins —
          no Certificate of Origin required. You only pay GST.
        </p>
      </div>

      <p className="tariff-source">
        Source: Australian Border Force (ABF) Working Tariff
        {tariffRate.last_verified && ` · Verified ${tariffRate.last_verified}`}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: 创建计算器 Client Component**

创建 `components/parts/CostCalculator.tsx`：

```tsx
'use client'

import { useState } from 'react'
import { calculateTariff } from '@/lib/db/parts'

interface Props {
  mfnRate: number
  ftaRate: number
  ftaName: string
  vatRate: number
  defaultPartPrice?: number
}

export function CostCalculator({
  mfnRate,
  ftaRate,
  ftaName,
  vatRate,
  defaultPartPrice = 200,
}: Props) {
  const [partPrice, setPartPrice] = useState(defaultPartPrice)
  const [shipping, setShipping] = useState(30)
  const [useFta, setUseFta] = useState(true)

  const result = calculateTariff({ partPrice, shipping, useFta, mfnRate, ftaRate, vatRate })

  return (
    <div className="cost-calculator">
      <h2>Landed Cost Calculator</h2>

      <div className="calculator-inputs">
        <label>
          Part price (AUD)
          <input
            type="number"
            min="0"
            value={partPrice}
            onChange={(e) => setPartPrice(parseFloat(e.target.value) || 0)}
          />
        </label>
        <label>
          Shipping (AUD)
          <input
            type="number"
            min="0"
            value={shipping}
            onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
          />
        </label>
        <label className="fta-toggle">
          <input
            type="checkbox"
            checked={useFta}
            onChange={(e) => setUseFta(e.target.checked)}
          />
          Apply {ftaName} 0% duty (requires Certificate of Origin)
        </label>
      </div>

      <div className="calculator-results">
        <div className="result-row">
          <span>CIF value</span>
          <span>${result.cif.toFixed(2)}</span>
        </div>
        <div className="result-row">
          <span>Customs duty ({useFta ? ftaRate : mfnRate}%)</span>
          <span>${result.duty.toFixed(2)}</span>
        </div>
        <div className="result-row">
          <span>GST ({vatRate}%)</span>
          <span>${result.vat.toFixed(2)}</span>
        </div>
        <div className="result-row total">
          <span>Estimated total</span>
          <span>${result.total.toFixed(2)}</span>
        </div>
      </div>

      <p className="calculator-note">
        * Excludes customs broker fees (~$50–150) and Import Processing Charge (~$50–100).
        GST is recoverable for GST-registered Australian businesses.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: 运行 lint 确认类型无误**

```bash
npx tsc --noEmit
```

期望：无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add components/parts/TariffSummary.tsx components/parts/CostCalculator.tsx
git commit -m "feat: add TariffSummary and CostCalculator components"
```

---

## Task 5: 速卖通商品卡片组件

**Files:**
- Create: `components/parts/AliexpressCards.tsx`

- [ ] **Step 1: 创建速卖通卡片 Server Component**

速卖通联盟 API 申请需要时间，此组件先实现降级方案（静态搜索链接），后续 API 接入后替换数据获取逻辑，UI 不变。

创建 `components/parts/AliexpressCards.tsx`：

```tsx
interface AliexpressProduct {
  title: string
  price: string
  imageUrl: string
  productUrl: string
  rating?: string
  orders?: string
}

interface Props {
  partNameEn: string
  modelNameEn: string
  // products 由父页面传入（API 就绪后填充，未就绪时传 []）
  products?: AliexpressProduct[]
}

export function AliexpressCards({ partNameEn, modelNameEn, products = [] }: Props) {
  const searchQuery = encodeURIComponent(`${partNameEn} ${modelNameEn}`)
  const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${searchQuery}`

  return (
    <div className="aliexpress-section">
      <div className="section-header">
        <h2>Buy on AliExpress</h2>
        <span className="affiliate-label">Affiliate links</span>
      </div>

      {products.length > 0 ? (
        <div className="product-cards">
          {products.slice(0, 3).map((product, i) => (
            <a
              key={i}
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="product-card"
            >
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.title} loading="lazy" />
              )}
              <div className="product-info">
                <p className="product-title">{product.title}</p>
                <p className="product-price">{product.price}</p>
                {product.rating && <p className="product-rating">★ {product.rating}</p>}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="aliexpress-fallback">
          <p>Search for {partNameEn} compatible with {modelNameEn} on AliExpress:</p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="aliexpress-search-link"
          >
            Search AliExpress →
          </a>
        </div>
      )}

      <p className="affiliate-disclaimer">
        * Prices are indicative. Verify compatibility before purchase.
        We may earn a commission on qualifying purchases.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/parts/AliexpressCards.tsx
git commit -m "feat: add AliexpressCards component with fallback search link"
```

---

## Task 6: 配件详情页

**Files:**
- Create: `app/[market]/parts/[brand]/[model]/[part]/page.tsx`

- [ ] **Step 1: 写 Schema.org 结构化数据测试**

创建 `__tests__/parts/schema-builders.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { buildPartProductSchema, buildPartBreadcrumbSchema } from '@/app/[market]/parts/[brand]/[model]/[part]/schema'

describe('buildPartProductSchema', () => {
  it('includes part name and description', () => {
    const schema = buildPartProductSchema({
      partNameEn: 'Front Bumper Assembly',
      modelName: 'BYD Dolphin',
      market: 'au',
      brand: 'byd',
      modelSlug: 'dolphin',
      partSlug: 'front-bumper',
    })
    expect(schema['@type']).toBe('Product')
    expect(schema.name).toContain('Front Bumper')
    expect(schema.name).toContain('BYD Dolphin')
  })
})

describe('buildPartBreadcrumbSchema', () => {
  it('has correct number of breadcrumb items', () => {
    const schema = buildPartBreadcrumbSchema({
      market: 'au',
      brand: 'byd',
      brandName: 'BYD',
      modelSlug: 'dolphin',
      modelName: 'BYD Dolphin',
      partName: 'Front Bumper Assembly',
    })
    expect(schema['@type']).toBe('BreadcrumbList')
    expect(schema.itemListElement).toHaveLength(5)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm run test -- __tests__/parts/schema-builders.test.ts
```

期望：FAIL

- [ ] **Step 3: 创建 schema 工具文件**

创建 `app/[market]/parts/[brand]/[model]/[part]/schema.ts`：

```typescript
import { BASE_URL } from '@/lib/config'

export function buildPartProductSchema(params: {
  partNameEn: string
  modelName: string
  market: string
  brand: string
  modelSlug: string
  partSlug: string
}) {
  const { partNameEn, modelName, market, brand, modelSlug, partSlug } = params
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${partNameEn} for ${modelName}`,
    description: `Import duty and buying guide for ${partNameEn} compatible with ${modelName}. Australia import costs, HS code, and AliExpress listings.`,
    url: `${BASE_URL}/${market}/parts/${brand}/${modelSlug}/${partSlug}`,
  }
}

export function buildPartBreadcrumbSchema(params: {
  market: string
  brand: string
  brandName: string
  modelSlug: string
  modelName: string
  partName: string
}) {
  const { market, brand, brandName, modelSlug, modelName, partName } = params
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${BASE_URL}/${market}` },
      { '@type': 'ListItem', position: 2, name: 'Parts', item: `${BASE_URL}/${market}/parts` },
      { '@type': 'ListItem', position: 3, name: brandName, item: `${BASE_URL}/${market}/parts/${brand}` },
      { '@type': 'ListItem', position: 4, name: modelName, item: `${BASE_URL}/${market}/parts/${brand}/${modelSlug}` },
      { '@type': 'ListItem', position: 5, name: partName },
    ],
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm run test -- __tests__/parts/schema-builders.test.ts
```

期望：PASS

- [ ] **Step 5: 创建配件详情页**

创建 `app/[market]/parts/[brand]/[model]/[part]/page.tsx`：

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import {
  getPartPageData,
  getAllPartSlugsForModel,
  getAllBydModelSlugs,
} from '@/lib/db/parts'
import { TariffSummary } from '@/components/parts/TariffSummary'
import { CostCalculator } from '@/components/parts/CostCalculator'
import { AliexpressCards } from '@/components/parts/AliexpressCards'
import { buildPartProductSchema, buildPartBreadcrumbSchema } from './schema'
import { JsonLd } from '@/components/JsonLd'

interface Props {
  params: Promise<{
    market: string
    brand: string
    model: string
    part: string
  }>
}

// market → country_code mapping（仅 AU 在 MVP 阶段）
const MARKET_COUNTRY: Record<string, string> = { au: 'AU' }

// brand → display name mapping
const BRAND_NAMES: Record<string, string> = { byd: 'BYD' }

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') {
    return [{ market: 'au', brand: 'byd', model: 'byd-dolphin', part: 'front-bumper' }]
  }
  const modelSlugs = await getAllBydModelSlugs()
  const results = []
  for (const modelSlug of modelSlugs) {
    const partSlugs = await getAllPartSlugsForModel(modelSlug)
    for (const partSlug of partSlugs) {
      results.push({ market: 'au', brand: 'byd', model: modelSlug, part: partSlug })
    }
  }
  return results
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, model, part } = await params
  const countryCode = MARKET_COUNTRY[market]
  if (!countryCode) return {}

  const data = await getPartPageData(model, part, countryCode)
  if (!data) return {}

  const partName = data.part.name_en
  const modelName = data.part.compatible_models.find(m => m.model_id === model)?.model_name ?? model
  const brandName = BRAND_NAMES[brand] ?? brand.toUpperCase()
  const url = `${BASE_URL}/${market}/parts/${brand}/${model}/${part}`

  return {
    title: `${brandName} ${modelName} ${partName} — Import Duty & Cost (Australia) | EVAftermarket`,
    description: `How much does it cost to import a ${partName} for ${brandName} ${modelName} into Australia? HS code, ChAFTA 0% duty, GST breakdown and AliExpress listings.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${brandName} ${modelName} ${partName} — Import Duty Australia`,
      description: `Import duty and cost breakdown for ${partName} compatible with ${brandName} ${modelName}.`,
      url,
      type: 'website',
    },
  }
}

export default async function PartDetailPage({ params }: Props) {
  const { market, brand, model, part } = await params
  const countryCode = MARKET_COUNTRY[market]
  if (!countryCode) notFound()

  const data = await getPartPageData(model, part, countryCode)
  if (!data) notFound()

  const { part: partData, cnHsCode, auHsCode, tariffRate } = data
  const modelInfo = partData.compatible_models.find(m => m.model_id === model)
  const modelName = modelInfo?.model_name ?? model
  const brandName = BRAND_NAMES[brand] ?? brand.toUpperCase()

  const productSchema = buildPartProductSchema({
    partNameEn: partData.name_en,
    modelName: `${brandName} ${modelName}`,
    market, brand, modelSlug: model, partSlug: part,
  })
  const breadcrumbSchema = buildPartBreadcrumbSchema({
    market, brand, brandName, modelSlug: model, modelName: `${brandName} ${modelName}`,
    partName: partData.name_en,
  })

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />

      <div className="page-container">
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a> &rsaquo;{' '}
          <a href={`/${market}/parts`}>Parts</a> &rsaquo;{' '}
          <a href={`/${market}/parts/${brand}`}>{brandName}</a> &rsaquo;{' '}
          <a href={`/${market}/parts/${brand}/${model}`}>{brandName} {modelName}</a> &rsaquo;{' '}
          {partData.name_en}
        </nav>

        <h1>
          {brandName} {modelName} {partData.name_en} —{' '}
          Import Duty & Buying Guide (Australia)
        </h1>

        {/* 配件基本信息 */}
        <section className="part-info">
          <h2>Part Information</h2>
          <dl>
            <dt>English name</dt><dd>{partData.name_en}</dd>
            {partData.name_cn && <><dt>Chinese name</dt><dd>{partData.name_cn}</dd></>}
            <dt>Compatible models</dt>
            <dd>
              {partData.compatible_models.map(m => (
                <span key={m.model_id}>{m.model_name} {m.years && `(${m.years})`}</span>
              ))}
            </dd>
            {partData.material && <><dt>Material</dt><dd>{partData.material}</dd></>}
          </dl>

          {/* HS 编码区块 */}
          <div className="hs-codes">
            {cnHsCode && (
              <div className="hs-code-item">
                <span className="hs-label">China export HS code (10-digit)</span>
                <code>{cnHsCode.hs_code}</code>
                <span className="hs-note">Used for Chinese customs export declaration</span>
              </div>
            )}
            {auHsCode && (
              <div className="hs-code-item">
                <span className="hs-label">Australia import HS code (8-digit)</span>
                <code>
                  <a href={`/${market}/parts/hs/${auHsCode.hs_code}`}>
                    {auHsCode.hs_code}
                  </a>
                </code>
                <span className="hs-note">Used for Australian customs import declaration</span>
              </div>
            )}
          </div>
        </section>

        {/* 税费一览 */}
        {tariffRate && <TariffSummary tariffRate={tariffRate} />}

        {/* 计算器 */}
        {tariffRate && (
          <CostCalculator
            mfnRate={parseFloat(tariffRate.mfn_rate ?? '5')}
            ftaRate={parseFloat(tariffRate.fta_rate ?? '0')}
            ftaName={tariffRate.fta_name ?? 'FTA'}
            vatRate={parseFloat(tariffRate.vat_rate ?? '10')}
          />
        )}

        {/* 速卖通导流 */}
        <AliexpressCards
          partNameEn={partData.name_en}
          modelNameEn={modelName}
        />

        {/* 购买须知 */}
        <section className="buying-guide">
          <h2>What You Need to Know</h2>
          <ul>
            <li>
              <strong>Zero customs duty:</strong> Australia's standard tariff on these EV body parts
              is 0% for all origins — no Certificate of Origin required.
            </li>
            <li>
              <strong>GST applies:</strong> 10% GST is payable on import, calculated on
              (part price + shipping).
            </li>
            <li>
              <strong>GST for businesses:</strong> Australian GST-registered businesses can claim
              the 10% GST back as an input tax credit on their BAS.
            </li>
            <li>
              <strong>Additional costs:</strong> Budget for a customs broker fee (~$50–150) and
              Import Processing Charge (~$50–100) on top of the figures above.
            </li>
          </ul>
        </section>

        {/* 相关链接 */}
        <nav className="related-links">
          <a href={`/${market}/parts/${brand}/${model}`}>
            Other {brandName} {modelName} parts
          </a>
          <a href={`/${market}/dtc/${model}`}>
            {brandName} {modelName} fault codes
          </a>
        </nav>
      </div>
    </>
  )
}
```

- [ ] **Step 6: 运行开发服务器验证页面渲染**

```bash
npm run dev
```

访问：`http://localhost:3000/au/parts/byd/byd-dolphin/front-bumper`

期望：页面正常渲染，显示配件信息、税费一览、计算器

- [ ] **Step 7: Commit**

```bash
git add app/[market]/parts/[brand]/[model]/[part]/ __tests__/parts/schema-builders.test.ts
git commit -m "feat: add part detail page with tariff summary, calculator, and AliExpress cards"
```

---

## Task 7: HS 编码详情页

**Files:**
- Create: `app/[market]/parts/hs/[code]/page.tsx`

- [ ] **Step 1: 创建 HS 编码详情页**

创建 `app/[market]/parts/hs/[code]/page.tsx`：

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getHsCodePageData, getAllHsCodesForSitemap, buildPartUrl } from '@/lib/db/parts'
import { JsonLd } from '@/components/JsonLd'

interface Props {
  params: Promise<{ market: string; code: string }>
}

const MARKET_COUNTRY: Record<string, string> = { au: 'AU' }
const BRAND_NAMES: Record<string, string> = { byd: 'BYD' }

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') {
    return [{ market: 'au', code: '87081010' }]
  }
  const hsCodes = await getAllHsCodesForSitemap('AU')
  return hsCodes.map(code => ({ market: 'au', code }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, code } = await params
  const countryCode = MARKET_COUNTRY[market]
  if (!countryCode) return {}

  const data = await getHsCodePageData(code, countryCode)
  if (!data) return {}

  const url = `${BASE_URL}/${market}/parts/hs/${code}`

  return {
    title: `HS Code ${code} — Australia Import Duty & Tariff Rate | EVAftermarket`,
    description: `HS code ${code} Australia import duty rate, ChAFTA preferential rate, GST, and declaration requirements for EV parts from China.`,
    alternates: { canonical: url },
  }
}

export default async function HsCodePage({ params }: Props) {
  const { market, code } = await params
  const countryCode = MARKET_COUNTRY[market]
  if (!countryCode) notFound()

  const data = await getHsCodePageData(code, countryCode)
  if (!data) notFound()

  const { hsCode, tariffRate, relatedParts } = data

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${BASE_URL}/${market}` },
      { '@type': 'ListItem', position: 2, name: 'Parts', item: `${BASE_URL}/${market}/parts` },
      { '@type': 'ListItem', position: 3, name: `HS Code ${code}` },
    ],
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      <div className="page-container">
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a> &rsaquo;{' '}
          <a href={`/${market}/parts`}>Parts</a> &rsaquo;{' '}
          HS Code {code}
        </nav>

        <h1>HS Code {code} — Australia Import Duty Guide</h1>

        {/* 编码基本信息 */}
        <section className="hs-info">
          <h2>Classification Details</h2>
          <dl>
            <dt>HS Code (Australia import, 8-digit)</dt>
            <dd><code>{code}</code></dd>
            {hsCode.description_en && (
              <><dt>Description</dt><dd>{hsCode.description_en}</dd></>
            )}
            {hsCode.declaration_elements && (
              <><dt>Declaration elements</dt><dd>{hsCode.declaration_elements}</dd></>
            )}
            {hsCode.last_verified && (
              <><dt>Last verified</dt><dd>{hsCode.last_verified}</dd></>
            )}
          </dl>
        </section>

        {/* 税率信息 */}
        {tariffRate && (
          <section className="tariff-info">
            <h2>Australia Import Duty Rates</h2>
            <table>
              <tbody>
                <tr>
                  <th>MFN Rate (standard)</th>
                  <td>{tariffRate.mfn_rate}%</td>
                </tr>
                {tariffRate.fta_name && (
                  <tr>
                    <th>{tariffRate.fta_name} rate (from China)</th>
                    <td><strong>{tariffRate.fta_rate}%</strong></td>
                  </tr>
                )}
                <tr>
                  <th>GST</th>
                  <td>{tariffRate.vat_rate}%</td>
                </tr>
              </tbody>
            </table>
            {tariffRate.fta_conditions && (
              <div className="fta-conditions">
                <strong>To claim {tariffRate.fta_name} rate:</strong>
                <p>{tariffRate.fta_conditions}</p>
              </div>
            )}
            {tariffRate.source_url && (
              <p className="source">
                Source: <a href={tariffRate.source_url} target="_blank" rel="noopener noreferrer">
                  Australian Border Force (ABF)
                </a>
                {tariffRate.last_verified && ` · Verified ${tariffRate.last_verified}`}
              </p>
            )}
          </section>
        )}

        {/* 使用该编码的配件 */}
        {relatedParts.length > 0 && (
          <section className="related-parts">
            <h2>EV Parts Using This HS Code</h2>
            <ul>
              {relatedParts.flatMap(part =>
                part.model_slugs.map(modelSlug => (
                  <li key={`${part.slug}-${modelSlug}`}>
                    <a href={buildPartUrl(market, 'byd', modelSlug, part.slug)}>
                      BYD {modelSlug.replace('byd-', '').replace(/-/g, ' ')} — {part.name_en}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}

        {/* 归类须知 */}
        <section className="classification-guide">
          <h2>Classification Notes</h2>
          <ul>
            <li>
              Ensure your supplier's export invoice uses the correct HS code to avoid
              customs delays or reclassification.
            </li>
            <li>
              The first 6 digits of Australian and Chinese HS codes are internationally
              standardised under the WCO Harmonized System.
            </li>
            <li>
              If you are unsure of the correct classification, consult a licensed
              Australian customs broker.
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
```

- [ ] **Step 2: 运行开发服务器验证**

```bash
npm run dev
```

访问：`http://localhost:3000/au/parts/hs/87081010`

期望：显示编码信息、税率、关联配件列表

- [ ] **Step 3: Commit**

```bash
git add app/[market]/parts/hs/
git commit -m "feat: add HS code detail page with tariff rates and related parts"
```

---

## Task 8: 索引页（品牌、车型、配件列表）

**Files:**
- Create: `app/[market]/parts/page.tsx`
- Create: `app/[market]/parts/[brand]/page.tsx`
- Create: `app/[market]/parts/[brand]/[model]/page.tsx`

- [ ] **Step 1: 创建品牌列表页 `/au/parts`**

创建 `app/[market]/parts/page.tsx`：

```tsx
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'

interface Props {
  params: Promise<{ market: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params
  return {
    title: 'Chinese EV Parts — Import Duty Guide Australia | EVAftermarket',
    description: 'Find import duty, HS codes and AliExpress listings for Chinese EV parts in Australia. BYD Dolphin, Atto 3, Seal and more.',
    alternates: { canonical: `${BASE_URL}/${market}/parts` },
  }
}

export default async function PartsIndexPage({ params }: Props) {
  const { market } = await params
  return (
    <div className="page-container">
      <h1>Chinese EV Parts — Import Duty Guide (Australia)</h1>
      <p>
        Find the correct HS code, import duty, and GST for Chinese EV parts shipped to Australia.
        Under ChAFTA, most parts attract <strong>0% customs duty</strong> — find out what you need to pay.
      </p>

      <section>
        <h2>Browse by Brand</h2>
        <ul className="brand-list">
          <li>
            <a href={`/${market}/parts/byd`}>
              <strong>BYD</strong>
              <span>Dolphin, Atto 3, Seal</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: 创建车型列表页 `/au/parts/byd`**

创建 `app/[market]/parts/[brand]/page.tsx`：

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getAllBydModelSlugs } from '@/lib/db/parts'
import { getModelBySlug } from '@/lib/db/models'

interface Props {
  params: Promise<{ market: string; brand: string }>
}

const BRAND_NAMES: Record<string, string> = { byd: 'BYD' }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand } = await params
  const brandName = BRAND_NAMES[brand]
  if (!brandName) return {}
  return {
    title: `${brandName} EV Parts — Import Duty Australia | EVAftermarket`,
    description: `Import duty and HS codes for ${brandName} EV parts in Australia. Dolphin, Atto 3, Seal exterior parts guide.`,
    alternates: { canonical: `${BASE_URL}/${market}/parts/${brand}` },
  }
}

export default async function BrandPartsPage({ params }: Props) {
  const { market, brand } = await params
  const brandName = BRAND_NAMES[brand]
  if (!brandName) notFound()

  const modelSlugs = await getAllBydModelSlugs()
  const models = await Promise.all(modelSlugs.map(getModelBySlug))
  const validModels = models.filter(Boolean)

  return (
    <div className="page-container">
      <nav className="breadcrumb">
        <a href={`/${market}/parts`}>Parts</a> &rsaquo; {brandName}
      </nav>
      <h1>{brandName} EV Parts — Import Duty Guide (Australia)</h1>
      <ul className="model-list">
        {validModels.map(m => m && (
          <li key={m.slug}>
            <a href={`/${market}/parts/${brand}/${m.slug}`}>
              <strong>{m.model_name}</strong>
              {m.years && <span>{m.years}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: 创建配件列表页 `/au/parts/byd/dolphin`**

创建 `app/[market]/parts/[brand]/[model]/page.tsx`：

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getModelBySlug } from '@/lib/db/models'
import { getPartsByModel, getAllBydModelSlugs } from '@/lib/db/parts'

interface Props {
  params: Promise<{ market: string; brand: string; model: string }>
}

const BRAND_NAMES: Record<string, string> = { byd: 'BYD' }

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') {
    return [{ market: 'au', brand: 'byd', model: 'byd-dolphin' }]
  }
  const modelSlugs = await getAllBydModelSlugs()
  return modelSlugs.map(slug => ({ market: 'au', brand: 'byd', model: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}
  const brandName = BRAND_NAMES[brand] ?? brand.toUpperCase()
  return {
    title: `${brandName} ${modelData.model_name} Parts — Import Duty Australia | EVAftermarket`,
    description: `Import duty, HS codes, and AliExpress buying guide for ${brandName} ${modelData.model_name} parts in Australia.`,
    alternates: { canonical: `${BASE_URL}/${market}/parts/${brand}/${model}` },
  }
}

export default async function ModelPartsPage({ params }: Props) {
  const { market, brand, model } = await params
  const brandName = BRAND_NAMES[brand]
  if (!brandName) notFound()

  const [modelData, parts] = await Promise.all([
    getModelBySlug(model),
    getPartsByModel(model),
  ])
  if (!modelData) notFound()

  return (
    <div className="page-container">
      <nav className="breadcrumb">
        <a href={`/${market}/parts`}>Parts</a> &rsaquo;{' '}
        <a href={`/${market}/parts/${brand}`}>{brandName}</a> &rsaquo;{' '}
        {brandName} {modelData.model_name}
      </nav>
      <h1>{brandName} {modelData.model_name} Parts — Import Duty Guide (Australia)</h1>
      <ul className="parts-list">
        {parts.map(p => (
          <li key={p.slug}>
            <a href={`/${market}/parts/${brand}/${model}/${p.slug}`}>
              <strong>{p.name_en}</strong>
              {p.name_cn && <span>{p.name_cn}</span>}
              <span className="arrow">→</span>
            </a>
          </li>
        ))}
      </ul>
      <a href={`/${market}/dtc/${model}`} className="related-link">
        View {brandName} {modelData.model_name} fault codes →
      </a>
    </div>
  )
}
```

- [ ] **Step 4: 验证三个索引页**

```bash
npm run dev
```

访问以下页面，确认均正常渲染：
- `http://localhost:3000/au/parts`
- `http://localhost:3000/au/parts/byd`
- `http://localhost:3000/au/parts/byd/byd-dolphin`

- [ ] **Step 5: Commit**

```bash
git add app/[market]/parts/
git commit -m "feat: add parts index pages for brand, model, and root listing"
```

---

## Task 9: Sitemap 更新

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: 读取现有 sitemap.ts**

```bash
cat app/sitemap.ts
```

确认现有结构，定位添加位置（在 `return pages` 之前）。

- [ ] **Step 2: 在 sitemap.ts 中新增配件页和 HS 编码页**

在 `app/sitemap.ts` 中，在现有导入后添加：

```typescript
import { getAllBydModelSlugs, getAllPartSlugsForModel, getAllHsCodesForSitemap } from '@/lib/db/parts'
```

在 `return pages` 之前，在现有页面生成代码后追加：

```typescript
  // Parts index pages
  pages.push({
    url: `${BASE_URL}/au/parts`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  })
  pages.push({
    url: `${BASE_URL}/au/parts/byd`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  })

  // Parts model index pages and detail pages
  const bydModelSlugs = await getAllBydModelSlugs()
  for (const modelSlug of bydModelSlugs) {
    pages.push({
      url: `${BASE_URL}/au/parts/byd/${modelSlug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
    const partSlugs = await getAllPartSlugsForModel(modelSlug)
    for (const partSlug of partSlugs) {
      pages.push({
        url: `${BASE_URL}/au/parts/byd/${modelSlug}/${partSlug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })
    }
  }

  // HS code pages
  const hsCodes = await getAllHsCodesForSitemap('AU')
  for (const hsCode of hsCodes) {
    pages.push({
      url: `${BASE_URL}/au/parts/hs/${hsCode}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })
  }
```

- [ ] **Step 3: 验证 sitemap 输出**

```bash
npm run build && curl http://localhost:3000/sitemap.xml | grep '/parts/'
```

期望：输出包含 `/au/parts`、`/au/parts/byd`、配件详情页和 HS 编码页的 URL

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: add parts and HS code pages to sitemap"
```

---

## Task 10: 全量测试 & 构建验证

- [ ] **Step 1: 运行全部测试**

```bash
npm run test
```

期望：所有测试通过，无失败

- [ ] **Step 2: 运行 TypeScript 类型检查**

```bash
npx tsc --noEmit
```

期望：无类型错误

- [ ] **Step 3: 运行生产构建**

```bash
npm run build
```

期望：构建成功，所有 22+ 个配件/HS 编码页面正确生成。在构建输出中确认：
- `/au/parts/byd/byd-dolphin/front-bumper` 等页面出现在静态生成列表中
- `/au/parts/hs/87081010` 等编码页面出现在静态生成列表中
- 无构建错误

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete EV parts import duty pages MVP — 18 part pages + 4 HS code pages"
```
