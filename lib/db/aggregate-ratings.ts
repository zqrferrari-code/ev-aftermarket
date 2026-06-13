import { sb } from './index'

export interface AggregateRating {
  id: number
  model_id: string
  market_code: string
  rating_value: number
  review_count: number
  source_url: string | null
  last_verified: string | null
}

export async function getAggregateRatingForModel(modelId: string, market: string): Promise<AggregateRating | null> {
  const { data, error } = await sb
    .from('mf_nv_aggregate_ratings')
    .select('*')
    .eq('model_id', modelId)
    .eq('market_code', market)
    .limit(1)
    .single()
  if (error) return null
  return data
}
