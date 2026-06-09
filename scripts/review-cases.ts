/**
 * 命令行审核工具 — 逐条 approve / reject pending_cases
 * 审核通过的条目自动写入正式 cases 表
 *
 * 用法:
 *   dotenv -e .env.local -- tsx scripts/review-cases.ts
 *   dotenv -e .env.local -- tsx scripts/review-cases.ts --model byd-atto-3
 *   dotenv -e .env.local -- tsx scripts/review-cases.ts --list    # 只列出统计
 */

import * as readline from 'readline'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../lib/db/index'
import { pendingCases, cases } from '../lib/db/schema'

const args = process.argv.slice(2)
const FILTER_MODEL = args.includes('--model') ? args[args.indexOf('--model') + 1] : null
const LIST_ONLY = args.includes('--list')
const APPROVE_ALL = args.includes('--approve-all')

// ── 拉取待审核条目 ────────────────────────────────────────────────────────────
async function getPending() {
  const rows = await db
    .select()
    .from(pendingCases)
    .where(eq(pendingCases.status, 'pending'))

  if (FILTER_MODEL) {
    return rows.filter(r => {
      const ext = r.ai_extracted as Record<string, string> | null
      return ext?.model_id === FILTER_MODEL
    })
  }
  return rows
}

// ── 统计 ──────────────────────────────────────────────────────────────────────
async function printStats() {
  const all = await db.select().from(pendingCases)
  const byStatus = all.reduce((acc, r) => {
    acc[r.status ?? 'null'] = (acc[r.status ?? 'null'] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byModel = all.reduce((acc, r) => {
    const ext = r.ai_extracted as Record<string, string> | null
    const model = ext?.model_id ?? 'unknown'
    acc[model] = (acc[model] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n=== pending_cases 统计 ===')
  console.log('状态分布:')
  for (const [status, cnt] of Object.entries(byStatus)) {
    console.log(`  ${status}: ${cnt}`)
  }
  console.log('\n车型分布:')
  for (const [model, cnt] of Object.entries(byModel)) {
    console.log(`  ${model}: ${cnt}`)
  }
  console.log()
}

// ── 写入正式 cases 表 ─────────────────────────────────────────────────────────
async function approveCase(pendingId: number, ext: Record<string, string | null>) {
  await db.insert(cases).values({
    model_id: ext.model_id!,
    market_code: ext.market_code ?? 'au',
    content_type: (ext.content_type as 'problem' | 'charging') ?? 'problem',
    source_type: ext.source_type ?? 'community',
    source_name: ext.source_name ?? 'Reddit',
    source_url: ext.source_url ?? null,
    source_language: 'en',
    location: ext.location ?? null,
    report_date: ext.report_date ?? null,
    vehicle_desc: ext.vehicle_desc ?? null,
    symptom_summary: ext.symptom_summary!,
    resolution: ext.resolution ?? null,
    cost_info: ext.cost_info ?? null,
    confidence: 'community',
    translated_by: null,
  })

  // 更新 pending 状态
  await db
    .update(pendingCases)
    .set({ status: 'approved' })
    .where(eq(pendingCases.id, pendingId))
}

async function rejectCase(pendingId: number) {
  await db
    .update(pendingCases)
    .set({ status: 'rejected' })
    .where(eq(pendingCases.id, pendingId))
}

// ── 格式化显示 ────────────────────────────────────────────────────────────────
function display(row: typeof pendingCases.$inferSelect, index: number, total: number) {
  const ext = row.ai_extracted as Record<string, string | null> | null
  const raw = JSON.parse(row.raw_content) as Record<string, unknown>

  console.clear()
  console.log(`\n━━━ 案例 ${index + 1} / ${total} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`来源:     ${row.source_platform}`)
  console.log(`URL:      ${row.source_url ?? '—'}`)
  console.log(`车型:     ${ext?.model_id ?? '?'} | 市场: ${ext?.market_code ?? '?'}`)
  console.log()
  console.log(`原始标题: ${(raw.title as string | undefined)?.slice(0, 100) ?? '—'}`)
  console.log()
  console.log('─── 提炼结果 ───────────────────────────────────────────────────────')
  console.log(`症状: ${ext?.symptom_summary ?? '—'}`)
  console.log()
  if (ext?.resolution) console.log(`解决: ${ext.resolution}`)
  if (ext?.cost_info)  console.log(`费用: ${ext.cost_info}`)
  if (ext?.location)   console.log(`地点: ${ext.location}`)
  if (ext?.vehicle_desc) console.log(`车辆: ${ext.vehicle_desc}`)
  if (ext?.report_date)  console.log(`日期: ${ext.report_date}`)
  console.log('───────────────────────────────────────────────────────────────────')
  console.log()
  console.log('[a] 通过  [r] 拒绝  [s] 跳过  [e] 编辑症状  [q] 退出')
}

// ── 交互输入 ──────────────────────────────────────────────────────────────────
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  await printStats()
  if (LIST_ONLY) process.exit(0)

  const pending = await getPending()

  if (pending.length === 0) {
    console.log('没有待审核的条目。')
    console.log('先运行: dotenv -e .env.local -- tsx scripts/collect-reddit.ts')
    process.exit(0)
  }

  console.log(`\n待审核: ${pending.length} 条${FILTER_MODEL ? ` (${FILTER_MODEL})` : ''}`)

  // ── approve-all 模式 ──────────────────────────────────────────────────────
  if (APPROVE_ALL) {
    let approved = 0
    for (const row of pending) {
      const ext = row.ai_extracted as Record<string, string | null> | null
      if (!ext) continue
      await approveCase(row.id, ext)
      console.log(`✓ [${ext.model_id}] [${ext.content_type ?? 'problem'}] ${ext.symptom_summary?.slice(0, 80)}`)
      approved++
    }
    console.log(`\n=== 完成 ===`)
    console.log(`全部通过: ${approved} 条 → cases 表`)
    process.exit(0)
  }

  console.log('开始审核...\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  // 支持方向键输入
  if (process.stdin.isTTY) process.stdin.setRawMode(true)

  let approved = 0
  let rejected = 0
  let skipped = 0

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i]
    const ext = row.ai_extracted as Record<string, string | null> | null
    if (!ext) continue

    display(row, i, pending.length)

    let handled = false
    while (!handled) {
      const answer = (await prompt(rl, '> ')).trim().toLowerCase()

      switch (answer) {
        case 'a':
          await approveCase(row.id, ext)
          console.log('✓ 已通过')
          approved++
          handled = true
          break

        case 'r':
          await rejectCase(row.id)
          console.log('✗ 已拒绝')
          rejected++
          handled = true
          break

        case 's':
          console.log('→ 跳过')
          skipped++
          handled = true
          break

        case 'e': {
          // 编辑症状描述
          const newSymptom = await prompt(rl, '新症状描述: ')
          if (newSymptom.trim()) {
            ext.symptom_summary = newSymptom.trim()
            await db
              .update(pendingCases)
              .set({ ai_extracted: ext })
              .where(eq(pendingCases.id, row.id))
            console.log('✎ 已更新，重新显示...')
            display(row, i, pending.length)
          }
          break
        }

        case 'q':
          console.log(`\n已退出。通过: ${approved} | 拒绝: ${rejected} | 跳过: ${skipped}`)
          rl.close()
          process.exit(0)

        default:
          console.log('输入 a/r/s/e/q')
      }
    }

    // 短暂停顿避免闪屏
    await new Promise(r => setTimeout(r, 200))
  }

  rl.close()
  console.log(`\n=== 审核完成 ===`)
  console.log(`通过: ${approved} | 拒绝: ${rejected} | 跳过: ${skipped}`)

  if (approved > 0) {
    console.log(`\n${approved} 条案例已写入 cases 表，content_type='problem'`)
    console.log('problems 页面现在可以从数据库读取真实数据了。')
  }

  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
