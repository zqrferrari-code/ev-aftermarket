import { db } from '../lib/db/index'
import { warningLights } from '../lib/db/schema'

async function main() {
  const rows = await db.select().from(warningLights).orderBy(warningLights.id)
  const sample = [
    ...rows.slice(10, 15),   // ids around 11-15
    ...rows.slice(25, 30),   // ids around 26-30
    rows[rows.length - 5],   // near end
    rows[rows.length - 1],   // last
  ].filter(Boolean)
  for (const r of sample) {
    console.log(`--- id=${r.id} [${r.category}]`)
    console.log('Name:', r.name_en)
    console.log('Desc:', r.description_en?.slice(0, 250) ?? '(empty)')
    console.log('Action:', r.action_en?.slice(0, 200) ?? '(empty)')
    console.log()
  }
  process.exit(0)
}
main()
