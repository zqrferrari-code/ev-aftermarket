import { eq } from 'drizzle-orm'
import { db } from '../lib/db/index'
import { pendingCases, cases } from '../lib/db/schema'

// Map collected slugs to actual DB model_ids
const MODEL_ID_MAP: Record<string, string> = {
  'byd-atto-3': 'byd-atto3',
  'byd-dolphin': 'byd-dolphin',
  'mg-mg4': 'mg-mg4',
  'mg-zs-ev': 'mg-zs-ev',
}

async function main() {
  const pending = await db.select().from(pendingCases).where(eq(pendingCases.status, 'pending'))
  console.log('Pending:', pending.length)

  for (const row of pending) {
    const ext = row.ai_extracted as Record<string, string | null>
    if (!ext?.symptom_summary) continue

    const rawModelId = ext.model_id ?? ''
    const modelId = MODEL_ID_MAP[rawModelId] ?? rawModelId

    await db.insert(cases).values({
      model_id: modelId,
      market_code: ext.market_code ?? 'au',
      content_type: 'problem',
      source_type: ext.source_type ?? 'community',
      source_name: ext.source_name ?? 'ProductReview.com.au',
      source_url: ext.source_url ?? null,
      source_language: 'en',
      location: ext.location ?? null,
      report_date: ext.report_date ?? null,
      vehicle_desc: ext.vehicle_desc ?? null,
      symptom_summary: ext.symptom_summary!,
      resolution: ext.resolution ?? null,
      cost_info: ext.cost_info ?? null,
      confidence: 'community',
      translated_by: null,
    })

    await db.update(pendingCases).set({ status: 'approved' }).where(eq(pendingCases.id, row.id))
    console.log('Approved:', ext.symptom_summary?.slice(0, 80))
  }

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
