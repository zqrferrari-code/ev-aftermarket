/**
 * 检查充电案例数据分布
 */

import { db } from '../lib/db/index'
import { cases } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function main() {
  console.log('=== 充电案例统计 ===\n')

  // 按车型统计充电案例
  const allCases = await db.select().from(cases)

  const byModel = allCases.reduce((acc, c) => {
    const key = `${c.model_id} (${c.market_code})`
    if (!acc[key]) {
      acc[key] = { problem: 0, charging: 0 }
    }
    if (c.content_type === 'charging') {
      acc[key].charging++
    } else {
      acc[key].problem++
    }
    return acc
  }, {} as Record<string, { problem: number; charging: number }>)

  console.log('车型分布:')
  for (const [model, counts] of Object.entries(byModel)) {
    console.log(`  ${model}:`)
    console.log(`    问题案例: ${counts.problem}`)
    console.log(`    充电案例: ${counts.charging}`)
  }

  console.log(`\n总计: ${allCases.length} 条案例`)
  console.log(`  问题案例: ${allCases.filter(c => c.content_type === 'problem').length}`)
  console.log(`  充电案例: ${allCases.filter(c => c.content_type === 'charging').length}`)

  // 显示所有充电案例
  const chargingCases = allCases.filter(c => c.content_type === 'charging')
  if (chargingCases.length > 0) {
    console.log('\n=== 充电案例详情 ===\n')
    for (const c of chargingCases) {
      console.log(`[${c.model_id}] ${c.symptom_summary}`)
      if (c.resolution) console.log(`  解决: ${c.resolution}`)
      if (c.cost_info) console.log(`  费用: ${c.cost_info}`)
      console.log()
    }
  }

  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
