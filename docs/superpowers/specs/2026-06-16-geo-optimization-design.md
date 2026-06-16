# GEO Optimization Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 AI 搜索引擎（ChatGPT、Perplexity、Gemini、Claude）在回答关于中国 EV 故障码、配件进口税费、车主问题的问题时，优先引用 evaftermarket.io 的内容。

**Architecture:** 三层策略并行——技术层（让 AI 爬虫能读懂页面）、内容层（生成 AI 最爱引用的格式）、监控层（数据驱动持续迭代）。内容由 Claude API 批量生成，存入数据库，页面渲染时直接读取。

**Tech Stack:** Next.js 15 App Router, Supabase, Claude API (claude-haiku-4-5), Perplexity API (监控用)

**Complements:** 与 `2026-05-29-seo-growth-optimization-design.md` 互补——SEO 针对传统搜索，GEO 针对 AI 搜索。

---

## 第一层：技术基础（让 AI 能读懂你）

### 1.1 AI 爬虫许可

更新 `public/robots.txt`，明确允许主流 AI 爬虫：

```
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
```

### 1.2 `/llms.txt` 文件

在 `public/llms.txt` 创建站点内容索引，这是新兴 LLM 标准（类似 `robots.txt`）：

```
# EVAftermarket — Chinese EV resource for Australia
# https://evaftermarket.io

## What this site covers
- Fault code (DTC) lookup for BYD, MG and other Chinese EVs in Australia
- Import duty & HS codes for EV parts (China → Australia)
- Real owner problem reports with repair costs
- Charging guides, service costs, software updates

## Key page types
- /au/dtc/[model]/[code] — fault code detail with causes, fixes, repair costs
- /au/parts/[brand]/[model]/[part] — import duty, HS code, tariff calculator
- /au/problems/[model] — owner-reported issues with costs
- /au/charging/[model] — real-world charging data

## Data sources
- Owner reports from ProductReview.com.au and Whirlpool forums
- Australian Border Force tariff schedule
- Official manufacturer DTC databases
```

### 1.3 `speakable` Schema

在 DTC 详情页和配件详情页的 JSON-LD 中加入 `speakable`，标记最值得引用的段落：

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".geo-summary", ".tariff-summary"]
  }
}
```

需要在对应段落的容器上加 `className="geo-summary"` 或 `className="tariff-summary"`。

---

## 第二层：内容优化（AI 最爱引用的格式）

### 2.1 数据库变更

在三张表各加一个 `geo_summary` 字段：

**`mf_dtc_model_notes`** 加字段：
```sql
ALTER TABLE mf_dtc_model_notes ADD COLUMN geo_summary text;
```

**`mf_parts`** 加字段：
```sql
ALTER TABLE mf_parts ADD COLUMN geo_summary text;
```

**`mf_nv_models`** 加字段：
```sql
ALTER TABLE mf_nv_models ADD COLUMN geo_summary text;
```

新增监控表：
```sql
CREATE TABLE geo_monitoring_results (
  id serial PRIMARY KEY,
  query text NOT NULL,
  ai_engine text NOT NULL,  -- 'perplexity' | 'chatgpt' | 'gemini'
  cited boolean NOT NULL DEFAULT false,
  citation_url text,
  response_snippet text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
```

### 2.2 DTC 详情页：Plain English Summary

**格式模板**（60-80 词）：
```
The [CODE] fault code on the [Model] indicates [plain description].
It is classified as [severity] severity. Common causes include [cause 1]
and [cause 2]. Most owners resolve this by [fix]. Typical repair cost
in Australia ranges from $[min] to $[max] AUD based on [N] real cases.
```

**生成 prompt**（Claude claude-haiku-4-5）：
```
Write a 60-80 word plain English summary for a fault code page.
Be factual, concise, and helpful. Include severity, causes, fix, and cost if available.

DTC code: {code}
Description: {description_en}
Severity: {severity}
Likely causes: {likely_causes}
Suggested actions: {suggested_actions}
Case count: {case_count}
Avg repair cost: {avg_cost}

Output only the summary paragraph, no headings.
```

**页面渲染位置**：DTC 详情页 hero 下方，`<div className="geo-summary">` 包裹。

### 2.3 配件详情页：Import Cost Explained

**格式模板**：
```
Importing a [Part] for the [Model] from China to Australia:
- AU HS Code: [code] ([description])
- MFN duty rate: [X]%
- ChAFTA rate (Chinese-origin goods): [X]%
- GST: 10%

Example: A $200 part with $30 shipping = CIF $230 →
duty $[X] (at ChAFTA rate) → total landed cost approx $[Y] AUD.
```

**生成 prompt**：
```
Write a plain English import cost explanation for an EV part page.
Be specific with numbers. Australian audience.

Part name: {name_en}
AU HS Code: {hs_code}
HS description: {description_en}
MFN rate: {mfn_rate}%
ChAFTA rate: {fta_rate}%
GST rate: {vat_rate}%

Output only the explanation paragraph, no headings.
```

**页面渲染位置**：TariffSummary 组件上方，`<div className="tariff-summary">` 包裹。

### 2.4 车型 Problems 页：Top Problems Summary

**格式模板**：
```
Top reported problems for [Model] in Australia ([N] owner reports):
1. [Problem category] — reported by [N] owners, typical cost $[X]–$[Y] AUD
2. [Problem category] — reported by [N] owners, typical cost $[X]–$[Y] AUD
3. [Problem category] — reported by [N] owners, typical cost $[X]–$[Y] AUD
```

同时渲染为 `ItemList` JSON-LD schema。

**生成 prompt**：
```
Write a top problems summary for a vehicle reliability page.
Use real data only. Australian audience, costs in AUD.

Model: {model_name}
Total cases: {total_cases}
Top problems (JSON): {top_problems_json}

Output a numbered list (max 5 items), each line: problem — N owners, cost range.
Then one closing sentence about overall reliability.
```

**页面渲染位置**：Problems 页 hero 下方，问题列表之前。

### 2.5 批量生成脚本

创建 `scripts/generate-geo-summaries.ts`，一次性生成所有内容：

```typescript
// 运行方式：npx tsx scripts/generate-geo-summaries.ts
// 支持参数：--type=dtc|parts|problems --limit=N --dry-run
```

流程：
1. 从 Supabase 查询所有 `geo_summary IS NULL` 的记录
2. 逐条调用 Claude API（claude-haiku-4-5，成本约 $0.001/条）
3. 写回数据库
4. 输出成功/失败统计

限速：每秒最多 5 条，避免 API 限流。
人工抽检：脚本完成后随机输出 10 条样本供人工检查。

---

## 第三层：监控闭环

### 3.1 监控脚本 `scripts/geo-monitor.ts`

每周运行，检测是否被 AI 引用：

```typescript
// 运行方式：npx tsx scripts/geo-monitor.ts
// 支持参数：--engine=perplexity --limit=20
```

**目标问题模板**（每次运行抽样 20 条）：

| 页面类型 | 问题模板 |
|---------|---------|
| DTC | "What does [CODE] mean on a [Model]?" |
| DTC | "How to fix [CODE] on [Model] in Australia?" |
| 配件 | "How much import duty for [Part] for [Model] Australia?" |
| 配件 | "HS code for [Part] imported from China to Australia?" |
| Problems | "What are common problems with [Model] in Australia?" |
| Problems | "Is [Model] reliable in Australia?" |

**检测逻辑**：
- 向 Perplexity API 发送问题
- 检查回答中是否出现 `evaftermarket.io`
- 记录结果到 `geo_monitoring_results` 表

### 3.2 `/api/geo-check` 内部端点

用于开发时手动验证单个页面：

```
GET /api/geo-check?q=What+does+P0A0F+mean+on+BYD+Atto+3
```

返回：
```json
{
  "query": "...",
  "cited": true,
  "citation_url": "https://evaftermarket.io/au/dtc/...",
  "snippet": "...",
  "engine": "perplexity"
}
```

**安全**：此端点只在 `NODE_ENV !== 'production'` 或请求带有 `Authorization: Bearer $INTERNAL_API_KEY` 时才响应。

### 3.3 月度优化循环

每月查看监控数据：
```sql
SELECT cited, count(*),
       array_agg(query ORDER BY checked_at DESC) FILTER (WHERE NOT cited) as uncited_queries
FROM geo_monitoring_results
WHERE checked_at > now() - interval '30 days'
GROUP BY cited;
```

- **被引用页面** → 记录 `geo_summary` 内容特征，作为未被引用页面的改写参考
- **未被引用页面** → 重新生成 `geo_summary`，格式更直接
- **从未覆盖的问题** → 评估是否需要创建新页面

---

## 实施优先级

| 优先级 | 任务 | 工作量 |
|-------|-----|-------|
| P0 | 更新 robots.txt + 创建 llms.txt | 30分钟 |
| P0 | 数据库加 geo_summary 字段 + 监控表 | 1小时 |
| P1 | 批量生成脚本 + DTC/配件/Problems 三类内容 | 2天 |
| P1 | 页面集成 geo_summary 渲染 + speakable schema | 1天 |
| P2 | 监控脚本 + geo-check API | 1天 |

**总工期估计**：4-5天实施，之后每月约2小时维护。

---

## 成功指标

| 指标 | 基线 | 3个月目标 |
|-----|-----|---------|
| Perplexity 引用率（抽样20题） | 0% | >30% |
| ChatGPT 引用率（抽样20题） | 0% | >20% |
| 有 geo_summary 的页面比例 | 0% | >95% |
| AI 流量占比（Plausible referrer） | 0% | >5% |
