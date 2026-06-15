import { sb } from '@/lib/db'

// ─── 类型定义 ──────────────────────────────────────────────

export interface Part {
  id: number
  slug: string
  name_en: string
  name_cn: string | null
  category: string | null
  material: string | null
  is_dangerous: boolean
  notes: string | null
}

export interface PartWithCompatibility extends Part {
  compatible_models: {
    model_id: string
    model_name: string
    brand_id: string
    years: string | null
    oem_number: string | null
  }[]
}

export interface HsCode {
  id: number
  part_id: number
  country_code: string
  hs_code: string
  hs_code_type: string
  description_en: string | null
  description_local: string | null
  declaration_elements: string | null
  regulatory_conditions: string | null
  last_verified: string | null
  source_url: string | null
}

export interface TariffRate {
  id: number
  country_code: string
  hs_code: string
  mfn_rate: string | null
  fta_name: string | null
  fta_rate: string | null
  fta_conditions: string | null
  vat_rate: string | null
  additional_duties: string | null
  last_verified: string | null
  source_url: string | null
}

export interface PartPageData {
  part: PartWithCompatibility
  cnHsCode: HsCode | null
  auHsCode: HsCode | null
  tariffRate: TariffRate | null
}

export interface HsCodePageData {
  hsCode: HsCode
  tariffRate: TariffRate | null
  relatedParts: (Part & { model_slugs: string[] })[]
}

// ─── 纯函数（可单元测试）──────────────────────────────────

export function buildPartUrl(market: string, brand: string, model: string, part: string): string {
  return `/${market}/parts/${brand}/${model}/${part}`
}

export function buildHsCodeUrl(market: string, hsCode: string): string {
  return `/${market}/parts/hs/${hsCode}`
}

export function buildAliexpressSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query)
  const trackingId = process.env.NEXT_PUBLIC_ALIEXPRESS_TRACKING_ID
  if (trackingId) {
    return `https://www.aliexpress.com/wholesale?SearchText=${encoded}&aff_fcid=${trackingId}&aff_fsk=&aff_platform=portals-search&sk=_dT9BpKL&aff_trace_key=`
  }
  return `https://www.aliexpress.com/wholesale?SearchText=${encoded}`
}

export function calculateTariff(params: {
  partPrice: number
  shipping: number
  dutyRate: number
  vatRate: number
}): {
  cif: number
  duty: number
  vat: number
  total: number
} {
  const { partPrice, shipping, dutyRate, vatRate } = params
  const cif = partPrice + shipping
  const duty = cif * (dutyRate / 100)
  const vat = (cif + duty) * (vatRate / 100)
  const total = cif + duty + vat
  return {
    cif: Math.round(cif * 100) / 100,
    duty: Math.round(duty * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

// ─── 数据库查询函数 ────────────────────────────────────────

export async function getPartBySlug(partSlug: string): Promise<PartWithCompatibility | null> {
  const { data: part, error } = await sb
    .from('mf_parts')
    .select('*')
    .eq('slug', partSlug)
    .single()

  if (error || !part) return null

  const { data: compat } = await sb
    .from('mf_part_model_compatibility')
    .select('model_id, years, oem_number, mf_nv_models(model_name, brand_id)')
    .eq('part_id', part.id)

  return {
    ...part,
    compatible_models: ((compat ?? []) as any[]).map((c) => ({
      model_id: c.model_id,
      model_name: c.mf_nv_models?.model_name ?? '',
      brand_id: c.mf_nv_models?.brand_id ?? '',
      years: c.years,
      oem_number: c.oem_number,
    })),
  }
}

export async function getPartsByModel(modelId: string): Promise<Part[]> {
  const { data, error } = await sb
    .from('mf_part_model_compatibility')
    .select('mf_parts(*)')
    .eq('model_id', modelId)

  if (error || !data) return []
  return (data as any[]).map((row) => row.mf_parts).filter(Boolean)
}

export async function getHsCodesForPart(partId: number): Promise<HsCode[]> {
  const { data, error } = await sb
    .from('mf_part_hs_codes')
    .select('*')
    .eq('part_id', partId)

  if (error) return []
  return data ?? []
}

export async function getTariffRate(countryCode: string, hsCode: string): Promise<TariffRate | null> {
  const { data, error } = await sb
    .from('mf_tariff_rates')
    .select('*')
    .eq('country_code', countryCode)
    .eq('hs_code', hsCode)
    .single()

  if (error) return null
  return data
}

export async function getPartPageData(
  modelId: string,
  partSlug: string,
  marketCountryCode: string
): Promise<PartPageData | null> {
  const part = await getPartBySlug(partSlug)
  if (!part) return null

  const isCompatible = part.compatible_models.some(m => m.model_id === modelId)
  if (!isCompatible) return null

  const hsCodes = await getHsCodesForPart(part.id)
  const cnHsCode = hsCodes.find(h => h.country_code === 'CN' && h.hs_code_type === 'export') ?? null
  const auHsCode = hsCodes.find(h => h.country_code === marketCountryCode && h.hs_code_type === 'import') ?? null

  const tariffRate = auHsCode
    ? await getTariffRate(marketCountryCode, auHsCode.hs_code)
    : null

  return { part, cnHsCode, auHsCode, tariffRate }
}

export async function getHsCodePageData(
  hsCode: string,
  countryCode: string
): Promise<HsCodePageData | null> {
  const { data: hsCodeRow, error } = await sb
    .from('mf_part_hs_codes')
    .select('*')
    .eq('hs_code', hsCode)
    .eq('country_code', countryCode)
    .eq('hs_code_type', 'import')
    .limit(1)
    .single()

  if (error || !hsCodeRow) return null

  const tariffRate = await getTariffRate(countryCode, hsCode)

  const { data: allWithCode } = await sb
    .from('mf_part_hs_codes')
    .select('part_id')
    .eq('hs_code', hsCode)
    .eq('country_code', countryCode)

  const partIds = ((allWithCode ?? []) as any[]).map(r => r.part_id)
  const relatedParts: (Part & { model_slugs: string[] })[] = []

  for (const partId of partIds) {
    const { data: partRow } = await sb.from('mf_parts').select('*').eq('id', partId).single()
    if (!partRow) continue
    const { data: compat } = await sb
      .from('mf_part_model_compatibility')
      .select('model_id')
      .eq('part_id', partId)
    relatedParts.push({
      ...(partRow as Part),
      model_slugs: ((compat ?? []) as any[]).map(c => c.model_id),
    })
  }

  return { hsCode: hsCodeRow, tariffRate, relatedParts }
}

// ─── Static params 辅助函数 ───────────────────────────────

export async function getAllPartSlugsForModel(modelId: string): Promise<string[]> {
  const { data } = await sb
    .from('mf_part_model_compatibility')
    .select('mf_parts(slug)')
    .eq('model_id', modelId)

  return ((data ?? []) as any[]).map(r => r.mf_parts?.slug).filter(Boolean)
}

export async function getAllHsCodesForSitemap(countryCode: string): Promise<string[]> {
  const { data } = await sb
    .from('mf_tariff_rates')
    .select('hs_code')
    .eq('country_code', countryCode)

  return [...new Set(((data ?? []) as any[]).map(r => r.hs_code))]
}

export async function getAllBydModelSlugs(): Promise<string[]> {
  const { data } = await sb
    .from('mf_nv_models')
    .select('slug')
    .eq('brand_id', 'byd')

  return ((data ?? []) as any[]).map(r => r.slug)
}

export async function getPartsForHome(): Promise<{ slug: string; name_en: string }[]> {
  const { data, error } = await sb.from('mf_parts').select('slug, name_en').order('id')
  if (error) return []
  return data ?? []
}
