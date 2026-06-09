import { eq, or, isNull, and, inArray } from 'drizzle-orm'
import { db } from './index'
import { warningLights, warningLightDtcLinks, dtcs, models } from './schema'
import type { WarningLight, WarningLightWithDtcs } from '../types'

function toWarningLight(r: typeof warningLights.$inferSelect): WarningLight {
  return {
    id: r.id,
    brand_id: r.brand_id,
    model_id: r.model_id ?? null,
    slug: r.slug ?? null,
    code: r.code ?? null,
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

export async function getWarningLightBySlug(
  brandId: string,
  slug: string
): Promise<WarningLightWithDtcs | null> {
  const rows = await db
    .select()
    .from(warningLights)
    .where(and(eq(warningLights.brand_id, brandId), eq(warningLights.slug, slug)))
    .limit(1)
  if (rows.length === 0) return null
  const result = await attachDtcs(rows)
  return result[0] ?? null
}
