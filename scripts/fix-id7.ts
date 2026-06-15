import { db } from '../lib/db/index'
import { warningLights } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { readFileSync } from 'fs'
import { join } from 'path'

const llmConfig = JSON.parse(readFileSync(join(process.env.HOME!, 'trunk/ev-pipeline/llm-config.json'), 'utf8'))
const llm = new OpenAI({ apiKey: llmConfig.llm_api_key, baseURL: llmConfig.llm_base_url })

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function extractText(html: string, afterId: string): string {
  const headingRe = new RegExp(`id="${afterId}"[^>]*>[^<]*(?:<[^>]+>)*[^<]*</h\\d>`, 'i')
  const match = html.match(headingRe)
  if (!match) return ''
  const afterHeading = html.slice(html.indexOf(match[0]) + match[0].length)
  const nextH2 = afterHeading.search(/<h2\b/i)
  const section = nextH2 > 0 ? afterHeading.slice(0, nextH2) : afterHeading.slice(0, 2000)
  return section.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}

async function main() {
  const url = 'https://dianchema.com/byd/brake/byd-fp-018/'
  console.log('Fetching', url)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  const html = await res.text()

  const description_cn = extractText(html, '这个警告灯是什么意思')
  const action_cn = extractText(html, '出现这个警告灯怎么办')
  console.log('description_cn:', description_cn.slice(0, 100))
  console.log('action_cn:', action_cn.slice(0, 100))

  console.log('Translating...')
  const response = await llm.chat.completions.create({
    model: 'pub-kimi-k2.5',
    max_tokens: 800,
    messages: [{ role: 'user', content: `Translate the following Chinese automotive warning light texts to natural English for Australian EV owners. Return JSON only with "description_en" and "action_en" keys.\n\nDescription:\n${description_cn}\n\nAction:\n${action_cn}\n\nReturn only valid JSON, no markdown fences.` }],
  })
  const translated = JSON.parse(response.choices[0]?.message?.content ?? '{}')
  console.log('description_en:', translated.description_en?.slice(0, 200))
  console.log('action_en:', translated.action_en?.slice(0, 200))

  await db.update(warningLights).set({
    code: 'BYD_FP_018',
    description_en: translated.description_en,
    action_en: translated.action_en,
  }).where(eq(warningLights.id, 7))

  console.log('Updated id=7')
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
