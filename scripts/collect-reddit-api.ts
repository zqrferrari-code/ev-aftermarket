/**
 * Reddit API 案例采集脚本
 * 从 Reddit 抓取真实车主充电问题，用 Claude 提炼后写入 pending_cases
 *
 * 用法:
 *   dotenv -e .env.local -- tsx scripts/collect-reddit-api.ts
 *   dotenv -e .env.local -- tsx scripts/collect-reddit-api.ts --model byd-atto-3
 *   dotenv -e .env.local -- tsx scripts/collect-reddit-api.ts --dry-run
 *   dotenv -e .env.local -- tsx scripts/collect-reddit-api.ts --limit 50
 *
 * 环境变量:
 *   REDDIT_CLIENT_ID     - Reddit app client ID
 *   REDDIT_CLIENT_SECRET - Reddit app client secret
 *   REDDIT_USER_AGENT    - User agent (e.g., "script:ev-aftermarket:v1.0 (by /u/yourname)")
 */

import Anthropic from '@anthropic-ai/sdk'
import { db } from '../lib/db/index'
import { pendingCases } from '../lib/db/schema'

// ── CLI 参数 ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const TARGET_MODEL = args.includes('--model') ? args[args.indexOf('--model') + 1] : null
const DRY_RUN = args.includes('--dry-run')
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 25

if (DRY_RUN) console.log('🔍 DRY RUN — 不写入数据库\n')

// ── Reddit API 配置 ───────────────────────────────────────────────────────────
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'script:ev-aftermarket:v1.0'

if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
  console.error('错误: 缺少 Reddit API 凭证')
  console.error('请在 .env.local 中设置:')
  console.error('  REDDIT_CLIENT_ID=your_client_id')
  console.error('  REDDIT_CLIENT_SECRET=your_client_secret')
  console.error('  REDDIT_USER_AGENT="script:ev-aftermarket:v1.0 (by /u/yourname)"')
  console.error('\n获取凭证: https://www.reddit.com/prefs/apps')
  process.exit(1)
}

// ── 车型配置 ──────────────────────────────────────────────────────────────────
const MODEL_CONFIGS = [
  {
    slug: 'byd-atto-3',
    model_id: 'byd-atto3',
    search_terms: ['BYD Atto 3', 'Atto 3'],
    market: 'au',
  },
  {
    slug: 'mg-mg4',
    model_id: 'mg-mg4',
    search_terms: ['MG4', 'MG 4'],
    market: 'au',
  },
  {
    slug: 'byd-dolphin',
    model_id: 'byd-dolphin',
    search_terms: ['BYD Dolphin'],
    market: 'au',
  },
  {
    slug: 'mg-zs-ev',
    model_id: 'mg-zs-ev',
    search_terms: ['MG ZS EV'],
    market: 'au',
  },
  {
    slug: 'byd-seal-u',
    model_id: 'byd-seal-u',
    search_terms: ['BYD Seal U', 'Sealion 6'],
    market: 'au',
  },
  {
    slug: 'byd-atto-8',
    model_id: 'byd-atto8',
    search_terms: ['BYD Atto 8'],
    market: 'au',
  },
]

// ── Reddit API 客户端 ─────────────────────────────────────────────────────────
let accessToken: string | null = null
let tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken
  }

  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`Reddit auth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  accessToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return accessToken
}

interface RedditPost {
  id: string
  title: string
  selftext: string
  author: string
  created_utc: number
  subreddit: string
  permalink: string
  url: string
}

async function searchReddit(query: string, subreddit?: string, limit = 25): Promise<RedditPost[]> {
  const token = await getAccessToken()
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    sort: 'relevance',
    t: 'year',
    restrict_sr: subreddit ? 'true' : 'false',
  })

  const searchUrl = subreddit
    ? `https://oauth.reddit.com/r/${subreddit}/search?${params}`
    : `https://oauth.reddit.com/search?${params}`

  const res = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': REDDIT_USER_AGENT,
    },
  })

  if (!res.ok) {
    throw new Error(`Reddit search failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as {
    data: {
      children: Array<{
        data: {
          id: string
          title: string
          selftext: string
          author: string
          created_utc: number
          subreddit: string
          permalink: string
          url: string
        }
      }>
    }
  }

  return data.data.children.map(c => c.data).filter(p => p.selftext && p.selftext.length > 100)
}

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
    model: '[REDACTED]',
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

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Reddit API 案例采集 ===\n')

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

  // 目标 subreddits
  const subreddits = ['electricvehicles', 'evaustralia', 'BYDAuto']

  for (const config of configs) {
    console.log(`\n━━ ${config.model_id} ━━`)

    for (const term of config.search_terms) {
      // 搜索充电相关问题
      const chargingQuery = `${term} (charging OR charger OR "slow charge" OR "DC fast" OR wallbox OR "charge fail")`

      for (const subreddit of subreddits) {
        console.log(`\n[Reddit r/${subreddit}] "${term}" charging issues`)

        try {
          const posts = await searchReddit(chargingQuery, subreddit, LIMIT)
          console.log(`  找到 ${posts.length} 个帖子`)

          for (const post of posts) {
            try {
              const rawText = `Title: ${post.title}\n\n${post.selftext}`
              const extracted = await extractCase(
                rawText,
                config.model_id,
                `Reddit r/${subreddit}`
              )

              if (!extracted.is_relevant) {
                console.log(`  ✗ 跳过 [${extracted.skip_reason}]: ${post.title.slice(0, 50)}`)
                totalSkipped++
                continue
              }

              const sourceUrl = `https://reddit.com${post.permalink}`
              console.log(`  ✓ [${extracted.content_type}] ${post.title.slice(0, 60)}`)
              console.log(`    ${extracted.symptom_summary.slice(0, 80)}...`)

              if (!DRY_RUN) {
                await saveToDb(
                  rawText,
                  `Reddit r/${subreddit}`,
                  sourceUrl,
                  extracted,
                  config.model_id,
                  config.market
                )
                totalSaved++
              }

              await sleep(400)
            } catch (e) {
              console.warn(`  ⚠ ${(e as Error).message}`)
            }
          }

          await sleep(2000)
        } catch (e) {
          console.warn(`  Reddit 搜索失败: ${(e as Error).message}`)
        }
      }

      // 搜索一般问题
      const problemQuery = `${term} (problem OR issue OR fault OR error OR "not working")`

      for (const subreddit of subreddits) {
        console.log(`\n[Reddit r/${subreddit}] "${term}" general problems`)

        try {
          const posts = await searchReddit(problemQuery, subreddit, LIMIT)
          console.log(`  找到 ${posts.length} 个帖子`)

          for (const post of posts) {
            try {
              const rawText = `Title: ${post.title}\n\n${post.selftext}`
              const extracted = await extractCase(
                rawText,
                config.model_id,
                `Reddit r/${subreddit}`
              )

              if (!extracted.is_relevant) {
                console.log(`  ✗ 跳过 [${extracted.skip_reason}]: ${post.title.slice(0, 50)}`)
                totalSkipped++
                continue
              }

              const sourceUrl = `https://reddit.com${post.permalink}`
              console.log(`  ✓ [${extracted.content_type}] ${post.title.slice(0, 60)}`)
              console.log(`    ${extracted.symptom_summary.slice(0, 80)}...`)

              if (!DRY_RUN) {
                await saveToDb(
                  rawText,
                  `Reddit r/${subreddit}`,
                  sourceUrl,
                  extracted,
                  config.model_id,
                  config.market
                )
                totalSaved++
              }

              await sleep(400)
            } catch (e) {
              console.warn(`  ⚠ ${(e as Error).message}`)
            }
          }

          await sleep(2000)
        } catch (e) {
          console.warn(`  Reddit 搜索失败: ${(e as Error).message}`)
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
