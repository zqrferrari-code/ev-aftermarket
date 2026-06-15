import { db } from '../lib/db/index'
import { cases } from '../lib/db/schema'

async function main() {
  const rows = await db.select({
    model_id: cases.model_id,
    market_code: cases.market_code,
    content_type: cases.content_type,
  }).from(cases)

  const byModel: Record<string, number> = {}
  for (const r of rows) {
    const key = `${r.market_code ?? 'null'}|${r.model_id ?? 'null'}`
    byModel[key] = (byModel[key] ?? 0) + 1
  }
  console.log(`Cases: ${rows.length} total`)
  for (const [k,v] of Object.entries(byModel).sort((a,b) => b[1]-a[1])) console.log(`  ${k}: ${v}`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
