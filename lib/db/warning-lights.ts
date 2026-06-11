import { sb } from './index'
import type { WarningLight, WarningLightWithDtcs } from '../types'

function toWarningLight(r: any): WarningLight {
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

async function attachDtcs(rows: any[]): Promise<WarningLightWithDtcs[]> {
  const lightIds = rows.map((r) => r.id)
  if (lightIds.length === 0) return []

  // Step 1: get warning_light_dtc_links
  const { data: linksData, error: linksError } = await sb
    .from('mf_nv_warning_light_dtc_links')
    .select('warning_light_id, dtc_id')
    .in('warning_light_id', lightIds)
  if (linksError) throw linksError

  const dtcIds = [...new Set((linksData ?? []).map((l) => l.dtc_id).filter(Boolean))]

  // Step 2: get dtcs
  const dtcMap = new Map<number, { dtc_id: number; dtc_code: string; description_en: string }>()
  if (dtcIds.length > 0) {
    const { data: dtcsData, error: dtcsError } = await sb
      .from('mf_nv_dtcs')
      .select('dtc_id, dtc_code, description_en')
      .in('dtc_id', dtcIds)
    if (dtcsError) throw dtcsError
    for (const d of dtcsData ?? []) {
      dtcMap.set(d.dtc_id, { dtc_id: d.dtc_id, dtc_code: d.dtc_code, description_en: d.description_en })
    }
  }

  // Build lightId -> dtcs map
  const lightDtcMap = new Map<number, { dtc_id: number; dtc_code: string; description_en: string }[]>()
  for (const link of linksData ?? []) {
    if (!link.dtc_id) continue
    const dtc = dtcMap.get(link.dtc_id)
    if (!dtc) continue
    if (!lightDtcMap.has(link.warning_light_id)) lightDtcMap.set(link.warning_light_id, [])
    lightDtcMap.get(link.warning_light_id)!.push(dtc)
  }

  return rows.map((r) => ({ ...toWarningLight(r), dtcs: lightDtcMap.get(r.id) ?? [] }))
}

export async function getWarningLightsForBrand(brandId: string): Promise<WarningLight[]> {
  const { data, error } = await sb
    .from('mf_nv_warning_lights')
    .select('*')
    .eq('brand_id', brandId)
  if (error) throw error
  return (data ?? []).map(toWarningLight)
}

export async function getWarningLightsForModel(
  brandId: string,
  modelId: string
): Promise<WarningLightWithDtcs[]> {
  const { data, error } = await sb
    .from('mf_nv_warning_lights')
    .select('*')
    .eq('brand_id', brandId)
    .or(`model_id.is.null,model_id.eq.${modelId}`)
  if (error) throw error
  return attachDtcs(data ?? [])
}

export async function getBrandsWithWarningLights(): Promise<string[]> {
  const { data, error } = await sb.from('mf_nv_warning_lights').select('brand_id')
  if (error) throw error
  const seen = new Set<string>()
  return (data ?? [])
    .map((r) => r.brand_id)
    .filter((b) => { if (seen.has(b)) return false; seen.add(b); return true })
}

export async function getModelSlugsWithWarningLights(brandId: string): Promise<string[]> {
  const { data: wlData, error: wlError } = await sb
    .from('mf_nv_warning_lights')
    .select('model_id')
    .eq('brand_id', brandId)
    .not('model_id', 'is', null)
  if (wlError) throw wlError

  const modelIds = [...new Set((wlData ?? []).map((r) => r.model_id).filter(Boolean))]
  if (modelIds.length === 0) return []

  const { data: modelsData, error: modelsError } = await sb
    .from('mf_nv_models')
    .select('slug')
    .in('model_id', modelIds)
  if (modelsError) throw modelsError

  const seen = new Set<string>()
  return (modelsData ?? [])
    .map((r) => r.slug)
    .filter((s) => { if (seen.has(s)) return false; seen.add(s); return true })
}

export async function getWarningLightBySlug(
  brandId: string,
  slug: string
): Promise<WarningLightWithDtcs | null> {
  const { data, error } = await sb
    .from('mf_nv_warning_lights')
    .select('*')
    .eq('brand_id', brandId)
    .eq('slug', slug)
    .limit(1)
    .single()
  if (error) return null
  return (await attachDtcs([data]))[0] ?? null
}
