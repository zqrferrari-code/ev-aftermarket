// scripts/geo-monitor.ts
// 用法: PERPLEXITY_API_KEY=xxx dotenv -e .env.local -- tsx scripts/geo-monitor.ts
// 参数: --engine=perplexity  --limit=20

import { sb } from '@/lib/db'

const args = process.argv.slice(2)
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '20')
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY!
const SITE = 'evaftermarket.io'

// ─── 问题模板 ─────────────────────────────────────────────────────────────────

const DTC_QUERY_TEMPLATES = [
  (code: string, model: string) => `What does ${code} mean on a ${model}?`,
  (code: string, model: string) => `How to fix ${code} on ${model} in Australia?`,
]

const PARTS_QUERY_TEMPLATES = [
  (part: string, model: string) => `How much import duty for ${part} for ${model} Australia?`,
  (part: string) => `HS code for ${part} imported from China to Australia?`,
]

const PROBLEMS_QUERY_TEMPLATES = [
  (model: string) => `What are common problems with ${model} in Australia?`,
  (model: string) => `Is ${model} reliable in Australia?`,
]

// ─── Perplexity API 调用 ──────────────────────────────────────────────────────

async function askPerplexity(query: string): Promise<{ text: string; citations: string[] }> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: query }],
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`)
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
    citations?: string[]
  }

  return {
    text: data.choices[0]?.message?.content ?? '',
    citations: data.citations ?? [],
  }
}

function checkCitation(text: string, citations: string[]): { cited: boolean; url: string | null } {
  const allText = text + ' ' + citations.join(' ')
  const cited = allText.toLowerCase().includes(SITE)
  const url = citations.find(c => c.toLowerCase().includes(SITE.toLowerCase())) ?? null
  return { cited, url }
}

// ─── 采样查询 ─────────────────────────────────────────────────────────────────

async function sampleQueries(): Promise<{ query: string; type: string }[]> {
  const queries: { query: string; type: string }[] = []

  // DTC 样本
  const { data: dtcSamples } = await sb
    .from('mf_nv_dtc_model_notes')
    .select('dtc_id, model_id, mf_nv_dtcs!inner(dtc_code), mf_nv_models!inner(model_name)')
    .not('geo_summary', 'is', null)
    .limit(5)

  for (const row of (dtcSamples as any[] ?? [])) {
    const code = row.mf_nv_dtcs.dtc_code
    const model = row.mf_nv_models.model_name
    const tmpl = DTC_QUERY_TEMPLATES[Math.floor(Math.random() * DTC_QUERY_TEMPLATES.length)]
    queries.push({ query: tmpl(code, model), type: 'dtc' })
  }

  // Parts 样本
  const { data: partSamples } = await sb
    .from('mf_parts')
    .select('name_en, mf_part_model_compatibility!inner(mf_nv_models!inner(model_name))')
    .not('geo_summary', 'is', null)
    .limit(4)

  for (const row of (partSamples as any[] ?? [])) {
    const part = row.name_en
    const model = (row.mf_part_model_compatibility as any[])[0]?.mf_nv_models?.model_name ?? 'BYD Atto 3'
    const tmpl = PARTS_QUERY_TEMPLATES[Math.floor(Math.random() * PARTS_QUERY_TEMPLATES.length)]
    queries.push({ query: tmpl(part, model), type: 'parts' })
  }

  // Problems 样本
  const { data: modelSamples } = await sb
    .from('mf_nv_models')
    .select('model_name')
    .not('geo_summary', 'is', null)
    .limit(4)

  for (const row of (modelSamples as any[] ?? [])) {
    const tmpl = PROBLEMS_QUERY_TEMPLATES[Math.floor(Math.random() * PROBLEMS_QUERY_TEMPLATES.length)]
    queries.push({ query: tmpl(row.model_name), type: 'problems' })
  }

  return queries.slice(0, limitArg)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔍 GEO Monitor — engine=perplexity, limit=${limitArg}\n`)

  const queries = await sampleQueries()
  console.log(`Sampled ${queries.length} queries\n`)

  let cited = 0
  let notCited = 0

  for (const { query, type } of queries) {
    console.log(`[${type}] ${query}`)
    try {
      const result = await askPerplexity(query)
      const { cited: isCited, url } = checkCitation(result.text, result.citations)

      await sb.from('geo_monitoring_results').insert({
        query,
        ai_engine: 'perplexity',
        cited: isCited,
        citation_url: url,
        response_snippet: result.text.slice(0, 300),
      })

      if (isCited) {
        console.log(`  ✅ CITED — ${url}`)
        cited++
      } else {
        console.log(`  ❌ not cited`)
        notCited++
      }

      await new Promise(r => setTimeout(r, 1500))
    } catch (e) {
      console.error(`  Error:`, e)
    }
  }

  console.log(`\n📊 Results: ${cited} cited / ${notCited} not cited out of ${queries.length} queries`)
  if (queries.length > 0) {
    console.log(`Citation rate: ${Math.round(cited / queries.length * 100)}%`)
  } else {
    console.log('No queries sampled — check that geo_summary content has been generated first.')
  }
}

main().catch(console.error)
