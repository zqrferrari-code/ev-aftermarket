# Updates Page Redesign + Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the software updates list page to use the Editorial Clarity design system, and seed 4 BYD Atto 3 AU software update records into the database.

**Architecture:** Two independent tasks: (1) replace Tailwind utility classes in `app/[market]/updates/[model]/page.tsx` with Editorial Clarity CSS tokens/classes from `globals.css`; (2) create a one-shot seed script `scripts/seed-updates-byd-atto3.ts` that inserts 4 rows into `mf_nv_software_updates` using Drizzle ORM.

**Tech Stack:** Next.js App Router, Drizzle ORM (mysql2), existing `globals.css` design tokens

---

## File Map

| File | Change |
|---|---|
| `app/[market]/updates/[model]/page.tsx` | Modify — rewrite JSX to use Editorial Clarity classes |
| `scripts/seed-updates-byd-atto3.ts` | Create — one-shot seed script for BYD Atto 3 AU updates |

---

## Task 1: Seed BYD Atto 3 AU update records

**Files:**
- Create: `scripts/seed-updates-byd-atto3.ts`

Do this first so the page redesign can be visually verified with real data.

- [ ] **Step 1: Create `scripts/seed-updates-byd-atto3.ts`**

```ts
import 'dotenv/config'
import { db } from '../lib/db/index'
import { softwareUpdates, models } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  // Look up the model_id for byd-atto-3
  const rows = await db
    .select({ model_id: models.model_id })
    .from(models)
    .where(eq(models.slug, 'byd-atto-3'))
    .limit(1)

  const modelRow = rows[0]
  if (!modelRow) {
    console.error('Model byd-atto-3 not found in DB. Run seed.ts first.')
    process.exit(1)
  }

  const model_id = modelRow.model_id
  const market_code = 'au'

  // Check if already seeded
  const existing = await db
    .select({ update_id: softwareUpdates.update_id })
    .from(softwareUpdates)
    .where(eq(softwareUpdates.model_id, model_id))
    .limit(1)

  if (existing.length > 0) {
    console.log('Updates already seeded for byd-atto-3. Skipping.')
    process.exit(0)
  }

  await db.insert(softwareUpdates).values([
    {
      model_id,
      market_code,
      version: '3.0.1.156',
      release_date: '2024-11',
      update_method: 'OTA',
      changelog_en:
        'Fixes CarPlay disconnection under cellular load. Improves AC charging curve in hot climates. TPMS sensitivity adjustment.',
      source_url: null,
      data_confidence: 'community',
    },
    {
      model_id,
      market_code,
      version: '3.0.1.140',
      release_date: '2024-07',
      update_method: 'OTA',
      changelog_en:
        'Battery management recalibration. Improved range estimation accuracy at low SoC. Regenerative braking torque smoothing.',
      source_url: null,
      data_confidence: 'community',
    },
    {
      model_id,
      market_code,
      version: '3.0.0.128',
      release_date: '2024-01',
      update_method: 'dealer_only',
      changelog_en:
        'ADAS calibration update. Steering torque feedback correction. Applied during scheduled servicing at BYD dealers.',
      source_url: null,
      data_confidence: 'community',
    },
    {
      model_id,
      market_code,
      version: '2.0.0.104',
      release_date: '2023-05',
      update_method: 'OTA',
      changelog_en:
        'Initial production firmware for AU-spec Atto 3. Base for all subsequent OTA updates.',
      source_url: null,
      data_confidence: 'community',
    },
  ])

  console.log('✓ Seeded 4 software updates for byd-atto-3 (AU)')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the seed script**

```bash
cd /path/to/ev-aftermarket
npx tsx scripts/seed-updates-byd-atto3.ts
```

Expected output:
```
✓ Seeded 4 software updates for byd-atto-3 (AU)
```

If you see `Model byd-atto-3 not found in DB`, run `npx tsx scripts/seed.ts` first.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-updates-byd-atto3.ts
git commit -m "feat: seed BYD Atto 3 AU software update records"
```

---

## Task 2: Redesign the updates list page

**Files:**
- Modify: `app/[market]/updates/[model]/page.tsx`

Replace the entire file. The page uses these CSS classes from `globals.css`:
- `.page-wrapper` — max-width 860px centered container with padding
- `.dtc-card` — white card with border and border-radius
- `.breadcrumb` + `.sep` — breadcrumb nav row
- `.model-section-head` — condensed caps section header (bg `var(--bg)`, border-bottom)
- `.model-update-version` — monospace bold version text
- `.model-update-row` — padded row with border-bottom
- `.model-update-top` — flex row for version + date + badge
- `.model-update-date` — faint date text, margin-left auto
- `.model-update-log` — muted changelog preview text
- `.model-method-tag` — condensed caps badge (blue bg by default)
- `.disclaimer` — faint footer note strip

Method badge colours are overridden inline per method:
- OTA: `background: 'var(--green-light)', color: 'var(--green-text)', border: '1px solid #bbf7d0'`
- dealer_only: `background: 'var(--amber-bg)', color: 'var(--amber-text)', border: '1px solid var(--amber-border)'`
- usb: default `.model-method-tag` (blue)

- [ ] **Step 1: Replace `app/[market]/updates/[model]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUpdatesByModel } from '@/lib/db/updates'
import { getModelBySlug } from '@/lib/db/models'
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const revalidate = 3600

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}

interface Props {
  params: Promise<{ market: string; model: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}
  return {
    title: `${modelData.model_name} Software Updates — Version History & Changelog (${market.toUpperCase()})`,
    description: `Complete ${modelData.model_name} software update history for ${market.toUpperCase()}: firmware versions, OTA update instructions, and what each update fixes.`,
  }
}

function methodBadgeStyle(method: string | null): React.CSSProperties {
  if (method === 'OTA') {
    return { background: 'var(--green-light)', color: 'var(--green-text)', border: '1px solid #bbf7d0' }
  }
  if (method === 'dealer_only') {
    return { background: 'var(--amber-bg)', color: 'var(--amber-text)', border: '1px solid var(--amber-border)' }
  }
  return {} // usb — default .model-method-tag blue
}

function methodLabel(method: string | null): string {
  if (method === 'OTA') return 'OTA'
  if (method === 'dealer_only') return 'Dealer Only'
  if (method === 'usb') return 'USB'
  return 'Unknown'
}

export default async function UpdatesListPage({ params }: Props) {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const updates = await getUpdatesByModel(modelData.model_id, market)

  const otaCount = updates.filter((u) => u.update_method === 'OTA').length
  const latestYear = updates
    .map((u) => u.release_date?.slice(0, 4))
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  return (
    <main className="page-wrapper">
      <div className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href={`/${market}`}>{market.toUpperCase()}</Link>
          <span className="sep">›</span>
          <Link href={`/${market}/models/${model}`}>{modelData.model_name}</Link>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>Software Updates</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '32px 28px 24px', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--text-base)',
            lineHeight: 1.2,
            marginBottom: '10px',
          }}>
            Software Updates<br />
            <em style={{ color: 'var(--text-muted)', fontSize: '26px' }}>
              {modelData.model_name} · {market.toUpperCase()}
            </em>
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '54ch', lineHeight: 1.65 }}>
            Firmware and software version history. Data sourced from community reports and official release notes.
          </p>

          {/* Stats strip */}
          {updates.length > 0 && (
            <div className="list-stats">
              <div className="stat">
                <div className="stat-num">{updates.length}</div>
                <div className="stat-label">Versions tracked</div>
              </div>
              {otaCount > 0 && (
                <div className="stat">
                  <div className="stat-num" style={{ color: 'var(--green)' }}>{otaCount}</div>
                  <div className="stat-label">OTA capable</div>
                </div>
              )}
              {latestYear && (
                <div className="stat">
                  <div className="stat-num">{latestYear}</div>
                  <div className="stat-label">Latest release</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Update list */}
        <div className="model-section-head">Update History</div>

        {updates.length > 0 ? (
          <ul style={{ listStyle: 'none' }}>
            {[...updates].reverse().map((update) => (
              <li key={update.update_id} className="model-update-row">
                <a
                  href={`/${market}/updates/${model}/${update.version}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div className="model-update-top">
                    <div>
                      <div className="model-update-version">{update.version}</div>
                      {update.release_date && (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--text-faint)',
                          fontFamily: 'var(--font-cond)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          marginTop: '2px',
                        }}>
                          {update.release_date}
                        </div>
                      )}
                    </div>
                    {update.update_method && (
                      <span
                        className="model-method-tag"
                        style={methodBadgeStyle(update.update_method)}
                      >
                        {methodLabel(update.update_method)}
                      </span>
                    )}
                  </div>
                  {update.changelog_en && (
                    <p className="model-update-log" style={{ marginTop: '6px' }}>
                      {update.changelog_en}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="disclaimer" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '28px', gap: '6px' }}>
            <p>No software updates recorded yet for this market.</p>
            <p>
              Know of a recent update?{' '}
              <Link href="/contact" style={{ color: 'var(--green)' }}>Let us know →</Link>
            </p>
          </div>
        )}

        {/* Confidence footer */}
        {updates.length > 0 && (
          <div className="disclaimer">
            <span>⚠</span>
            <span>
              Data sourced from community reports and owner forums. Version numbers may not be exhaustive.{' '}
              <Link href="/contact" style={{ color: 'var(--green)' }}>Submit a missing update →</Link>
            </span>
          </div>
        )}

      </div>
    </main>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd /path/to/ev-aftermarket
npx tsc --noEmit 2>&1 | grep "updates/\[model\]" | head -10
```

Expected: no output (no errors in this file). Ignore errors in `scripts/`.

- [ ] **Step 3: Verify in browser**

Open http://localhost:3000/au/updates/byd-atto-3 — confirm:
- Serif hero heading "Software Updates / BYD Atto 3 · AU"
- Stats strip showing "4 Versions tracked", "3 OTA capable", "2024 Latest release"
- 4 update rows in reverse chronological order (3.0.1.156 first)
- OTA badge: green; Dealer Only badge: amber
- Footer disclaimer with "Submit a missing update →" link

- [ ] **Step 4: Commit**

```bash
git add "app/[market]/updates/[model]/page.tsx"
git commit -m "feat: redesign updates list page to Editorial Clarity"
```

---

## Self-Review

**Spec coverage:**
- ✅ Page uses `page-wrapper` + `dtc-card` shell
- ✅ Breadcrumb with `.breadcrumb` + `.sep`
- ✅ Serif h1 with italic `<em>` subtitle
- ✅ Stats strip using `.list-stats` / `.stat-num` / `.stat-label`
- ✅ Section header with `.model-section-head`
- ✅ Update rows using `.model-update-row`, `.model-update-version`, `.model-update-top`, `.model-update-log`
- ✅ Method badges: OTA green, dealer_only amber, usb blue (default)
- ✅ Footer confidence disclaimer using `.disclaimer`
- ✅ Empty state restyled (no Tailwind, `.disclaimer`-style)
- ✅ MG4 hardcoded fallback block removed
- ✅ Newsletter subscription box removed
- ✅ Seed script creates 4 rows for byd-atto-3 AU
- ✅ Seed script is idempotent (skips if already seeded)

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `update.update_method` is `string | null` from DB — `methodBadgeStyle` and `methodLabel` both handle `null`. `latestYear` uses `.at(-1)` (ES2022, available in Next.js 14+). Consistent throughout.
