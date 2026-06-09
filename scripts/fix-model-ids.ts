import { eq } from 'drizzle-orm'
import { db } from '../lib/db/index'
import { pendingCases } from '../lib/db/schema'

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
    if (!ext?.model_id) continue

    const rawModelId = ext.model_id
    const correctModelId = MODEL_ID_MAP[rawModelId] ?? rawModelId

    if (rawModelId !== correctModelId) {
      ext.model_id = correctModelId
      await db.update(pendingCases).set({ ai_extracted: ext }).where(eq(pendingCases.id, row.id))
      console.log(`Fixed: ${rawModelId} → ${correctModelId}`)
    }
  }

  console.log('Done')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
