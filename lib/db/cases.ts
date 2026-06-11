import { sb } from './index'

const CASE_SELECT =
  'case_id, model_id, market_code, content_type, source_type, source_name, source_url, source_language, location, report_date, vehicle_desc, symptom_summary, resolution, cost_info, confidence, translated_by'

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

export async function getProblemCasesCount(): Promise<number> {
  const { count, error } = await sb
    .from('mf_nv_cases')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', 'problem')
  if (error) throw error
  return count ?? 0
}
