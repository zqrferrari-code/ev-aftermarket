import { sb } from './index'

export async function getDTCByCode(dtcCode: string) {
  const { data, error } = await sb
    .from('mf_nv_dtcs')
    .select('*')
    .eq('dtc_code', dtcCode.toUpperCase())
    .limit(1)
    .single()
  if (error) return null
  return data
}

export async function getDTCsForModel(modelId: string) {
  // Step 1: get dtc_model_notes for model
  const { data: notes, error: notesError } = await sb
    .from('mf_nv_dtc_model_notes')
    .select('id, dtc_id, model_id, likely_causes, suggested_actions, climate_notes, data_confidence, source_urls')
    .eq('model_id', modelId)
  if (notesError) throw notesError
  if (!notes || notes.length === 0) return []

  const dtcIds = [...new Set(notes.map((n) => n.dtc_id).filter(Boolean))]
  if (dtcIds.length === 0) return []

  // Step 2: get dtcs
  const { data: dtcsData, error: dtcsError } = await sb
    .from('mf_nv_dtcs')
    .select('dtc_id, dtc_code, dtc_type, description_en, severity, related_system, safety_warning')
    .in('dtc_id', dtcIds)
  if (dtcsError) throw dtcsError

  const dtcMap = new Map<number, any>()
  for (const d of dtcsData ?? []) {
    dtcMap.set(d.dtc_id, d)
  }

  return notes.map((note) => {
    const dtc = dtcMap.get(note.dtc_id) ?? {}
    return {
      dtc_id: dtc.dtc_id ?? null,
      dtc_code: dtc.dtc_code ?? null,
      dtc_type: dtc.dtc_type ?? null,
      description_en: dtc.description_en ?? null,
      severity: dtc.severity ?? null,
      related_system: dtc.related_system ?? null,
      safety_warning: dtc.safety_warning ?? null,
      note_id: note.id,
      likely_causes: note.likely_causes,
      suggested_actions: note.suggested_actions,
      climate_notes: note.climate_notes,
      data_confidence: note.data_confidence,
      source_urls: note.source_urls,
    }
  })
}

export const getDTCsByModel = getDTCsForModel

export async function getDTCNote(dtcId: number, modelId: string, marketCode?: string) {
  let query = sb
    .from('mf_nv_dtc_model_notes')
    .select('*')
    .eq('dtc_id', dtcId)
    .eq('model_id', modelId)

  if (marketCode) {
    query = query.eq('market_code', marketCode)
  }

  const { data, error } = await query.limit(1).single()
  if (error) return null
  return data
}

export const getDTCModelNote = getDTCNote

export async function getCasesForDTC(dtcId: number) {
  // Step 1: get case IDs from case_dtc_links
  const { data: links, error: linksError } = await sb
    .from('mf_nv_case_dtc_links')
    .select('case_id')
    .eq('dtc_id', dtcId)
  if (linksError) throw linksError
  if (!links || links.length === 0) return []

  const caseIds = links.map((l) => l.case_id)

  // Step 2: get cases
  const { data, error } = await sb
    .from('mf_nv_cases')
    .select('case_id, model_id, market_code, content_type, source_type, source_name, source_url, source_language, location, report_date, vehicle_desc, symptom_summary, resolution, cost_info, confidence, translated_by, created_at')
    .in('case_id', caseIds)
  if (error) throw error
  return data ?? []
}

export async function getAllDTCCodesForSitemap() {
  // Step 1: get dtc_model_notes joined with dtcs and models
  const { data: notes, error: notesError } = await sb
    .from('mf_nv_dtc_model_notes')
    .select('dtc_id, model_id, market_code')
  if (notesError) throw notesError
  if (!notes || notes.length === 0) return []

  const dtcIds = [...new Set(notes.map((n) => n.dtc_id).filter(Boolean))]
  const modelIds = [...new Set(notes.map((n) => n.model_id).filter(Boolean))]

  const [{ data: dtcsData, error: dtcsError }, { data: modelsData, error: modelsError }] = await Promise.all([
    sb.from('mf_nv_dtcs').select('dtc_id, dtc_code').in('dtc_id', dtcIds),
    sb.from('mf_nv_models').select('model_id, slug').in('model_id', modelIds),
  ])
  if (dtcsError) throw dtcsError
  if (modelsError) throw modelsError

  const dtcCodeMap = new Map<number, string>()
  for (const d of dtcsData ?? []) dtcCodeMap.set(d.dtc_id, d.dtc_code)

  const modelSlugMap = new Map<string, string>()
  for (const m of modelsData ?? []) modelSlugMap.set(m.model_id, m.slug)

  return notes
    .filter((n) => dtcCodeMap.has(n.dtc_id) && modelSlugMap.has(n.model_id))
    .map((n) => ({
      dtc_code: dtcCodeMap.get(n.dtc_id)!,
      model_slug: modelSlugMap.get(n.model_id)!,
      market_code: n.market_code,
    }))
}

export async function getCasesCountForDTC(dtcId: number): Promise<number> {
  const { count, error } = await sb
    .from('mf_nv_case_dtc_links')
    .select('*', { count: 'exact', head: true })
    .eq('dtc_id', dtcId)
  if (error) throw error
  return count ?? 0
}

export async function getRelatedDTCs(modelId: string, excludeDtcId: number, limit = 5) {
  const { data: notes, error: notesError } = await sb
    .from('mf_nv_dtc_model_notes')
    .select('dtc_id')
    .eq('model_id', modelId)
    .neq('dtc_id', excludeDtcId)
    .limit(limit)
  if (notesError) throw notesError
  if (!notes || notes.length === 0) return []

  const dtcIds = notes.map((n) => n.dtc_id).filter(Boolean)
  if (dtcIds.length === 0) return []

  const { data, error } = await sb
    .from('mf_nv_dtcs')
    .select('dtc_id, dtc_code, description_en, severity')
    .in('dtc_id', dtcIds)
  if (error) throw error
  return data ?? []
}

export async function getDTCNoteCount(): Promise<number> {
  const { count, error } = await sb
    .from('mf_nv_dtc_model_notes')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}
