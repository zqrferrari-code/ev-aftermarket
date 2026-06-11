import { sb } from './index'

export async function getUpdatesForModel(modelId: string, marketCode?: string) {
  let query = sb
    .from('mf_nv_software_updates')
    .select('*')
    .eq('model_id', modelId)
    .order('release_date', { ascending: false })

  if (marketCode) {
    query = query.eq('market_code', marketCode)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getLatestUpdate(modelId: string, marketCode?: string) {
  const rows = await getUpdatesForModel(modelId, marketCode)
  return rows[0] ?? null
}

export const getUpdatesByModel = getUpdatesForModel

export async function getAllUpdateModelVersionPairs(): Promise<{ model_id: string; model_slug: string; version: string; market_code: string | null }[]> {
  // Fetch software_updates, then join with models in JS
  const { data: updates, error: updatesError } = await sb
    .from('mf_nv_software_updates')
    .select('model_id, version, market_code')
    .not('model_id', 'is', null)
  if (updatesError) throw updatesError

  const modelIds = [...new Set((updates ?? []).map((u) => u.model_id).filter(Boolean))]
  if (modelIds.length === 0) return []

  const { data: modelsData, error: modelsError } = await sb
    .from('mf_nv_models')
    .select('model_id, slug')
    .in('model_id', modelIds)
  if (modelsError) throw modelsError

  const slugMap = new Map<string, string>()
  for (const m of modelsData ?? []) {
    slugMap.set(m.model_id, m.slug)
  }

  return (updates ?? [])
    .filter((u) => u.model_id && slugMap.has(u.model_id))
    .map((u) => ({
      model_id: u.model_id as string,
      model_slug: slugMap.get(u.model_id!)!,
      version: u.version,
      market_code: u.market_code,
    }))
}

export async function getUpdateByVersion(modelId: string, version: string) {
  const { data, error } = await sb
    .from('mf_nv_software_updates')
    .select('*')
    .eq('model_id', modelId)
    .eq('version', version)
    .limit(1)
    .single()
  if (error) return null
  return data
}
