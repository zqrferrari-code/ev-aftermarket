// scripts/generate-geo-summaries.ts
// 用法: npx dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts
// 参数: --type=dtc|parts|problems  --limit=N  --dry-run
// 配置: 读取 ev-pipeline 的 llm-config.json，使用 pub-kimi-k2.5 模型

import { readFileSync } from 'fs'
import { resolve } from 'path'
import OpenAI from 'openai'
import { sb } from '@/lib/db'

const llmConfigPath = resolve(__dirname, '../../ev-pipeline/llm-config.json')
const llmConfig = JSON.parse(readFileSync(llmConfigPath, 'utf-8')) as {
  llm_base_url: string
  llm_api_key: string
}

const client = new OpenAI({
  apiKey: llmConfig.llm_api_key,
  baseURL: llmConfig.llm_base_url,
})

const MODEL = 'pub-gpt-5.5'

const args = process.argv.slice(2)
const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1] ?? 'all'
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '9999')
const dryRun = args.includes('--dry-run')

// ─── DTC ──────────────────────────────────────────────────────────────────────

async function generateDtcSummary(row: {
  id: number
  dtc_code: string
  description_en: string | null
  severity: string | null
  likely_causes: unknown
  suggested_actions: unknown
  model_name: string
  case_count: number
}): Promise<string> {
  const causes = Array.isArray(row.likely_causes)
    ? (row.likely_causes as string[]).slice(0, 2).join(' and ')
    : typeof row.likely_causes === 'string'
    ? (() => { try { return (JSON.parse(row.likely_causes) as string[]).slice(0, 2).join(' and ') } catch { return 'various electrical or software faults' } })()
    : 'various electrical or software faults'

  const actions = Array.isArray(row.suggested_actions)
    ? (row.suggested_actions as { title: string }[])[0]?.title ?? 'visiting an authorised dealer'
    : 'visiting an authorised dealer'

  const prompt = `Write a 60-80 word plain English summary for a fault code page. Be factual and concise.

DTC code: ${row.dtc_code}
Vehicle: ${row.model_name}
Description: ${row.description_en ?? 'unknown'}
Severity: ${row.severity ?? 'unknown'}
Common causes: ${causes}
First recommended action: ${actions}
Real cases recorded: ${row.case_count}

Start with "The ${row.dtc_code} fault code on the ${row.model_name} indicates...". Include severity, 1-2 causes, and fix. If case_count > 0, mention typical repair cost data is available. Output only the paragraph, no headings.`

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from model')
  return text
} {
  console.log('📋 Fetching DTC notes without geo_summary...')

  const { data: notes, error } = await sb
    .from('mf_nv_dtc_model_notes')
    .select(`
      id,
      dtc_id,
      model_id,
      likely_causes,
      suggested_actions,
      mf_nv_dtcs!inner(dtc_code, description_en, severity),
      mf_nv_models!inner(model_name)
    `)
    .is('geo_summary', null)
    .limit(limitArg)

  if (error || !notes) {
    console.error('Error fetching DTC notes:', error)
    return
  }

  console.log(`Found ${notes.length} DTC notes to process`)

  let success = 0
  let failed = 0
  const samples: string[] = []

  for (const note of notes as any[]) {
    const dtc = note.mf_nv_dtcs
    const model = note.mf_nv_models

    // Count cases for this DTC
    const { count } = await sb
      .from('mf_nv_case_dtc_links')
      .select('*', { count: 'exact', head: true })
      .eq('dtc_id', note.dtc_id)

    try {
      const summary = await generateDtcSummary({
        id: note.id,
        dtc_code: dtc.dtc_code,
        description_en: dtc.description_en,
        severity: dtc.severity,
        likely_causes: note.likely_causes,
        suggested_actions: note.suggested_actions,
        model_name: model.model_name,
        case_count: count ?? 0,
      })

      if (dryRun) {
        console.log(`[DRY RUN] ${dtc.dtc_code} — ${model.model_name}:\n${summary}\n`)
      } else {
        const { error: updateError } = await sb
          .from('mf_nv_dtc_model_notes')
          .update({ geo_summary: summary })
          .eq('id', note.id)
        if (updateError) throw new Error(`Update failed: ${updateError.message}`)
        success++
        if (samples.length < 3) samples.push(`${dtc.dtc_code} (${model.model_name}): ${summary.slice(0, 80)}...`)
      }

      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.error(`Failed for note ${note.id}:`, e)
      failed++
    }
  }

  console.log(`\n✅ DTC: ${success} generated, ${failed} failed`)
  console.log('\nSamples:')
  samples.forEach(s => console.log(' -', s))
}

// ─── PARTS ────────────────────────────────────────────────────────────────────

async function generatePartsSummary(row: {
  id: number
  name_en: string
  hs_code: string
  hs_description: string | null
  mfn_rate: string | null
  fta_rate: string | null
  fta_name: string | null
  vat_rate: string | null
}): Promise<string> {
  const mfn = row.mfn_rate ? `${row.mfn_rate}%` : 'unknown'
  const fta = row.fta_rate ? `${row.fta_rate}%` : 'unknown'
  const ftaName = row.fta_name ?? 'ChAFTA'
  const gst = row.vat_rate ? `${row.vat_rate}%` : '10%'

  // Example calculation: $200 part + $30 shipping
  const exampleCIF = 230
  const ftaRateNum = parseFloat(row.fta_rate ?? '0')
  const gstRateNum = parseFloat(row.vat_rate ?? '10')
  const exampleDuty = Math.round(exampleCIF * (ftaRateNum / 100) * 100) / 100
  const exampleGST = Math.round((exampleCIF + exampleDuty) * (gstRateNum / 100) * 100) / 100
  const exampleTotal = Math.round((exampleCIF + exampleDuty + exampleGST) * 100) / 100

  const prompt = `Write a plain English import cost explanation for an EV part page. Australian audience, costs in AUD. Be specific with numbers.

Part: ${row.name_en}
AU HS Code: ${row.hs_code}
HS Description: ${row.hs_description ?? 'EV replacement part'}
MFN duty rate: ${mfn}
${ftaName} FTA rate (Chinese origin): ${fta}
GST: ${gst}

Example with $200 part + $30 shipping = CIF $${exampleCIF}:
- Duty at ${ftaName} rate: $${exampleDuty}
- GST: $${exampleGST}
- Total landed cost: $${exampleTotal} AUD

Format as 3-4 bullet points listing the rates, then one sentence with the example calculation. Output only the content, no headings.`

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from model')
  return text
}

async function processParts() {
  console.log('📋 Fetching parts without geo_summary...')

  const { data: parts, error } = await sb
    .from('mf_parts')
    .select('id, name_en')
    .is('geo_summary', null)
    .limit(limitArg)

  if (error || !parts) {
    console.error('Error fetching parts:', error)
    return
  }

  console.log(`Found ${parts.length} parts to process`)

  let success = 0
  let failed = 0

  for (const part of parts) {
    // Get AU HS code and tariff
    const { data: hsCodes } = await sb
      .from('mf_part_hs_codes')
      .select('hs_code, description_en')
      .eq('part_id', part.id)
      .eq('country_code', 'AU')
      .eq('hs_code_type', 'import')
      .limit(1)

    if (!hsCodes || hsCodes.length === 0) continue

    const hsCode = hsCodes[0]

    const { data: tariff } = await sb
      .from('mf_tariff_rates')
      .select('mfn_rate, fta_rate, fta_name, vat_rate')
      .eq('country_code', 'AU')
      .eq('hs_code', hsCode.hs_code)
      .limit(1)
      .single()

    try {
      const summary = await generatePartsSummary({
        id: part.id,
        name_en: part.name_en,
        hs_code: hsCode.hs_code,
        hs_description: hsCode.description_en,
        mfn_rate: tariff?.mfn_rate ?? null,
        fta_rate: tariff?.fta_rate ?? null,
        fta_name: tariff?.fta_name ?? null,
        vat_rate: tariff?.vat_rate ?? null,
      })

      if (dryRun) {
        console.log(`[DRY RUN] ${part.name_en}:\n${summary}\n`)
      } else {
        const { error: updateError } = await sb
          .from('mf_parts')
          .update({ geo_summary: summary })
          .eq('id', part.id)
        if (updateError) throw new Error(`Update failed: ${updateError.message}`)
        success++
      }

      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.error(`Failed for part ${part.id}:`, e)
      failed++
    }
  }

  console.log(`\n✅ Parts: ${success} generated, ${failed} failed`)
}

// ─── PROBLEMS (models) ────────────────────────────────────────────────────────

async function generateModelSummary(row: {
  model_id: string
  model_name: string
  total_cases: number
  top_problems: { symptom_summary: string; cost_info: string | null; count: number }[]
}): Promise<string> {
  const topList = row.top_problems
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.symptom_summary.slice(0, 80)}${p.cost_info ? ` (cost: ${p.cost_info})` : ''} — ${p.count} report${p.count > 1 ? 's' : ''}`)
    .join('\n')

  const prompt = `Write a top problems summary for a vehicle reliability page. Australian audience, costs in AUD. Use real data only.

Vehicle: ${row.model_name}
Total owner reports: ${row.total_cases}
Top reported problems:
${topList}

Format as:
"Top reported problems for ${row.model_name} in Australia (${row.total_cases} owner reports):"
Then a numbered list (max 5), each: brief problem description — N owner report(s), cost if available.
End with one sentence about where to find more detail.
Output only the content, no extra headings.`

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from model')
  return text
}

async function processModels() {
  console.log('📋 Fetching models without geo_summary...')

  const { data: models, error } = await sb
    .from('mf_nv_models')
    .select('model_id, model_name')
    .is('geo_summary', null)
    .limit(limitArg)

  if (error || !models) {
    console.error('Error fetching models:', error)
    return
  }

  console.log(`Found ${models.length} models to process`)

  let success = 0
  let failed = 0

  for (const model of models) {
    const { data: cases } = await sb
      .from('mf_nv_cases')
      .select('symptom_summary, cost_info')
      .eq('model_id', model.model_id)
      .eq('content_type', 'problem')
      .not('symptom_summary', 'is', null)

    if (!cases || cases.length === 0) continue

    // Group by symptom similarity — simple approach: count distinct symptom_summary, take top 5
    const countMap: Record<string, { cost_info: string | null; count: number }> = {}
    for (const c of cases) {
      const key = c.symptom_summary.slice(0, 60)
      if (!countMap[key]) countMap[key] = { cost_info: c.cost_info, count: 0 }
      countMap[key].count++
    }
    const topProblems = Object.entries(countMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([symptom_summary, v]) => ({ symptom_summary, ...v }))

    try {
      const summary = await generateModelSummary({
        model_id: model.model_id,
        model_name: model.model_name,
        total_cases: cases.length,
        top_problems: topProblems,
      })

      if (dryRun) {
        console.log(`[DRY RUN] ${model.model_name}:\n${summary}\n`)
      } else {
        const { error: updateError } = await sb
          .from('mf_nv_models')
          .update({ geo_summary: summary })
          .eq('model_id', model.model_id)
        if (updateError) throw new Error(`Update failed: ${updateError.message}`)
        success++
      }

      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.error(`Failed for model ${model.model_id}:`, e)
      failed++
    }
  }

  console.log(`\n✅ Models: ${success} generated, ${failed} failed`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 GEO Summary Generator — type=${typeArg}, limit=${limitArg}, dryRun=${dryRun}\n`)

  if (typeArg === 'dtc' || typeArg === 'all') await processDtcs()
  if (typeArg === 'parts' || typeArg === 'all') await processParts()
  if (typeArg === 'problems' || typeArg === 'all') await processModels()

  console.log('\n✅ Done.')
}

main().catch(console.error)
