# 首页设计实现计划

> **给自动化执行者：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务执行此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 新建 `/home/[market]` 页面，包含 2×2 交互式功能卡片网格，并将现有 `/` 和 `/[market]` 路由重定向到该页面。

**架构：** `app/home/[market]/page.tsx` 是 Server Component，负责数据获取并将数据作为 props 传给 `FeatureGrid`（`'use client'` 组件）。`FeatureGrid` 渲染四张卡片，点击某张卡片时在网格下方展开面板。现有根路由和市场路由更新为 301 重定向到 `/home/au`。

**技术栈：** Next.js 15 App Router、Server Components + Client Components、现有 CSS 类（`page-wrapper`、`dtc-card`、`list-hero`、`dtc-list`、`dtc-row`、`section-label`）、`lib/db/` 中的现有数据库辅助函数。

---

## 文件清单

| 操作 | 路径 | 职责 |
|---|---|---|
| 新增函数 | `lib/db/parts.ts` | `getPartsForHome()` — 查询所有配件的 slug 和 name_en |
| 新建 | `components/home/FeatureGrid.tsx` | `'use client'` — 2×2 卡片网格 + 展开面板 |
| 新建 | `app/home/[market]/page.tsx` | Server Component — 数据获取、SEO 元数据、页面布局 |
| 修改 | `app/page.tsx` | 将重定向目标从 `/au` 改为 `/home/au` |
| 修改 | `app/[market]/page.tsx` | 整个页面替换为重定向到 `/home/au` |

---

## 任务 1：在 `lib/db/parts.ts` 中新增 `getPartsForHome`

**文件：**
- 修改：`lib/db/parts.ts`

- [ ] **步骤 1：在 `lib/db/parts.ts` 末尾追加函数**

在文件末尾（`getAllHsCodesForSitemap` 之后）追加：

```ts
export async function getPartsForHome(): Promise<{ slug: string; name_en: string }[]> {
  const { data } = await sb.from('mf_parts').select('slug, name_en').order('id')
  return data ?? []
}
```

- [ ] **步骤 2：验证 TypeScript 编译通过**

运行：`npx tsc --noEmit`
预期：无与 `getPartsForHome` 相关的报错

- [ ] **步骤 3：提交**

```bash
git add lib/db/parts.ts
git commit -m "feat: add getPartsForHome DB helper"
```

---

## 任务 2：创建 `FeatureGrid` 客户端组件

**文件：**
- 新建：`components/home/FeatureGrid.tsx`

- [ ] **步骤 1：创建文件**

新建 `components/home/FeatureGrid.tsx`：

```tsx
'use client'

import { useState } from 'react'

interface Model {
  model_id: string
  model_name: string
  brand_id: string
  slug: string
}

interface Part {
  slug: string
  name_en: string
}

export interface FeatureGridProps {
  market: string
  models: Model[]
  parts: Part[]
}

const FEATURES = [
  { key: 'dtc', label: 'Fault Codes', icon: '🔧' },
  { key: 'problems', label: 'Problems', icon: '⚠️' },
  { key: 'parts', label: 'Parts', icon: '🔩' },
  { key: 'charging', label: 'Charging', icon: '⚡' },
] as const

type FeatureKey = (typeof FEATURES)[number]['key']

export default function FeatureGrid({ market, models, parts }: FeatureGridProps) {
  const [active, setActive] = useState<FeatureKey | null>(null)

  function handleCardClick(key: FeatureKey) {
    setActive((prev) => (prev === key ? null : key))
  }

  return (
    <div style={{ padding: '0 0 4px' }}>
      {/* 2×2 网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        background: 'var(--border)',
        borderTop: '1px solid var(--border)',
      }}>
        {FEATURES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => handleCardClick(key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              padding: '16px 20px',
              background: active === key ? 'oklch(97% 0.015 145)' : 'var(--card-bg, #fff)',
              border: 'none',
              borderBottom: active === key ? '2px solid var(--green)' : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: '72px',
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-cond)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: active === key ? 'var(--green-text)' : 'oklch(30% 0.01 60)',
            }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* 展开面板 */}
      {active !== null && (
        <div style={{
          borderTop: '1px solid var(--border-soft)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          {active === 'parts' ? (
            <PartsPanel market={market} models={models} parts={parts} />
          ) : (
            <ModelListPanel market={market} models={models} feature={active} />
          )}
        </div>
      )}
    </div>
  )
}

function ModelListPanel({
  market,
  models,
  feature,
}: {
  market: string
  models: Model[]
  feature: 'dtc' | 'problems' | 'charging'
}) {
  const LABEL: Record<typeof feature, string> = {
    dtc: 'Fault Codes',
    problems: 'Problems',
    charging: 'Charging',
  }

  return (
    <div>
      <div style={{
        padding: '8px 20px',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'var(--font-cond)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border-soft)',
      }}>
        Select model → {LABEL[feature]}
      </div>
      <ul className="dtc-list" style={{ margin: 0 }}>
        {models.map((m) => (
          <li key={m.model_id}>
            <a href={`/${market}/${feature}/${m.slug}`} className="dtc-row">
              <div className="dtc-row-top">
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.model_name}</span>
                <span className="dtc-arrow">›</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PartsPanel({
  market,
  models,
  parts,
}: {
  market: string
  models: Model[]
  parts: Part[]
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' }}>
      {/* 按车型列 */}
      <div style={{ background: 'var(--card-bg, #fff)' }}>
        <div style={{
          padding: '8px 16px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-cond)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          按车型
        </div>
        <ul className="dtc-list" style={{ margin: 0 }}>
          {models.map((m) => (
            <li key={m.model_id}>
              <a href={`/${market}/parts/${m.brand_id}/${m.model_id}`} className="dtc-row">
                <div className="dtc-row-top">
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{m.model_name}</span>
                  <span className="dtc-arrow">›</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* 按配件类型列 */}
      <div style={{ background: 'var(--card-bg, #fff)' }}>
        <div style={{
          padding: '8px 16px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-cond)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          按配件类型
        </div>
        <ul className="dtc-list" style={{ margin: 0 }}>
          {parts.map((p) => (
            <li key={p.slug}>
              <a href={`/${market}/parts/byd/byd-atto-3/${p.slug}`} className="dtc-row">
                <div className="dtc-row-top">
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{p.name_en}</span>
                  <span className="dtc-arrow">›</span>
                </div>
              </a>
            </li>
          ))}
          <li>
            <a href={`/${market}/parts`} className="dtc-row">
              <div className="dtc-row-top">
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--green-text)' }}>
                  查看全部配件 ↗
                </span>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **步骤 2：验证 TypeScript 编译通过**

运行：`npx tsc --noEmit`
预期：`components/home/FeatureGrid.tsx` 无报错

- [ ] **步骤 3：提交**

```bash
git add components/home/FeatureGrid.tsx
git commit -m "feat: add FeatureGrid client component"
```

---

## 任务 3：创建 `app/home/[market]/page.tsx`

**文件：**
- 新建：`app/home/[market]/page.tsx`

- [ ] **步骤 1：创建页面文件**

新建 `app/home/[market]/page.tsx`：

```tsx
import type { Metadata } from 'next'
import { getAllModelsWithBrand } from '@/lib/db/models'
import { getDTCNoteCount } from '@/lib/db/dtcs'
import { getProblemCasesCount } from '@/lib/db/cases'
import { getPartsForHome } from '@/lib/db/parts'
import { BASE_URL } from '@/lib/config'
import FeatureGrid from '@/components/home/FeatureGrid'

export async function generateStaticParams() {
  return [{ market: 'au' }]
}

interface Props {
  params: Promise<{ market: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params
  const title = 'Chinese EV Fault Codes, Problems & Parts — Australia'
  const description =
    'Fault code lookup, owner problem reports, import duty for parts, charging guides and service costs for BYD, MG and other Chinese EVs in Australia.'
  const url = `${BASE_URL}/home/au`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'EVAftermarket',
      locale: 'en_AU',
      type: 'website',
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function HomeMarketPage({ params }: Props) {
  const { market } = await params

  const [models, dtcCount, casesCount, parts] = await Promise.all([
    getAllModelsWithBrand(),
    getDTCNoteCount(),
    getProblemCasesCount(),
    getPartsForHome(),
  ])

  // 按品牌分组
  const brandGroups: Record<string, typeof models> = {}
  for (const m of models) {
    const brand = m.brand_name_en ?? 'Other'
    if (!brandGroups[brand]) brandGroups[brand] = []
    brandGroups[brand].push(m)
  }

  const featureModels = models.map((m) => ({
    model_id: m.model_id,
    model_name: m.model_name,
    brand_id: m.brand_id,
    slug: m.slug,
  }))

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Hero */}
        <div className="list-hero">
          <h1>Chinese EV Resource — Australia</h1>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '56ch' }}>
            Fault codes · Problems · Parts · Guides for BYD, MG and other Chinese EVs
          </p>
          <div className="list-stats">
            <div className="stat">
              <span className="stat-num">{dtcCount.toLocaleString()}</span>
              <span className="stat-label">Fault Codes</span>
            </div>
            <div className="stat">
              <span className="stat-num">{models.length}</span>
              <span className="stat-label">Models</span>
            </div>
            <div className="stat">
              <span className="stat-num">{casesCount}</span>
              <span className="stat-label">Owner Reports</span>
            </div>
            <div className="stat">
              <span className="stat-num">AU</span>
              <span className="stat-label">Market</span>
            </div>
          </div>
        </div>

        {/* 功能卡片网格（交互） */}
        <FeatureGrid market={market} models={featureModels} parts={parts} />

        {/* 车型列表，按品牌分组 */}
        {Object.entries(brandGroups).map(([brandName, brandModels]) => (
          <div key={brandName}>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">{brandName}</span>
            </div>
            <ul className="dtc-list">
              {brandModels.map((m) => (
                <li key={m.model_id}>
                  <a href={`/${market}/models/${m.slug}`} className="dtc-row">
                    <div className="dtc-row-top">
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.model_name}</span>
                      {m.years && <span className="dtc-desc-cell">{m.years}</span>}
                      <span className="dtc-arrow">›</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* 次级链接栏 — 仅 AU 市场 */}
        {market === 'au' && (
          <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-soft)' }}>
            {[
              { label: '🏪 Find a Dealer', href: '/au/dealers/byd/nsw' },
              { label: '🔄 Updates', href: '/au/updates/byd-atto-3' },
              { label: '⚠️ Warning Lights', href: '/au/warnings/byd' },
              { label: '📖 Buying Guide', href: '/au/buying-guide' },
              { label: '🔧 Service', href: '/au/service/byd-atto-3' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-cond)',
                  letterSpacing: '0.06em',
                  textDecoration: 'none',
                  color: 'oklch(36% 0.01 60)',
                  background: 'oklch(99% 0 0)',
                }}
              >
                {label}
              </a>
            ))}
          </div>
        )}

      </article>
    </div>
  )
}
```

- [ ] **步骤 2：验证 TypeScript 编译通过**

运行：`npx tsc --noEmit`
预期：`app/home/[market]/page.tsx` 无报错

- [ ] **步骤 3：启动开发服务器，验证页面正常渲染**

运行：`npm run dev`
打开 `http://localhost:3000/home/au`，确认：
- Hero 区域显示"Chinese EV Resource — Australia"及 4 个统计数字
- 2×2 功能卡片网格可见
- 网格下方按品牌分组显示车型列表（BYD、MG）
- 页面底部显示次级链接栏

- [ ] **步骤 4：提交**

```bash
git add app/home/ components/home/
git commit -m "feat: add /home/[market] page with FeatureGrid"
```

---

## 任务 4：更新重定向

**文件：**
- 修改：`app/page.tsx`
- 修改：`app/[market]/page.tsx`

- [ ] **步骤 1：更新 `app/page.tsx`**

当前内容：
```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/au");
}
```

替换为：
```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/home/au");
}
```

- [ ] **步骤 2：将 `app/[market]/page.tsx` 替换为重定向**

当前文件是完整的市场首页（含元数据、数据获取、JSX）。将整个文件内容替换为：

```tsx
import { redirect } from 'next/navigation'

export function generateStaticParams() {
  return [{ market: 'au' }]
}

export default function MarketHomePage() {
  redirect('/home/au')
}
```

- [ ] **步骤 3：验证 TypeScript 编译通过**

运行：`npx tsc --noEmit`
预期：无报错

- [ ] **步骤 4：验证开发服务器中的重定向**

开发服务器运行中：
- 打开 `http://localhost:3000/` — 应重定向到 `/home/au`
- 打开 `http://localhost:3000/au` — 应重定向到 `/home/au`

- [ ] **步骤 5：提交**

```bash
git add app/page.tsx app/[market]/page.tsx
git commit -m "feat: redirect / and /[market] to /home/au"
```

---

## 任务 5：验证 FeatureGrid 交互行为

**文件：**（仅验证，无代码改动）

- [ ] **步骤 1：测试 Fault Codes 卡片**

开发服务器运行中，打开 `http://localhost:3000/home/au`：
- 点击"🔧 Fault Codes"卡片
- 预期：网格下方展开面板，显示"Select model → Fault Codes"标题和车型链接列表
- 每条链接应指向 `/au/dtc/[model-slug]`

- [ ] **步骤 2：测试收起**

- 再次点击已激活的"🔧 Fault Codes"卡片
- 预期：面板收起

- [ ] **步骤 3：测试 Problems 卡片**

- 点击"⚠️ Problems"卡片
- 预期：面板显示车型链接，指向 `/au/problems/[model-slug]`

- [ ] **步骤 4：测试 Parts 卡片**

- 点击"🔩 Parts"卡片
- 预期：双列面板 — 左列"按车型"链接指向 `/au/parts/[brand_id]/[model_id]`，右列"按配件类型"链接指向 `/au/parts/byd/byd-atto-3/[part-slug]`，底部有"查看全部配件 ↗"链接指向 `/au/parts`

- [ ] **步骤 5：测试 Charging 卡片**

- 点击"⚡ Charging"卡片
- 预期：面板显示车型链接，指向 `/au/charging/[model-slug]`

- [ ] **步骤 6：测试卡片切换**

- 某张卡片已激活时，点击另一张卡片
- 预期：新卡片激活，旧卡片取消激活，面板内容更新，无动画

---

## 规格覆盖检查

| 规格要求 | 对应任务 |
|---|---|
| `/home/[market]` 路由 | 任务 3 |
| `generateStaticParams` 返回 `[{ market: 'au' }]` | 任务 3 步骤 1 |
| `/` 重定向 → `/home/au` | 任务 4 步骤 1 |
| `/au` 重定向 → `/home/au` | 任务 4 步骤 2 |
| Hero 含 dtcCount、modelCount、casesCount、"AU" 统计 | 任务 3 步骤 1 |
| 2×2 FeatureGrid（Fault Codes / Problems / Parts / Charging） | 任务 2 步骤 1 |
| 激活卡片绿色边框 | 任务 2 步骤 1（绿色 borderBottom） |
| 再次点击收起 | 任务 2 步骤 1（`setActive` 切换逻辑） |
| 默认展开面板（dtc/problems/charging）→ 车型列表 | 任务 2 步骤 1 `ModelListPanel` |
| Parts 面板 — 按车型列 | 任务 2 步骤 1 `PartsPanel` |
| Parts 面板 — 按配件类型列，默认 BYD Atto 3 | 任务 2 步骤 1 `PartsPanel` |
| Parts 面板 — "查看全部配件"链接 | 任务 2 步骤 1 |
| FeatureGrid 下方车型列表，按品牌分组 | 任务 3 步骤 1 |
| 车型行链接到 `/[market]/models/[slug]` | 任务 3 步骤 1 |
| 次级链接栏（仅 AU） | 任务 3 步骤 1 |
| SEO 元数据，canonical URL 为 `/home/au` | 任务 3 步骤 1 `generateMetadata` |
| `getPartsForHome` 数据库辅助函数 | 任务 1 步骤 1 |
| 不新增 CSS | 所有任务均只使用现有类 |
