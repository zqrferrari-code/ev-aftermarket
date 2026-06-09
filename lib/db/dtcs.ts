import { eq, and, ne, count } from 'drizzle-orm'
import { db } from './index'
import { dtcs, dtcModelNotes, cases, caseDtcLinks, models } from './schema'

export async function getDTCByCode(dtcCode: string) {
  const rows = await db
    .select()
    .from(dtcs)
    .where(eq(dtcs.dtc_code, dtcCode.toUpperCase()))
    .limit(1)
  return rows[0] ?? null
}

export async function getDTCsForModel(modelId: string) {
  return db
    .select({
      dtc_id: dtcs.dtc_id,
      dtc_code: dtcs.dtc_code,
      dtc_type: dtcs.dtc_type,
      description_en: dtcs.description_en,
      severity: dtcs.severity,
      related_system: dtcs.related_system,
      safety_warning: dtcs.safety_warning,
      note_id: dtcModelNotes.id,
      likely_causes: dtcModelNotes.likely_causes,
      suggested_actions: dtcModelNotes.suggested_actions,
      climate_notes: dtcModelNotes.climate_notes,
      data_confidence: dtcModelNotes.data_confidence,
      source_urls: dtcModelNotes.source_urls,
    })
    .from(dtcModelNotes)
    .leftJoin(dtcs, eq(dtcModelNotes.dtc_id, dtcs.dtc_id))
    .where(eq(dtcModelNotes.model_id, modelId))
}

export const getDTCsByModel = getDTCsForModel

export async function getDTCNote(dtcId: number, modelId: string, marketCode?: string) {
  const conditions = [
    eq(dtcModelNotes.dtc_id, dtcId),
    eq(dtcModelNotes.model_id, modelId),
  ]
  if (marketCode) {
    conditions.push(eq(dtcModelNotes.market_code, marketCode))
  }
  const rows = await db
    .select()
    .from(dtcModelNotes)
    .where(and(...conditions))
    .limit(1)
  return rows[0] ?? null
}

export const getDTCModelNote = getDTCNote

export async function getCasesForDTC(dtcId: number) {
  return db
    .select({
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
      created_at: cases.created_at,
    })
    .from(cases)
    .innerJoin(caseDtcLinks, eq(caseDtcLinks.case_id, cases.case_id))
    .where(eq(caseDtcLinks.dtc_id, dtcId))
}

export async function getAllDTCCodesForSitemap() {
  return db
    .select({
      dtc_code: dtcs.dtc_code,
      model_slug: models.slug,
      market_code: dtcModelNotes.market_code,
    })
    .from(dtcModelNotes)
    .innerJoin(dtcs, eq(dtcModelNotes.dtc_id, dtcs.dtc_id))
    .innerJoin(models, eq(dtcModelNotes.model_id, models.model_id))
}

export async function getCasesCountForDTC(dtcId: number): Promise<number> {
  const rows = await db
    .select({ case_id: caseDtcLinks.case_id })
    .from(caseDtcLinks)
    .where(eq(caseDtcLinks.dtc_id, dtcId))
  return rows.length
}

export async function getRelatedDTCs(modelId: string, excludeDtcId: number, limit = 5) {
  return db
    .select({
      dtc_id: dtcs.dtc_id,
      dtc_code: dtcs.dtc_code,
      description_en: dtcs.description_en,
      severity: dtcs.severity,
    })
    .from(dtcModelNotes)
    .innerJoin(dtcs, eq(dtcModelNotes.dtc_id, dtcs.dtc_id))
    .where(
      and(
        eq(dtcModelNotes.model_id, modelId),
        ne(dtcModelNotes.dtc_id, excludeDtcId)
      )
    )
    .limit(limit)
}

export async function getDTCNoteCount(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(dtcModelNotes)
  return row?.value ?? 0
}
