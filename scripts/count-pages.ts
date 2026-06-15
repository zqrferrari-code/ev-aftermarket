import { db } from '../lib/db/index'
import { warningLights } from '../lib/db/schema'
import { getAllDTCCodesForSitemap } from '../lib/db/dtcs'

async function main() {
  // DTC breakdown by model
  const dtcRows = await getAllDTCCodesForSitemap()
  const byModel: Record<string, number> = {}
  for (const r of dtcRows) {
    if (!r.model_slug || !r.dtc_code) continue
    byModel[r.model_slug] = (byModel[r.model_slug] ?? 0) + 1
  }
  console.log('DTC codes by model:')
  for (const [slug, count] of Object.entries(byModel).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${slug}: ${count}`)
  }

  // Warning lights with/without description
  const wlRows = await db.select().from(warningLights)
  const withDesc = wlRows.filter(r => r.description_en && r.description_en.length > 50)
  const withSeverity = wlRows.filter(r => r.severity)
  console.log()
  console.log('Warning lights total:', wlRows.length)
  console.log('  with description_en:', withDesc.length)
  console.log('  with severity:', withSeverity.length)
  console.log('  brands:', [...new Set(wlRows.map(r => r.brand_id))].join(', '))
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
