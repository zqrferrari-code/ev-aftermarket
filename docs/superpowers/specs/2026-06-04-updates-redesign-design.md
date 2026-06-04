# Updates Page Redesign + Seed Data Design

**Goal:** Redesign the software updates list page to use the Editorial Clarity design system, and seed BYD Atto 3 AU update records into the database.

**Audience:** EV owners looking up firmware history for their vehicle.

---

## Scope

Two independent deliverables:
1. **Page redesign** — `app/[market]/updates/[model]/page.tsx` migrated from Tailwind to Editorial Clarity CSS classes
2. **Seed data** — 4 BYD Atto 3 AU software update records inserted into `mf_nv_software_updates`

---

## Architecture

- **No new files** — modifies existing page and adds a seed script
- **CSS approach** — replace Tailwind utility classes with `globals.css` tokens and class names (same pattern as DTC detail page)
- **Data** — seed script inserts rows directly via Drizzle ORM; model_id for byd-atto-3 fetched from DB

---

## Page Design

### Layout (matches DTC detail page pattern)
- `page-wrapper` → `dtc-card` shell
- Breadcrumb using `.breadcrumb` + `.sep`

### Hero section
```
Software Updates
BYD Atto 3 · AU         ← italic, smaller, muted
```
- h1: `font-family: var(--font-serif-body)`, 32px, weight 400
- Subtitle: italic `<em>`, 26px, `color: var(--text-muted)`
- Description paragraph: 13.5px, muted
- Stats strip (same pattern as `.list-stats`): "4 Versions tracked", "3 OTA capable", "2024 Latest release" — uses `.stat-num` + `.stat-label`

### Update list
Section header: `.model-section-head` style (condensed caps, bg `var(--bg)`)

Each update row — 3-column grid (`120px 1fr auto`):
- **Col 1:** Version in `.model-update-version` (monospace bold) + date in condensed caps below
- **Col 2:** Title (13.5px semibold) + description (12.5px muted, line-clamp 2)
- **Col 3:** Method badge — `.model-method-tag` variant:
  - OTA → green (`--green-light` bg, `--green-text` color)
  - dealer_only → amber (`--amber-bg`, `--amber-text`)
  - usb → blue (`--blue-bg`, `--blue-text`)

### Footer note
Confidence disclaimer: `.disclaimer` style — faint text, "⚠ Data sourced from community reports..."  + "Submit a missing update →" link to `/contact`

### Empty state (no updates)
Keep existing empty state but restyle with `.disclaimer`-style box. Remove the MG4-specific hardcoded fallback block — it's not needed once real data exists.

### Removed
- Blue "Get Update Alerts" newsletter box — disabled anyway, adds visual noise, remove entirely for now

---

## Seed Data — BYD Atto 3 AU

Four records to insert into `mf_nv_software_updates`:

| version | release_date | update_method | changelog_en | data_confidence |
|---|---|---|---|---|
| 3.0.1.156 | 2024-11 | OTA | Fixes CarPlay disconnection under cellular load. Improves AC charging curve in hot climates. TPMS sensitivity adjustment. | community |
| 3.0.1.140 | 2024-07 | OTA | Battery management recalibration. Improved range estimation accuracy at low SoC. Regenerative braking torque smoothing. | community |
| 3.0.0.128 | 2024-01 | dealer_only | ADAS calibration update. Steering torque feedback correction. Applied during scheduled servicing at BYD dealers. | community |
| 2.0.0.104 | 2023-05 | OTA | Initial production firmware for AU-spec Atto 3. Base for all subsequent OTA updates. | community |

- `model_id`: looked up from DB via `getModelBySlug('byd-atto-3')`
- `market_code`: `'au'`
- `source_url`: null

**Seed script:** `scripts/seed-updates-byd-atto3.ts` — standalone script, run once with `npx tsx scripts/seed-updates-byd-atto3.ts`

---

## What This Is NOT

- No email subscription feature
- No admin UI for managing updates
- No changes to the version detail page (`[version]/page.tsx`)
- No changes to other models
