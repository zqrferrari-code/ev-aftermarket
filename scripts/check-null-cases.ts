/**
 * 查看 model_id = null 的案例
 */

import { db } from '../lib/db/index'
import { cases } from '../lib/db/schema'
import { isNull, count } from 'drizzle-orm'

async function main() {
  console.log('=== model_id = null 的案例分析 ===\n')

  // 统计
  const [total] = await db.select({ value: count() }).from(cases).where(isNull(cases.model_id))
  console.log(`总计: ${total.value} 条\n`)

  // 样本
  const samples = await db.select().from(cases).where(isNull(cases.model_id)).limit(10)

  console.log('样本数据:\n')
  for (const c of samples) {
    console.log(`[case_id: ${c.case_id}]`)
    console.log(`  content_type: ${c.content_type}`)
    console.log(`  market: ${c.market_code}`)
    console.log(`  source: ${c.source_name}`)
    console.log(`  source_url: ${c.source_url || 'N/A'}`)
    console.log(`  symptom: ${c.symptom_summary?.slice(0, 150) || 'N/A'}`)
    console.log()
  }

  // 按来源统计
  const allNull = await db.select().from(cases).where(isNull(cases.model_id))
  const bySource = allNull.reduce((acc, c) => {
    const source = c.source_name || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n按来源分布:')
  for (const [source, cnt] of Object.entries(bySource)) {
    console.log(`  ${source}: ${cnt}`)
  }

  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
