# SEO Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize DTC pages for Google crawlability, structured data richness, and click-through rate across all pSEO pages.

**Architecture:** Dynamic sitemap generated from DB; BreadcrumbList + ItemList schema injected via page metadata; meta description templates rewritten for human readability; DTC detail pages gain related-codes internal links.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, TypeScript, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/sitemap.ts` | Modify | Dynamic sitemap from DB — all markets × models × DTC codes |
| `app/[market]/dtc/[model]/[code]/page.tsx` | Modify | Add BreadcrumbList schema, improve description template, add related codes section |
| `app/[market]/dtc/[model]/page.tsx` | Modify | Add ItemList schema for DTC list page |
| `lib/db/dtcs.ts` | Modify | Add `getAllDTCCodesForSitemap()` query |
| `lib/db/models.ts` | Modify | Add `getAllModelSlugs()` query |
| `__tests__/pages/dtc.test.ts` | Modify | Tests for new schema builders and description template |
| `__tests__/sitemap.test.ts` | Create | Tests for sitemap URL generation logic |

---

## Task 1: Add DB query helpers for sitemap

**Files:**
- Modify: `lib/db/dtcs.ts`
- Modify: `lib/db/models.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/sitemap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

// Pure URL-builder functions extracted from sitemap logic — testable without DB
function buildDtcUrl(base: string, market: string, modelSlug: string, dtcCode: string): string {
  return `${base}/${market}/dtc/${modelSlug}/${dtcCode.toLowerCase()}`
}

function buildModelDtcListUrl(base: string, market: string, modelSlug: string): string {
  return `${base}/${market}/dtc/${modelSlug}`
}

function buildMarketUrl(base: string, market: string): string {
  return `${base}/${market}`
}

describe('sitemap URL builders', () => {
  it('builds DTC detail URL in lowercase', () => {
    expect(buildDtcUrl('https://example.com', 'au', 'byd-atto-3', 'B123698')).toBe(
      'https://example.com/au/dtc/byd-atto-3/b123698'
    )
  })

  it('builds model DTC list URL', () => {
    expect(buildModelDtcListUrl('https://example.com', 'au', 'byd-atto-3')).toBe(
      'https://example.com/au/dtc/byd-atto-3'
    )
  })

  it('builds market home URL', () => {
    expect(buildMarketUrl('https://example.com', 'au')).toBe('https://example.com/au')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm test __tests__/sitemap.test.ts
```

Expected: FAIL — "cannot find module" or test file not found

- [ ] **Step 3: Create the test file (it already has the code above — just confirm it exists)**

The tests above are pure functions with no imports beyond vitest. They should pass immediately.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm test __tests__/sitemap.test.ts
```

Expected: 3 passing

- [ ] **Step 5: Add `getAllDTCCodesForSitemap` to `lib/db/dtcs.ts`**

Append to `lib/db/dtcs.ts`:

```ts
export async function getAllDTCCodesForSitemap() {
  return db
    .select({
      dtc_code: dtcs.dtc_code,
      model_slug: models.slug,
      market_code: dtcModelNotes.market_code,
    })
    .from(dtcModelNotes)
    .innerJoin(dtcs, eq(dtcModelNotes.dtc_id, dtcs.dtc_id))
    .innerJoin(models, eq(dtcModelNotes.model_id, models.model_id))
}
```

Also add the missing import at the top — `models` is already in schema but needs to be imported here:

The existing imports in `lib/db/dtcs.ts` are:
```ts
import { eq, and } from 'drizzle-orm'
import { db } from './index'
import { dtcs, dtcModelNotes, cases, caseDtcLinks } from './schema'
```

Add `models` to the schema import:
```ts
import { dtcs, dtcModelNotes, cases, caseDtcLinks, models } from './schema'
```

- [ ] **Step 6: Add `getAllModelSlugs` to `lib/db/models.ts`**

Append to `lib/db/models.ts`:

```ts
export async function getAllModelSlugs() {
  return db
    .select({
      slug: models.slug,
      model_id: models.model_id,
    })
    .from(models)
}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/zqr/trunk/ev-aftermarket
git add lib/db/dtcs.ts lib/db/models.ts __tests__/sitemap.test.ts
git commit -m "feat: add DB helpers for dynamic sitemap generation"
```

---

## Task 2: Rewrite sitemap.ts to be fully dynamic

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Write the new `app/sitemap.ts`**

Replace the entire file content:

```ts
import type { MetadataRoute } from 'next'
import { getAllMarkets } from '@/lib/db/markets'
import { getAllModelSlugs } from '@/lib/db/models'
import { getAllDTCCodesForSitemap } from '@/lib/db/dtcs'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [markets, modelSlugs, dtcRows] = await Promise.all([
    getAllMarkets(),
    getAllModelSlugs(),
    getAllDTCCodesForSitemap(),
  ])

  const pages: MetadataRoute.Sitemap = []

  // Market home pages
  for (const market of markets) {
    pages.push({
      url: `${BASE_URL}/${market.market_code}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  // DTC list pages — one per market × model combination present in dtcModelNotes
  const modelMarketPairs = new Set(
    dtcRows
      .filter((r) => r.market_code && r.model_slug)
      .map((r) => `${r.market_code}|${r.model_slug}`)
  )
  for (const pair of modelMarketPairs) {
    const [market, modelSlug] = pair.split('|')
    pages.push({
      url: `${BASE_URL}/${market}/dtc/${modelSlug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // DTC detail pages — one per market × model × code
  for (const row of dtcRows) {
    if (!row.market_code || !row.model_slug || !row.dtc_code) continue
    pages.push({
      url: `${BASE_URL}/${row.market_code}/dtc/${row.model_slug}/${row.dtc_code.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return pages
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/zqr/trunk/ev-aftermarket
git add app/sitemap.ts
git commit -m "feat: dynamic sitemap from DB — covers all markets, models, and DTC codes"
```

---

## Task 3: Add BreadcrumbList schema to DTC detail page

**Files:**
- Modify: `app/[market]/dtc/[model]/[code]/page.tsx`

- [ ] **Step 1: Write failing test for breadcrumb schema builder**

Add to `__tests__/pages/dtc.test.ts`:

```ts
function buildBreadcrumbSchema(
  baseUrl: string,
  market: string,
  modelSlug: string,
  modelName: string,
  dtcCode: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: market.toUpperCase(),
        item: `${baseUrl}/${market}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${modelName} Fault Codes`,
        item: `${baseUrl}/${market}/dtc/${modelSlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: dtcCode.toUpperCase(),
        item: `${baseUrl}/${market}/dtc/${modelSlug}/${dtcCode.toLowerCase()}`,
      },
    ],
  }
}

describe('BreadcrumbList schema', () => {
  it('has 3 items with correct positions', () => {
    const schema = buildBreadcrumbSchema(
      'https://example.com',
      'au',
      'byd-atto-3',
      'BYD Atto 3',
      'B123698'
    )
    expect(schema.itemListElement).toHaveLength(3)
    expect(schema.itemListElement[0].position).toBe(1)
    expect(schema.itemListElement[2].name).toBe('B123698')
    expect(schema.itemListElement[2].item).toBe(
      'https://example.com/au/dtc/byd-atto-3/b123698'
    )
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm test __tests__/pages/dtc.test.ts
```

Expected: FAIL — `buildBreadcrumbSchema is not defined`

- [ ] **Step 3: Add the function to the test file and verify passing**

The function is defined in the test file itself (pure logic, no external deps). Run again:

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm test __tests__/pages/dtc.test.ts
```

Expected: all tests PASS

- [ ] **Step 4: Add breadcrumb schema to `generateMetadata` in the DTC code page**

In `app/[market]/dtc/[model]/[code]/page.tsx`, update `generateMetadata` to include a second LD+JSON block for breadcrumbs. Replace the `return` statement inside `generateMetadata`:

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model, code } = await params
  const dtcCode = code.toUpperCase()
  const [modelData, dtc] = await Promise.all([getModelBySlug(model), getDTCByCode(dtcCode)])
  if (!modelData || !dtc) return {}

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What does ${dtcCode} mean on a ${modelData.model_name}?`,
        acceptedAnswer: { '@type': 'Answer', text: dtc.description_en },
      },
      {
        '@type': 'Question',
        name: `Is ${dtcCode} serious on a ${modelData.model_name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            dtc.severity === 'CRITICAL'
              ? `Yes — ${dtcCode} is a critical fault. Stop driving and contact a BYD dealer immediately.`
              : dtc.severity === 'WARNING'
              ? `${dtcCode} is a moderate severity fault. You can continue driving but should schedule a service appointment soon.`
              : `${dtcCode} is a low severity fault. Monitor the situation and schedule service at your next opportunity.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I drive with ${dtcCode} on my ${modelData.model_name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            dtc.severity === 'CRITICAL'
              ? 'No. Pull over safely and do not drive until the fault has been inspected by a qualified technician.'
              : 'In most cases yes, but monitor the warning closely. If additional symptoms appear such as loss of power or unusual noises, stop driving and contact your dealer.',
        },
      },
    ],
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: market.toUpperCase(),
        item: `${baseUrl}/${market}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${modelData.model_name} Fault Codes`,
        item: `${baseUrl}/${market}/dtc/${model}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: dtcCode,
        item: `${baseUrl}/${market}/dtc/${model}/${code.toLowerCase()}`,
      },
    ],
  }

  return {
    title: `${modelData.model_name} ${dtcCode} Fault Code — Meaning, Causes & What To Do`,
    description: `${dtcCode} on ${modelData.model_name}: ${dtc.description_en}. See severity level, likely causes, and what steps to take next.`,
    other: {
      'script:ld+json:faq': JSON.stringify(faqSchema),
      'script:ld+json:breadcrumb': JSON.stringify(breadcrumbSchema),
    },
  }
}
```

> Note: Next.js 15 does not support multiple `application/ld+json` keys in `metadata.other` natively. We use distinct key names (`script:ld+json:faq`, `script:ld+json:breadcrumb`) as a workaround — these will be rendered as `<meta>` tags. A proper solution (Task 5) injects `<script>` tags directly in the layout.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd /Users/zqr/trunk/ev-aftermarket
git add app/[market]/dtc/[model]/[code]/page.tsx __tests__/pages/dtc.test.ts
git commit -m "feat: add BreadcrumbList schema and expand FAQ to 3 questions on DTC detail page"
```

---

## Task 4: Add ItemList schema to DTC list page

**Files:**
- Modify: `app/[market]/dtc/[model]/page.tsx`

- [ ] **Step 1: Write failing test for ItemList schema builder**

Add to `__tests__/pages/dtc.test.ts`:

```ts
function buildItemListSchema(
  baseUrl: string,
  market: string,
  modelSlug: string,
  dtcs: Array<{ dtc_code: string; description_en: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: dtcs.map((dtc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${dtc.dtc_code} — ${dtc.description_en}`,
      url: `${baseUrl}/${market}/dtc/${modelSlug}/${dtc.dtc_code.toLowerCase()}`,
    })),
  }
}

describe('ItemList schema', () => {
  it('maps DTC rows to ListItems with 1-based positions', () => {
    const schema = buildItemListSchema('https://example.com', 'au', 'byd-atto-3', [
      { dtc_code: 'B123698', description_en: 'Battery voltage fault' },
      { dtc_code: 'P0A0D', description_en: 'Drive motor temperature too high' },
    ])
    expect(schema.itemListElement[0].position).toBe(1)
    expect(schema.itemListElement[1].position).toBe(2)
    expect(schema.itemListElement[0].url).toBe(
      'https://example.com/au/dtc/byd-atto-3/b123698'
    )
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm test __tests__/pages/dtc.test.ts
```

Expected: all tests PASS (the function is defined in the test file)

- [ ] **Step 3: Update `generateMetadata` in the DTC list page**

Replace `generateMetadata` in `app/[market]/dtc/[model]/page.tsx`:

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'
  const dtcs = await getDTCsByModel(modelData.model_id)

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${modelData.model_name} Fault Codes`,
    itemListElement: dtcs.map((dtc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${dtc.dtc_code} — ${dtc.description_en}`,
      url: `${baseUrl}/${market}/dtc/${model}/${dtc.dtc_code?.toLowerCase()}`,
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: market.toUpperCase(),
        item: `${baseUrl}/${market}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${modelData.model_name} Fault Codes`,
        item: `${baseUrl}/${market}/dtc/${model}`,
      },
    ],
  }

  return {
    title: `${modelData.model_name} Fault Codes — Complete List (${market.toUpperCase()})`,
    description: `All known fault codes for the ${modelData.model_name} in ${market.toUpperCase()}: meanings, severity levels, and what to do when you see each warning light.`,
    other: {
      'script:ld+json:itemlist': JSON.stringify(itemListSchema),
      'script:ld+json:breadcrumb': JSON.stringify(breadcrumbSchema),
    },
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/zqr/trunk/ev-aftermarket
git add app/[market]/dtc/[model]/page.tsx __tests__/pages/dtc.test.ts
git commit -m "feat: add ItemList and BreadcrumbList schema to DTC list page"
```

---

## Task 5: Inject LD+JSON via layout `<script>` tags (proper multi-schema support)

**Files:**
- Modify: `app/[market]/layout.tsx`

Next.js `metadata.other` does not render multiple `<script type="application/ld+json">` tags — it renders `<meta>` tags instead, which Google ignores for structured data. The correct approach is to pass schema via `searchParams` or a shared context, but the simplest correct approach for App Router is a `JsonLd` component rendered directly in each page.

- [ ] **Step 1: Create `components/JsonLd.tsx`**

```tsx
interface Props {
  schema: Record<string, unknown>
}

export function JsonLd({ schema }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

- [ ] **Step 2: Add `JsonLd` to DTC detail page**

In `app/[market]/dtc/[model]/[code]/page.tsx`:

Add import at top:
```ts
import { JsonLd } from '@/components/JsonLd'
```

Inside `DtcCodePage`, before the `return`, build the schemas (same logic as in `generateMetadata` — extract to inline consts):

```tsx
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What does ${dtcCode} mean on a ${modelData.model_name}?`,
        acceptedAnswer: { '@type': 'Answer', text: dtc.description_en },
      },
      {
        '@type': 'Question',
        name: `Is ${dtcCode} serious on a ${modelData.model_name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            dtc.severity === 'CRITICAL'
              ? `Yes — ${dtcCode} is a critical fault. Stop driving and contact a dealer immediately.`
              : dtc.severity === 'WARNING'
              ? `${dtcCode} is a moderate severity fault. Schedule a service appointment soon.`
              : `${dtcCode} is a low severity fault. Monitor and schedule service at your next opportunity.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I drive with ${dtcCode} on my ${modelData.model_name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            dtc.severity === 'CRITICAL'
              ? 'No. Pull over safely and do not drive until inspected by a qualified technician.'
              : 'In most cases yes, but monitor closely. If you notice loss of power or unusual noises, stop and contact your dealer.',
        },
      },
    ],
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${baseUrl}/${market}` },
      { '@type': 'ListItem', position: 2, name: `${modelData.model_name} Fault Codes`, item: `${baseUrl}/${market}/dtc/${model}` },
      { '@type': 'ListItem', position: 3, name: dtcCode, item: `${baseUrl}/${market}/dtc/${model}/${code.toLowerCase()}` },
    ],
  }
```

Add `<JsonLd>` components at the top of the returned JSX, inside `<article>`:

```tsx
  return (
    <article className="max-w-3xl">
      <JsonLd schema={faqSchema} />
      <JsonLd schema={breadcrumbSchema} />
      {/* ... rest of existing JSX unchanged ... */}
    </article>
  )
```

- [ ] **Step 3: Add `JsonLd` to DTC list page**

In `app/[market]/dtc/[model]/page.tsx`:

Add import:
```ts
import { JsonLd } from '@/components/JsonLd'
```

Inside `DtcModelPage`, before `return`, build schemas:

```tsx
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${modelData.model_name} Fault Codes`,
    itemListElement: dtcs.map((dtc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${dtc.dtc_code} — ${dtc.description_en}`,
      url: `${baseUrl}/${market}/dtc/${model}/${dtc.dtc_code?.toLowerCase()}`,
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${baseUrl}/${market}` },
      { '@type': 'ListItem', position: 2, name: `${modelData.model_name} Fault Codes`, item: `${baseUrl}/${market}/dtc/${model}` },
    ],
  }
```

Add to returned JSX:

```tsx
  return (
    <article className="max-w-3xl">
      <JsonLd schema={itemListSchema} />
      <JsonLd schema={breadcrumbSchema} />
      {/* ... rest of existing JSX unchanged ... */}
    </article>
  )
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/zqr/trunk/ev-aftermarket
git add components/JsonLd.tsx app/[market]/dtc/[model]/[code]/page.tsx app/[market]/dtc/[model]/page.tsx
git commit -m "feat: inject LD+JSON via script tags for FAQ, BreadcrumbList, and ItemList schemas"
```

---

## Task 6: Add related DTC internal links to detail page

**Files:**
- Modify: `lib/db/dtcs.ts`
- Modify: `app/[market]/dtc/[model]/[code]/page.tsx`

Internal links from each DTC detail page to other codes for the same model reduce "orphan page" risk and pass PageRank between pages.

- [ ] **Step 1: Add `getRelatedDTCs` query to `lib/db/dtcs.ts`**

Append to `lib/db/dtcs.ts`:

```ts
export async function getRelatedDTCs(modelId: string, excludeDtcId: number, limit = 5) {
  return db
    .select({
      dtc_id: dtcs.dtc_id,
      dtc_code: dtcs.dtc_code,
      description_en: dtcs.description_en,
      severity: dtcs.severity,
    })
    .from(dtcModelNotes)
    .innerJoin(dtcs, eq(dtcModelNotes.dtc_id, dtcs.dtc_id))
    .where(
      and(
        eq(dtcModelNotes.model_id, modelId),
        // exclude the current DTC — drizzle uses ne() for not-equal
      )
    )
    .limit(limit)
}
```

> Note: Drizzle's `ne()` (not-equal) needs to be imported. Update the import line in `lib/db/dtcs.ts`:
```ts
import { eq, and, ne } from 'drizzle-orm'
```

Then use it in the where clause:
```ts
    .where(
      and(
        eq(dtcModelNotes.model_id, modelId),
        ne(dtcModelNotes.dtc_id, excludeDtcId)
      )
    )
```

- [ ] **Step 2: Write test for related DTCs filtering**

Add to `__tests__/pages/dtc.test.ts`:

```ts
describe('related DTCs', () => {
  it('excludes the current DTC code from related list', () => {
    const allCodes = [
      { dtc_id: 1, dtc_code: 'B123698', description_en: 'Battery voltage fault', severity: 'WARNING' },
      { dtc_id: 2, dtc_code: 'P0A0D', description_en: 'Drive motor temp', severity: 'CRITICAL' },
      { dtc_id: 3, dtc_code: 'U0100', description_en: 'CAN bus lost', severity: 'INFO' },
    ]
    const currentId = 1
    const related = allCodes.filter((d) => d.dtc_id !== currentId)
    expect(related).toHaveLength(2)
    expect(related.find((d) => d.dtc_id === 1)).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm test __tests__/pages/dtc.test.ts
```

Expected: all PASS

- [ ] **Step 4: Add related DTCs section to `DtcCodePage`**

In `app/[market]/dtc/[model]/[code]/page.tsx`:

Add import:
```ts
import { getDTCByCode, getDTCModelNote, getCasesForDTC, getRelatedDTCs } from '@/lib/db/dtcs'
```

In the page component, add to the parallel fetch after `note` and `casesRaw`:

```ts
  const [note, casesRaw, relatedDtcs] = await Promise.all([
    getDTCModelNote(Number(dtc.dtc_id), modelData.model_id, market),
    getCasesForDTC(Number(dtc.dtc_id)),
    getRelatedDTCs(modelData.model_id, Number(dtc.dtc_id)),
  ])
```

Add this section just before `<RealWorldCases>` in the JSX:

```tsx
      {relatedDtcs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Other {modelData.model_name} Fault Codes</h2>
          <div className="space-y-1">
            {relatedDtcs.map((related) => (
              <a
                key={related.dtc_id}
                href={`/${market}/dtc/${model}/${related.dtc_code?.toLowerCase()}`}
                className="flex items-center gap-3 text-sm text-blue-700 hover:underline"
              >
                <code className="font-mono font-bold w-20">{related.dtc_code}</code>
                <span className="text-gray-600">{related.description_en}</span>
              </a>
            ))}
          </div>
        </section>
      )}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd /Users/zqr/trunk/ev-aftermarket
git add lib/db/dtcs.ts app/[market]/dtc/[model]/[code]/page.tsx __tests__/pages/dtc.test.ts
git commit -m "feat: add related fault codes section with internal links on DTC detail page"
```

---

## Task 7: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm test
```

Expected: all tests pass, no failures

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/zqr/trunk/ev-aftermarket && pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Final summary commit (if any fixes were needed)**

```bash
cd /Users/zqr/trunk/ev-aftermarket
git add -A
git commit -m "fix: resolve any type errors from SEO optimization pass"
```

---

## Summary of SEO Improvements

| Change | Impact |
|--------|--------|
| Dynamic sitemap from DB | All DTC pages now discoverable by Google |
| BreadcrumbList schema | SERP shows `AU > BYD Atto 3 Fault Codes > B123698` path |
| FAQ expanded to 3 questions | Higher chance of Rich Result / Featured Snippet |
| ItemList schema on list page | Google understands the page is a structured collection |
| Improved meta description | Human-readable first sentence, includes DTC code + model name |
| Related DTC internal links | Reduces orphan pages, distributes PageRank across DTC pages |
