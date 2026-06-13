import { sb } from './index'

const CASE_SELECT =
  'case_id, model_id, market_code, content_type, source_type, source_name, source_url, source_language, location, report_date, vehicle_desc, symptom_summary, resolution, cost_info, confidence, translated_by'

const REVIEW_SELECT =
  'case_id, model_id, market_code, source_name, source_url, report_date, symptom_summary, rating'

function dedup<T extends { symptom_summary: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  return rows.filter((r) => {
    const key = r.symptom_summary.slice(0, 100)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function getProblemCasesForModel(modelId: string, market: string) {
  const { data, error } = await sb
    .from('mf_nv_cases')
    .select(CASE_SELECT)
    .eq('model_id', modelId)
    .eq('market_code', market)
    .eq('content_type', 'problem')
  if (error) throw error
  return dedup(data ?? [])
}

export async function getChargingCasesForModel(modelId: string, market: string) {
  const { data, error } = await sb
    .from('mf_nv_cases')
    .select(CASE_SELECT)
    .eq('model_id', modelId)
    .eq('market_code', market)
    .eq('content_type', 'charging')
  if (error) throw error
  return dedup(data ?? [])
}

export async function getServiceCasesForModel(modelId: string, market: string) {
  const { data, error } = await sb
    .from('mf_nv_cases')
    .select(CASE_SELECT)
    .eq('model_id', modelId)
    .eq('market_code', market)
    .eq('content_type', 'service')
  if (error) throw error
  return dedup(data ?? [])
}

export interface ReviewCase {
  case_id: number
  model_id: string
  market_code: string
  source_name: string | null
  source_url: string | null
  report_date: string | null
  symptom_summary: string
  rating: number | null
}

export async function getReviewsForModel(modelId: string, market: string): Promise<ReviewCase[]> {
  const { data, error } = await sb
    .from('mf_nv_cases')
    .select(REVIEW_SELECT)
    .eq('model_id', modelId)
    .eq('market_code', market)
    .eq('content_type', 'review')
    .order('report_date', { ascending: false })
  if (error) return []
  return data ?? []
}

export async function getProblemCasesCount(): Promise<number> {
  const { count, error } = await sb
    .from('mf_nv_cases')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', 'problem')
  if (error) throw error
  return count ?? 0
}
