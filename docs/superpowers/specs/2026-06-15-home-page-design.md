# 首页设计规格

**目标：** 在 `/home/[market]` 创建面向用户的市场首页，替代现有的 `/[market]` 作为用户入口。包含功能卡片网格（点击展开车型列表）和配件入口。

**架构：** 新建 `app/home/[market]/page.tsx`（Server Component），内嵌 `FeatureGrid` Client Component 处理交互。现有的 `/[market]` 和 `/` 路由重定向到 `/home/[market]`。数据在服务端获取后作为 props 传给客户端组件。

**技术栈：** Next.js App Router、Server Components + Client Components、现有 CSS 设计系统（`page-wrapper`、`dtc-card`、`list-hero`、`dtc-list`、`dtc-row`）、现有数据库函数。

---

## 路由规划

| 路由 | 行为 |
|---|---|
| `/home/[market]` | 新首页（本规格） |
| `/home/au` | 澳大利亚市场首页，目前唯一市场 |
| `/` | 301 重定向 → `/home/au` |
| `/au` | 301 重定向 → `/home/au` |
| `/dev` | 不变，内部开发用，noindex |

`generateStaticParams` 暂时只返回 `[{ market: 'au' }]`。

---

## 页面结构

```
page-wrapper
└── dtc-card
    ├── Hero 区域（统计数字）
    ├── FeatureGrid（Client Component，可交互）
    │   ├── 2×2 功能卡片
    │   └── 展开面板（在 grid 下方条件渲染）
    ├── 车型列表（服务端渲染）
    │   ├── 品牌分组标题（BYD）
    │   │   └── 车型行 → /au/models/[slug]
    │   └── 品牌分组标题（MG）
    │       └── 车型行
    └── 次级链接栏
```

---

## Hero 区域

静态，服务端渲染，使用现有 `list-hero` 样式。

```tsx
<div className="list-hero">
  <h1>Chinese EV Resource — Australia</h1>
  <p>Fault codes · Problems · Parts · Guides for BYD, MG and other Chinese EVs</p>
  <div className="list-stats">
    <div className="stat"><span className="stat-num">{dtcCount.toLocaleString()}</span><span className="stat-label">Fault Codes</span></div>
    <div className="stat"><span className="stat-num">{modelCount}</span><span className="stat-label">Models</span></div>
    <div className="stat"><span className="stat-num">{casesCount}</span><span className="stat-label">Owner Reports</span></div>
    <div className="stat"><span className="stat-num">AU</span><span className="stat-label">Market</span></div>
  </div>
</div>
```

---

## FeatureGrid 组件

**文件：** `components/home/FeatureGrid.tsx`
**类型：** `'use client'`

### Props

```ts
interface FeatureGridProps {
  market: string
  models: { model_id: string; model_name: string; brand_id: string; slug: string }[]
  parts: { slug: string; name_en: string }[]
}
```

### 四个功能卡片

| key | 标签 | 图标 | 展开内容 |
|---|---|---|---|
| `dtc` | Fault Codes | 🔧 | 车型列表 → `/[market]/dtc/[model]` |
| `problems` | Problems | ⚠️ | 车型列表 → `/[market]/problems/[model]` |
| `parts` | Parts | 🔩 | 双列面板：按车型 + 按配件类型 |
| `charging` | Charging | ⚡ | 车型列表 → `/[market]/charging/[model]` |

### 状态管理

```ts
const [active, setActive] = useState<string | null>(null)
// 再次点击已激活的卡片，收起面板
```

### 布局

```
┌─────────────────┬─────────────────┐
│  🔧 Fault Codes │  ⚠️ Problems    │
├─────────────────┼─────────────────┤
│  🔩 Parts       │  ⚡ Charging    │
└─────────────────┴─────────────────┘
┌─────────────────────────────────────┐  ← active !== null 时渲染
│  展开面板（内容根据 active 变化）     │
└─────────────────────────────────────┘
```

激活的卡片加绿色边框（`2px solid var(--green)`）。面板无动画，直接条件渲染。

### 展开面板 — 默认（Fault Codes / Problems / Charging）

```
SECTION LABEL: "Select model → [功能名称]"
[车型行] BYD Atto 3       →
[车型行] BYD Dolphin      →
[车型行] BYD Seal 6 EV    →
[车型行] MG MG4           →
...
```

每行是 `<a>` 链接，指向对应功能的车型页面。

### 展开面板 — Parts（双列布局）

```
┌──────────────────┬──────────────────┐
│ 按车型           │ 按配件类型        │
│ BYD Atto 3    →  │ Front Bumper  →  │
│ BYD Dolphin   →  │ Headlights    →  │
│ BYD Seal 6 EV →  │ Tail Lights   →  │
│                  │ 查看全部配件 ↗   │
└──────────────────┴──────────────────┘
```

- 按车型链接 → `/[market]/parts/byd/[model_id]`
- 按配件类型链接 → `/[market]/parts/byd/byd-atto-3/[part_slug]`（默认用 BYD Atto 3 作为入口，因为配件跨车型兼容）
- "查看全部配件" → `/[market]/parts`

配件列表来自 `parts` prop（目前约 6 条），全部显示，无需截断。

---

## 车型列表

服务端渲染，复用 `dtc-list` / `dtc-row` CSS 类，按品牌分组。

```tsx
{Object.entries(brandGroups).map(([brandName, brandModels]) => (
  <>
    <div className="section-label-row">{brandName}</div>
    <ul className="dtc-list">
      {brandModels.map(m => (
        <li key={m.model_id}>
          <a href={`/${market}/models/${m.slug}`} className="dtc-row">
            <div className="dtc-row-top">
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.model_name}</span>
              {m.years && <span className="dtc-desc-cell">{m.years}</span>}
            </div>
            <span className="dtc-arrow">›</span>
          </a>
        </li>
      ))}
    </ul>
  </>
))}
```

车型行链接到 `/[market]/models/[slug]`（现有车型详情页）。

---

## 次级链接栏

车型列表下方，紧凑型 pill 链接，指向访问量较低的功能页。仅 AU 市场显示。

```
🏪 Find a Dealer  ·  🔄 Updates  ·  ⚠️ Warning Lights  ·  📖 Buying Guide  ·  🔧 Service
```

链接目标：
- Dealers → `/au/dealers/byd/nsw`
- Warning Lights → `/au/warnings/byd`
- Buying Guide → `/au/buying-guide`
- Updates → `/au/updates/byd-atto-3`（默认车型）
- Service → `/au/service/byd-atto-3`（默认车型）

---

## 数据获取

全部在 Server Component 中获取，传入 props：

```ts
const [models, dtcCount, casesCount, parts] = await Promise.all([
  getAllModelsWithBrand(),
  getDTCNoteCount(),
  getProblemCasesCount(),
  getPartsForHome(),
])
```

**新增 DB 辅助函数**（`lib/db/parts.ts`）：

```ts
export async function getPartsForHome(): Promise<{ slug: string; name_en: string }[]> {
  const { data } = await sb.from('mf_parts').select('slug, name_en').order('id')
  return data ?? []
}
```

---

## 重定向修改

1. **`app/page.tsx`** — 将 `redirect('/au')` 改为 `redirect('/home/au')`
2. **`app/[market]/page.tsx`** — 整个页面替换为 `redirect('/home/au')`（当前只有 AU 市场）

---

## SEO

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const title = 'Chinese EV Fault Codes, Problems & Parts — Australia'
  const description = 'Fault code lookup, owner problem reports, import duty for parts, charging guides and service costs for BYD, MG and other Chinese EVs in Australia.'
  const url = `${BASE_URL}/home/au`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}
```

---

## 涉及文件

| 操作 | 路径 |
|---|---|
| 新建 | `app/home/[market]/page.tsx` |
| 新建 | `components/home/FeatureGrid.tsx` |
| 修改 | `lib/db/parts.ts` — 新增 `getPartsForHome()` |
| 修改 | `app/page.tsx` — 更新重定向目标 |
| 修改 | `app/[market]/page.tsx` — 替换为重定向 |

无需新增 CSS，全部复用现有 class。

---

## 不在范围内

- 市场切换器（目前只有 AU）
- 搜索 / 筛选功能
- 展开动画
- 非 AU 市场的 `/home/[market]` 页面
