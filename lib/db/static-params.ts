import { sb } from './index'

// Models with insufficient DTC data — exclude from DTC pages until data is complete
const DTC_EXCLUDED_MODELS = ['byd-dolphin', 'mg-mg4', 'mg-zs-ev']

export async function getActiveMarketCodes(): Promise<string[]> {
  const { data, error } = await sb
    .from('mf_nv_markets')
    .select('market_code')
    .eq('active', true)
  if (error) throw error
  return (data ?? []).map((r) => r.market_code)
}

export async function getAllSlugs(): Promise<string[]> {
  const { data, error } = await sb
    .from('mf_nv_models')
    .select('slug')
    .not('slug', 'in', `(${DTC_EXCLUDED_MODELS.map((s) => `"${s}"`).join(',')})`)
  if (error) throw error
  return (data ?? []).map((r) => r.slug)
}

/** Returns all unique { slug, dtc_code } pairs across models with sufficient DTC data */
export async function getAllDtcModelCodePairs(): Promise<{ slug: string; code: string }[]> {
  // Step 1: get all dtc_model_notes (model_id + dtc_id)
  const { data: notesData, error: notesError } = await sb
    .from('mf_nv_dtc_model_notes')
    .select('model_id, dtc_id')
  if (notesError) throw notesError
  if (!notesData || notesData.length === 0) return []

  const modelIds = [...new Set(notesData.map((n) => n.model_id).filter(Boolean))]
  const dtcIds = [...new Set(notesData.map((n) => n.dtc_id).filter(Boolean))]

  // Step 2: get model slugs (excluding DTC_EXCLUDED_MODELS) and dtc codes in parallel
  const [{ data: modelsData, error: modelsError }, { data: dtcsData, error: dtcsError }] = await Promise.all([
    sb.from('mf_nv_models').select('model_id, slug').in('model_id', modelIds)
      .not('slug', 'in', `(${DTC_EXCLUDED_MODELS.map((s) => `"${s}"`).join(',')})`),
    sb.from('mf_nv_dtcs').select('dtc_id, dtc_code').in('dtc_id', dtcIds),
  ])
  if (modelsError) throw modelsError
  if (dtcsError) throw dtcsError

  const slugMap = new Map<string, string>()
  for (const m of modelsData ?? []) slugMap.set(m.model_id, m.slug)

  const dtcCodeMap = new Map<number, string>()
  for (const d of dtcsData ?? []) dtcCodeMap.set(d.dtc_id, d.dtc_code)

  const seen = new Set<string>()
  const result: { slug: string; code: string }[] = []
  for (const note of notesData) {
    const slug = slugMap.get(note.model_id)
    const dtcCode = dtcCodeMap.get(note.dtc_id)
    if (!slug || !dtcCode) continue
    const key = `${slug}:${dtcCode}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ slug, code: dtcCode })
  }
  return result
}

/** Returns all unique { brand_id, state_province, market_code } from dealers table */
export async function getDealerStaticParams(): Promise<{ brand: string; state: string; market: string }[]> {
  const { data, error } = await sb
    .from('mf_nv_dealers')
    .select('brand_id, state_province, market_code')
  if (error) throw error

  const seen = new Set<string>()
  return (data ?? [])
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
  const { data, error } = await sb.from('mf_nv_warning_lights').select('brand_id')
  if (error) throw error
  const seen = new Set<string>()
  return (data ?? [])
    .map((r) => r.brand_id)
    .filter((b) => { if (seen.has(b)) return false; seen.add(b); return true })
}

/** All model slugs that have model-specific warning lights for a given brand */
export async function getWarningLightModelSlugs(brandId: string): Promise<string[]> {
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

/** All warning light slugs for a given brand (for generateStaticParams) */
export async function getWarningLightSlugs(brandId: string): Promise<string[]> {
  const { data, error } = await sb
    .from('mf_nv_warning_lights')
    .select('slug')
    .eq('brand_id', brandId)
  if (error) throw error
  return (data ?? []).map((r) => r.slug).filter((s): s is string => s !== null)
}
