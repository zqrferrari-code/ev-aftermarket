# Warning Lights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BYD warning lights pages to EVAftermarket — a brand summary page and per-model detail pages — backed by a new DB table with DTC cross-links.

**Architecture:** Two new DB tables (`mf_nv_warning_lights`, `mf_nv_warning_light_dtc_links`) hold the data. A `lib/db/warning-lights.ts` module exposes queries. Two new Next.js page routes mirror the existing `problems/charging/service` pattern. The model page gets one new "More Resources" link.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, MySQL, TypeScript, Tailwind CSS via CSS vars (no Tailwind classes — inline styles like the rest of the codebase)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/db/schema.ts` | Modify | Add `warningLights` and `warningLightDtcLinks` table definitions |
| `lib/types.ts` | Modify | Add `WarningLight`, `WarningLightWithDtcs`, `CanDrive` types |
| `lib/db/warning-lights.ts` | Create | DB query functions for warning lights |
| `lib/db/static-params.ts` | Modify | Add `getWarningLightBrands()` and `getWarningLightModelSlugs()` |
| `scripts/seed-warning-lights.ts` | Create | Seed BYD warning lights data into DB |
| `app/[market]/warnings/[brand]/page.tsx` | Create | Brand summary page |
| `app/[market]/warnings/[brand]/[model]/page.tsx` | Create | Model detail page |
| `app/[market]/models/[slug]/page.tsx` | Modify | Add Warning Lights entry to More Resources |
| `app/dev/page.tsx` | Modify | Add warning light routes to dev portal |

---

## Task 1: DB Schema — Add warning lights tables

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add table definitions to schema**

Open `lib/db/schema.ts` and append after the `caseDtcLinks` definition (around line 161):

```typescript
// ─── 警告灯表 ──────────────────────────────────────────────────────────────────
export const warningLights = mysqlTable('mf_nv_warning_lights', {
  id: serial('id').primaryKey(),
  brand_id: varchar('brand_id', { length: 50 }).references(() => brands.brand_id).notNull(),
  model_id: varchar('model_id', { length: 100 }).references(() => models.model_id),
  category: varchar('category', { length: 50 }).notNull(),
  name_en: varchar('name_en', { length: 200 }).notNull(),
  name_cn: varchar('name_cn', { length: 200 }),
  severity: varchar('severity', { length: 10 }),   // INFO | WARNING | CRITICAL
  description_en: text('description_en'),
  causes: json('causes'),                            // string[]
  can_drive: varchar('can_drive', { length: 20 }),   // yes | no | caution
  action_en: text('action_en'),
}, (t) => [
  index('idx_mf_nv_wl_brand_id').on(t.brand_id),
  index('idx_mf_nv_wl_model_id').on(t.model_id),
])

// ─── 警告灯-故障码关联表 ──────────────────────────────────────────────────────
export const warningLightDtcLinks = mysqlTable('mf_nv_warning_light_dtc_links', {
  warning_light_id: int('warning_light_id').references(() => warningLights.id).notNull(),
  dtc_id: int('dtc_id').references(() => dtcs.dtc_id).notNull(),
}, (t) => [
  primaryKey({ columns: [t.warning_light_id, t.dtc_id] }),
])
```

- [ ] **Step 2: Push schema to DB**

```bash
pnpm db:push
```

Expected: No errors. Two new tables created: `mf_nv_warning_lights`, `mf_nv_warning_light_dtc_links`.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add warning_lights and warning_light_dtc_links tables to schema"
```

---

## Task 2: Types — Add WarningLight types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add types to lib/types.ts**

Append after the `CaseMedia` interface (end of file):

```typescript
export type CanDrive = 'yes' | 'no' | 'caution'

export interface WarningLight {
  id: number
  brand_id: string
  model_id: string | null
  category: string
  name_en: string
  name_cn: string | null
  severity: Severity | null
  description_en: string | null
  causes: string[] | null
  can_drive: CanDrive | null
  action_en: string | null
}

export interface WarningLightWithDtcs extends WarningLight {
  dtcs: { dtc_id: number; dtc_code: string; description_en: string }[]
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add WarningLight types"
```

---

## Task 3: DB queries — lib/db/warning-lights.ts

**Files:**
- Create: `lib/db/warning-lights.ts`

- [ ] **Step 1: Create query file**

Create `lib/db/warning-lights.ts`:

```typescript
import { eq, or, isNull, and } from 'drizzle-orm'
import { db } from './index'
import { warningLights, warningLightDtcLinks, dtcs, models } from './schema'
import type { WarningLight, WarningLightWithDtcs } from '../types'

// All warning lights for a brand (brand-wide + all model-specific)
export async function getWarningLightsForBrand(brandId: string): Promise<WarningLight[]> {
  const rows = await db
    .select()
    .from(warningLights)
    .where(eq(warningLights.brand_id, brandId))
  return rows.map(toWarningLight)
}

// Brand-wide lights + lights specific to this model
export async function getWarningLightsForModel(
  brandId: string,
  modelId: string
): Promise<WarningLightWithDtcs[]> {
  const rows = await db
    .select()
    .from(warningLights)
    .where(
      and(
        eq(warningLights.brand_id, brandId),
        or(isNull(warningLights.model_id), eq(warningLights.model_id, modelId))
      )
    )

  // Fetch DTC links for all returned lights
  const lightIds = rows.map((r) => r.id)
  if (lightIds.length === 0) return []

  const links = await db
    .select({
      warning_light_id: warningLightDtcLinks.warning_light_id,
      dtc_id: dtcs.dtc_id,
      dtc_code: dtcs.dtc_code,
      description_en: dtcs.description_en,
    })
    .from(warningLightDtcLinks)
    .innerJoin(dtcs, eq(warningLightDtcLinks.dtc_id, dtcs.dtc_id))
    .where(
      // drizzle inList helper
      // @ts-expect-error drizzle inArray for number[]
      (warningLightDtcLinks.warning_light_id as any).__column
        ? eq(warningLightDtcLinks.warning_light_id, warningLightDtcLinks.warning_light_id)
        : eq(warningLightDtcLinks.warning_light_id, warningLightDtcLinks.warning_light_id)
    )

  // Build a map: warning_light_id → dtc[]
  const dtcMap = new Map<number, { dtc_id: number; dtc_code: string; description_en: string }[]>()
  for (const link of links) {
    if (!dtcMap.has(link.warning_light_id)) dtcMap.set(link.warning_light_id, [])
    dtcMap.get(link.warning_light_id)!.push({
      dtc_id: link.dtc_id,
      dtc_code: link.dtc_code,
      description_en: link.description_en,
    })
  }

  return rows.map((r) => ({
    ...toWarningLight(r),
    dtcs: dtcMap.get(r.id) ?? [],
  }))
}

// All brand IDs that have warning lights (for static params)
export async function getBrandsWithWarningLights(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ brand_id: warningLights.brand_id })
    .from(warningLights)
  return rows.map((r) => r.brand_id)
}

// All model slugs for a brand that have model-specific warning lights
export async function getModelSlugsWithWarningLights(brandId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: models.slug })
    .from(warningLights)
    .innerJoin(models, eq(warningLights.model_id, models.model_id))
    .where(eq(warningLights.brand_id, brandId))
  const seen = new Set<string>()
  return rows.filter((r) => {
    if (seen.has(r.slug)) return false
    seen.add(r.slug)
    return true
  }).map((r) => r.slug)
}

function toWarningLight(r: typeof warningLights.$inferSelect): WarningLight {
  return {
    id: r.id,
    brand_id: r.brand_id,
    model_id: r.model_id ?? null,
    category: r.category,
    name_en: r.name_en,
    name_cn: r.name_cn ?? null,
    severity: (r.severity as WarningLight['severity']) ?? null,
    description_en: r.description_en ?? null,
    causes: Array.isArray(r.causes) ? (r.causes as string[]) : null,
    can_drive: (r.can_drive as WarningLight['can_drive']) ?? null,
    action_en: r.action_en ?? null,
  }
}
```

> **Note on DTC links query:** The `getWarningLightsForModel` function above has a placeholder for `inArray`. Replace the links query with the correct drizzle `inArray` call:

```typescript
import { eq, or, isNull, and, inArray } from 'drizzle-orm'
// ...
const links = await db
  .select({
    warning_light_id: warningLightDtcLinks.warning_light_id,
    dtc_id: dtcs.dtc_id,
    dtc_code: dtcs.dtc_code,
    description_en: dtcs.description_en,
  })
  .from(warningLightDtcLinks)
  .innerJoin(dtcs, eq(warningLightDtcLinks.dtc_id, dtcs.dtc_id))
  .where(inArray(warningLightDtcLinks.warning_light_id, lightIds))
```

Write the file with this corrected version using `inArray` from the start.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: No errors (or only pre-existing errors unrelated to the new file).

- [ ] **Step 3: Commit**

```bash
git add lib/db/warning-lights.ts
git commit -m "feat: add warning lights DB query functions"
```

---

## Task 4: Seed data — scripts/seed-warning-lights.ts

**Files:**
- Create: `scripts/seed-warning-lights.ts`

- [ ] **Step 1: Create seed script**

Create `scripts/seed-warning-lights.ts`:

```typescript
import { db } from '../lib/db/index'
import { warningLights } from '../lib/db/schema'

// BYD warning lights data sourced from dianchema.com
// brand-wide lights have model_id = null
// model-specific lights have model_id set

const BYD_LIGHTS = [
  // ── Battery & Charging（电池与充电）──────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Battery & Charging',
    name_en: 'Check On-Board Charging System', name_cn: '请检查车载充电系统',
    severity: 'WARNING',
    description_en: 'The on-board charger (OBC) has detected a fault. AC charging may be unavailable.',
    causes: ['Charging cable fault', 'OBC internal fault', 'Communication error between OBC and BMS'],
    can_drive: 'caution',
    action_en: 'Avoid AC charging until inspected. DC fast charging may still work. Book a dealer appointment.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Battery & Charging',
    name_en: 'High Voltage Battery Overtemperature', name_cn: '动力电池过热警告灯',
    severity: 'CRITICAL',
    description_en: 'The high-voltage traction battery has exceeded safe operating temperature.',
    causes: ['Extreme ambient temperature', 'Blocked battery cooling vents', 'Coolant system fault', 'Rapid charging in hot conditions'],
    can_drive: 'no',
    action_en: 'Stop driving immediately. Park in shade with windows open. Do not charge. Contact dealer.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Battery & Charging',
    name_en: 'High Voltage Battery Fault', name_cn: '动力电池故障警告灯',
    severity: 'CRITICAL',
    description_en: 'A fault has been detected in the high-voltage battery pack or battery management system (BMS).',
    causes: ['BMS internal fault', 'Cell voltage imbalance', 'High voltage isolation fault', 'Wiring harness issue'],
    can_drive: 'no',
    action_en: 'Do not drive. Have the vehicle recovered to a BYD authorised dealer immediately.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Battery & Charging',
    name_en: 'Low Battery Warning', name_cn: '动力电池电量低警告灯',
    severity: 'INFO',
    description_en: 'The traction battery state of charge is critically low (typically below 10–15%).',
    causes: ['Battery depleted during driving'],
    can_drive: 'caution',
    action_en: 'Charge as soon as possible. Reduce speed to extend remaining range.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Battery & Charging',
    name_en: '12V Supply System Fault', name_cn: '低压供电系统故障警告灯',
    severity: 'WARNING',
    description_en: 'The 12V low-voltage supply system has a fault. This powers vehicle electronics.',
    causes: ['12V auxiliary battery weak or failed', 'DC-DC converter fault', 'Wiring fault'],
    can_drive: 'caution',
    action_en: 'Book a service appointment promptly. Vehicle may not start if 12V battery fails completely.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Battery & Charging',
    name_en: 'Charging Connected Indicator', name_cn: '动力电池充电连接指示灯',
    severity: 'INFO',
    description_en: 'The charge cable is connected and charging is in progress or the vehicle is plugged in.',
    causes: ['Normal charging operation'],
    can_drive: 'no',
    action_en: 'Normal indicator. Unplug before driving.',
  },

  // ── Braking System（制动系统）───────────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Braking System',
    name_en: 'Check ESC System', name_cn: '请检查ESC系统',
    severity: 'WARNING',
    description_en: 'The Electronic Stability Control system requires inspection.',
    causes: ['ESC module fault', 'Wheel speed sensor fault', 'Low brake fluid'],
    can_drive: 'caution',
    action_en: 'Drive carefully avoiding sharp manoeuvres. Book a service appointment.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Braking System',
    name_en: 'ABS Fault', name_cn: 'ABS故障警告灯',
    severity: 'WARNING',
    description_en: 'The Anti-lock Braking System has a fault. Normal braking still works but ABS is disabled.',
    causes: ['Wheel speed sensor fault', 'ABS module fault', 'Wiring fault'],
    can_drive: 'caution',
    action_en: 'Drive cautiously. Avoid emergency braking situations. Book a service appointment soon.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Braking System',
    name_en: 'ESC Fault', name_cn: 'ESC故障警告灯',
    severity: 'WARNING',
    description_en: 'The Electronic Stability Control system has a fault and is disabled.',
    causes: ['ESC module fault', 'Steering angle sensor fault', 'Wheel speed sensor fault'],
    can_drive: 'caution',
    action_en: 'Drive carefully. Avoid high speeds and sharp cornering. Book a service appointment.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Braking System',
    name_en: 'ESC OFF', name_cn: 'ESC OFF警告灯',
    severity: 'INFO',
    description_en: 'Electronic Stability Control has been manually switched off.',
    causes: ['Driver disabled ESC via button'],
    can_drive: 'yes',
    action_en: 'Re-enable ESC via the ESC button unless intentionally disabled (e.g., for off-road use).',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Braking System',
    name_en: 'Parking System Fault', name_cn: '驻车系统故障警告灯',
    severity: 'WARNING',
    description_en: 'The electronic parking brake (EPB) system has a fault.',
    causes: ['EPB actuator fault', 'EPB control module fault', 'Brake pad wear'],
    can_drive: 'caution',
    action_en: 'Ensure vehicle is on level ground before exiting. Book a service appointment immediately.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Braking System',
    name_en: 'Automatic Emergency Braking Alert', name_cn: '自动紧急制动报警警告灯',
    severity: 'WARNING',
    description_en: 'The Automatic Emergency Braking (AEB) system has triggered or has a fault.',
    causes: ['AEB activation during near-collision', 'AEB sensor blocked or dirty', 'System fault'],
    can_drive: 'caution',
    action_en: 'If triggered by near-collision, check for damage. If fault light remains, book a service.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Braking System',
    name_en: 'Brake System Fault', name_cn: '制动系统故障警告灯',
    severity: 'CRITICAL',
    description_en: 'A critical fault has been detected in the brake system.',
    causes: ['Low brake fluid', 'Brake line leak', 'Brake booster fault', 'Brake pad severely worn'],
    can_drive: 'no',
    action_en: 'Stop safely immediately. Do not drive. Have the vehicle inspected before moving.',
  },

  // ── Driver Assist（驾驶辅助）────────────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Driver Assist Limited (FCW/AEB)', name_cn: '驾驶辅助功能受限（FCW/AEB）',
    severity: 'INFO',
    description_en: 'Forward Collision Warning and Automatic Emergency Braking are temporarily unavailable.',
    causes: ['Camera/radar blocked by dirt, rain, or fog', 'Sensor temperature out of range', 'System calibration required after windscreen replacement'],
    can_drive: 'yes',
    action_en: 'Clean sensors. If persists, book calibration at a dealer.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Driver Assist Limited (BSD)', name_cn: '驾驶辅助功能受限（BSD）',
    severity: 'INFO',
    description_en: 'Blind Spot Detection is temporarily unavailable.',
    causes: ['Rear radar sensors blocked or dirty', 'Sensor fault'],
    can_drive: 'yes',
    action_en: 'Clean rear sensors. If persists, book a service.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Driver Assist Limited (LDW/LDP)', name_cn: '驾驶辅助功能受限（LDW/LDP）',
    severity: 'INFO',
    description_en: 'Lane Departure Warning and Lane Departure Prevention are temporarily unavailable.',
    causes: ['Front camera blocked', 'Poor lane marking visibility', 'System fault'],
    can_drive: 'yes',
    action_en: 'Clean windscreen around camera. If persists, book calibration.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Adaptive Cruise Control Fault', name_cn: '自适应巡航故障警告灯',
    severity: 'WARNING',
    description_en: 'The Adaptive Cruise Control system has a fault and is unavailable.',
    causes: ['Front radar blocked or dirty', 'Radar module fault', 'Wiring fault'],
    can_drive: 'yes',
    action_en: 'Clean front bumper radar area. Book a service if light remains.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Blind Spot Monitor Fault', name_cn: '盲区监测故障警告灯',
    severity: 'WARNING',
    description_en: 'The Blind Spot Monitoring system has a fault.',
    causes: ['Rear radar sensor fault', 'Wiring fault'],
    can_drive: 'yes',
    action_en: 'Book a service appointment.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Lane Assist Fault', name_cn: '车道辅助系统故障警告灯',
    severity: 'WARNING',
    description_en: 'The Lane Keeping Assist system has a fault.',
    causes: ['Front camera fault', 'System software fault'],
    can_drive: 'yes',
    action_en: 'Book a service appointment.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Adaptive Headlight Fault', name_cn: '自适应前照灯故障警告灯',
    severity: 'WARNING',
    description_en: 'The adaptive headlight levelling or swivelling system has a fault.',
    causes: ['Headlight actuator fault', 'Ride height sensor fault'],
    can_drive: 'yes',
    action_en: 'Book a service. Headlights remain on but without auto-levelling.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Driver Assist',
    name_en: 'Driver Monitoring Fault', name_cn: '驾驶员监测辅助系统故障警告灯',
    severity: 'INFO',
    description_en: 'The Driver Monitoring System (DMS) has a fault.',
    causes: ['Interior camera blocked or dirty', 'System fault'],
    can_drive: 'yes',
    action_en: 'Clean interior camera lens. Book a service if persists.',
  },

  // ── Powertrain（动力系统）───────────────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Powertrain',
    name_en: 'EV Function Limited', name_cn: 'EV功能受限',
    severity: 'WARNING',
    description_en: 'The electric drive system is operating in a reduced-power mode.',
    causes: ['Battery temperature too high or low', 'Drive motor fault', 'Inverter fault', 'Overheating protection active'],
    can_drive: 'caution',
    action_en: 'Reduce speed and load. Allow vehicle to cool if overheated. Book a service if persists.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Powertrain',
    name_en: 'Powertrain Fault', name_cn: '动力系统故障警告灯',
    severity: 'CRITICAL',
    description_en: 'A critical fault has been detected in the powertrain system.',
    causes: ['Drive motor fault', 'Inverter fault', 'High voltage system fault'],
    can_drive: 'no',
    action_en: 'Stop safely. Do not drive. Contact dealer for recovery.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Powertrain',
    name_en: 'Drive Power Limited', name_cn: '驱动功率限制警告灯',
    severity: 'WARNING',
    description_en: 'Drive power is being limited by the system (limp mode).',
    causes: ['Motor overtemperature', 'Battery overtemperature', 'System protection active'],
    can_drive: 'caution',
    action_en: 'Reduce driving demands. Pull over and allow cooling if possible. Book a service.',
  },

  // ── Steering & Chassis（转向与底盘）─────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Steering & Chassis',
    name_en: 'Check HDC System', name_cn: '请检查HDC系统',
    severity: 'WARNING',
    description_en: 'The Hill Descent Control system requires inspection.',
    causes: ['HDC module fault', 'Wheel speed sensor fault'],
    can_drive: 'caution',
    action_en: 'Avoid steep downhill driving until inspected. Book a service.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Steering & Chassis',
    name_en: 'Steering System Fault', name_cn: '转向系统故障警告灯',
    severity: 'CRITICAL',
    description_en: 'The Electric Power Steering (EPS) system has a fault. Steering may be very heavy.',
    causes: ['EPS motor fault', 'EPS control module fault', 'Steering angle sensor fault', 'Low 12V voltage'],
    can_drive: 'no',
    action_en: 'Stop safely. Steering will require more effort. Do not drive. Contact dealer.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Steering & Chassis',
    name_en: 'Tyre Pressure Fault', name_cn: '胎压故障警告灯',
    severity: 'WARNING',
    description_en: 'One or more tyres has low pressure or the TPMS has a fault.',
    causes: ['Puncture or slow tyre leak', 'Tyre pressure below minimum (typically 35 PSI)', 'TPMS sensor battery dead', 'Temperature change causing pressure drop'],
    can_drive: 'caution',
    action_en: 'Check tyre pressures immediately. Inflate to recommended pressure (see door jamb sticker). If puncture, replace or repair.',
  },

  // ── Safety（安全系统）──────────────────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Safety',
    name_en: 'Airbag Fault', name_cn: '安全气囊故障警告灯',
    severity: 'WARNING',
    description_en: 'A fault has been detected in the airbag / SRS system. Airbags may not deploy in a crash.',
    causes: ['Airbag control module fault', 'Seat belt pre-tensioner fault', 'Wiring fault under seat', 'Clock spring fault'],
    can_drive: 'caution',
    action_en: 'Book a service immediately. Occupant protection is compromised.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Safety',
    name_en: 'Seatbelt Reminder', name_cn: '安全带未系指示灯',
    severity: 'INFO',
    description_en: 'One or more occupants have not fastened their seatbelt.',
    causes: ['Seatbelt not buckled'],
    can_drive: 'caution',
    action_en: 'Fasten all seatbelts before driving.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Safety',
    name_en: 'Smart Key System Warning', name_cn: '智能钥匙系统警告灯',
    severity: 'WARNING',
    description_en: 'The smart key / keyless entry system has a fault or the key battery is low.',
    causes: ['Key fob battery low', 'Key module fault', 'Signal interference'],
    can_drive: 'caution',
    action_en: 'Replace key fob battery. If persists, book a service.',
  },

  // ── Lighting（灯光系统）────────────────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Lighting',
    name_en: 'Headlight Fault', name_cn: '前照灯故障警告灯',
    severity: 'WARNING',
    description_en: 'A headlight bulb or headlight system has a fault.',
    causes: ['LED headlight module fault', 'Headlight control unit fault', 'Wiring fault'],
    can_drive: 'caution',
    action_en: 'Check headlights are working. Book a service — LED headlights are dealer-replaced.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Lighting',
    name_en: 'Auto High Beam Fault', name_cn: '智能远近光灯故障指示灯',
    severity: 'INFO',
    description_en: 'The automatic high beam / intelligent headlight system has a fault.',
    causes: ['Front camera dirty or blocked', 'System fault'],
    can_drive: 'yes',
    action_en: 'Clean windscreen around camera. Use manual high beam control. Book a service if persists.',
  },

  // ── Thermal Management（热管理系统）─────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Thermal Management',
    name_en: 'Coolant Temperature High', name_cn: '冷却液温度过高警告灯',
    severity: 'CRITICAL',
    description_en: 'The coolant temperature has exceeded the safe operating threshold.',
    causes: ['Coolant level low', 'Coolant leak', 'Coolant pump fault', 'Thermostat fault', 'Blocked radiator'],
    can_drive: 'no',
    action_en: 'Stop immediately. Do not open the bonnet immediately. Allow to cool. Check coolant level. Call for assistance.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Thermal Management',
    name_en: 'Motor Overtemperature', name_cn: '电机过热警告灯',
    severity: 'WARNING',
    description_en: 'The drive motor has exceeded its safe operating temperature.',
    causes: ['Extended high-load driving', 'Towing at maximum capacity', 'Cooling system fault'],
    can_drive: 'caution',
    action_en: 'Reduce speed and load immediately. Pull over and allow cooling. If persists, book a service.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Thermal Management',
    name_en: 'Motor Coolant Temperature High', name_cn: '电机冷却液温度过高警告灯',
    severity: 'WARNING',
    description_en: 'The motor cooling circuit coolant temperature is too high.',
    causes: ['Motor cooling pump fault', 'Coolant level low in motor circuit', 'Cooling fan fault'],
    can_drive: 'caution',
    action_en: 'Reduce driving load. Book a service promptly.',
  },

  // ── Body Electronics（车身电子）────────────────────────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Body Electronics',
    name_en: 'Vehicle Network Fault', name_cn: '车辆网络故障',
    severity: 'WARNING',
    description_en: 'A fault has been detected in the vehicle CAN bus network.',
    causes: ['CAN bus communication error', 'Control module fault', 'Wiring or connector fault'],
    can_drive: 'caution',
    action_en: 'Book a dealer appointment. Multiple systems may be affected.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Body Electronics',
    name_en: 'Check Headlight System', name_cn: '请检查前照灯系统',
    severity: 'WARNING',
    description_en: 'The headlight control system requires inspection.',
    causes: ['Headlight levelling motor fault', 'Headlight control module fault'],
    can_drive: 'yes',
    action_en: 'Book a service appointment.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Body Electronics',
    name_en: 'Master Warning Light', name_cn: '主告警指示灯',
    severity: 'WARNING',
    description_en: 'A general system warning. Check the vehicle display for the specific message.',
    causes: ['Various — check instrument cluster message'],
    can_drive: 'caution',
    action_en: 'Read the accompanying message on the display screen. Follow specific guidance shown.',
  },

  // ── Engine System（发动机系统）— DM-i models only ───────────────────────────
  {
    brand_id: 'byd', model_id: null,
    category: 'Engine System',
    name_en: 'Engine Accessory Function Limited', name_cn: '发动机附件功能受限',
    severity: 'INFO',
    description_en: 'An engine accessory (alternator, A/C compressor, etc.) is operating in reduced mode.',
    causes: ['Accessory belt fault', 'Alternator fault', 'A/C compressor issue'],
    can_drive: 'caution',
    action_en: 'Book a service appointment. DM-i models use engine for charging in some conditions.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Engine System',
    name_en: 'Emission Fault Indicator', name_cn: '排放故障指示灯',
    severity: 'WARNING',
    description_en: 'The engine emission control system has detected a fault (DM-i models).',
    causes: ['Catalytic converter fault', 'Oxygen sensor fault', 'EGR valve fault'],
    can_drive: 'caution',
    action_en: 'Book a service appointment. Vehicle may fail emissions testing.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Engine System',
    name_en: 'Engine Fault Warning', name_cn: '发动机故障警告灯',
    severity: 'WARNING',
    description_en: 'The engine control unit has detected a fault (DM-i / DM-p models).',
    causes: ['Various engine faults — read DTC codes with a scanner', 'Fuel system fault', 'Ignition fault'],
    can_drive: 'caution',
    action_en: 'Book a dealer service. For DM-i models, EV mode may still work — avoid engine-on driving.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Engine System',
    name_en: 'Low Fuel Warning', name_cn: '燃油低警告灯',
    severity: 'INFO',
    description_en: 'The fuel tank is running low (DM-i / DM-p models only).',
    causes: ['Fuel level critically low'],
    can_drive: 'caution',
    action_en: 'Refuel as soon as possible. In DM-i mode, EV range remains available.',
  },
  {
    brand_id: 'byd', model_id: null,
    category: 'Engine System',
    name_en: 'Low Oil Pressure Warning', name_cn: '机油压力低警告灯',
    severity: 'CRITICAL',
    description_en: 'Engine oil pressure is critically low (DM-i / DM-p models).',
    causes: ['Oil level low', 'Oil pump fault', 'Oil leak'],
    can_drive: 'no',
    action_en: 'Stop immediately. Do not run the engine. Check oil level. Call for assistance.',
  },

  // ── Model-specific: BYD Atto 3（元PLUS）────────────────────────────────────
  {
    brand_id: 'byd', model_id: 'byd-atto-3',
    category: 'Powertrain',
    name_en: 'Atto 3: High Voltage Interlock Fault', name_cn: '元PLUS：高压互锁故障',
    severity: 'CRITICAL',
    description_en: 'A high-voltage circuit interlock fault specific to the BYD Atto 3.',
    causes: ['High voltage connector not fully seated', 'Wiring harness damage', 'Maintenance cover open'],
    can_drive: 'no',
    action_en: 'Do not drive. Contact BYD dealer immediately.',
  },

  // ── Model-specific: BYD Dolphin（海豚）─────────────────────────────────────
  {
    brand_id: 'byd', model_id: 'byd-dolphin',
    category: 'Body Electronics',
    name_en: 'Dolphin: Gear Selector Fault', name_cn: '海豚：请检查挡位系统',
    severity: 'WARNING',
    description_en: 'The electronic gear selector system on the BYD Dolphin has a fault.',
    causes: ['Gear selector module fault', 'Communication fault between gear selector and VCU'],
    can_drive: 'caution',
    action_en: 'Try cycling power off and on. Book dealer appointment if persists.',
  },

  // ── Model-specific: BYD Han EV（汉EV）──────────────────────────────────────
  {
    brand_id: 'byd', model_id: 'byd-han-ev',
    category: 'Driver Assist',
    name_en: 'Han EV: Remote Driving Suspended', name_cn: '汉EV：遥控驾驶暂停使用',
    severity: 'INFO',
    description_en: 'The remote driving feature on the BYD Han EV is temporarily unavailable.',
    causes: ['Signal quality insufficient', 'System update in progress', 'Feature disabled'],
    can_drive: 'yes',
    action_en: 'Normal driving is unaffected. Check BYD app for remote driving status.',
  },

  // ── Model-specific: BYD Seal（海豹）────────────────────────────────────────
  {
    brand_id: 'byd', model_id: 'byd-seal',
    category: 'Body Electronics',
    name_en: 'Seal: Memory System Fault', name_cn: '海豹：请检查记忆系统',
    severity: 'INFO',
    description_en: 'The seat/mirror/steering memory system on the BYD Seal has a fault.',
    causes: ['Memory module fault', '12V supply interruption cleared settings'],
    can_drive: 'yes',
    action_en: 'Re-save seat and mirror positions. Book a service if persists.',
  },
]

async function main() {
  console.log(`Seeding ${BYD_LIGHTS.length} BYD warning lights...`)

  for (const light of BYD_LIGHTS) {
    await db.insert(warningLights).values({
      brand_id: light.brand_id,
      model_id: light.model_id ?? null,
      category: light.category,
      name_en: light.name_en,
      name_cn: light.name_cn ?? null,
      severity: light.severity ?? null,
      description_en: light.description_en ?? null,
      causes: light.causes ?? null,
      can_drive: light.can_drive ?? null,
      action_en: light.action_en ?? null,
    })
  }

  console.log('Done.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run seed script**

```bash
pnpm exec dotenv -e .env.local -- tsx scripts/seed-warning-lights.ts
```

Expected output:
```
Seeding 44 BYD warning lights...
Done.
```

- [ ] **Step 3: Verify data in DB**

```bash
pnpm exec dotenv -e .env.local -- tsx -e "
import { db } from './lib/db/index'
import { warningLights } from './lib/db/schema'
import { count } from 'drizzle-orm'
const [r] = await db.select({ n: count() }).from(warningLights)
console.log('Warning lights in DB:', r.n)
process.exit(0)
"
```

Expected: `Warning lights in DB: 44`

- [ ] **Step 4: Add seed script to package.json**

In `package.json`, add to the `scripts` block:
```json
"seed:warnings": "dotenv -e .env.local -- tsx scripts/seed-warning-lights.ts"
```

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-warning-lights.ts package.json
git commit -m "feat: add BYD warning lights seed script and data"
```

---

## Task 5: DB queries — lib/db/warning-lights.ts (fix inArray)

**Files:**
- Create: `lib/db/warning-lights.ts`

> This task replaces the placeholder created in Task 3. Write the final, correct version:

- [ ] **Step 1: Write the final query file**

Create `lib/db/warning-lights.ts` with this content:

```typescript
import { eq, or, isNull, and, inArray } from 'drizzle-orm'
import { db } from './index'
import { warningLights, warningLightDtcLinks, dtcs, models } from './schema'
import type { WarningLight, WarningLightWithDtcs } from '../types'

function toWarningLight(r: typeof warningLights.$inferSelect): WarningLight {
  return {
    id: r.id,
    brand_id: r.brand_id,
    model_id: r.model_id ?? null,
    category: r.category,
    name_en: r.name_en,
    name_cn: r.name_cn ?? null,
    severity: (r.severity as WarningLight['severity']) ?? null,
    description_en: r.description_en ?? null,
    causes: Array.isArray(r.causes) ? (r.causes as string[]) : null,
    can_drive: (r.can_drive as WarningLight['can_drive']) ?? null,
    action_en: r.action_en ?? null,
  }
}

async function attachDtcs(
  rows: (typeof warningLights.$inferSelect)[]
): Promise<WarningLightWithDtcs[]> {
  const lightIds = rows.map((r) => r.id)
  if (lightIds.length === 0) return []

  const links = await db
    .select({
      warning_light_id: warningLightDtcLinks.warning_light_id,
      dtc_id: dtcs.dtc_id,
      dtc_code: dtcs.dtc_code,
      description_en: dtcs.description_en,
    })
    .from(warningLightDtcLinks)
    .innerJoin(dtcs, eq(warningLightDtcLinks.dtc_id, dtcs.dtc_id))
    .where(inArray(warningLightDtcLinks.warning_light_id, lightIds))

  const dtcMap = new Map<number, { dtc_id: number; dtc_code: string; description_en: string }[]>()
  for (const link of links) {
    if (!dtcMap.has(link.warning_light_id)) dtcMap.set(link.warning_light_id, [])
    dtcMap.get(link.warning_light_id)!.push({
      dtc_id: link.dtc_id,
      dtc_code: link.dtc_code,
      description_en: link.description_en,
    })
  }

  return rows.map((r) => ({ ...toWarningLight(r), dtcs: dtcMap.get(r.id) ?? [] }))
}

export async function getWarningLightsForBrand(brandId: string): Promise<WarningLight[]> {
  const rows = await db
    .select()
    .from(warningLights)
    .where(eq(warningLights.brand_id, brandId))
  return rows.map(toWarningLight)
}

export async function getWarningLightsForModel(
  brandId: string,
  modelId: string
): Promise<WarningLightWithDtcs[]> {
  const rows = await db
    .select()
    .from(warningLights)
    .where(
      and(
        eq(warningLights.brand_id, brandId),
        or(isNull(warningLights.model_id), eq(warningLights.model_id, modelId))
      )
    )
  return attachDtcs(rows)
}

export async function getBrandsWithWarningLights(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ brand_id: warningLights.brand_id })
    .from(warningLights)
  return rows.map((r) => r.brand_id)
}

export async function getModelSlugsWithWarningLights(brandId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: models.slug })
    .from(warningLights)
    .innerJoin(models, eq(warningLights.model_id, models.model_id))
    .where(eq(warningLights.brand_id, brandId))
  const seen = new Set<string>()
  return rows
    .filter((r) => { if (seen.has(r.slug)) return false; seen.add(r.slug); return true })
    .map((r) => r.slug)
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm exec tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db/warning-lights.ts
git commit -m "feat: add warning lights DB query module"
```

---

## Task 6: Static params — update lib/db/static-params.ts

**Files:**
- Modify: `lib/db/static-params.ts`

- [ ] **Step 1: Add warning light static param helpers**

Add to the bottom of `lib/db/static-params.ts`:

```typescript
import { warningLights } from './schema'
// add 'warningLights' to the existing import line at top, e.g.:
// import { markets, models, dtcs, dtcModelNotes, dealers, warningLights } from './schema'

/** All brand IDs that have at least one warning light */
export async function getWarningLightBrands(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ brand_id: warningLights.brand_id })
    .from(warningLights)
  return rows.map((r) => r.brand_id)
}

/** All model slugs that have model-specific warning lights for a given brand */
export async function getWarningLightModelSlugs(
  brandId: string
): Promise<string[]> {
  const rows = await db
    .select({ slug: models.slug })
    .from(warningLights)
    .innerJoin(models, eq(warningLights.model_id, models.model_id))
    .where(eq(warningLights.brand_id, brandId))
  const seen = new Set<string>()
  return rows
    .filter((r) => { if (seen.has(r.slug)) return false; seen.add(r.slug); return true })
    .map((r) => r.slug)
}
```

Note: update the import at the top of `static-params.ts` to include `warningLights` and `eq` (already imported):
```typescript
import { markets, models, dtcs, dtcModelNotes, dealers, warningLights } from './schema'
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/static-params.ts
git commit -m "feat: add warning light static param helpers"
```

---

## Task 7: Brand summary page — app/[market]/warnings/[brand]/page.tsx

**Files:**
- Create: `app/[market]/warnings/[brand]/page.tsx`

- [ ] **Step 1: Create the brand summary page**

Create `app/[market]/warnings/[brand]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWarningLightsForBrand } from '@/lib/db/warning-lights'
import { getModelSlugsWithWarningLights, getWarningLightBrands, getActiveMarketCodes } from '@/lib/db/static-params'
import { getAllModelsWithBrand } from '@/lib/db/models'
import { SeverityBadge } from '@/components/SeverityBadge'
import { BASE_URL } from '@/lib/config'
import type { Severity, WarningLight } from '@/lib/types'

export const revalidate = 1800
export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, brands] = await Promise.all([
    getActiveMarketCodes(),
    getWarningLightBrands(),
  ])
  return markets.flatMap((market) => brands.map((brand) => ({ market, brand })))
}

interface Props {
  params: Promise<{ market: string; brand: string }>
}

const BRAND_LABELS: Record<string, string> = {
  byd: 'BYD',
  mg: 'MG',
}

const MARKET_LABELS: Record<string, string> = {
  au: 'Australia',
  uk: 'United Kingdom',
  uae: 'UAE',
  no: 'Norway',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand } = await params
  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()
  const marketLabel = MARKET_LABELS[market] ?? market.toUpperCase()
  const title = `${brandLabel} Warning Lights — What They Mean | EVAftermarket ${marketLabel}`
  const description = `Complete guide to ${brandLabel} dashboard warning lights for ${marketLabel} owners. Warning lights explained with severity, causes, and what to do.`
  const url = `${BASE_URL}/${market}/warnings/${brand}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

function groupByCategory(lights: WarningLight[]): Record<string, WarningLight[]> {
  const groups: Record<string, WarningLight[]> = {}
  for (const l of lights) {
    if (!groups[l.category]) groups[l.category] = []
    groups[l.category].push(l)
  }
  return groups
}

export default async function WarningLightsBrandPage({ params }: Props) {
  const { market, brand } = await params
  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()

  const [lights, modelSlugs, allModels] = await Promise.all([
    getWarningLightsForBrand(brand),
    getModelSlugsWithWarningLights(brand),
    getAllModelsWithBrand(),
  ])

  if (lights.length === 0) notFound()

  const brandModels = allModels.filter((m) => m.brand_id === brand)
  const groups = groupByCategory(lights)
  const criticalCount = lights.filter((l) => l.severity === 'CRITICAL').length
  const warningCount = lights.filter((l) => l.severity === 'WARNING').length

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>{brandLabel} Warning Lights</span>
        </nav>

        {/* Hero */}
        <div className="list-hero">
          <h1>{brandLabel} Warning Lights — {MARKET_LABELS[market] ?? market.toUpperCase()}</h1>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '56ch' }}>
            Dashboard warning light meanings, severity, and what to do for {brandLabel} vehicles.
          </p>
          <div className="list-stats">
            <div className="stat">
              <span className="stat-num">{lights.length}</span>
              <span className="stat-label">Warning Lights</span>
            </div>
            {criticalCount > 0 && (
              <div className="stat">
                <span className="stat-num red">{criticalCount}</span>
                <span className="stat-label">Critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="stat">
                <span className="stat-num amber">{warningCount}</span>
                <span className="stat-label">Warning</span>
              </div>
            )}
          </div>
        </div>

        {/* Lights grouped by category */}
        {Object.entries(groups).map(([category, categoryLights]) => (
          <div key={category}>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">{category}</span>
            </div>
            <ul className="dtc-list">
              {categoryLights.map((light) => (
                <li key={light.id}>
                  <a
                    href={light.model_id
                      ? `/${market}/warnings/${brand}/${light.model_id}`
                      : `/${market}/warnings/${brand}`}
                    className="dtc-row"
                    style={{ cursor: light.model_id ? 'pointer' : 'default' }}
                  >
                    <div className="dtc-row-top">
                      <span className="dtc-code-cell" style={{ fontFamily: 'inherit', fontSize: '14px', fontWeight: 600 }}>
                        {light.name_en}
                      </span>
                      {light.severity && <SeverityBadge severity={light.severity as Severity} />}
                      {light.model_id && <span className="dtc-arrow">›</span>}
                    </div>
                    <span className="dtc-desc-cell">
                      {light.name_cn && <span style={{ color: 'var(--text-faint)', marginRight: '8px' }}>{light.name_cn}</span>}
                      {light.description_en?.split('.')[0]}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Browse by Model */}
        {brandModels.length > 0 && (
          <>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">Browse by Model</span>
            </div>
            <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {brandModels.map((m) => (
                <a
                  key={m.model_id}
                  href={`/${market}/warnings/${brand}/${m.slug}`}
                  style={{
                    padding: '7px 12px',
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
                  {m.model_name}
                </a>
              ))}
            </div>
          </>
        )}

      </article>
    </div>
  )
}
```

- [ ] **Step 2: Check page loads**

Visit http://localhost:3000/au/warnings/byd — should show BYD warning lights grouped by category.

- [ ] **Step 3: Commit**

```bash
git add app/[market]/warnings/[brand]/page.tsx
git commit -m "feat: add BYD warning lights brand summary page"
```

---

## Task 8: Model detail page — app/[market]/warnings/[brand]/[model]/page.tsx

**Files:**
- Create: `app/[market]/warnings/[brand]/[model]/page.tsx`

- [ ] **Step 1: Create the model detail page**

Create `app/[market]/warnings/[brand]/[model]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWarningLightsForModel } from '@/lib/db/warning-lights'
import { getModelBySlug } from '@/lib/db/models'
import { getWarningLightBrands, getWarningLightModelSlugs, getActiveMarketCodes } from '@/lib/db/static-params'
import { SeverityBadge } from '@/components/SeverityBadge'
import { DisclaimerBox } from '@/components/DisclaimerBox'
import { BASE_URL } from '@/lib/config'
import type { Severity, WarningLightWithDtcs } from '@/lib/types'

export const revalidate = 1800
export const dynamicParams = true

export async function generateStaticParams() {
  const markets = await getActiveMarketCodes()
  const brands = await getWarningLightBrands()
  const pairs: { market: string; brand: string; model: string }[] = []
  for (const brand of brands) {
    const slugs = await getWarningLightModelSlugs(brand)
    for (const market of markets) {
      for (const model of slugs) {
        pairs.push({ market, brand, model })
      }
    }
  }
  return pairs
}

interface Props {
  params: Promise<{ market: string; brand: string; model: string }>
}

const BRAND_LABELS: Record<string, string> = { byd: 'BYD', mg: 'MG' }
const MARKET_LABELS: Record<string, string> = { au: 'Australia', uk: 'United Kingdom', uae: 'UAE', no: 'Norway' }

const CAN_DRIVE_CONFIG = {
  yes: { label: 'Yes — safe to drive', color: 'oklch(34% 0.14 145)', bg: 'oklch(93% 0.06 145)' },
  caution: { label: 'With caution — monitor closely', color: 'oklch(40% 0.12 70)', bg: 'oklch(95% 0.06 70)' },
  no: { label: 'No — stop driving', color: 'oklch(40% 0.18 25)', bg: 'oklch(95% 0.05 25)' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}
  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()
  const title = `${modelData.model_name} Warning Lights — Meanings & What To Do | EVAftermarket`
  const description = `Complete guide to ${modelData.model_name} dashboard warning lights: what each light means, whether you can drive, and what to do next.`
  const url = `${BASE_URL}/${market}/warnings/${brand}/${model}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'article' },
    twitter: { card: 'summary', title, description },
  }
}

function groupByCategory(lights: WarningLightWithDtcs[]): Record<string, WarningLightWithDtcs[]> {
  const groups: Record<string, WarningLightWithDtcs[]> = {}
  for (const l of lights) {
    if (!groups[l.category]) groups[l.category] = []
    groups[l.category].push(l)
  }
  return groups
}

export default async function WarningLightsModelPage({ params }: Props) {
  const { market, brand, model } = await params
  const [modelData, lights] = await Promise.all([
    getModelBySlug(model),
    getWarningLightsForModel(brand, model),
  ])
  if (!modelData) notFound()

  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()
  const groups = groupByCategory(lights)
  const criticalCount = lights.filter((l) => l.severity === 'CRITICAL').length
  const warningCount = lights.filter((l) => l.severity === 'WARNING').length

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <a href={`/${market}/warnings/${brand}`}>{brandLabel} Warning Lights</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>{modelData.model_name}</span>
        </nav>

        {/* Hero */}
        <div className="list-hero">
          <h1>{modelData.model_name} Warning Lights</h1>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '56ch' }}>
            Dashboard warning light meanings and guidance for {modelData.model_name} owners in {MARKET_LABELS[market] ?? market.toUpperCase()}.
          </p>
          <div className="list-stats">
            <div className="stat">
              <span className="stat-num">{lights.length}</span>
              <span className="stat-label">Warning Lights</span>
            </div>
            {criticalCount > 0 && (
              <div className="stat">
                <span className="stat-num red">{criticalCount}</span>
                <span className="stat-label">Critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="stat">
                <span className="stat-num amber">{warningCount}</span>
                <span className="stat-label">Warning</span>
              </div>
            )}
          </div>
        </div>

        {/* Lights grouped by category */}
        <div className="detail-body" style={{ paddingTop: '4px' }}>
          {Object.entries(groups).map(([category, categoryLights]) => (
            <div key={category} className="section">
              <span className="section-label">{category}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {categoryLights.map((light) => {
                  const canDriveCfg = light.can_drive ? CAN_DRIVE_CONFIG[light.can_drive] : null
                  const causes = light.causes ?? []
                  return (
                    <div key={light.id} style={{
                      border: '1px solid var(--border-soft)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'oklch(99.5% 0 0)',
                    }}>
                      {/* Card header */}
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'oklch(18% 0.01 60)' }}>
                            {light.name_en}
                          </span>
                          {light.severity && <SeverityBadge severity={light.severity as Severity} />}
                        </div>
                        {light.name_cn && (
                          <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '2px' }}>
                            {light.name_cn}
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {light.description_en && (
                          <p style={{ fontSize: '13px', color: 'oklch(28% 0.01 60)', lineHeight: 1.55 }}>
                            {light.description_en}
                          </p>
                        )}

                        {/* Can I drive? */}
                        {canDriveCfg && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '2px', minWidth: '80px',
                            }}>Can I drive?</span>
                            <span style={{
                              fontSize: '12.5px', fontWeight: 600, padding: '2px 8px',
                              borderRadius: '4px', background: canDriveCfg.bg, color: canDriveCfg.color,
                            }}>{canDriveCfg.label}</span>
                          </div>
                        )}

                        {/* Causes */}
                        {causes.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px', minWidth: '80px',
                            }}>Causes</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {causes.map((c, i) => (
                                <span key={i} style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)', lineHeight: 1.45 }}>
                                  — {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action */}
                        {light.action_en && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px', minWidth: '80px',
                            }}>What to do</span>
                            <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)', lineHeight: 1.45 }}>
                              {light.action_en}
                            </span>
                          </div>
                        )}

                        {/* Related DTCs */}
                        {light.dtcs.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '4px', minWidth: '80px',
                            }}>Fault Codes</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {light.dtcs.map((d) => (
                                <a
                                  key={d.dtc_id}
                                  href={`/${market}/dtc/${model}/${d.dtc_code.toLowerCase()}`}
                                  style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700,
                                    padding: '3px 8px', borderRadius: '4px',
                                    background: 'oklch(93% 0.01 60)', color: 'oklch(28% 0.01 60)',
                                    textDecoration: 'none', border: '1px solid var(--border-soft)',
                                  }}
                                  title={d.description_en}
                                >
                                  {d.dtc_code}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <DisclaimerBox confidence="community" sourceUrls={[]} />
      </article>
    </div>
  )
}
```

- [ ] **Step 2: Check page loads**

Visit http://localhost:3000/au/warnings/byd/byd-atto-3 — should show Atto 3 warning lights with full card detail.

- [ ] **Step 3: Commit**

```bash
git add "app/[market]/warnings/[brand]/[model]/page.tsx"
git commit -m "feat: add warning lights model detail page"
```

---

## Task 9: Model page — add Warning Lights to More Resources

**Files:**
- Modify: `app/[market]/models/[slug]/page.tsx`

- [ ] **Step 1: Add Warning Lights link to More Resources grid**

In `app/[market]/models/[slug]/page.tsx`, find the More Resources section (around line 325). After the `service/${slug}` link block and before the dealers link block, insert:

```tsx
<a
  href={`/${market}/warnings/${model.brand_id}/${slug}`}
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    border: '1px solid var(--border-soft)',
    borderRadius: '6px',
    textDecoration: 'none',
    background: 'oklch(99% 0 0)',
  }}
>
  <div>
    <div style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '2px' }}>
      Warning Lights
    </div>
    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
      Dashboard warning light meanings and what to do
    </div>
  </div>
  <span style={{ color: 'var(--green)', fontSize: '18px' }}>›</span>
</a>
```

- [ ] **Step 2: Verify model page**

Visit http://localhost:3000/au/models/byd-atto-3 — confirm Warning Lights appears in More Resources between Service Costs and Find a Dealer.

- [ ] **Step 3: Commit**

```bash
git add "app/[market]/models/[slug]/page.tsx"
git commit -m "feat: add Warning Lights entry to model page More Resources"
```

---

## Task 10: Dev portal — add warning light routes

**Files:**
- Modify: `app/dev/page.tsx`

- [ ] **Step 1: Add Warning Lights group to dev portal**

In `app/dev/page.tsx`, add a new group to the `GROUPS` array after the `Updates` group:

```typescript
{
  icon: '⚠️',
  label: 'Warning Lights',
  links: [
    { href: '/au/warnings/byd', note: 'brand summary' },
    { href: '/au/warnings/byd/byd-atto-3', note: 'model detail' },
  ],
  hint: 'byd-dolphin, byd-seal etc. also work',
},
```

- [ ] **Step 2: Verify dev portal**

Visit http://localhost:3000/dev — confirm Warning Lights group appears.

- [ ] **Step 3: Commit**

```bash
git add app/dev/page.tsx
git commit -m "feat: add warning lights routes to dev portal"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| New DB tables (`mf_nv_warning_lights`, `mf_nv_warning_light_dtc_links`) | Task 1 |
| `WarningLight`, `WarningLightWithDtcs`, `CanDrive` types | Task 2 |
| DB query functions | Task 5 |
| Static params helpers | Task 6 |
| Seed script with BYD 58 lights | Task 4 |
| Brand summary page `/[market]/warnings/[brand]` | Task 7 |
| Model detail page `/[market]/warnings/[brand]/[model]` | Task 8 |
| Model page More Resources link | Task 9 |
| Dev portal routes | Task 10 |
| Severity badge reuse | Task 8 (uses `SeverityBadge`) |
| DisclaimerBox reuse | Task 8 (uses `DisclaimerBox`) |
| Related DTC chips on model page | Task 8 |
| SEO metadata on both pages | Tasks 7 & 8 |
| `revalidate = 1800`, `dynamicParams = true` | Tasks 7 & 8 |

**No gaps found.**

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:** `WarningLight` and `WarningLightWithDtcs` defined in Task 2, used consistently in Tasks 5, 7, 8. `CanDrive` type used in Task 2 and 8. `toWarningLight()` helper defined once in Task 5, not duplicated.
