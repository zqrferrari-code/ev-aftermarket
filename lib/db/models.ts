import { eq } from 'drizzle-orm'
import { db } from './index'
import { models, brands } from './schema'

export async function getModelBySlug(slug: string) {
  const rows = await db
    .select()
    .from(models)
    .where(eq(models.slug, slug))
    .limit(1)
  return rows[0] ?? null
}

export async function getModelsByBrand(brandId: string) {
  return db.select().from(models).where(eq(models.brand_id, brandId))
}

export async function getAllModelsWithBrand() {
  return db
    .select({
      model_id: models.model_id,
      model_name: models.model_name,
      vehicle_type: models.vehicle_type,
      years: models.years,
      steering: models.steering,
      slug: models.slug,
      brand_id: brands.brand_id,
      brand_name_en: brands.brand_name_en,
      brand_name_cn: brands.brand_name_cn,
      logo_url: brands.logo_url,
    })
    .from(models)
    .leftJoin(brands, eq(models.brand_id, brands.brand_id))
}

export async function getAllModelSlugs() {
  return db
    .select({
      slug: models.slug,
      model_id: models.model_id,
    })
    .from(models)
}
