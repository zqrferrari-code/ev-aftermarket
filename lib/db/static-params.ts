import { db } from './index'
import { markets, models, dtcs, dtcModelNotes, dealers, warningLights } from './schema'
import { eq, notInArray } from 'drizzle-orm'

// Models with insufficient DTC data — exclude from DTC pages until data is complete
const DTC_EXCLUDED_MODELS = ['byd-dolphin', 'mg-mg4', 'mg-zs-ev']

export async function getActiveMarketCodes(): Promise<string[]> {
  const rows = await db
    .select({ market_code: markets.market_code })
    .from(markets)
    .where(eq(markets.active, true))
  return rows.map((r) => r.market_code)
}

export async function getAllSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: models.slug }).from(models)
    .where(notInArray(models.slug, DTC_EXCLUDED_MODELS))
  return rows.map((r) => r.slug)
}

/** Returns all unique { slug, dtc_code } pairs across models with sufficient DTC data */
export async function getAllDtcModelCodePairs(): Promise<{ slug: string; code: string }[]> {
  const rows = await db
    .select({
      slug: models.slug,
      dtc_code: dtcs.dtc_code,
    })
    .from(dtcModelNotes)
    .innerJoin(dtcs, eq(dtcModelNotes.dtc_id, dtcs.dtc_id))
    .innerJoin(models, eq(dtcModelNotes.model_id, models.model_id))
    .where(notInArray(models.slug, DTC_EXCLUDED_MODELS))
  // deduplicate
  const seen = new Set<string>()
  return rows.filter((r) => {
    const key = `${r.slug}:${r.dtc_code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((r) => ({ slug: r.slug, code: r.dtc_code }))
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

/** All warning light slugs for a given brand (for generateStaticParams) */
export async function getWarningLightSlugs(brandId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: warningLights.slug })
    .from(warningLights)
    .where(eq(warningLights.brand_id, brandId))
  return rows.map((r) => r.slug).filter((s): s is string => s !== null)
}
