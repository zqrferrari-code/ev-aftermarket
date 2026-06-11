import { sb } from './index'

export async function getAllMarkets() {
  const { data, error } = await sb.from('mf_nv_markets').select('*').eq('active', true)
  if (error) throw error
  return data ?? []
}

export async function getMarket(marketCode: string) {
  const { data, error } = await sb
    .from('mf_nv_markets')
    .select('*')
    .eq('market_code', marketCode)
    .limit(1)
    .single()
  if (error) return null
  return data
}
