import { sb } from './index'

export async function getModelBySlug(slug: string) {
  const { data, error } = await sb
    .from('mf_nv_models')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .single()
  if (error) return null
  return data
}

export async function getModelsByBrand(brandId: string) {
  const { data, error } = await sb.from('mf_nv_models').select('*').eq('brand_id', brandId)
  if (error) throw error
  return data ?? []
}

export async function getAllModelsWithBrand() {
  const { data: modelsData, error: modelsError } = await sb
    .from('mf_nv_models')
    .select('model_id, model_name, vehicle_type, years, steering, slug, brand_id')
  if (modelsError) throw modelsError

  const brandIds = [...new Set((modelsData ?? []).map((m) => m.brand_id).filter(Boolean))]
  const { data: brandsData, error: brandsError } = await sb
    .from('mf_nv_brands')
    .select('brand_id, brand_name_en, brand_name_cn, logo_url')
    .in('brand_id', brandIds)
  if (brandsError) throw brandsError

  const brandMap = new Map<string, any>()
  for (const b of brandsData ?? []) brandMap.set(b.brand_id, b)

  return (modelsData ?? []).map((row) => {
    const brand = brandMap.get(row.brand_id)
    return {
      model_id: row.model_id,
      model_name: row.model_name,
      vehicle_type: row.vehicle_type,
      years: row.years,
      steering: row.steering,
      slug: row.slug,
      brand_id: row.brand_id,
      brand_name_en: brand?.brand_name_en ?? null,
      brand_name_cn: brand?.brand_name_cn ?? null,
      logo_url: brand?.logo_url ?? null,
    }
  })
}

export async function getAllModelSlugs() {
  const { data, error } = await sb.from('mf_nv_models').select('slug, model_id')
  if (error) throw error
  return data ?? []
}
