# GEO 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 ChatGPT、Perplexity、Gemini 等 AI 搜索引擎在回答关于中国 EV 故障码、配件进口税费、车主问题时引用 evaftermarket.io。

**Architecture:** 三层：(1) 技术层——robots.txt + llms.txt + speakable schema；(2) 内容层——数据库新增 `geo_summary` 字段，Claude API 批量生成摘要段落，页面渲染时展示；(3) 监控层——脚本每周通过 Perplexity API 检测被引用情况并写回数据库。

**Tech Stack:** Next.js 15 App Router, Supabase (`sb` client in `lib/db/index.ts`), Anthropic SDK (`claude-haiku-4-5-20251001`), Perplexity API

---

## 文件结构

**新建文件：**
- `public/robots.txt` — 添加 AI 爬虫许可
- `public/llms.txt` — LLM 站点索引文件
- `scripts/generate-geo-summaries.ts` — 批量生成三类 geo_summary
- `scripts/geo-monitor.ts` — 每周检测 AI 引用情况
- `app/api/geo-check/route.ts` — 开发用手动检测端点

**修改文件：**
- `app/[market]/dtc/[model]/[code]/page.tsx` — 加 geo_summary 渲染 + speakable schema
- `app/[market]/parts/[brand]/[model]/[part]/page.tsx` — 加 tariff geo_summary 渲染 + speakable schema
- `app/[market]/problems/[model]/page.tsx` — 加 Top Problems 摘要渲染 + ItemList schema
- `lib/db/dtcs.ts` — getDTCNote 查询加 geo_summary 字段
- `lib/db/parts.ts` — getPartPageData 返回包含 geo_summary
- `lib/db/cases.ts` — 新增 getTopProblemsForModel 查询函数

---

## Task 1：技术基础层 — robots.txt + llms.txt

**Files:**
- Create: `public/robots.txt`
- Create: `public/llms.txt`

- [ ] **Step 1：创建 robots.txt**

```
# public/robots.txt
User-agent: *
Allow: /
Disallow: /api/

# AI crawlers — explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Googlebot-Extended
Allow: /

# Rate-limit aggressive SEO bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

Sitemap: https://evaftermarket.io/sitemap.xml
```

- [ ] **Step 2：创建 llms.txt**

```
# public/llms.txt
# EVAftermarket — Chinese EV resource for Australia
# https://evaftermarket.io

## What this site covers
- Fault code (DTC) lookup for BYD, MG, Chery, and other Chinese EVs in Australia
- Import duty & HS codes for EV replacement parts (China → Australia)
- Real owner problem reports with repair costs (sourced from ProductReview.com.au and Whirlpool forums)
- Charging guides, service costs, software update history

## Key page types
- /au/dtc/[model]/[code] — fault code detail: description, severity, causes, fixes, repair costs from real cases
- /au/parts/[brand]/[model]/[part] — import duty calculator: HS code, MFN rate, ChAFTA rate, GST
- /au/problems/[model] — owner-reported issues with resolution status and costs
- /au/charging/[model] — real-world charging data and home setup guides
- /au/service/[model] — service costs from owner reports

## Data sources
- Owner reports from ProductReview.com.au and Whirlpool forums (Australia)
- Australian Border Force Working Tariff schedule
- Official manufacturer DTC databases
- Real repair cost data from Australian owners

## Coverage
- Models: BYD Atto 3, BYD Seal, BYD Dolphin, BYD Atto 8, MG ZS EV, and more
- Market: Australia (AUD pricing, Australian regulations)
- Fault codes: 1,000+ DTC codes with causes and repair guidance
```

- [ ] **Step 3：验证文件可访问**

本地运行：`pnpm dev`，然后访问：
- `http://localhost:3000/robots.txt` — 应返回文本内容，包含 GPTBot
- `http://localhost:3000/llms.txt` — 应返回文本内容

- [ ] **Step 4：提交**

```bash
git add public/robots.txt public/llms.txt
git commit -m "feat: add robots.txt with AI crawler permissions and llms.txt"
```

---

## Task 2：数据库变更 — 添加 geo_summary 字段和监控表

**Files:**
- (Supabase SQL migration，无本地文件变更)

> **注意：** 直接在 Supabase Dashboard → SQL Editor 运行以下 SQL。项目 URL: `https://xerjbccayvqvaxbqrabu.supabase.co`

- [ ] **Step 1：给 mf_nv_dtc_model_notes 加 geo_summary 字段**

在 Supabase SQL Editor 运行：
```sql
ALTER TABLE mf_nv_dtc_model_notes ADD COLUMN IF NOT EXISTS geo_summary text;
```

- [ ] **Step 2：给 mf_parts 加 geo_summary 字段**

```sql
ALTER TABLE mf_parts ADD COLUMN IF NOT EXISTS geo_summary text;
```

- [ ] **Step 3：给 mf_nv_models 加 geo_summary 字段**

```sql
ALTER TABLE mf_nv_models ADD COLUMN IF NOT EXISTS geo_summary text;
```

- [ ] **Step 4：创建监控结果表**

```sql
CREATE TABLE IF NOT EXISTS geo_monitoring_results (
  id serial PRIMARY KEY,
  query text NOT NULL,
  ai_engine text NOT NULL,
  cited boolean NOT NULL DEFAULT false,
  citation_url text,
  response_snippet text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 5：验证字段存在**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'mf_nv_dtc_model_notes' AND column_name = 'geo_summary';
-- 应返回 1 行

SELECT column_name FROM information_schema.columns
WHERE table_name = 'mf_parts' AND column_name = 'geo_summary';
-- 应返回 1 行

SELECT table_name FROM information_schema.tables
WHERE table_name = 'geo_monitoring_results';
-- 应返回 1 行
```

---

## Task 3：批量生成脚本 — generate-geo-summaries.ts

**Files:**
- Create: `scripts/generate-geo-summaries.ts`

参考现有脚本 `scripts/generate-dtc-content.ts` 的模式：使用 Anthropic SDK，逐条生成，写回 Supabase。

- [ ] **Step 1：创建脚本文件**

```typescript
// scripts/generate-geo-summaries.ts
// 用法: ANTHROPIC_API_KEY=xxx dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts
// 参数: --type=dtc|parts|problems  --limit=N  --dry-run

import Anthropic from '@anthropic-ai/sdk'
import { sb } from '@/lib/db'

const client = new Anthropic()

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
    ? (JSON.parse(row.likely_causes) as string[]).slice(0, 2).join(' and ')
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

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
}

async function processDtcs() {
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
        await sb
          .from('mf_nv_dtc_model_notes')
          .update({ geo_summary: summary })
          .eq('id', note.id)
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

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
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
        await sb
          .from('mf_parts')
          .update({ geo_summary: summary })
          .eq('id', part.id)
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

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
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
        await sb
          .from('mf_nv_models')
          .update({ geo_summary: summary })
          .eq('model_id', model.model_id)
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
```

- [ ] **Step 2：dry-run 测试 DTC 类型（不写入数据库）**

```bash
ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts --type=dtc --limit=3 --dry-run
```

预期输出：打印 3 条 DTC summary，格式以 "The [CODE] fault code on the [Model] indicates..." 开头，无报错。

- [ ] **Step 3：dry-run 测试 parts 类型**

```bash
ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts --type=parts --limit=3 --dry-run
```

预期输出：打印 3 条配件 import cost summary，包含 HS Code 和税率数字。

- [ ] **Step 4：dry-run 测试 problems 类型**

```bash
ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts --type=problems --limit=3 --dry-run
```

预期输出：打印 3 条车型 Top Problems summary。

- [ ] **Step 5：提交脚本文件**

```bash
git add scripts/generate-geo-summaries.ts
git commit -m "feat: add geo summary batch generation script"
```

---

## Task 4：运行内容生成（写入数据库）

> **前提：** Task 2 的数据库字段已存在，Task 3 的 dry-run 验证已通过。

- [ ] **Step 1：生成并写入 DTC summaries（先跑小批量验证）**

```bash
ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts --type=dtc --limit=10
```

预期输出：`✅ DTC: 10 generated, 0 failed`

- [ ] **Step 2：在 Supabase 验证写入成功**

在 Supabase SQL Editor 运行：
```sql
SELECT id, geo_summary FROM mf_nv_dtc_model_notes WHERE geo_summary IS NOT NULL LIMIT 3;
```
预期：3 行，geo_summary 字段有英文段落文本。

- [ ] **Step 3：全量生成 DTC summaries**

```bash
ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts --type=dtc
```

预期：无报错，success 数量等于 DTC notes 总数。

- [ ] **Step 4：全量生成 parts summaries**

```bash
ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts --type=parts
```

- [ ] **Step 5：全量生成 problems (model) summaries**

```bash
ANTHROPIC_API_KEY=your_key dotenv -e .env.local -- tsx scripts/generate-geo-summaries.ts --type=problems
```

- [ ] **Step 6：人工抽检 5 条内容**

在 Supabase SQL Editor 运行：
```sql
SELECT geo_summary FROM mf_nv_dtc_model_notes WHERE geo_summary IS NOT NULL ORDER BY random() LIMIT 5;
```
检查：内容是否准确，是否以正确格式开头，是否有明显错误信息。如有问题，用 `UPDATE mf_nv_dtc_model_notes SET geo_summary = NULL WHERE id = xxx` 清空后重新生成。

---

## Task 5：DTC 详情页集成 geo_summary

**Files:**
- Modify: `app/[market]/dtc/[model]/[code]/page.tsx`

DTC 详情页已从 `getDTCModelNote` 获取 `note`。Supabase 的 `select('*')` 会自动包含新增的 `geo_summary` 字段，无需修改查询。

- [ ] **Step 1：在 DTC 详情页 hero 下方插入 geo_summary 段落**

在 `app/[market]/dtc/[model]/[code]/page.tsx` 中，找到以下代码（约第 230 行）：

```tsx
            {/* Meta stats */}
            {(casesRaw.length > 0 || parsedCauses.length > 0) && (
```

在这段代码**之前**插入：

```tsx
            {/* GEO Summary — AI 引用优化摘要段 */}
            {note?.geo_summary && (
              <div className="geo-summary" style={{
                margin: '16px 0',
                padding: '14px 16px',
                background: 'oklch(97.5% 0.005 145)',
                borderLeft: '3px solid var(--green)',
                borderRadius: '0 4px 4px 0',
                fontSize: '14px',
                lineHeight: 1.7,
                color: 'var(--text-base)',
              }}>
                {note.geo_summary}
              </div>
            )}
```

- [ ] **Step 2：在 JSON-LD 中加入 speakable schema**

在 `faqSchema` 对象同一作用域内，新增：

```tsx
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${dtcCode} ${modelData.model_name} — Fault Code Guide`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.geo-summary'],
    },
  }
```

然后在 JSX return 里加 `<JsonLd schema={articleSchema} />`（紧跟已有的 `<JsonLd schema={faqSchema} />`）。

- [ ] **Step 3：本地验证**

```bash
pnpm dev
```

访问 `http://localhost:3000/au/dtc/byd-atto-3/b110913`（开发模式默认页面）。

预期：hero 描述下方出现绿色左边框的摘要段落（如果该 DTC note 有 geo_summary）。查看页面源码确认 `speakable` schema 存在。

- [ ] **Step 4：提交**

```bash
git add app/[market]/dtc/[market]/[code]/page.tsx
git commit -m "feat: add geo_summary display and speakable schema to DTC detail pages"
```

---

## Task 6：配件详情页集成 geo_summary

**Files:**
- Modify: `app/[market]/parts/[brand]/[model]/[part]/page.tsx`
- Modify: `lib/db/parts.ts` — getPartPageData 已返回 part 对象，`part.geo_summary` 即可访问（select('*') 自动包含）

配件页从 `getPartPageData` 获取 `data.part`，`part` 对象来自 `mf_parts` 表的 `select('*')`，新字段 `geo_summary` 已自动包含。

- [ ] **Step 1：在 TariffSummary 上方插入 tariff geo_summary**

在 `app/[market]/parts/[brand]/[model]/[part]/page.tsx` 中，找到：

```tsx
          {/* Tariff summary */}
          <TariffSummary cnHsCode={cnHsCode} auHsCode={auHsCode} tariffRate={tariffRate} />
```

替换为：

```tsx
          {/* GEO Tariff Summary */}
          {partData.geo_summary && (
            <div className="tariff-summary" style={{
              margin: '0',
              padding: '16px 28px',
              background: 'oklch(97.5% 0.005 145)',
              borderTop: '1px solid var(--border-soft)',
              borderBottom: '1px solid var(--border-soft)',
              fontSize: '13.5px',
              lineHeight: 1.75,
              color: 'var(--text-base)',
              whiteSpace: 'pre-line',
            }}>
              {partData.geo_summary}
            </div>
          )}

          {/* Tariff summary */}
          <TariffSummary cnHsCode={cnHsCode} auHsCode={auHsCode} tariffRate={tariffRate} />
```

- [ ] **Step 2：在已有 JSON-LD 中加入 speakable schema**

在 `app/[market]/parts/[brand]/[model]/[part]/page.tsx` 的 `jsonLd` 对象里，加入 speakable：

找到：
```tsx
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: partData.name_en,
    description: `${partData.name_en} compatible with ${modelName}`,
    brand: { '@type': 'Brand', name: 'BYD' },
  }
```

替换为：
```tsx
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: partData.name_en,
    description: `${partData.name_en} compatible with ${modelName}`,
    brand: { '@type': 'Brand', name: 'BYD' },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.tariff-summary'],
    },
  }
```

- [ ] **Step 3：本地验证**

访问 `http://localhost:3000/au/parts/byd/byd-atto-3/front-bumper`。

预期：TariffSummary 表格上方出现包含 HS Code、税率、示例计算的文字段落。查看源码确认 speakable schema 存在。

- [ ] **Step 4：提交**

```bash
git add "app/[market]/parts/[brand]/[model]/[part]/page.tsx"
git commit -m "feat: add geo_summary and speakable schema to parts detail pages"
```

---

## Task 7：Problems 页集成 geo_summary + ItemList schema

**Files:**
- Modify: `app/[market]/problems/[model]/page.tsx`
- Modify: `lib/db/cases.ts` — 新增 getTopProblemsForModel

`mf_nv_models` 表的 `geo_summary` 存在于 model 记录中，但当前 Problems 页只从 `getModelBySlug` 获取 model 数据。需要确认 `getModelBySlug` 返回的字段包含 `geo_summary`。

- [ ] **Step 1：检查 getModelBySlug 是否包含 geo_summary**

```bash
grep -n "getModelBySlug\|select(" lib/db/models.ts | head -20
```

如果 `select('*')`，则 `geo_summary` 已自动包含，跳到 Step 3。如果是 `select('model_id, model_name, ...')` 明确列字段，则需在 Step 2 添加字段。

- [ ] **Step 2：（如需要）在 getModelBySlug 的 select 中加 geo_summary**

在 `lib/db/models.ts` 中找到 `getModelBySlug` 的 Supabase query，将 select 字符串末尾加上 `, geo_summary`。

- [ ] **Step 3：在 Problems 页 hero 下方插入 geo_summary**

在 `app/[market]/problems/[model]/page.tsx` 中，找到（约第 74 行）：

```tsx
        <div className="list-hero">
```

在 `list-hero` div 的结束标签 `</div>` **之后**插入：

```tsx
        {vehicleModel.geo_summary && (
          <div className="geo-summary" style={{
            padding: '16px 28px',
            background: 'oklch(97.5% 0.005 145)',
            borderBottom: '1px solid var(--border-soft)',
            fontSize: '14px',
            lineHeight: 1.7,
            color: 'var(--text-base)',
            whiteSpace: 'pre-line',
          }}>
            {vehicleModel.geo_summary}
          </div>
        )}
```

- [ ] **Step 4：加 ItemList schema（前 5 个问题）**

在 Problems 页已有 FAQPage JsonLd 之后，加 ItemList schema：

```tsx
        {problemCases.length > 0 && (
          <JsonLd schema={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Top ${vehicleModel.model_name} Problems in Australia`,
            numberOfItems: Math.min(problemCases.length, 5),
            itemListElement: problemCases.slice(0, 5).map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.symptom_summary.slice(0, 100),
              description: c.resolution ?? 'No confirmed resolution yet.',
            })),
          }} />
        )}
```

- [ ] **Step 5：本地验证**

访问 `http://localhost:3000/au/problems/byd-atto-3`（如果有数据）。预期：hero stats 下方显示 geo_summary 文字段落。查看源码确认 ItemList schema 存在。

- [ ] **Step 6：提交**

```bash
git add "app/[market]/problems/[model]/page.tsx" lib/db/models.ts
git commit -m "feat: add geo_summary and ItemList schema to problems pages"
```

---

## Task 8：监控脚本 geo-monitor.ts

**Files:**
- Create: `scripts/geo-monitor.ts`

- [ ] **Step 1：创建监控脚本**

```typescript
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
  const url = citations.find(c => c.includes(SITE)) ?? null
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
  console.log(`Citation rate: ${Math.round(cited / queries.length * 100)}%`)
}

main().catch(console.error)
```

- [ ] **Step 2：验证脚本语法**

```bash
tsx --noEmit scripts/geo-monitor.ts 2>&1 | head -20
```

预期：无 TypeScript 编译错误。

- [ ] **Step 3：提交**

```bash
git add scripts/geo-monitor.ts
git commit -m "feat: add geo monitoring script for AI citation tracking"
```

---

## Task 9：/api/geo-check 内部端点

**Files:**
- Create: `app/api/geo-check/route.ts`

- [ ] **Step 1：创建 route 文件**

```typescript
// app/api/geo-check/route.ts
import { NextRequest, NextResponse } from 'next/server'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const SITE = 'evaftermarket.io'

export async function GET(request: NextRequest) {
  // 安全检查：仅开发环境或带有正确 API Key
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    const authHeader = request.headers.get('Authorization')
    const key = authHeader?.replace('Bearer ', '')
    if (!INTERNAL_API_KEY || key !== INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const query = request.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Missing ?q= parameter' }, { status: 400 })
  }

  if (!PERPLEXITY_API_KEY) {
    return NextResponse.json({ error: 'PERPLEXITY_API_KEY not configured' }, { status: 500 })
  }

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
    return NextResponse.json({ error: `Perplexity error: ${response.status}` }, { status: 502 })
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
    citations?: string[]
  }

  const text = data.choices[0]?.message?.content ?? ''
  const citations: string[] = data.citations ?? []
  const allText = text + ' ' + citations.join(' ')
  const cited = allText.toLowerCase().includes(SITE)
  const citationUrl = citations.find(c => c.includes(SITE)) ?? null

  return NextResponse.json({
    query,
    cited,
    citation_url: citationUrl,
    snippet: text.slice(0, 300),
    all_citations: citations,
    engine: 'perplexity',
  })
}
```

- [ ] **Step 2：添加环境变量说明到 .env.local**

在 `.env.local` 中加入（如果还没有）：
```
PERPLEXITY_API_KEY=your_perplexity_api_key_here
INTERNAL_API_KEY=your_random_secret_key_here
```

- [ ] **Step 3：本地验证端点**

```bash
pnpm dev
# 新开终端
curl "http://localhost:3000/api/geo-check?q=What+does+P0A0F+mean+on+BYD+Atto+3"
```

预期：返回 JSON，包含 `cited`, `citation_url`, `snippet` 字段。如果还没被引用，`cited: false` 是正常的。

- [ ] **Step 4：提交**

```bash
git add "app/api/geo-check/route.ts"
git commit -m "feat: add internal geo-check API endpoint"
```

---

## Task 10：推送并运行首次监控基线

- [ ] **Step 1：推送所有变更到 git**

```bash
git push origin main
```

- [ ] **Step 2：等待 Vercel 部署完成**

在 Vercel Dashboard 确认最新部署成功（通常 1-2 分钟）。

- [ ] **Step 3：验证线上文件可访问**

```bash
curl https://evaftermarket.io/robots.txt | grep -i GPTBot
# 预期：User-agent: GPTBot

curl https://evaftermarket.io/llms.txt | head -5
# 预期：# EVAftermarket...
```

- [ ] **Step 4：运行首次 GEO 监控（建立基线）**

```bash
PERPLEXITY_API_KEY=xxx dotenv -e .env.local -- tsx scripts/geo-monitor.ts --limit=20
```

记录结果。这是优化前的基线，引用率可能接近 0%，这是正常的。

- [ ] **Step 5：查询基线数据**

在 Supabase SQL Editor 运行：
```sql
SELECT
  cited,
  count(*) as total,
  array_agg(query) as queries
FROM geo_monitoring_results
WHERE checked_at > now() - interval '1 day'
GROUP BY cited;
```

- [ ] **Step 6：最终提交**

```bash
git add -A
git commit -m "feat: GEO optimization complete — robots.txt, llms.txt, geo_summary content, monitoring"
git push origin main
```

---

## 后续维护（每月）

每月运行一次监控脚本，分析哪些页面被引用、哪些没有：

```bash
# 检查引用率趋势
dotenv -e .env.local -- tsx scripts/geo-monitor.ts --limit=20
```

在 Supabase 查看月度趋势：
```sql
SELECT
  date_trunc('week', checked_at) as week,
  round(100.0 * sum(cited::int) / count(*), 1) as citation_rate_pct
FROM geo_monitoring_results
GROUP BY 1
ORDER BY 1 DESC
LIMIT 8;
```

对引用率低的页面类型，重新生成 `geo_summary`（清空后重跑脚本）：
```sql
-- 重置某类型的 geo_summary 以便重新生成
UPDATE mf_nv_dtc_model_notes SET geo_summary = NULL WHERE id IN (/* 指定 IDs */);
```
