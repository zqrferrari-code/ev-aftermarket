# mybyd.co.uk Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape BYD Atto 3 and Dolphin OTA update records + vehicle specs from mybyd.co.uk and write them into the database.

**Architecture:** Two independent tasks: (1) extend `models` table schema with spec fields and push to DB; (2) create `scripts/scrape-mybyd.ts` that fetches mybyd.co.uk pages, parses HTML with cheerio, and writes OTA records + spec fields directly to DB.

**Tech Stack:** Next.js/Node.js, Drizzle ORM (mysql2), cheerio (HTML parsing), dotenv, `pnpm db:push` for schema sync

---

## File Map

| File | Change |
|---|---|
| `lib/db/schema.ts` | Modify — add 6 spec fields to `mf_nv_models` table |
| `scripts/scrape-mybyd.ts` | Create — scraper script |

---

## Task 1: Extend models schema with spec fields

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add spec fields to `models` table in `lib/db/schema.ts`**

Find the `mf_nv_models` table definition. It currently ends with:
```ts
  slug: varchar('slug', { length: 100 }).unique().notNull(),
})
```

Replace with:
```ts
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  range_km: int('range_km'),
  battery_kwh: decimal('battery_kwh', { precision: 5, scale: 1 }),
  acceleration_0_100: decimal('acceleration_0_100', { precision: 4, scale: 1 }),
  charge_ac_kw: decimal('charge_ac_kw', { precision: 4, scale: 1 }),
  charge_dc_kw: int('charge_dc_kw'),
  cargo_l: int('cargo_l'),
})
```

Also add `decimal` to the imports at the top of the file:
```ts
import {
  mysqlTable,
  varchar,
  text,
  boolean,
  int,
  decimal,
  serial,
  timestamp,
  json,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core'
```

- [ ] **Step 2: Push schema to DB**

```bash
cd /path/to/ev-aftermarket
pnpm db:push
```

Expected: Drizzle will prompt to confirm adding 6 columns. Type `yes`. Output ends with `✓ Changes applied`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /path/to/ev-aftermarket
npx tsc --noEmit 2>&1 | grep "schema" | head -10
```

Expected: no output (no errors).

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add spec fields to models table (range, battery, acceleration, charging, cargo)"
```

---

## Task 2: Create mybyd.co.uk scraper script

**Files:**
- Create: `scripts/scrape-mybyd.ts`

- [ ] **Step 1: Install cheerio**

```bash
cd /path/to/ev-aftermarket
pnpm add cheerio
```

Expected: cheerio added to `package.json` dependencies.

- [ ] **Step 2: Create `scripts/scrape-mybyd.ts`**

```ts
import 'dotenv/config'
import * as cheerio from 'cheerio'
import { db } from '../lib/db/index'
import { softwareUpdates, models } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'

// Only scrape models that exist in our DB
const MODEL_MAP: Record<string, string> = {
  'atto-3': 'byd-atto3',
  'atto3': 'byd-atto3',
  'dolphin': 'byd-dolphin',
}

const SPEC_URLS: { modelId: string; url: string }[] = [
  { modelId: 'byd-atto3', url: 'https://www.mybyd.co.uk/byd-atto-3/' },
  { modelId: 'byd-dolphin', url: 'https://www.mybyd.co.uk/byd-dolphin/' },
]

const MARKET_CODE = 'au'

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EVAftermarket-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

// Parse version number like "2.1.0" or "3.2.2" from text
function parseVersion(text: string): string | null {
  const m = text.match(/\b(\d+\.\d+\.\d+)\b/)
  return m ? m[1] : null
}

// Parse release date like "February 28, 2026" → "2026-02"
function parseReleaseDate(text: string): string | null {
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  }
  const m = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d+,?\s+(\d{4})\b/i)
  if (!m) return null
  const month = months[m[1].toLowerCase()]
  return `${m[2]}-${month}`
}

// Convert miles to km (rounded to nearest 10)
function milesToKm(miles: number): number {
  return Math.round((miles * 1.60934) / 10) * 10
}

// Parse a number from text, return null if not found
function parseNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern)
  return m ? parseFloat(m[1]) : null
}

async function scrapeOtaArticles(): Promise<void> {
  console.log('\nDiscovering OTA articles from homepage...')
  const html = await fetchHtml('https://www.mybyd.co.uk/')
  const $ = cheerio.load(html)

  const articleUrls: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (/mybyd\.co\.uk\/.+(ota|software.update)/i.test(href)) {
      articleUrls.push(href)
    }
  })

  // Deduplicate
  const unique = [...new Set(articleUrls)]
  console.log(`Found ${unique.length} OTA article(s): ${unique.join(', ')}`)

  for (const url of unique) {
    await scrapeOtaArticle(url)
  }
}

async function scrapeOtaArticle(url: string): Promise<void> {
  // Determine model from URL
  let modelId: string | null = null
  for (const [key, id] of Object.entries(MODEL_MAP)) {
    if (url.toLowerCase().includes(key)) {
      modelId = id
      break
    }
  }
  if (!modelId) {
    console.log(`  Skip ${url} — model not in DB`)
    return
  }

  const html = await fetchHtml(url)
  const $ = cheerio.load(html)

  const bodyText = $('body').text()
  const version = parseVersion($('h1').first().text()) ?? parseVersion(bodyText)
  if (!version) {
    console.log(`  Skip ${url} — could not parse version`)
    return
  }

  const releaseDate = parseReleaseDate(bodyText)

  // Build changelog from li items under headings
  const changelogParts: string[] = []
  $('li').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 10) changelogParts.push(text)
  })
  const changelog = changelogParts.join(' ')

  // Check idempotency
  const existing = await db
    .select({ update_id: softwareUpdates.update_id })
    .from(softwareUpdates)
    .where(and(
      eq(softwareUpdates.model_id, modelId),
      eq(softwareUpdates.version, version),
    ))
    .limit(1)

  if (existing.length > 0) {
    console.log(`  Skip ${modelId} v${version} (already exists)`)
    return
  }

  await db.insert(softwareUpdates).values({
    model_id: modelId,
    market_code: MARKET_CODE,
    version,
    release_date: releaseDate ?? undefined,
    update_method: 'OTA',
    changelog_en: changelog || null,
    source_url: url,
    data_confidence: 'community',
  })
  console.log(`✓ Inserted ${modelId} v${version} (${releaseDate ?? 'date unknown'})`)
}

async function scrapeModelSpec(modelId: string, url: string): Promise<void> {
  console.log(`\n[${modelId}] Fetching spec page...`)
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  const bodyText = $('body').text()

  // Range: "265 mi" or "420 miles" → convert to km
  const rangeMiles = parseNumber(bodyText, /(\d+)\s*mi(?:les)?(?:\s+WLTP)?/i)
  const range_km = rangeMiles ? milesToKm(rangeMiles) : null

  // Battery: "60.5 kWh" or "44.9kWh"
  const battery_kwh = parseNumber(bodyText, /(\d+(?:\.\d+)?)\s*kWh/i)

  // Acceleration: "7.3s 0-62" or "0-100 in 7.3"
  const acceleration_0_100 = parseNumber(bodyText, /(\d+(?:\.\d+)?)\s*s(?:econds?)?\s+0[-–](?:62|100)/i)
    ?? parseNumber(bodyText, /0[-–](?:62|100)[^.]*?(\d+(?:\.\d+)?)\s*s/i)

  // DC charging: "100 kW DC"
  const charge_dc_kw = parseNumber(bodyText, /(\d+)\s*kW\s+DC/i)
    ? Math.round(parseNumber(bodyText, /(\d+)\s*kW\s+DC/i)!)
    : null

  // AC charging: "11 kW AC" or "Type 2.*11 kW"
  const charge_ac_kw = parseNumber(bodyText, /(\d+(?:\.\d+)?)\s*kW\s+AC/i)
    ?? parseNumber(bodyText, /(?:Type\s*2|AC)[^.]*?(\d+(?:\.\d+)?)\s*kW/i)

  // Cargo: "345 litres" or "345L"
  const cargo_l = parseNumber(bodyText, /(\d+)\s*(?:litres?|L)\b/i)
    ? Math.round(parseNumber(bodyText, /(\d+)\s*(?:litres?|L)\b/i)!)
    : null

  console.log(`  range: ${range_km ? range_km + 'km' : 'null'}, battery: ${battery_kwh ? battery_kwh + 'kWh' : 'null'}, 0-100: ${acceleration_0_100 ? acceleration_0_100 + 's' : 'null'}, DC: ${charge_dc_kw ? charge_dc_kw + 'kW' : 'null'}, AC: ${charge_ac_kw ? charge_ac_kw + 'kW' : 'null'}, cargo: ${cargo_l ? cargo_l + 'L' : 'null'}`)

  await db.update(models)
    .set({
      ...(range_km !== null && { range_km }),
      ...(battery_kwh !== null && { battery_kwh: battery_kwh.toString() }),
      ...(acceleration_0_100 !== null && { acceleration_0_100: acceleration_0_100.toString() }),
      ...(charge_ac_kw !== null && { charge_ac_kw: charge_ac_kw.toString() }),
      ...(charge_dc_kw !== null && { charge_dc_kw }),
      ...(cargo_l !== null && { cargo_l }),
    })
    .where(eq(models.model_id, modelId))

  console.log(`  Spec updated in DB`)
}

async function main() {
  console.log('Scraping mybyd.co.uk...')

  // Specs
  for (const { modelId, url } of SPEC_URLS) {
    await scrapeModelSpec(modelId, url)
  }

  // OTA articles
  await scrapeOtaArticles()

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Run the scraper**

```bash
cd /path/to/ev-aftermarket
DOTENV_CONFIG_PATH=.env.local npx tsx scripts/scrape-mybyd.ts
```

Expected output (approximate):
```
Scraping mybyd.co.uk...

[byd-atto3] Fetching spec page...
  range: 420km, battery: null, 0-100: 7.3s, DC: null, AC: null, cargo: null
  Spec updated in DB

[byd-dolphin] Fetching spec page...
  range: 430km, battery: null, 0-100: null, DC: 100kW, AC: null, cargo: 345L
  Spec updated in DB

Discovering OTA articles from homepage...
Found 1 OTA article(s): https://www.mybyd.co.uk/byd-dolphin-software-update-2-1-0-ota/
✓ Inserted byd-dolphin v2.1.0 (2026-02)

Done.
```

If you see `HTTP 404` or `HTTP 403`, check the URL is still live. If you see `could not parse version`, the article HTML structure may have changed — inspect the page manually.

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape-mybyd.ts pnpm-lock.yaml package.json
git commit -m "feat: add mybyd.co.uk scraper for BYD OTA updates and model specs"
```

---

## Self-Review

**Spec coverage:**
- ✅ `models` table extended with 6 spec fields (nullable)
- ✅ `decimal` import added to schema
- ✅ `pnpm db:push` used for schema sync (no migration files)
- ✅ Only `byd-atto3` and `byd-dolphin` processed
- ✅ OTA records inserted with `market_code = 'au'`, `data_confidence = 'community'`, `source_url = article URL`
- ✅ Idempotent: OTA skipped if `(model_id, version)` exists
- ✅ Spec fields overwritten each run (non-null values only)
- ✅ Homepage crawl to discover OTA article URLs dynamically
- ✅ Miles → km conversion for range
- ✅ Console output matches spec

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `battery_kwh`, `acceleration_0_100`, `charge_ac_kw` stored as `.toString()` because Drizzle's `decimal` type expects string input in mysql2. `range_km`, `charge_dc_kw`, `cargo_l` are `int` — stored as numbers directly.
