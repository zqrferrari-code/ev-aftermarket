import { db } from '../lib/db/index'
import { models } from '../lib/db/schema'

async function main() {
  const rows = await db.select({ model_id: models.model_id, slug: models.slug }).from(models)
  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
