/**
 * 将审核后的 generated-dtc-notes.json 写入 MySQL 数据库
 * 用法: dotenv -e .env.local -- tsx scripts/seed-dtc-notes.ts
 */
import { readFileSync } from 'fs'
import { eq, and } from 'drizzle-orm'
import { db } from '../lib/db/index'
import { dtcs, dtcModelNotes } from '../lib/db/schema'

async function main() {
  const notes = JSON.parse(readFileSync('scripts/generated-dtc-notes.json', 'utf-8'))

  for (const note of notes) {
    // 查找 dtc_id
    const dtcRows = await db
      .select({ dtc_id: dtcs.dtc_id })
      .from(dtcs)
      .where(eq(dtcs.dtc_code, note.code))
      .limit(1)

    if (dtcRows.length === 0) {
      // 先插入 DTC 基本信息
      await db.insert(dtcs).ignore().values({
        dtc_code: note.code,
        dtc_type: 'STANDARD',
        description_en: `${note.code} — auto-generated entry`,
        severity: 'WARNING',
      })
      const newDtc = await db
        .select({ dtc_id: dtcs.dtc_id })
        .from(dtcs)
        .where(eq(dtcs.dtc_code, note.code))
        .limit(1)
      if (newDtc.length === 0) {
        console.warn(`Could not create DTC ${note.code}, skipping`)
        continue
      }
      dtcRows.push(newDtc[0])
    }

    const dtcId = dtcRows[0].dtc_id

    // 检查是否已存在
    const existing = await db
      .select({ id: dtcModelNotes.id })
      .from(dtcModelNotes)
      .where(and(eq(dtcModelNotes.dtc_id, Number(dtcId)), eq(dtcModelNotes.model_id, note.model)))
      .limit(1)

    if (existing.length > 0) {
      console.log(`Skipping ${note.code} for ${note.model} — already exists (id: ${existing[0].id})`)
      continue
    }

    await db.insert(dtcModelNotes).values({
      dtc_id: Number(dtcId),
      model_id: note.model,
      market_code: note.market.toLowerCase(),
      likely_causes: JSON.stringify(note.likely_causes),
      suggested_actions: JSON.stringify(note.suggested_actions),
      climate_notes: note.climate_notes ?? null,
      data_confidence: 'ai_generated',
      source_urls: JSON.stringify([]),
    })

    console.log(`✅ Seeded ${note.code} for ${note.model} (${note.market})`)
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
