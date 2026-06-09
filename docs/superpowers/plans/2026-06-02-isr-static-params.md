# ISR + generateStaticParams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `generateStaticParams` to all dynamic route pages so known pages are pre-rendered at build time, with ISR fallback for new content.

**Architecture:** Each page exports `generateStaticParams` that queries the DB for all known slugs/codes, and `dynamicParams = true` so new routes still work without rebuild. Existing `revalidate` values stay, providing background refresh. A shared `lib/db/static-params.ts` file centralises all param-fetching queries to keep pages clean.

**Tech Stack:** Next.js App Router, Drizzle ORM, MySQL (mf_nv_* tables)

---

## Current State

- 4 active markets: `au`, `no`, `uae`, `uk`
- 8 models in DB
- 4,576 DTC model+code combinations (the biggest route)
- 0 software update versions, 0 dealer records (dynamic-only for now)

## Pages to update

| File | Route | Params needed |
|------|-------|---------------|
| `app/[market]/page.tsx` | `/[market]` | markets |
| `app/[market]/models/[slug]/page.tsx` | `/[market]/models/[slug]` | markets × slugs |
| `app/[market]/dtc/[model]/page.tsx` | `/[market]/dtc/[model]` | markets × slugs |
| `app/[market]/dtc/[model]/[code]/page.tsx` | `/[market]/dtc/[model]/[code]` | model+code combos × markets |
| `app/[market]/problems/page.tsx` | `/[market]/problems` | markets |
| `app/[market]/problems/[model]/page.tsx` | `/[market]/problems/[model]` | markets × slugs |
| `app/[market]/charging/[model]/page.tsx` | `/[market]/charging/[model]` | markets × slugs |
| `app/[market]/service/[model]/page.tsx` | `/[market]/service/[model]` | markets × slugs |
| `app/[market]/updates/[model]/page.tsx` | `/[market]/updates/[model]` | markets × slugs |
| `app/[market]/dealers/[brand]/[state]/page.tsx` | `/[market]/dealers/[brand]/[state]` | DB dealers (empty → skip) |

---

## File Structure

- **Create:** `lib/db/static-params.ts` — all param-fetching helpers used by `generateStaticParams`
- **Modify:** each of the 10 page files above — add `generateStaticParams` + `export const dynamicParams = true`

---

### Task 1: Create `lib/db/static-params.ts`

**Files:**
- Create: `lib/db/static-params.ts`

- [ ] **Step 1: Create the file with all helpers**

```ts
import { db } from './index'
import { markets, models, dtcs, dtcModelNotes, dealers } from './schema'
import { eq } from 'drizzle-orm'

export async function getActiveMarketCodes(): Promise<string[]> {
  const rows = await db
    .select({ market_code: markets.market_code })
    .from(markets)
    .where(eq(markets.active, true))
  return rows.map((r) => r.market_code)
}

export async function getAllSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: models.slug }).from(models)
  return rows.map((r) => r.slug)
}

/** Returns all unique { slug, dtc_code } pairs across all models */
export async function getAllDtcModelCodePairs(): Promise<{ slug: string; code: string }[]> {
  const rows = await db
    .select({
      slug: models.slug,
      dtc_code: dtcs.dtc_code,
    })
    .from(dtcModelNotes)
    .innerJoin(dtcs, eq(dtcModelNotes.dtc_id, dtcs.dtc_id))
    .innerJoin(models, eq(dtcModelNotes.model_id, models.model_id))
  // deduplicate
  const seen = new Set<string>()
  return rows.filter((r) => {
    const key = `${r.slug}:${r.dtc_code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Returns all unique { brand_id, state_province, market_code } from dealers table */
export async function getDealerStaticParams(): Promise<{ brand: string; state: string; market: string }[]> {
  const rows = await db
    .select({
      brand_id: dealers.brand_id,
      state_province: dealers.state_province,
      market_code: dealers.market_code,
    })
    .from(dealers)
  const seen = new Set<string>()
  return rows
    .filter((r) => r.brand_id && r.state_province && r.market_code)
    .filter((r) => {
      const key = `${r.brand_id}:${r.state_province}:${r.market_code}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((r) => ({ brand: r.brand_id!, state: r.state_province!, market: r.market_code! }))
}
```

- [ ] **Step 2: Verify it compiles (no test needed, just type-check)**

```bash
cd /Users/zqr/trunk/ev-aftermarket
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors relating to `lib/db/static-params.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/db/static-params.ts
git commit -m "feat: add static-params DB helpers for generateStaticParams"
```

---

### Task 2: Add `generateStaticParams` to market home page

**Files:**
- Modify: `app/[market]/page.tsx`

- [ ] **Step 1: Add the export after the imports**

In `app/[market]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const codes = await getActiveMarketCodes()
  return codes.map((market) => ({ market }))
}
```

- [ ] **Step 2: Verify dev server still compiles**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/[market]/page.tsx
git commit -m "feat: generateStaticParams for market home page"
```

---

### Task 3: Add `generateStaticParams` to model detail page

**Files:**
- Modify: `app/[market]/models/[slug]/page.tsx`

- [ ] **Step 1: Add the export**

In `app/[market]/models/[slug]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((slug) => ({ market, slug })))
}
```

- [ ] **Step 2: Verify**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/models/byd-atto-3
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/[market]/models/[slug]/page.tsx
git commit -m "feat: generateStaticParams for model detail page"
```

---

### Task 4: Add `generateStaticParams` to DTC model list page

**Files:**
- Modify: `app/[market]/dtc/[model]/page.tsx`

- [ ] **Step 1: Add the export**

In `app/[market]/dtc/[model]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}
```

- [ ] **Step 2: Verify**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/dtc/byd-atto-3
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/[market]/dtc/[model]/page.tsx
git commit -m "feat: generateStaticParams for DTC model list page"
```

---

### Task 5: Add `generateStaticParams` to DTC detail page

**Files:**
- Modify: `app/[market]/dtc/[model]/[code]/page.tsx`

This is the biggest route: 4,576 model+code pairs × 4 markets = ~18,304 pages at build time.

- [ ] **Step 1: Add the export**

In `app/[market]/dtc/[model]/[code]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes, getAllDtcModelCodePairs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, pairs] = await Promise.all([getActiveMarketCodes(), getAllDtcModelCodePairs()])
  return markets.flatMap((market) =>
    pairs.map((p) => ({
      market,
      model: p.slug,
      code: p.dtc_code.toLowerCase(),
    }))
  )
}
```

- [ ] **Step 2: Verify one DTC detail page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/dtc/byd-atto-3/b1108
```

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add app/[market]/dtc/[model]/[code]/page.tsx
git commit -m "feat: generateStaticParams for DTC detail page"
```

---

### Task 6: Add `generateStaticParams` to problems pages

**Files:**
- Modify: `app/[market]/problems/page.tsx`
- Modify: `app/[market]/problems/[model]/page.tsx`

- [ ] **Step 1: Update problems index page**

In `app/[market]/problems/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const codes = await getActiveMarketCodes()
  return codes.map((market) => ({ market }))
}
```

- [ ] **Step 2: Update problems model page**

In `app/[market]/problems/[model]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}
```

- [ ] **Step 3: Verify**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/problems
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/problems/byd-atto-3
```

Expected: both `200`

- [ ] **Step 4: Commit**

```bash
git add app/[market]/problems/page.tsx app/[market]/problems/[model]/page.tsx
git commit -m "feat: generateStaticParams for problems pages"
```

---

### Task 7: Add `generateStaticParams` to charging, service, and updates pages

**Files:**
- Modify: `app/[market]/charging/[model]/page.tsx`
- Modify: `app/[market]/service/[model]/page.tsx`
- Modify: `app/[market]/updates/[model]/page.tsx`

All three follow the same pattern: markets × slugs.

- [ ] **Step 1: Update charging page**

In `app/[market]/charging/[model]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}
```

- [ ] **Step 2: Update service page**

In `app/[market]/service/[model]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}
```

- [ ] **Step 3: Update updates page**

In `app/[market]/updates/[model]/page.tsx`, add after the existing imports:

```ts
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}
```

- [ ] **Step 4: Verify**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/charging/byd-atto-3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/service/byd-atto-3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/updates/byd-atto-3
```

Expected: all `200`

- [ ] **Step 5: Commit**

```bash
git add app/[market]/charging/[model]/page.tsx app/[market]/service/[model]/page.tsx app/[market]/updates/[model]/page.tsx
git commit -m "feat: generateStaticParams for charging, service, updates pages"
```

---

### Task 8: Add `generateStaticParams` to dealers page

**Files:**
- Modify: `app/[market]/dealers/[brand]/[state]/page.tsx`

Dealer DB is currently empty, so `generateStaticParams` returns `[]` — all requests fall through to dynamic rendering. This is correct: `dynamicParams = true` ensures the page still works.

- [ ] **Step 1: Add the export**

In `app/[market]/dealers/[brand]/[state]/page.tsx`, add after the existing imports:

```ts
import { getDealerStaticParams } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const params = await getDealerStaticParams()
  return params.map((p) => ({ market: p.market, brand: p.brand, state: p.state }))
}
```

- [ ] **Step 2: Verify**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/au/dealers/byd/nsw
```

Expected: `200` (dynamic fallback)

- [ ] **Step 3: Commit**

```bash
git add app/[market]/dealers/[brand]/[state]/page.tsx
git commit -m "feat: generateStaticParams for dealers page"
```

---

### Task 9: Verify full build works

- [ ] **Step 1: Run production build**

```bash
cd /Users/zqr/trunk/ev-aftermarket
pnpm build 2>&1 | tail -40
```

Expected: build completes, output shows pre-rendered page counts. Look for lines like:
```
○ /au
● /au/dtc/byd-atto-3  (ISR: 3600s)
```

- [ ] **Step 2: Check for any generateStaticParams errors**

```bash
pnpm build 2>&1 | grep -i "error\|warn" | head -20
```

Expected: no errors related to generateStaticParams or DB connections.
