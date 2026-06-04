# mybyd.co.uk Scraper Design

**Goal:** Scrape OTA software update records and vehicle specs from mybyd.co.uk for BYD Atto 3 and BYD Dolphin, and write results into the existing database.

**Audience:** Internal — run manually by developer to seed/refresh data.

---

## Scope

Two deliverables:

1. **Schema migration** — add spec fields to `models` table in `lib/db/schema.ts`
2. **Scraper script** — `scripts/scrape-mybyd.ts` fetches mybyd.co.uk, parses OTA articles and model spec pages, writes to DB

---

## Architecture

**Data flow:**
```
mybyd.co.uk HTML → fetch() → cheerio parse → structured data → Drizzle ORM → DB
```

- Single script `scripts/scrape-mybyd.ts`, run manually with `npx tsx scripts/scrape-mybyd.ts`
- Uses `cheerio` for HTML parsing (already lightweight, no headless browser needed — mybyd.co.uk is server-rendered)
- Only processes `byd-atto3` and `byd-dolphin` (existing model_ids in DB); skips Seal, Sealion 7, Dolphin Surf, Atto 2
- Idempotent: OTA records skipped if `(model_id, version)` already exists; spec fields overwritten each run

---

## Schema Changes — `lib/db/schema.ts`

Add to `mf_nv_models` table:

| Field | Type | Description |
|---|---|---|
| `range_km` | `int` | WLTP range in km |
| `battery_kwh` | `decimal(5,1)` | Battery capacity |
| `acceleration_0_100` | `decimal(4,1)` | 0–100 km/h in seconds |
| `charge_ac_kw` | `decimal(4,1)` | Max AC charging power |
| `charge_dc_kw` | `int` | Max DC fast charge power |
| `cargo_l` | `int` | Boot/cargo volume in litres |

All fields nullable — not every source will have every value.

**Note:** No Drizzle migration file needed for local dev — use `drizzle-kit push` to sync schema.

---

## Scraper Design — `scripts/scrape-mybyd.ts`

### Target URLs

**OTA update articles** (fetch each, parse version + changelog):

| Model | URL |
|---|---|
| Dolphin | `https://www.mybyd.co.uk/byd-dolphin-software-update-2-1-0-ota/` |
| Atto 3 | Discovered by crawling homepage article list — filter by slug containing `atto` or `atto-3` |

Strategy: fetch homepage, extract all article links, filter to those matching `/(atto|dolphin).*(ota|software-update)/i`, then fetch each.

**Model spec pages:**

| Model | URL |
|---|---|
| Atto 3 | `https://www.mybyd.co.uk/byd-atto-3/` |
| Dolphin | `https://www.mybyd.co.uk/byd-dolphin/` |

### OTA Parsing Logic

From each update article page, extract:
- **version** — regex match on `h1` or first `<p>` for pattern like `2.1.0` or `3.2.2`
- **release_date** — look for date string near top of article (format: `Month DD, YYYY` → convert to `YYYY-MM`)
- **changelog_en** — concatenate all `<li>` text under "New Features" and "Feature Optimizations" headings
- **update_method** — default `'OTA'` (all mybyd articles cover OTA updates)
- **market_code** — `'au'` (BYD OTA is global; AU market is our primary target)
- **data_confidence** — `'community'`
- **source_url** — the article URL

Model mapping (slug → model_id):
```ts
const MODEL_MAP: Record<string, string> = {
  'atto-3': 'byd-atto3',
  'atto3': 'byd-atto3',
  'dolphin': 'byd-dolphin',
}
```

### Spec Parsing Logic

From each model page, extract via CSS selectors or regex:
- `range_km` — find text matching `\d+ mi(les)?` → convert miles to km (`× 1.60934`)
- `acceleration_0_100` — find text matching `\d+(\.\d+)?s` near "0-62" or "0-100"
- `charge_dc_kw` — find text matching `\d+ kW` near "DC"
- `cargo_l` — find text matching `\d+ litre` or `\d+L` near "boot" or "cargo"
- `battery_kwh` — find text matching `\d+(\.\d+)? kWh`
- `charge_ac_kw` — find text matching `\d+(\.\d+)? kW` near "AC" or "Type 2"

Fields not found are left as `null` (no error).

### DB Write Logic

**OTA records:**
```ts
// Check existing
const existing = await db.select().from(softwareUpdates)
  .where(and(eq(softwareUpdates.model_id, modelId), eq(softwareUpdates.version, version)))
  .limit(1)

if (existing.length === 0) {
  await db.insert(softwareUpdates).values({ ... })
  console.log(`✓ Inserted ${modelId} v${version}`)
} else {
  console.log(`  Skip ${modelId} v${version} (already exists)`)
}
```

**Spec fields:**
```ts
await db.update(models)
  .set({ range_km, battery_kwh, acceleration_0_100, charge_ac_kw, charge_dc_kw, cargo_l })
  .where(eq(models.model_id, modelId))
```

### Console output

```
Scraping mybyd.co.uk...

[Atto 3] Spec page → range: 420km, battery: null, 0-100: 7.3s, DC: null, AC: null, cargo: null
[Atto 3] Spec updated in DB

[Dolphin] Spec page → range: 426km, battery: null, 0-100: null, DC: 100kW, AC: null, cargo: 345L
[Dolphin] Spec updated in DB

[Dolphin] OTA v2.1.0 (2026-02) → inserting...
✓ Inserted byd-dolphin v2.1.0

Done. 1 OTA records inserted, 2 model specs updated.
```

---

## What This Is NOT

- No scheduled/automated runs — manual only
- No admin UI or approval queue — direct DB write
- No new models created — only `byd-atto3` and `byd-dolphin`
- No UK/NZ market records — only `market_code = 'au'`
- No Drizzle migration files — use `drizzle-kit push` for local dev
