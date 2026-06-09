/**
 * 批量翻译 DTC 内容脚本
 *
 * 流程：
 * 1. 为两张表新增 _cn 备份列（幂等）
 * 2. 从 DB 读取含中文的行
 * 3. 用 pub-claude-opus-4-6 将中文翻译成英文
 * 4. 用 pub-claude-sonnet-4-6 对比中英文，修正歧义、去 AI 味
 * 5. 将最终英文写回 DB，原始中文写入 _cn 备份列
 *
 * 用法：
 *   tsx scripts/translate-dtc-content.ts
 *
 * 可选参数：
 *   --table=dtcs            只跑 dtcs 表
 *   --table=notes           只跑 notes 表
 *   --limit=50              限制处理行数（测试用）
 *   --dry-run               只翻译不写入 DB
 */

import Anthropic from '@anthropic-ai/sdk'
import mysql from 'mysql2/promise'
import { appendFileSync } from 'fs'

// ─── Config ──────────────────────────────────────────────────────────────────

const TRANSLATOR_MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? 'pub-claude-opus-4-6'
const REVIEWER_MODEL = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? 'pub-claude-sonnet-4-6'
const BATCH_SIZE = 5
const DELAY_MS = 500
const LOG_FILE = 'scripts/translate-log.jsonl'

const args = process.argv.slice(2)
const TABLE_FILTER = args.find(a => a.startsWith('--table='))?.split('=')[1]
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '99999')
const DRY_RUN = args.includes('--dry-run')

if (DRY_RUN) console.log('🔍 DRY RUN — no DB writes')

// ─── Clients ─────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 5,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasChinese(val: unknown): boolean {
  if (!val) return false
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return /[\u4e00-\u9fff]/.test(str)
}

function parseJsonField(val: unknown): unknown {
  if (val === null || val === undefined) return val
  if (typeof val === 'object') return val
  try { return JSON.parse(val as string) } catch { return val }
}

function log(entry: object) {
  appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Step 1: Translate (Chinese → English draft) ─────────────────────────────

async function translate(chineseText: string, context: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: TRANSLATOR_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a professional automotive technical translator. Translate the following Chinese EV fault code documentation into clear, natural British English for Australian car owners.

Context: ${context}

Rules:
- Keep technical terms (DTC codes, part names, tool names) in their standard English form
- Use active voice and direct language ("Check the X", not "It is recommended to check the X")
- Preserve all specific values (voltages, resistances, temperatures, part numbers)
- Do NOT add explanations or commentary not in the original
- Do NOT use filler phrases like "Please note that", "It is worth mentioning", "In conclusion"
- Output ONLY the translated text, no preamble

Chinese text to translate:
${chineseText}`,
      },
    ],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}

// ─── Step 2: Review (check for ambiguity and AI tone) ────────────────────────

async function review(chinese: string, englishDraft: string, context: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: REVIEWER_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a bilingual automotive technical editor reviewing an English translation of Chinese EV fault code documentation.

Context: ${context}

Your job:
1. Compare the English draft against the Chinese original for accuracy
2. Fix any mistranslations, omissions, or ambiguities
3. Remove AI-flavoured phrases ("It is important to note", "Please ensure", "It should be noted", "In order to")
4. Replace passive voice with active voice where natural
5. Ensure technical values (voltages, part numbers, tool names) are preserved exactly
6. Keep the tone direct and factual — like a workshop manual, not a chatbot

CHINESE ORIGINAL:
${chinese}

ENGLISH DRAFT:
${englishDraft}

Output ONLY the final corrected English text. No commentary, no explanations.`,
      },
    ],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : englishDraft
}

// ─── Translate a single string field ─────────────────────────────────────────

async function translateField(chinese: string, context: string): Promise<string> {
  const draft = await translate(chinese, context)
  const final = await review(chinese, draft, context)
  return final
}

// ─── Translate a JSON array field (string[] or {title,body}[]) ───────────────

async function translateJsonArray(val: unknown, context: string): Promise<unknown> {
  const arr = parseJsonField(val) as unknown[]
  if (!Array.isArray(arr) || arr.length === 0) return arr

  if (typeof arr[0] === 'string') {
    const results: string[] = []
    for (const item of arr as string[]) {
      if (hasChinese(item)) {
        results.push(await translateField(item, context))
      } else {
        results.push(item)
      }
    }
    return results
  } else {
    const results = []
    for (const item of arr as { title?: string; body?: string }[]) {
      const translated: { title?: string; body?: string } = { ...item }
      if (item.title && hasChinese(item.title)) {
        translated.title = await translateField(item.title, context + ' (step title)')
      }
      if (item.body && hasChinese(item.body)) {
        translated.body = await translateField(item.body, context + ' (step detail)')
      }
      results.push(translated)
    }
    return results
  }
}

// ─── Add backup columns (idempotent) ─────────────────────────────────────────

async function addBackupColumns() {
  console.log('Adding backup columns if not exist...')
  const columns: [string, string, string][] = [
    ['mf_nv_dtcs', 'description_cn', 'LONGTEXT'],
    ['mf_nv_dtcs', 'safety_warning_cn', 'TEXT'],
    ['mf_nv_dtc_model_notes', 'likely_causes_cn', 'JSON'],
    ['mf_nv_dtc_model_notes', 'suggested_actions_cn', 'JSON'],
    ['mf_nv_dtc_model_notes', 'climate_notes_cn', 'TEXT'],
  ]
  for (const [table, column, type] of columns) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    )
    if (rows.length > 0) {
      console.log(`  ─ ${table}.${column} already exists`)
      continue
    }
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    console.log(`  ✓ added ${table}.${column}`)
  }
}

// ─── Translate mf_nv_dtcs ────────────────────────────────────────────────────

async function translateDtcsTable() {
  console.log('\n── mf_nv_dtcs ──────────────────────────────────────')

  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT dtc_id, dtc_code, description_en, safety_warning
    FROM mf_nv_dtcs
    WHERE (description_en REGEXP '[\u4e00-\u9fff]' OR safety_warning REGEXP '[\u4e00-\u9fff]')
      AND description_cn IS NULL
    LIMIT ${LIMIT}
  `)
  console.log(`Found ${rows.length} rows needing translation`)

  let done = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    for (const row of batch) {
      const ctx = `DTC code ${row.dtc_code} — fault description for an EV`
      const updates: Record<string, string | null> = {}

      try {
        updates.description_cn = row.description_en ?? null
        updates.safety_warning_cn = row.safety_warning ?? null

        if (hasChinese(row.description_en)) {
          updates.description_en = await translateField(row.description_en, ctx)
        }
        if (hasChinese(row.safety_warning)) {
          updates.safety_warning = await translateField(
            row.safety_warning,
            `${ctx} — safety warning shown to driver`
          )
        }

        if (!DRY_RUN) {
          await pool.query(
            `UPDATE mf_nv_dtcs SET description_en=?, safety_warning=?, description_cn=?, safety_warning_cn=? WHERE dtc_id=?`,
            [
              updates.description_en ?? row.description_en,
              updates.safety_warning ?? row.safety_warning,
              updates.description_cn,
              updates.safety_warning_cn,
              row.dtc_id,
            ]
          )
        }

        done++
        log({ table: 'dtcs', dtc_id: row.dtc_id, dtc_code: row.dtc_code, status: 'ok', en: updates.description_en })
        process.stdout.write(`\r  ${done}/${rows.length} — ${row.dtc_code}          `)
      } catch (e) {
        console.error(`\n  ✗ dtc_id ${row.dtc_id}:`, (e as Error).message)
        log({ table: 'dtcs', dtc_id: row.dtc_id, dtc_code: row.dtc_code, status: 'error', error: (e as Error).message })
      }
    }

    if (i + BATCH_SIZE < rows.length) await sleep(DELAY_MS)
  }
  console.log(`\n  Done: ${done} rows`)
}

// ─── Translate mf_nv_dtc_model_notes ─────────────────────────────────────────

async function translateNotesTable() {
  console.log('\n── mf_nv_dtc_model_notes ───────────────────────────')

  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT n.id, n.model_id, d.dtc_code,
           n.likely_causes, n.suggested_actions, n.climate_notes
    FROM mf_nv_dtc_model_notes n
    JOIN mf_nv_dtcs d ON n.dtc_id = d.dtc_id
    WHERE (
      n.likely_causes REGEXP '[\u4e00-\u9fff]'
      OR n.suggested_actions REGEXP '[\u4e00-\u9fff]'
      OR n.climate_notes REGEXP '[\u4e00-\u9fff]'
    )
    AND n.likely_causes_cn IS NULL
    LIMIT ${LIMIT}
  `)
  console.log(`Found ${rows.length} rows needing translation`)

  let done = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    for (const row of batch) {
      const ctx = `DTC code ${row.dtc_code} on ${row.model_id}`

      try {
        const origCauses = parseJsonField(row.likely_causes)
        const origActions = parseJsonField(row.suggested_actions)
        const origClimate = row.climate_notes

        let newCauses = origCauses
        let newActions = origActions
        let newClimate = origClimate

        if (hasChinese(row.likely_causes)) {
          newCauses = await translateJsonArray(row.likely_causes, `${ctx} — likely causes list`)
        }
        if (hasChinese(row.suggested_actions)) {
          newActions = await translateJsonArray(row.suggested_actions, `${ctx} — repair steps`)
        }
        if (hasChinese(row.climate_notes)) {
          newClimate = await translateField(row.climate_notes, `${ctx} — climate/environment note`)
        }

        if (!DRY_RUN) {
          await pool.query(
            `UPDATE mf_nv_dtc_model_notes
             SET likely_causes=?, suggested_actions=?, climate_notes=?,
                 likely_causes_cn=?, suggested_actions_cn=?, climate_notes_cn=?
             WHERE id=?`,
            [
              JSON.stringify(newCauses),
              JSON.stringify(newActions),
              newClimate,
              JSON.stringify(origCauses),
              JSON.stringify(origActions),
              origClimate,
              row.id,
            ]
          )
        }

        done++
        log({ table: 'notes', note_id: row.id, dtc_code: row.dtc_code, status: 'ok' })
        process.stdout.write(`\r  ${done}/${rows.length} — note ${row.id} (${row.dtc_code})          `)
      } catch (e) {
        console.error(`\n  ✗ note_id ${row.id}:`, (e as Error).message)
        log({ table: 'notes', note_id: row.id, dtc_code: row.dtc_code, status: 'error', error: (e as Error).message })
      }
    }

    if (i + BATCH_SIZE < rows.length) await sleep(DELAY_MS)
  }
  console.log(`\n  Done: ${done} rows`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Translation script started')
  console.log(`  Translator: ${TRANSLATOR_MODEL}`)
  console.log(`  Reviewer:   ${REVIEWER_MODEL}`)
  console.log(`  Batch size: ${BATCH_SIZE}`)
  console.log(`  Limit:      ${LIMIT}`)
  console.log(`  Dry run:    ${DRY_RUN}`)
  console.log(`  Log file:   ${LOG_FILE}`)

  await addBackupColumns()

  if (!TABLE_FILTER || TABLE_FILTER === 'dtcs') {
    await translateDtcsTable()
  }
  if (!TABLE_FILTER || TABLE_FILTER === 'notes') {
    await translateNotesTable()
  }

  await pool.end()
  console.log('\nAll done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


// ─── Config ──────────────────────────────────────────────────────────────────

const TRANSLATOR_MODEL = 'pub-gpt-5'
const REVIEWER_MODEL = 'pub-gemini-3.1-pro-preview'
const BATCH_SIZE = 5          // rows per batch (keep small to respect rate limits)
const DELAY_MS = 1000         // delay between batches
const LOG_FILE = 'scripts/translate-log.jsonl'

const args = process.argv.slice(2)
const TABLE_FILTER = args.find(a => a.startsWith('--table='))?.split('=')[1]
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '99999')
const DRY_RUN = args.includes('--dry-run')

if (DRY_RUN) console.log('🔍 DRY RUN — no DB writes')

// ─── Clients ─────────────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL + '/openai/v1',
})

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 5,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasChinese(val: unknown): boolean {
  if (!val) return false
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return /[\u4e00-\u9fff]/.test(str)
}

function parseJsonField(val: unknown): unknown {
  if (val === null || val === undefined) return val
  if (typeof val === 'object') return val
  try { return JSON.parse(val as string) } catch { return val }
}

function log(entry: object) {
  appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Step 1: Translate (Chinese → English draft) ─────────────────────────────

async function translate(chineseText: string, context: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: TRANSLATOR_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are a professional automotive technical translator. Translate Chinese EV fault code documentation into clear, natural British English for Australian car owners.

Rules:
- Keep technical terms (DTC codes, part names, tool names) in their standard English form
- Use active voice and direct language ("Check the X", not "It is recommended to check the X")
- Preserve all specific values (voltages, resistances, temperatures, part numbers)
- Do NOT add explanations or commentary not in the original
- Do NOT use filler phrases like "Please note that", "It is worth mentioning", "In conclusion"
- Output ONLY the translated text, no preamble`,
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nTranslate this Chinese text to English:\n\n${chineseText}`,
      },
    ],
  })
  return response.choices[0].message.content?.trim() ?? ''
}

// ─── Step 2: Review (check for ambiguity and AI tone) ────────────────────────

async function review(chinese: string, englishDraft: string, context: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: REVIEWER_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: `You are a bilingual automotive technical editor reviewing an English translation of Chinese EV fault code documentation.

Your job:
1. Compare the English draft against the Chinese original for accuracy
2. Fix any mistranslations, omissions, or ambiguities
3. Remove AI-flavoured phrases ("It is important to note", "Please ensure", "It should be noted", "In order to")
4. Replace passive voice with active voice where natural
5. Ensure technical values (voltages, part numbers, tool names) are preserved exactly
6. Keep the tone direct and factual — like a workshop manual, not a chatbot

Output ONLY the final corrected English text. No commentary, no explanations, no "Here is the corrected translation:".`,
      },
      {
        role: 'user',
        content: `Context: ${context}

CHINESE ORIGINAL:
${chinese}

ENGLISH DRAFT:
${englishDraft}

Output the final corrected English:`,
      },
    ],
  })
  return response.choices[0].message.content?.trim() ?? englishDraft
}

// ─── Translate a single string field ─────────────────────────────────────────

async function translateField(chinese: string, context: string): Promise<string> {
  const draft = await translate(chinese, context)
  const final = await review(chinese, draft, context)
  return final
}

// ─── Translate a JSON array field (string[] or {title,body}[]) ───────────────

async function translateJsonArray(
  val: unknown,
  context: string
): Promise<unknown> {
  const arr = parseJsonField(val) as unknown[]
  if (!Array.isArray(arr) || arr.length === 0) return arr

  // Detect format: string[] or {title, body}[]
  if (typeof arr[0] === 'string') {
    // string[] — translate each item
    const results: string[] = []
    for (const item of arr as string[]) {
      if (hasChinese(item)) {
        results.push(await translateField(item, context))
      } else {
        results.push(item)
      }
    }
    return results
  } else {
    // {title, body}[] — translate title and body separately
    const results = []
    for (const item of arr as { title?: string; body?: string }[]) {
      const translated: { title?: string; body?: string } = { ...item }
      if (item.title && hasChinese(item.title)) {
        translated.title = await translateField(item.title, context + ' (step title)')
      }
      if (item.body && hasChinese(item.body)) {
        translated.body = await translateField(item.body, context + ' (step detail)')
      }
      results.push(translated)
    }
    return results
  }
}

// ─── Add backup columns (idempotent) ─────────────────────────────────────────

async function addBackupColumns() {
  console.log('Adding backup columns if not exist...')
  const columns: [string, string, string][] = [
    ['mf_nv_dtcs', 'description_cn', 'LONGTEXT'],
    ['mf_nv_dtcs', 'safety_warning_cn', 'TEXT'],
    ['mf_nv_dtc_model_notes', 'likely_causes_cn', 'JSON'],
    ['mf_nv_dtc_model_notes', 'suggested_actions_cn', 'JSON'],
    ['mf_nv_dtc_model_notes', 'climate_notes_cn', 'TEXT'],
  ]
  for (const [table, column, type] of columns) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    )
    if (rows.length > 0) {
      console.log(`  ─ ${table}.${column} already exists`)
      continue
    }
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    console.log(`  ✓ added ${table}.${column}`)
  }
}

// ─── Translate mf_nv_dtcs ────────────────────────────────────────────────────

async function translateDtcsTable() {
  console.log('\n── mf_nv_dtcs ──────────────────────────────────────')

  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT dtc_id, dtc_code, description_en, safety_warning
    FROM mf_nv_dtcs
    WHERE (description_en REGEXP '[\u4e00-\u9fff]' OR safety_warning REGEXP '[\u4e00-\u9fff]')
      AND description_cn IS NULL
    LIMIT ${LIMIT}
  `)
  console.log(`Found ${rows.length} rows needing translation`)

  let done = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    for (const row of batch) {
      const ctx = `DTC code ${row.dtc_code} — fault description for an EV`
      const updates: Record<string, string> = {}

      try {
        // Backup originals
        updates.description_cn = row.description_en ?? null
        updates.safety_warning_cn = row.safety_warning ?? null

        // Translate description_en
        if (hasChinese(row.description_en)) {
          updates.description_en = await translateField(row.description_en, ctx)
        }

        // Translate safety_warning
        if (hasChinese(row.safety_warning)) {
          updates.safety_warning = await translateField(
            row.safety_warning,
            `${ctx} — safety warning shown to driver`
          )
        }

        if (!DRY_RUN) {
          await pool.query(
            `UPDATE mf_nv_dtcs SET description_en=?, safety_warning=?, description_cn=?, safety_warning_cn=? WHERE dtc_id=?`,
            [updates.description_en ?? row.description_en, updates.safety_warning ?? row.safety_warning, updates.description_cn, updates.safety_warning_cn, row.dtc_id]
          )
        }

        done++
        log({ table: 'dtcs', dtc_id: row.dtc_id, dtc_code: row.dtc_code, status: 'ok', ...updates })
        process.stdout.write(`\r  ${done}/${rows.length} — ${row.dtc_code}          `)
      } catch (e) {
        console.error(`\n  ✗ dtc_id ${row.dtc_id}:`, (e as Error).message)
        log({ table: 'dtcs', dtc_id: row.dtc_id, dtc_code: row.dtc_code, status: 'error', error: (e as Error).message })
        console.error(`\n  ✗ dtc_id ${row.dtc_id} full error:`, e)
      }
    }

    if (i + BATCH_SIZE < rows.length) await sleep(DELAY_MS)
  }
  console.log(`\n  Done: ${done} rows`)
}

// ─── Translate mf_nv_dtc_model_notes ────────────────────────────────────────

async function translateNotesTable() {
  console.log('\n── mf_nv_dtc_model_notes ───────────────────────────')

  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT n.id, n.model_id, d.dtc_code,
           n.likely_causes, n.suggested_actions, n.climate_notes
    FROM mf_nv_dtc_model_notes n
    JOIN mf_nv_dtcs d ON n.dtc_id = d.dtc_id
    WHERE (
      n.likely_causes REGEXP '[\u4e00-\u9fff]'
      OR n.suggested_actions REGEXP '[\u4e00-\u9fff]'
      OR n.climate_notes REGEXP '[\u4e00-\u9fff]'
    )
    AND n.likely_causes_cn IS NULL
    LIMIT ${LIMIT}
  `)
  console.log(`Found ${rows.length} rows needing translation`)

  let done = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    for (const row of batch) {
      const ctx = `DTC code ${row.dtc_code} on ${row.model_id}`

      try {
        // Backup originals
        const origCauses = parseJsonField(row.likely_causes)
        const origActions = parseJsonField(row.suggested_actions)
        const origClimate = row.climate_notes

        let newCauses = origCauses
        let newActions = origActions
        let newClimate = origClimate

        if (hasChinese(row.likely_causes)) {
          newCauses = await translateJsonArray(row.likely_causes, `${ctx} — likely causes list`)
        }
        if (hasChinese(row.suggested_actions)) {
          newActions = await translateJsonArray(row.suggested_actions, `${ctx} — repair steps`)
        }
        if (hasChinese(row.climate_notes)) {
          newClimate = await translateField(row.climate_notes, `${ctx} — climate/environment note`)
        }

        if (!DRY_RUN) {
          await pool.query(
            `UPDATE mf_nv_dtc_model_notes
             SET likely_causes=?, suggested_actions=?, climate_notes=?,
                 likely_causes_cn=?, suggested_actions_cn=?, climate_notes_cn=?
             WHERE id=?`,
            [
              JSON.stringify(newCauses),
              JSON.stringify(newActions),
              newClimate,
              JSON.stringify(origCauses),
              JSON.stringify(origActions),
              origClimate,
              row.id,
            ]
          )
        }

        done++
        log({ table: 'notes', note_id: row.id, dtc_code: row.dtc_code, status: 'ok' })
        process.stdout.write(`\r  ${done}/${rows.length} — note ${row.id} (${row.dtc_code})          `)
      } catch (e) {
        console.error(`\n  ✗ note_id ${row.id}:`, (e as Error).message)
        log({ table: 'notes', note_id: row.id, dtc_code: row.dtc_code, status: 'error', error: (e as Error).message })
      }
    }

    if (i + BATCH_SIZE < rows.length) await sleep(DELAY_MS)
  }
  console.log(`\n  Done: ${done} rows`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Translation script started`)
  console.log(`  Translator: ${TRANSLATOR_MODEL}`)
  console.log(`  Reviewer:   ${REVIEWER_MODEL}`)
  console.log(`  Batch size: ${BATCH_SIZE}`)
  console.log(`  Limit:      ${LIMIT}`)
  console.log(`  Dry run:    ${DRY_RUN}`)
  console.log(`  Log file:   ${LOG_FILE}`)

  await addBackupColumns()

  if (!TABLE_FILTER || TABLE_FILTER === 'dtcs') {
    await translateDtcsTable()
  }
  if (!TABLE_FILTER || TABLE_FILTER === 'notes') {
    await translateNotesTable()
  }

  await pool.end()
  console.log('\nAll done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
