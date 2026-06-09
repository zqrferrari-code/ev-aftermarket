/**
 * AI 辅助故障码内容生成脚本
 * 用法: ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-dtc-content.ts
 * 生成后人工审核 scripts/generated-dtc-notes.json，再运行 seed-dtc-notes.ts 写入数据库
 */
import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync } from 'fs'

const client = new Anthropic()

const TARGET_DTCS = [
  { code: 'P0A1F', model: 'byd-atto3', market: 'AU' },
  { code: 'P0A80', model: 'byd-atto3', market: 'AU' },
  { code: 'P0A7A', model: 'byd-atto3', market: 'AU' },
  { code: 'P0A09', model: 'byd-atto3', market: 'AU' },
  { code: 'P0C73', model: 'byd-atto3', market: 'AU' },
  { code: 'P0D0B', model: 'byd-atto3', market: 'AU' },
  { code: 'B1001', model: 'byd-atto3', market: 'AU' },
]

async function generateDtcNote(code: string, model: string, market: string) {
  const prompt = `You are an automotive technical writer creating fault code documentation for ${model.replace(/-/g, ' ').toUpperCase()} vehicles in the ${market} market.

Generate a structured JSON response for fault code ${code} with these exact fields:
{
  "likely_causes": [3-5 specific causes as strings, relevant to BYD/Chinese EV systems],
  "suggested_actions": [
    {
      "title": "Short imperative step title (5-8 words)",
      "body": "2-3 sentences of specific technical detail: what to look for, exact values, tools needed, or why this step matters. Not generic advice."
    }
  ],
  "climate_notes": "one sentence about ${market} climate relevance or null if not relevant"
}

Rules:
- likely_causes: be specific to this code and BYD/EV systems, not generic OBD descriptions
- suggested_actions: 3-5 steps. Each body must include at least one concrete detail (voltage value, temperature threshold, part name, tool name, or specific symptom)
- For CRITICAL codes, first action must address immediate safety
- For high-voltage codes, always include "authorised dealer only" in relevant steps
- Respond with valid JSON only, no other text`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text)
}

async function main() {
  const results = []
  for (const dtc of TARGET_DTCS) {
    console.log(`Generating content for ${dtc.code}...`)
    try {
      const note = await generateDtcNote(dtc.code, dtc.model, dtc.market)
      results.push({ ...dtc, ...note })
      await new Promise((r) => setTimeout(r, 800))
    } catch (e) {
      console.error(`Failed for ${dtc.code}:`, e)
    }
  }

  writeFileSync('scripts/generated-dtc-notes.json', JSON.stringify(results, null, 2))
  console.log(`✅ Generated ${results.length} DTC notes → scripts/generated-dtc-notes.json`)
  console.log('Review the file before running: pnpm tsx scripts/seed-dtc-notes.ts')
}

main().catch(console.error)
