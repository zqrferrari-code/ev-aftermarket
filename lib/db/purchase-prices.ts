import { sb } from './index'

export interface PurchasePrice {
  id: number
  model_id: string
  market_code: string
  variant_name: string
  price: number
  currency: string
  source_url: string | null
  last_verified: string | null
}

export async function getPurchasePricesForModel(modelId: string, market: string): Promise<PurchasePrice[]> {
  const { data, error } = await sb
    .from('mf_nv_purchase_prices')
    .select('*')
    .eq('model_id', modelId)
    .eq('market_code', market)
    .order('price', { ascending: true })
  if (error) return []
  return data ?? []
}
