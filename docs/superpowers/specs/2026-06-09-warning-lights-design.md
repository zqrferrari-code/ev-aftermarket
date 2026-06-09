# Warning Lights Feature — Design Spec

**Date:** 2026-06-09
**Status:** Approved

## Overview

Add a warning lights section to EVAftermarket, covering BYD dashboard warning lights with meanings, severity, can-drive guidance, causes, and links to related DTC fault codes. First version covers BYD only (58 lights).

## Routes

Two new route levels, consistent with existing `problems/charging/service` pattern:

```
/:market/warnings/[brand]              → Brand summary page (all BYD warning lights by category)
/:market/warnings/[brand]/[model]      → Model-specific page (filtered + model-specific lights)
```

Entry point added to existing model page (`/[market]/models/[slug]`) under "More Resources".

## Database Schema

### `mf_nv_warning_lights`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `brand_id` | varchar(50) | → `brands.brand_id` |
| `model_id` | varchar(100) nullable | null = brand-wide; set = model-specific |
| `category` | varchar(50) | e.g. "Battery & Charging", "Braking System" |
| `name_en` | varchar(200) | e.g. "Battery Fault Warning" |
| `name_cn` | varchar(200) | e.g. "动力电池故障警告灯" |
| `severity` | varchar(10) | `INFO` \| `WARNING` \| `CRITICAL` |
| `description_en` | text | What the light means |
| `causes` | json | `string[]` of likely trigger causes |
| `can_drive` | varchar(20) | `yes` \| `no` \| `caution` |
| `action_en` | text | What the driver should do |

### `mf_nv_warning_light_dtc_links`

| Column | Type | Notes |
|--------|------|-------|
| `warning_light_id` | int | → `warning_lights.id` |
| `dtc_id` | int | → `dtcs.dtc_id` |
| PRIMARY KEY | `(warning_light_id, dtc_id)` | |

## Pages

### Brand Summary Page `/[market]/warnings/[brand]`

- Hero: "BYD Warning Lights — {Market}" + count stats
- Warning lights grouped by category (Battery & Charging / Braking / Driver Assist / etc.)
- Each row: light name (EN + CN), severity badge, one-line description, link to model detail if model-specific
- Bottom section: "Browse by Model" — links to each BYD model's warning lights page

### Model Detail Page `/[market]/warnings/[brand]/[model]`

- Breadcrumb: Market › BYD Warnings › {Model Name}
- Hero: "{Model} Warning Lights" + critical/warning counts
- Lights grouped by category (brand-wide lights + model-specific lights combined)
- Each light card:
  - Name EN + CN
  - Severity badge (reuse `SeverityBadge` component)
  - Description
  - Can I drive? — explicit yes/no/caution indicator
  - Causes list
  - Related fault codes — linked chips to `/[market]/dtc/[model]/[code]`
- `DisclaimerBox` at bottom (reuse existing component)

### Model Page Change (`/[market]/models/[slug]`)

Add one entry to the existing "More Resources" grid:

```
Warning Lights
"Dashboard warning light meanings and what to do"  ›
→ /[market]/warnings/[brand]/[slug]
```

## Data

### Seed Script

`scripts/seed-warning-lights.ts` — imports BYD warning light data:

- ~50 brand-wide lights (model_id = null)
- ~8 model-specific lights (Dolphin, Atto 3, Seagull, Song PLUS, Qin PLUS DM-i, Han EV)
- DTC links: manually mapped where known relationships exist

Data sourced from dianchema.com (robots.txt permits scraping of non-restricted paths).

### Categories (BYD)

1. Battery & Charging（电池与充电）
2. Braking System（制动系统）
3. Driver Assist（驾驶辅助）
4. Powertrain（动力系统）
5. Steering & Chassis（转向与底盘）
6. Safety（安全系统）
7. Lighting（灯光系统）
8. Thermal Management（热管理系统）
9. Body Electronics（车身电子）
10. Engine System（发动机系统）— for DM-i models

## SEO

**Brand page:**
- Title: `BYD Warning Lights — What They Mean | EVAftermarket {Market}`
- Description: `Complete guide to BYD dashboard warning lights for {Market} owners. {N} warning lights explained with severity, causes, and what to do.`

**Model page:**
- Title: `{Model} Warning Lights — Meanings & What To Do | EVAftermarket`
- Description: `Complete guide to {Model} dashboard warning lights: what each light means, whether you can drive, and what to do next.`

Both pages: `revalidate = 1800`, `dynamicParams = true`, canonical URL set.

## Out of Scope (First Version)

- MG, Chery, GWM and other brands — added later following same pattern
- Warning light images/icons — text-only first version
- User-submitted warning light reports
- Push notifications or alert features
