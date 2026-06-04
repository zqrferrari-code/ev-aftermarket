import 'dotenv/config'
import * as cheerio from 'cheerio'
import { db } from '../lib/db/index'
import { softwareUpdates, models } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'

// Only scrape models that exist in our DB
const MODEL_MAP: Record<string, string> = {
  'atto-3': 'byd-atto3',
  'atto3': 'byd-atto3',
  'dolphin': 'byd-dolphin',
}

const SPEC_URLS: { modelId: string; url: string }[] = [
  { modelId: 'byd-atto3', url: 'https://www.mybyd.co.uk/byd-atto-3/' },
  { modelId: 'byd-dolphin', url: 'https://www.mybyd.co.uk/byd-dolphin/' },
]

const MARKET_CODE = 'au'

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EVAftermarket-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function parseVersion(text: string): string | null {
  const m = text.match(/\b(\d+\.\d+\.\d+)\b/)
  return m ? m[1] : null
}

function parseReleaseDate(text: string): string | null {
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  }
  const m = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d+,?\s+(\d{4})\b/i)
  if (!m) return null
  const month = months[m[1].toLowerCase()]
  return `${m[2]}-${month}`
}

function milesToKm(miles: number): number {
  return Math.round((miles * 1.60934) / 10) * 10
}

function parseNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern)
  return m ? parseFloat(m[1]) : null
}

async function scrapeOtaArticles(): Promise<void> {
  console.log('\nDiscovering OTA articles from homepage...')
  const html = await fetchHtml('https://www.mybyd.co.uk/')
  const $ = cheerio.load(html)

  const articleUrls: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (/mybyd\.co\.uk\/.+(ota|software.update)/i.test(href)) {
      articleUrls.push(href)
    }
  })

  const unique = [...new Set(articleUrls)]
  console.log(`Found ${unique.length} OTA article(s): ${unique.join(', ')}`)

  for (const url of unique) {
    await scrapeOtaArticle(url)
  }
}

async function scrapeOtaArticle(url: string): Promise<void> {
  let modelId: string | null = null
  for (const [key, id] of Object.entries(MODEL_MAP)) {
    if (url.toLowerCase().includes(key)) {
      modelId = id
      break
    }
  }
  if (!modelId) {
    console.log(`  Skip ${url} — model not in DB`)
    return
  }

  const html = await fetchHtml(url)
  const $ = cheerio.load(html)

  const bodyText = $('body').text()
  const version = parseVersion($('h1').first().text()) ?? parseVersion(bodyText)
  if (!version) {
    console.log(`  Skip ${url} — could not parse version`)
    return
  }

  const releaseDate = parseReleaseDate(bodyText)

  const changelogParts: string[] = []
  $('li').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 10) changelogParts.push(text)
  })
  const changelog = changelogParts.join(' ')

  const existing = await db
    .select({ update_id: softwareUpdates.update_id })
    .from(softwareUpdates)
    .where(and(
      eq(softwareUpdates.model_id, modelId),
      eq(softwareUpdates.version, version),
    ))
    .limit(1)

  if (existing.length > 0) {
    console.log(`  Skip ${modelId} v${version} (already exists)`)
    return
  }

  await db.insert(softwareUpdates).values({
    model_id: modelId,
    market_code: MARKET_CODE,
    version,
    release_date: releaseDate ?? undefined,
    update_method: 'OTA',
    changelog_en: changelog || null,
    source_url: url,
    data_confidence: 'community',
  })
  console.log(`✓ Inserted ${modelId} v${version} (${releaseDate ?? 'date unknown'})`)
}

async function scrapeModelSpec(modelId: string, url: string): Promise<void> {
  console.log(`\n[${modelId}] Fetching spec page...`)
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  const bodyText = $('body').text()

  const rangeMiles = parseNumber(bodyText, /(\d+)\s*mi(?:les)?(?:\s+WLTP)?/i)
  const range_km = rangeMiles ? milesToKm(rangeMiles) : null

  const battery_kwh = parseNumber(bodyText, /(\d+(?:\.\d+)?)\s*kWh/i)

  const acceleration_0_100 = parseNumber(bodyText, /(\d+(?:\.\d+)?)\s*s(?:econds?)?\s+0[-–](?:62|100)/i)
    ?? parseNumber(bodyText, /0[-–](?:62|100)[^.]*?(\d+(?:\.\d+)?)\s*s/i)

  const charge_dc_kw_raw = parseNumber(bodyText, /(\d+(?:\.\d+)?)\s*kW\s+DC/i)
  const charge_dc_kw = charge_dc_kw_raw

  const charge_ac_kw = parseNumber(bodyText, /(\d+(?:\.\d+)?)\s*kW\s+AC/i)
    ?? parseNumber(bodyText, /(?:Type\s*2|AC)[^.]*?(\d+(?:\.\d+)?)\s*kW/i)

  // Cargo: look for 3+ digit numbers near boot/cargo/luggage/litre context
  const cargo_l_raw = parseNumber(bodyText, /(\d{3,})\s*(?:litres?|L)\b/i)
    ?? parseNumber(bodyText, /(?:boot|cargo|luggage|trunk)[^.]{0,60}?(\d{3,})/i)
  const cargo_l = cargo_l_raw ? Math.round(cargo_l_raw) : null

  console.log(`  range: ${range_km ? range_km + 'km' : 'null'}, battery: ${battery_kwh ? battery_kwh + 'kWh' : 'null'}, 0-100: ${acceleration_0_100 ? acceleration_0_100 + 's' : 'null'}, DC: ${charge_dc_kw ? charge_dc_kw + 'kW' : 'null'}, AC: ${charge_ac_kw ? charge_ac_kw + 'kW' : 'null'}, cargo: ${cargo_l ? cargo_l + 'L' : 'null'}`)

  // Only update non-null values — range_km and cargo_l are int; decimal fields use string representation
  const updateData: Record<string, unknown> = {}
  if (range_km !== null) updateData.range_km = range_km
  if (battery_kwh !== null) updateData.battery_kwh = battery_kwh.toString()
  if (acceleration_0_100 !== null) updateData.acceleration_0_100 = acceleration_0_100.toString()
  if (charge_ac_kw !== null) updateData.charge_ac_kw = charge_ac_kw.toString()
  if (charge_dc_kw !== null) updateData.charge_dc_kw = charge_dc_kw.toString()
  if (cargo_l !== null) updateData.cargo_l = cargo_l

  if (Object.keys(updateData).length > 0) {
    await db.update(models)
      .set(updateData)
      .where(eq(models.model_id, modelId))
    console.log(`  Spec updated in DB`)
  } else {
    console.log(`  No spec data found — skipping DB update`)
  }
}

async function main() {
  console.log('Scraping mybyd.co.uk...')

  for (const { modelId, url } of SPEC_URLS) {
    await scrapeModelSpec(modelId, url)
  }

  await scrapeOtaArticles()

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
