/**
 * Scrape BYD warning light data from dianchema.com
 * Extracts: code (BYD_WL_xxx), name_en, description_cn, action_cn
 * Translates CN→EN via LiteLLM
 * Matches to DB records by name_en and updates code + description_en + action_en
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/scrape-dianchema-wl.ts
 *   Or dry run (no DB writes):
 *   npx tsx --env-file=.env.local scripts/scrape-dianchema-wl.ts --dry-run
 */
import 'dotenv/config'
import OpenAI from 'openai'
import { db } from '../lib/db/index'
import { warningLights } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'https://dianchema.com'
const BRAND = 'byd'
const DRY_RUN = process.argv.includes('--dry-run')
const TRANSLATE_MODEL = 'pub-kimi-k2.5'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Load LiteLLM config from ev-pipeline
const llmConfig = JSON.parse(readFileSync(join(process.env.HOME!, 'trunk/ev-pipeline/llm-config.json'), 'utf8'))
const llm = new OpenAI({ apiKey: llmConfig.llm_api_key, baseURL: llmConfig.llm_base_url })

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function extractText(html: string, afterId: string): string {
  // Find content after heading with given id
  const headingRe = new RegExp(`id="${afterId}"[^>]*>[^<]*(?:<[^>]+>)*[^<]*</h\\d>`, 'i')
  const match = html.match(headingRe)
  if (!match) return ''
  const afterHeading = html.slice(html.indexOf(match[0]) + match[0].length)
  // Extract up to the next h2 heading
  const nextH2 = afterHeading.search(/<h2\b/i)
  const section = nextH2 > 0 ? afterHeading.slice(0, nextH2) : afterHeading.slice(0, 2000)
  // Strip HTML tags and decode entities
  return section
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x26;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

interface ScrapedLight {
  url: string
  code: string         // e.g. BYD_WL_008
  name_cn: string
  name_en: string
  description_cn: string
  action_cn: string
}

async function scrapeLightPage(url: string): Promise<ScrapedLight | null> {
  try {
    const html = await fetchHtml(url)

    // Code from URL: /byd/battery/byd-wl-008/ → BYD_WL_008
    const codeMatch = url.match(/\/(byd-[a-z]+-\d+)\/$/)
    if (!codeMatch) return null
    const code = codeMatch[1].toUpperCase().replace(/-/g, '_')

    // Chinese name from h1
    const h1Match = html.match(/<h1[^>]*class="[^"]*astro-j6tvhyss[^"]*"[^>]*>([^<]+)<\/h1>/)
    const name_cn = h1Match ? h1Match[1].trim() : ''

    // English name from aside note
    const enMatch = html.match(/英文名称[\s\S]{0,200}?<p>([\s\S]*?)<\/p>/)
    const name_en = enMatch ? enMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    // Description (这个警告灯是什么意思)
    const description_cn = extractText(html, '这个警告灯是什么意思')

    // Action (出现这个警告灯怎么办)
    const action_cn = extractText(html, '出现这个警告灯怎么办')

    return { url, code, name_cn, name_en, description_cn, action_cn }
  } catch (e) {
    console.error(`  Error scraping ${url}:`, e)
    return null
  }
}

async function getAllLightUrls(): Promise<string[]> {
  const html = await fetchHtml(`${BASE_URL}/${BRAND}/`)
  const matches = [...html.matchAll(/href="(\/byd\/[^"/]+\/byd-(?:wl|fp)-\d+\/)"/g)]
  return [...new Set(matches.map((m) => BASE_URL + m[1]))]
}

async function translateToEnglish(texts: { description_cn: string; action_cn: string }): Promise<{ description_en: string; action_en: string }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await llm.chat.completions.create({
        model: TRANSLATE_MODEL,
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Translate the following Chinese automotive warning light texts to natural English for Australian EV owners. Return JSON only with "description_en" and "action_en" keys.

Description (what the light means):
${texts.description_cn}

Action (what to do):
${texts.action_cn}

Return only valid JSON, no markdown fences.`,
        }],
      })
      const text = response.choices[0]?.message?.content ?? ''
      try {
        return JSON.parse(text)
      } catch {
        console.error('  Translation parse error:', text.slice(0, 100))
        return { description_en: '', action_en: '' }
      }
    } catch (e: any) {
      if (attempt < 3) {
        console.error(`  Translate attempt ${attempt} failed, retrying in 3s...`)
        await new Promise((r) => setTimeout(r, 3000))
      } else {
        console.error('  Translation failed after 3 attempts:', e?.message ?? e)
        return { description_en: '', action_en: '' }
      }
    }
  }
  return { description_en: '', action_en: '' }
}

async function findDbRecord(nameEn: string, nameCn: string): Promise<number | null> {
  // Try exact name_en match first
  const rows = await db
    .select({ id: warningLights.id, name_en: warningLights.name_en, name_cn: warningLights.name_cn })
    .from(warningLights)
    .where(eq(warningLights.brand_id, BRAND))

  // Exact English match
  const exactEn = rows.find((r) => r.name_en.toLowerCase() === nameEn.toLowerCase())
  if (exactEn) return exactEn.id

  // Exact Chinese match
  const exactCn = rows.find((r) => r.name_cn && r.name_cn === nameCn)
  if (exactCn) return exactCn.id

  // Fuzzy: significant word overlap on English name
  const queryWords = new Set(nameEn.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
  let bestId: number | null = null
  let bestScore = 0
  for (const r of rows) {
    const rowWords = new Set(r.name_en.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
    let overlap = 0
    for (const w of queryWords) if (rowWords.has(w)) overlap++
    const score = overlap / Math.max(queryWords.size, rowWords.size)
    if (score > bestScore && score >= 0.5) { bestScore = score; bestId = r.id }
  }

  return bestId
}

async function main() {
  console.log('Collecting warning light URLs...')
  const allUrls = await getAllLightUrls()
  console.log(`Total: ${allUrls.length} unique URLs\n`)

  const results: Array<ScrapedLight & { description_en: string; action_en: string; matched_id: number | null }> = []

  for (const url of allUrls) {
    console.log(`Scraping: ${url}`)
    const scraped = await scrapeLightPage(url)
    if (!scraped) continue

    console.log(`  Code: ${scraped.code}  Name EN: ${scraped.name_en}`)

    let description_en = ''
    let action_en = ''

    if (scraped.description_cn || scraped.action_cn) {
      process.stdout.write('  Translating...')
      const translated = await translateToEnglish({ description_cn: scraped.description_cn, action_cn: scraped.action_cn })
      description_en = translated.description_en
      action_en = translated.action_en
      console.log(' done')
    }

    const matched_id = await findDbRecord(scraped.name_en, scraped.name_cn)
    console.log(`  DB match: ${matched_id ?? 'none'}`)

    results.push({ ...scraped, description_en, action_en, matched_id })

    // Polite delay
    await new Promise((r) => setTimeout(r, 300))
  }

  // Save intermediate results
  writeFileSync('scripts/dianchema-wl-scraped.json', JSON.stringify(results, null, 2))
  console.log(`\nSaved ${results.length} records to scripts/dianchema-wl-scraped.json`)

  if (DRY_RUN) {
    console.log('\nDry run — skipping DB updates')
    const matched = results.filter((r) => r.matched_id !== null)
    const unmatched = results.filter((r) => r.matched_id === null)
    console.log(`Matched: ${matched.length}, Unmatched: ${unmatched.length}`)
    if (unmatched.length > 0) {
      console.log('Unmatched codes:')
      for (const r of unmatched) console.log(`  ${r.code} — ${r.name_en}`)
    }
    process.exit(0)
  }

  // Update DB
  console.log('\nUpdating DB...')
  let updated = 0
  for (const r of results) {
    if (!r.matched_id) continue
    await db
      .update(warningLights)
      .set({
        code: r.code,
        ...(r.description_en ? { description_en: r.description_en } : {}),
        ...(r.action_en ? { action_en: r.action_en } : {}),
      })
      .where(eq(warningLights.id, r.matched_id))
    updated++
    console.log(`  Updated id=${r.matched_id} with code=${r.code}`)
  }

  console.log(`\nDone. Updated ${updated} / ${results.length} records.`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
