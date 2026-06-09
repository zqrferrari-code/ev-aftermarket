import { eq, and, count } from 'drizzle-orm'
import { db } from './index'
import { cases } from './schema'

const CASE_FIELDS = {
  case_id: cases.case_id,
  model_id: cases.model_id,
  market_code: cases.market_code,
  content_type: cases.content_type,
  source_type: cases.source_type,
  source_name: cases.source_name,
  source_url: cases.source_url,
  source_language: cases.source_language,
  location: cases.location,
  report_date: cases.report_date,
  vehicle_desc: cases.vehicle_desc,
  symptom_summary: cases.symptom_summary,
  resolution: cases.resolution,
  cost_info: cases.cost_info,
  confidence: cases.confidence,
  translated_by: cases.translated_by,
}

function dedup<T extends { symptom_summary: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  return rows.filter(r => {
    const key = r.symptom_summary.slice(0, 100)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function getProblemCasesForModel(modelId: string, market: string) {
  const rows = await db
    .select(CASE_FIELDS)
    .from(cases)
    .where(
      and(
        eq(cases.model_id, modelId),
        eq(cases.market_code, market),
        eq(cases.content_type, 'problem')
      )
    )
  return dedup(rows)
}

export async function getChargingCasesForModel(modelId: string, market: string) {
  const rows = await db
    .select(CASE_FIELDS)
    .from(cases)
    .where(
      and(
        eq(cases.model_id, modelId),
        eq(cases.market_code, market),
        eq(cases.content_type, 'charging')
      )
    )
  return dedup(rows)
}

export async function getProblemCasesCount(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(cases)
    .where(eq(cases.content_type, 'problem'))
  return row?.value ?? 0
}
