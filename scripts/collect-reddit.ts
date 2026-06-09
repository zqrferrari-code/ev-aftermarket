/**
 * Whirlpool + ProductReview 案例采集脚本
 * 从澳洲本地论坛/评论网站抓取真实车主问题，用 Claude 提炼后写入 pending_cases
 *
 * 用法:
 *   dotenv -e .env.local -- tsx scripts/collect-reddit.ts                    # 全部
 *   dotenv -e .env.local -- tsx scripts/collect-reddit.ts --source whirlpool
 *   dotenv -e .env.local -- tsx scripts/collect-reddit.ts --source productreview
 *   dotenv -e .env.local -- tsx scripts/collect-reddit.ts --model byd-atto-3
 *   dotenv -e .env.local -- tsx scripts/collect-reddit.ts --dry-run
 */

import Anthropic from '@anthropic-ai/sdk'
import { db } from '../lib/db/index'
import { pendingCases } from '../lib/db/schema'

// ── CLI 参数 ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const TARGET_MODEL  = args.includes('--model')  ? args[args.indexOf('--model')  + 1] : null
const TARGET_SOURCE = args.includes('--source') ? args[args.indexOf('--source') + 1] : null
const DRY_RUN = args.includes('--dry-run')

if (DRY_RUN) console.log('🔍 DRY RUN — 不写入数据库\n')

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ── 车型配置 ──────────────────────────────────────────────────────────────────
const MODEL_CONFIGS = [
  {
    slug: 'byd-atto-3',
    model_id: 'byd-atto3',
    search_terms: ['BYD Atto 3', 'Atto 3 EV'],
    // ProductReview listing slugs
    pr_slug: 'byd-atto-3',
    // Whirlpool forum search terms
    wp_terms: ['BYD Atto 3', 'Atto3'],
    market: 'au',
  },
  {
    slug: 'mg-mg4',
    model_id: 'mg-mg4',
    search_terms: ['MG4 EV', 'MG 4'],
    pr_slug: 'mg-mg4',
    wp_terms: ['MG4', 'MG 4 EV'],
    market: 'au',
  },
  {
    slug: 'byd-dolphin',
    model_id: 'byd-dolphin',
    search_terms: ['BYD Dolphin'],
    pr_slug: 'byd-dolphin',
    wp_terms: ['BYD Dolphin'],
    market: 'au',
  },
  {
    slug: 'mg-zs-ev',
    model_id: 'mg-zs-ev',
    search_terms: ['MG ZS EV'],
    pr_slug: 'mg-zs-ev',
    wp_terms: ['MG ZS EV', 'MGZSEV'],
    market: 'au',
  },
  {
    slug: 'byd-seal-u',
    model_id: 'byd-seal-u',
    search_terms: ['BYD Seal U', 'Seal U'],
    pr_slug: 'byd-sealion-6',  // ProductReview 上可能叫 Sealion 6
    wp_terms: ['BYD Seal U', 'Sealion 6'],
    market: 'au',
  },
  {
    slug: 'byd-atto-8',
    model_id: 'byd-atto8',
    search_terms: ['BYD Atto 8', 'Atto 8'],
    pr_slug: 'byd-atto-8',
    wp_terms: ['BYD Atto 8', 'Atto8'],
    market: 'au',
  },
]

// ── Claude 提炼 ───────────────────────────────────────────────────────────────
interface ExtractedCase {
  is_relevant: boolean
  skip_reason?: string
  content_type: 'problem' | 'charging'
  symptom_summary: string
  resolution: string | null
  cost_info: string | null
  location: string | null
  report_date: string | null
  inferred_market: string
  vehicle_desc: string | null
}

const anthropic = new Anthropic()

async function extractCase(
  rawText: string,
  modelName: string,
  source: string
): Promise<ExtractedCase> {
  const prompt = `You are extracting EV owner reports for a ${modelName} owner resource website. Source: ${source}

RAW TEXT:
${rawText.slice(0, 3000)}

---

Analyze this text. Return ONLY valid JSON:

{
  "is_relevant": boolean,       // true ONLY if a real owner describes an actual problem/fault/issue with their ${modelName}
  "skip_reason": string | null, // if false: why (e.g. "positive review", "buying question", "unrelated")
  "content_type": string,       // "charging" if the issue is primarily about charging (slow DC/AC charging, charge interruption, charger compatibility, charging station issues, home wallbox problems); otherwise "problem"
  "symptom_summary": string,    // plain English, 1-3 sentences: what happened, when, any codes/lights. Max 300 chars.
  "resolution": string | null,  // e.g. "Dealer replaced sensor under warranty", "OTA update resolved it", null if unresolved
  "cost_info": string | null,   // e.g. "Free under warranty", "~AUD 350 out of pocket", null if unknown
  "location": string | null,    // e.g. "Sydney, NSW" or "Melbourne" if mentioned
  "report_date": string | null, // "2024-03" or "2024" or null
  "inferred_market": string,    // "au", "uk", "uae", "no", or "unknown"
  "vehicle_desc": string | null // e.g. "2023 BYD Atto 3 Extended Range" if mentioned
}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (msg.content[0] as { text: string }).text.trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`格式错误: ${text.slice(0, 100)}`)
  return JSON.parse(match[0]) as ExtractedCase
}

// ── 写入数据库 ────────────────────────────────────────────────────────────────
async function saveToDb(
  raw: string,
  platform: string,
  sourceUrl: string,
  extracted: ExtractedCase,
  modelId: string,
  market: string
) {
  await db.insert(pendingCases).values({
    raw_content: raw,
    source_platform: platform,
    source_url: sourceUrl,
    ai_extracted: {
      model_id: modelId,
      market_code: market,
      content_type: extracted.content_type,
      symptom_summary: extracted.symptom_summary,
      resolution: extracted.resolution,
      cost_info: extracted.cost_info,
      location: extracted.location,
      report_date: extracted.report_date,
      vehicle_desc: extracted.vehicle_desc,
      confidence: 'community',
      source_type: 'community',
      source_name: platform,
      source_language: 'en',
      source_url: sourceUrl,
    },
    status: 'pending',
  })
}

// ── ProductReview.com.au ──────────────────────────────────────────────────────
interface PRReview {
  text: string
  rating: number
  date: string
  url: string
}

async function fetchProductReviews(prSlug: string, maxPages = 5): Promise<PRReview[]> {
  const reviews: PRReview[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://www.productreview.com.au/listings/${prSlug}?page=${page}`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) break
      const html = await res.text()

      // ProductReview embeds review data in a large inline <script> as JS bundle data.
      // Reviews are stored as objects with "rating":N and "body":"..." fields.
      // Extract all script tags and look for the one containing review data.
      const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]

      for (const sm of scriptMatches) {
        const script = sm[1]
        if (!script.includes('"body":') || !script.includes('"rating":')) continue

        // Extract rating+body pairs from this script block
        const ratingMatches = [...script.matchAll(/"rating":(\d),/g)]
        for (const rm of ratingMatches) {
          const rating = parseInt(rm[1])
          if (rating > 3) continue

          // Look forward from this match for the body field
          const chunk = script.slice(rm.index!, rm.index! + 5000)
          const bodyMatch = chunk.match(/"body":"((?:[^"\\]|\\.)+)"/)
          if (!bodyMatch) continue

          const body = bodyMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\')

          if (body.length < 100 || seen.has(body.slice(0, 80))) continue
          seen.add(body.slice(0, 80))

          // Also grab date if available
          const dateMatch = chunk.match(/"submittedAt":"([^"]+)"/)
          const date = dateMatch ? dateMatch[1].slice(0, 7) : ''

          reviews.push({ text: body, rating, date, url })
        }
      }

      await sleep(2000)
    } catch (e) {
      console.warn(`  ProductReview fetch 失败 (page ${page}): ${(e as Error).message}`)
      break
    }
  }

  return reviews
}

// ── Whirlpool Forums ──────────────────────────────────────────────────────────
interface WPPost {
  text: string
  url: string
  threadTitle: string
}

async function fetchWhirlpoolPosts(searchTerm: string, maxPages = 3): Promise<WPPost[]> {
  const posts: WPPost[] = []
  // Two passes: general problems + charging-specific
  const queries = [
    `${searchTerm} problem OR issue OR fault OR error`,
    `${searchTerm} charging OR charger OR wallbox OR "DC charge" OR "slow charge" OR "charge fail"`,
  ]

  const seen = new Set<string>()

  for (const query of queries) {
    for (let page = 1; page <= maxPages; page++) {
      const url = `https://forums.whirlpool.net.au/search?q=${encodeURIComponent(query)}&section=EV&p=${page}`
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } })
        if (!res.ok) {
          console.warn(`  Whirlpool ${res.status}: ${url}`)
          break
        }
        const html = await res.text()

        // 提取帖子链接
        const threadLinks = [...html.matchAll(/href="(\/forum\/\d+\/\d+[^"]*)"[^>]*>([^<]{10,})</g)]
        for (const m of threadLinks.slice(0, 10)) {
          const threadUrl = `https://forums.whirlpool.net.au${m[1]}`
          const title = m[2].trim()
          if (seen.has(threadUrl)) continue
          seen.add(threadUrl)

          // 获取帖子内容
          try {
            const threadRes = await fetch(threadUrl, { headers: { 'User-Agent': UA } })
            if (!threadRes.ok) continue
            const threadHtml = await threadRes.text()

            // 提取帖子正文（第一页前几条回复）
            const postBodies = [...threadHtml.matchAll(/class="[^"]*post-body[^"]*"[^>]*>([\s\S]{100,?}?)<\/div>/g)]
              .slice(0, 5)
              .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
              .filter(t => t.length > 100)

            if (postBodies.length > 0) {
              posts.push({
                text: postBodies.join('\n\n'),
                url: threadUrl,
                threadTitle: title,
              })
            }

            await sleep(1500)
          } catch { /* skip failed threads */ }
        }

        await sleep(2000)
      } catch (e) {
        console.warn(`  Whirlpool 搜索失败: ${(e as Error).message}`)
        break
      }
    }
  }

  return posts
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== 社区案例采集 ===\n')

  const configs = TARGET_MODEL
    ? MODEL_CONFIGS.filter(c => c.slug === TARGET_MODEL)
    : MODEL_CONFIGS

  if (TARGET_MODEL && configs.length === 0) {
    console.error(`未找到车型: ${TARGET_MODEL}`)
    console.error(`可用: ${MODEL_CONFIGS.map(c => c.slug).join(', ')}`)
    process.exit(1)
  }

  let totalSaved = 0
  let totalSkipped = 0

  for (const config of configs) {
    console.log(`\n━━ ${config.model_id} ━━`)

    // ── ProductReview ──
    if (!TARGET_SOURCE || TARGET_SOURCE === 'productreview') {
      console.log(`\n[ProductReview] ${config.pr_slug}`)
      const reviews = await fetchProductReviews(config.pr_slug)
      console.log(`  找到 ${reviews.length} 条差评 (≤3星)`)

      for (const review of reviews) {
        try {
          const extracted = await extractCase(
            review.text,
            config.model_id,
            'ProductReview.com.au'
          )

          if (!extracted.is_relevant) {
            console.log(`  ✗ 跳过 [${extracted.skip_reason}]`)
            totalSkipped++
            continue
          }

          console.log(`  ✓ ${extracted.symptom_summary.slice(0, 80)}...`)
          if (!DRY_RUN) {
            await saveToDb(review.text, 'ProductReview.com.au', review.url, extracted, config.model_id, config.market)
            totalSaved++
          }
          await sleep(400)
        } catch (e) {
          console.warn(`  ⚠ ${(e as Error).message}`)
        }
      }
    }

    // ── Whirlpool ──
    if (!TARGET_SOURCE || TARGET_SOURCE === 'whirlpool') {
      for (const term of config.wp_terms) {
        console.log(`\n[Whirlpool] "${term}"`)
        const posts = await fetchWhirlpoolPosts(term)
        console.log(`  找到 ${posts.length} 个相关帖子`)

        for (const post of posts) {
          try {
            const extracted = await extractCase(
              `Thread: ${post.threadTitle}\n\n${post.text}`,
              config.model_id,
              'Whirlpool Forums'
            )

            if (!extracted.is_relevant) {
              console.log(`  ✗ 跳过 [${extracted.skip_reason}]: ${post.threadTitle.slice(0, 50)}`)
              totalSkipped++
              continue
            }

            console.log(`  ✓ ${post.threadTitle.slice(0, 60)}`)
            console.log(`    ${extracted.symptom_summary.slice(0, 80)}...`)
            if (!DRY_RUN) {
              await saveToDb(post.text, 'Whirlpool Forums', post.url, extracted, config.model_id, config.market)
              totalSaved++
            }
            await sleep(400)
          } catch (e) {
            console.warn(`  ⚠ ${(e as Error).message}`)
          }
        }
      }
    }
  }

  console.log(`\n=== 完成 ===`)
  console.log(`写入: ${totalSaved} 条${DRY_RUN ? '（dry-run）' : ' → pending_cases'}`)
  console.log(`跳过: ${totalSkipped} 条`)
  if (!DRY_RUN && totalSaved > 0) {
    console.log(`\n下一步: pnpm review --model ${TARGET_MODEL ?? 'byd-atto-3'}`)
  }
  process.exit(0)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(e => { console.error(e); process.exit(1) })
