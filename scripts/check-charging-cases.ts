import { db } from '@/lib/db/index'
import { cases } from '@/lib/db/schema'
import { ilike, or } from 'drizzle-orm'

async function main() {
  const rows = await db.select({
    model_id: cases.model_id,
    content_type: cases.content_type,
    symptom_summary: cases.symptom_summary,
  }).from(cases).where(
    or(
      ilike(cases.symptom_summary, '%charg%'),
      ilike(cases.symptom_summary, '%battery%'),
      ilike(cases.symptom_summary, '%range%'),
    )
  ).limit(30)

  console.log(`Total: ${rows.length}`)
  for (const r of rows) {
    console.log(`[${r.model_id}] ${r.symptom_summary.slice(0, 100)}`)
  }
  process.exit(0)
}
main()
