import { eq } from 'drizzle-orm'
import { db } from '../lib/db/index'
import { cases } from '../lib/db/schema'

async function main() {
  const rows = await db
    .select({
      case_id: cases.case_id,
      model_id: cases.model_id,
      market_code: cases.market_code,
      content_type: cases.content_type,
      symptom_summary: cases.symptom_summary,
    })
    .from(cases)
    .where(eq(cases.content_type, 'problem'))

  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
