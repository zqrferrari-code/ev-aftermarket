# Home Page Design Spec

**Goal:** Build a public-facing market home page at `/home/[market]` that replaces `/[market]` as the user entry point, featuring a feature grid with expandable model panels and an integrated parts entry point.

**Architecture:** New `app/home/[market]/page.tsx` (Server Component) with an embedded `FeatureGrid` Client Component for interactivity. Existing `/[market]` and `/` routes redirect to `/home/[market]`. Data fetched server-side and passed as props to the client component.

**Tech Stack:** Next.js App Router, Server Components + Client Components, existing CSS design system (`page-wrapper`, `dtc-card`, `list-hero`, `dtc-list`, `dtc-row`), existing DB functions (`getAllModelsWithBrand`, `getDTCNoteCount`, `getProblemCasesCount`, `getAllPartSlugsForModel`).

---

## Routes

| Route | Behaviour |
|---|---|
| `/home/[market]` | New home page (this spec) |
| `/home/au` | AU market home — only market in scope |
| `/` | 301 redirect → `/home/au` (replace existing redirect) |
| `/au` | 301 redirect → `/home/au` (replace existing market page) |
| `/dev` | Unchanged — internal dev portal, noindex |

`generateStaticParams` returns `[{ market: 'au' }]` for now.

---

## Page Structure

```
page-wrapper
└── dtc-card
    ├── Hero section
    ├── FeatureGrid (Client Component)
    │   ├── 2×2 feature cards (interactive)
    │   └── Expanded panel (slides open below grid)
    ├── Model list (Server-rendered)
    │   ├── Brand section header (BYD)
    │   │   └── Model rows → /home/au/models/[slug] (future) or /au/models/[slug]
    │   └── Brand section header (MG)
    │       └── Model rows
    └── Secondary links strip
```

---

## Hero Section

Static, server-rendered. Matches existing `list-hero` pattern.

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

## FeatureGrid Component

**File:** `components/home/FeatureGrid.tsx`
**Type:** `'use client'`

### Props

```ts
interface FeatureGridProps {
  market: string
  models: { model_id: string; model_name: string; brand_id: string; slug: string }[]
  parts: { slug: string; name_en: string }[]  // all parts (for Parts panel)
}
```

### Features (4 cards)

| Key | Label | Icon | Expanded panel |
|---|---|---|---|
| `dtc` | Fault Codes | 🔧 | Model list → `/[market]/dtc/[model]` |
| `problems` | Problems | ⚠️ | Model list → `/[market]/problems/[model]` |
| `parts` | Parts | 🔩 | Two-column: By Model + By Part Type |
| `charging` | Charging | ⚡ | Model list → `/[market]/charging/[model]` |

### State

```ts
const [active, setActive] = useState<string | null>(null)
// clicking active card again collapses panel
```

### Layout

```
┌─────────────────┬─────────────────┐
│  🔧 Fault Codes │  ⚠️ Problems    │
├─────────────────┼─────────────────┤
│  🔩 Parts       │  ⚡ Charging    │
└─────────────────┴─────────────────┘
┌─────────────────────────────────────┐  ← slides open when active !== null
│  Expanded panel (content varies)    │
└─────────────────────────────────────┘
```

Active card gets green border (`2px solid var(--green)`). Panel appears immediately below the grid (no animation required — simple conditional render).

### Expanded Panel — Default (Fault Codes / Problems / Charging)

```
SECTION LABEL: "Select model → [Feature Name]"
[Model row] BYD Atto 3  →
[Model row] BYD Dolphin →
[Model row] BYD Seal 6 EV →
[Model row] MG MG4 →
...
```

Each row is an `<a>` linking to the appropriate feature URL for that model.

### Expanded Panel — Parts

Two-column layout:

```
┌──────────────────┬──────────────────┐
│ BY MODEL         │ BY PART TYPE     │
│ BYD Atto 3    →  │ Front Bumper  →  │
│ BYD Dolphin   →  │ Headlights    →  │
│ BYD Seal 6 EV →  │ Tail Lights   →  │
│                  │ View all parts ↗ │
└──────────────────┴──────────────────┘
```

- By Model links → `/[market]/parts/byd/[model_id]`
- By Part Type links → `/[market]/parts/byd/[model_id]/[part_slug]` — use first compatible model (BYD Atto 3) as default target, since parts are cross-model
- "View all parts" → `/[market]/parts`

Part list is the `parts` prop (all parts from DB, typically 6 items). Show all of them — no truncation needed at current scale.

---

## Model List (below FeatureGrid)

Server-rendered. Reuses existing `dtc-list` / `dtc-row` CSS classes. Grouped by brand.

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

Model rows link to `/[market]/models/[slug]` (existing model detail page).

---

## Secondary Links Strip

Below the model list. Compact pill links for less-visited sections.

```
🏪 Find a Dealer  |  🔄 Updates  |  ⚠️ Warning Lights  |  📖 Buying Guide  |  🔧 Service
```

AU market only (same market-gate as existing `/au` page). Links:
- Dealers → `/au/dealers/byd/nsw` (existing)
- Warning Lights → `/au/warnings/byd` (existing)
- Buying Guide → `/au/buying-guide` (existing)
- Updates and Service → model-specific, so link to BYD Atto 3 as default entry

---

## Data Fetching

All fetched in the Server Component, passed as props:

```ts
const [models, dtcCount, casesCount, parts] = await Promise.all([
  getAllModelsWithBrand(),
  getDTCNoteCount(),
  getProblemCasesCount(),
  getPartsForHome(),  // new helper — fetches all parts (slug, name_en)
])
```

**New DB helper** in `lib/db/parts.ts`:

```ts
export async function getPartsForHome(): Promise<{ slug: string; name_en: string }[]> {
  const { data } = await sb.from('mf_parts').select('slug, name_en').order('id')
  return data ?? []
}
```

---

## Redirects

Update two existing files:

1. **`app/page.tsx`** — change `redirect('/au')` → `redirect('/home/au')`
2. **`app/[market]/page.tsx`** — change entire page to `redirect('/home/au')` (market-agnostic for now since only AU exists)

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

## Files

| Action | Path |
|---|---|
| Create | `app/home/[market]/page.tsx` |
| Create | `components/home/FeatureGrid.tsx` |
| Modify | `lib/db/parts.ts` — add `getPartsForHome()` |
| Modify | `app/page.tsx` — update redirect target |
| Modify | `app/[market]/page.tsx` — replace with redirect |

No new CSS needed — all existing classes apply.

---

## Out of Scope

- Market switcher (only AU exists)
- Search / filter functionality
- Animations on panel expand
- `/home/[market]` pages for non-AU markets
