/**
 * 查看和统计充电案例
 *
 * 用法:
 *   dotenv -e .env.local -- tsx scripts/view-charging-cases.ts
 *   dotenv -e .env.local -- tsx scripts/view-charging-cases.ts --model byd-atto-3
 */

import { db } from '../lib/db/index'
import { cases } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'

const args = process.argv.slice(2)
const TARGET_MODEL = args.includes('--model') ? args[args.indexOf('--model') + 1] : null

async function main() {
  console.log('=== 充电案例查看 ===\n')

  const allCases = await db.select().from(cases).where(eq(cases.content_type, 'charging'))

  const filtered = TARGET_MODEL
    ? allCases.filter(c => c.model_id === TARGET_MODEL)
    : allCases

  console.log(`总计: ${filtered.length} 条充电案例${TARGET_MODEL ? ` (${TARGET_MODEL})` : ''}\n`)

  // 按车型分组
  const byModel = filtered.reduce((acc, c) => {
    const key = c.model_id || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {} as Record<string, typeof filtered>)

  for (const [modelId, casesForModel] of Object.entries(byModel)) {
    console.log(`\n━━ ${modelId} (${casesForModel.length} 条) ━━\n`)

    for (const c of casesForModel) {
      console.log(`[${c.case_id}] ${c.symptom_summary}`)
      if (c.resolution) console.log(`  ✓ 解决: ${c.resolution}`)
      if (c.cost_info) console.log(`  💰 费用: ${c.cost_info}`)
      if (c.location) console.log(`  📍 地点: ${c.location}`)
      if (c.source_url) console.log(`  🔗 来源: ${c.source_url}`)
      console.log()
    }
  }

  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
