# SEO 增长优化实施计划

> **给执行者：** 必须使用 superpowers:executing-plans 技能逐任务执行本计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 在上线后 1 个月内，通过技术 SEO、内容优化、Analytics 监控和变现集成，提升 Google 收录率、搜索命中率、用户点击率和收益率。

---

## 执行进度（2026-05-29 更新）

| 任务 | 类型 | 状态 | 提交 |
|---|---|---|---|
| 1. next.config 图片优化 | 代码 | ✅ 已完成 | `93bd469` |
| 2. ISR revalidate 调优 | 代码 | ✅ 已完成 | `73e36e8` |
| 3. Sitemap priority/changefreq | 代码 | ✅ 已完成 | `71fa23c` |
| 4. Robots.txt crawl-delay | 代码 | ✅ 已完成 | `77b2a5a` |
| 5. Organization schema | 代码 | ✅ 已完成 | `4939948` |
| 6. Product schema（车型页）| 代码 | ✅ 已完成 | `f25a27a` |
| 7. HowTo schema（充电页）| 代码 | ✅ 已完成 | `dfed0e9` |
| 8. DTC 列表页 meta 优化 | 代码 | ✅ 已完成 | `cc5e1a6` |
| 9. DTC 详情页 meta 优化 | 代码 | ✅ 已完成 | `e46129f` |
| 10. Problems 聚合页（新建）| 代码 | ✅ 已完成 | `12d924f` |
| 11. DTC 列表页介绍段落 | 代码 | ✅ 已完成 | `68b8097` |
| 12. Plausible Analytics | 代码 | ✅ 已完成 | `156f5c5` |
| 13. Google Search Console 提交 | **手动** | ⬜ 待执行 | — |
| 14. Sitemap 添加 problems 页 | 代码 | ✅ 已完成 | `bde1aa0` |
| 15. Privacy + Contact 页面 | 代码 | ✅ 已完成 | `ed79345` |
| 16. Footer 链接 | 代码 | ✅ 已完成 | `905afcc` |
| 17. 充电页联盟营销区块 | 代码 | ✅ 已完成 | `86072aa` |
| 18. AdSense 申请 | **手动** | ⬜ 上线后 2-4 周 | — |
| 19. 上线前技术审计 | **手动** | ⬜ 待执行 | — |
| 20. 每周监控习惯 | **手动** | ⬜ 上线后持续 | — |

---

## ⬜ 剩余手动任务

### 任务 13：提交 sitemap 到 Google Search Console
**触发时机：** 域名上线后立即执行

- [ ] 访问 https://search.google.com/search-console，添加域名资源
- [ ] 在 DNS 后台（Cloudflare / Namecheap）添加 TXT 记录完成验证
  - 主机名：`@`，值：`google-site-verification=xxxx`
- [ ] GSC → Sitemaps → 提交 `sitemap.xml`
- [ ] 同步到 Bing：https://www.bing.com/webmasters，提交同一 sitemap URL
- [ ] GSC → URL 检查 → 手动请求收录 Top 20 页面（市场首页、热门车型页、充电页、DTC 列表页）

### 任务 18：申请 Google AdSense
**触发时机：** 上线后 2-4 周（需有一定真实访问量）

- [ ] 确认前提条件：网站已上线、Privacy Policy 存在、Contact 存在、内容原创
- [ ] 访问 https://adsense.google.com 注册并填写网站 URL
- [ ] 等待审核（通常 2-4 周），期间持续更新内容
- [ ] 审核通过后，在 `app/layout.tsx` 的 `<head>` 中添加 AdSense 脚本：
  ```html
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossOrigin="anonymous" />
  ```
  （将 `ca-pub-XXXXXXXXXX` 替换为实际 Publisher ID）
- [ ] 在 `app/[market]/dtc/[model]/[code]/page.tsx` 内容区中间添加广告位 `<ins>` 标签

### 任务 19：上线前技术审计
**触发时机：** 部署到生产环境后、公开推广前

- [ ] 运行 `pnpm build`，确认 0 错误
- [ ] 用 curl 验证所有关键路由返回 200：`/au`、`/au/problems`、`/au/dtc/byd-atto-3`、`/au/charging/byd-atto-3`、`/au/models/byd-atto-3`、`/privacy`、`/contact`
- [ ] 访问 `https://yourdomain.com/sitemap.xml`，确认 XML 格式正确
- [ ] 访问 `https://yourdomain.com/robots.txt`，确认包含 `Disallow: /api/` 和 Sitemap URL
- [ ] 用 Google Rich Results Test 测试：市场首页、车型页、DTC 详情页、充电页
- [ ] 用 PageSpeed Insights 测试首页，目标：Performance ≥ 70，SEO ≥ 90

### 任务 20：建立每周监控习惯
**触发时机：** 上线后持续执行

**每周一：**
- [ ] GSC → Coverage：检查 indexed 页面数量趋势，排查 crawl error
- [ ] GSC → Core Web Vitals：检查是否有 Poor / Needs Improvement URL

**每周三：**
- [ ] Plausible 控制台：查看 Top Pages、Traffic Sources、Countries
- [ ] 关注跳出率高的页面，考虑内容改进

**每月初：**
- [ ] GSC → Performance → Queries：找出 impressions 高但 CTR 低的词，优化对应页面的 meta description
- [ ] 找出排名 11-20 的词，针对性优化内容
- [ ] 运行数据采集更新案例：
  ```bash
  pnpm collect:reddit --model byd-atto-3
  pnpm review --approve-all
  ```
- [ ] 为有新案例的页面在 GSC 请求重新收录

---

**架构：** 基于现有 Next.js 16 App Router + MySQL + Vercel 基础设施，逐步增强 SEO 信号和内容质量。优先保证 Google 能完整收录所有页面，其次提升排名，再优化点击率，最后接入变现。

**技术栈：** Next.js 16.2.6 App Router · Drizzle ORM · MySQL · Vercel · TypeScript · Tailwind CSS v4

---

## 涉及文件一览

| 文件路径 | 操作 | 说明 |
|---|---|---|
| `next.config.ts` | 修改 | 添加图片格式优化配置 |
| `app/layout.tsx` | 修改 | 添加 Organization schema、Analytics 脚本 |
| `app/sitemap.ts` | 修改 | 添加 priority/changefreq 字段 |
| `app/robots.ts` | 修改 | 添加 bot crawl-delay 规则 |
| `app/[market]/dtc/[model]/page.tsx` | 修改 | 调整 revalidate、优化 meta description |
| `app/[market]/dtc/[model]/[code]/page.tsx` | 修改 | 优化 meta title/description 格式 |
| `app/[market]/models/[slug]/page.tsx` | 修改 | 添加 Product schema |
| `app/[market]/charging/[model]/page.tsx` | 修改 | 添加 HowTo schema、优化 meta |
| `app/[market]/problems/page.tsx` | 新建 | 问题分类聚合页 |
| `components/JsonLd.tsx` | 修改（或已存在）| 复用现有组件注入新 schema |
| `lib/config.ts` | 确认 | BASE_URL 等常量 |

---

## 第一周：技术 SEO 基础

---

### 任务 1：优化 next.config.ts 图片配置

**文件：**
- 修改：`next.config.ts`

- [ ] **步骤 1：读取现有配置，确认当前内容**

  ```bash
  cat next.config.ts
  ```
  预期输出：只有空的 `nextConfig: NextConfig = {}`。

- [ ] **步骤 2：添加图片优化配置**

  将 `next.config.ts` 修改为：

  ```typescript
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    images: {
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200],
      imageSizes: [16, 32, 48, 64, 96],
    },
  };

  export default nextConfig;
  ```

- [ ] **步骤 3：验证构建不报错**

  ```bash
  pnpm build 2>&1 | tail -20
  ```
  预期：build 成功，无 TypeScript 错误。

- [ ] **步骤 4：提交**

  ```bash
  git add next.config.ts
  git commit -m "perf: add image format optimization (avif/webp) to next.config"
  ```

---

### 任务 2：调整各页面 ISR revalidate 时间

**文件：**
- 修改：`app/[market]/page.tsx`（市场首页）
- 修改：`app/[market]/dtc/[model]/page.tsx`（DTC 列表）
- 修改：`app/[market]/dtc/[model]/[code]/page.tsx`（DTC 详情）
- 修改：`app/[market]/models/[slug]/page.tsx`（车型页）
- 修改：`app/[market]/charging/[model]/page.tsx`（充电页）

- [ ] **步骤 1：查看各页面当前 revalidate 值**

  ```bash
  grep -r "export const revalidate" app/ --include="*.tsx"
  ```

- [ ] **步骤 2：修改市场首页 revalidate**

  在 `app/[market]/page.tsx` 中将 revalidate 改为 1800：

  ```typescript
  export const revalidate = 1800  // 高频页面：30 分钟
  ```

- [ ] **步骤 3：修改 DTC 列表页 revalidate**

  在 `app/[market]/dtc/[model]/page.tsx` 中保持 3600（已是正确值）：

  ```typescript
  export const revalidate = 3600  // 中频页面：1 小时
  ```

- [ ] **步骤 4：修改 DTC 详情页 revalidate**

  在 `app/[market]/dtc/[model]/[code]/page.tsx` 中修改为 7200：

  ```typescript
  export const revalidate = 7200  // 低频页面：2 小时
  ```

- [ ] **步骤 5：修改车型页 revalidate**

  在 `app/[market]/models/[slug]/page.tsx` 中修改为 1800：

  ```typescript
  export const revalidate = 1800  // 高频页面：30 分钟
  ```

- [ ] **步骤 6：验证**

  ```bash
  grep -r "export const revalidate" app/ --include="*.tsx"
  ```
  预期输出：`market/page` 和 `models/slug/page` 显示 1800，DTC 详情页显示 7200。

- [ ] **步骤 7：提交**

  ```bash
  git add app/
  git commit -m "perf: tune ISR revalidate times by page frequency"
  ```

---

### 任务 3：在 sitemap 中添加 priority 和 changefreq

**文件：**
- 修改：`app/sitemap.ts`

- [ ] **步骤 1：读取当前 sitemap**

  ```bash
  cat app/sitemap.ts
  ```

- [ ] **步骤 2：更新 sitemap，为每类页面添加 priority 和 changefreq**

  在 `app/sitemap.ts` 中，为各类 URL 条目添加字段。示例结构（根据实际代码调整每个 URL 对象）：

  ```typescript
  // 市场首页 — priority: 1.0, weekly
  { url: `${BASE_URL}/${market}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 }

  // 车型页 — priority: 0.9, weekly
  { url: `${BASE_URL}/${market}/models/${slug}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 }

  // 充电/服务/问题页 — priority: 0.8, weekly
  { url: `${BASE_URL}/${market}/charging/${slug}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 }

  // DTC 列表页 — priority: 0.8, monthly
  { url: `${BASE_URL}/${market}/dtc/${model}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 }

  // DTC 详情页 — priority: 0.7, monthly
  { url: `${BASE_URL}/${market}/dtc/${model}/${code}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 }
  ```

- [ ] **步骤 3：在本地验证 sitemap 输出格式**

  ```bash
  pnpm build && pnpm start &
  sleep 5
  curl http://localhost:3000/sitemap.xml | head -60
  ```
  预期：XML 中包含 `<priority>` 和 `<changefreq>` 标签。

- [ ] **步骤 4：提交**

  ```bash
  git add app/sitemap.ts
  git commit -m "seo: add priority and changefreq to sitemap entries"
  ```

---

### 任务 4：优化 robots.txt，添加 crawl-delay

**文件：**
- 修改：`app/robots.ts`

- [ ] **步骤 1：读取当前 robots.ts**

  ```bash
  cat app/robots.ts
  ```

- [ ] **步骤 2：更新 robots.ts**

  ```typescript
  import type { MetadataRoute } from 'next'
  import { BASE_URL } from '@/lib/config'

  export default function robots(): MetadataRoute.Robots {
    return {
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/'],
        },
        {
          userAgent: 'AhrefsBot',
          allow: '/',
          crawlDelay: 10,
        },
        {
          userAgent: 'SemrushBot',
          allow: '/',
          crawlDelay: 10,
        },
      ],
      sitemap: `${BASE_URL}/sitemap.xml`,
    }
  }
  ```

- [ ] **步骤 3：验证输出**

  ```bash
  curl http://localhost:3000/robots.txt
  ```
  预期：包含 `Disallow: /api/` 和各 bot 的 `Crawl-delay: 10`。

- [ ] **步骤 4：提交**

  ```bash
  git add app/robots.ts
  git commit -m "seo: add crawl-delay for scrapers and disallow /api in robots.txt"
  ```

---

### 任务 5：在 root layout 注入 Organization schema

**文件：**
- 修改：`app/layout.tsx`
- 复用：`components/JsonLd.tsx`（已存在）

- [ ] **步骤 1：读取现有 layout.tsx 和 JsonLd 组件**

  ```bash
  cat app/layout.tsx
  cat components/JsonLd.tsx
  ```

- [ ] **步骤 2：在 layout.tsx 中添加 Organization JSON-LD**

  在 `<body>` 标签内最前面添加：

  ```typescript
  import { JsonLd } from '@/components/JsonLd'
  import { BASE_URL } from '@/lib/config'

  // 在 RootLayout 的 return 中：
  <JsonLd
    data={{
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'EVAftermarket',
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      sameAs: [],
      description: 'Fault codes, charging guides, and owner experiences for Chinese EVs in Australia and beyond.',
    }}
  />
  ```

- [ ] **步骤 3：用 Google Rich Results Test 验证**

  打开 https://search.google.com/test/rich-results，输入本地 URL（或部署后的 URL）。
  预期：检测到 Organization 类型，无错误。

- [ ] **步骤 4：提交**

  ```bash
  git add app/layout.tsx
  git commit -m "seo: add Organization JSON-LD to root layout"
  ```

---

### 任务 6：为车型页面添加 Product schema

**文件：**
- 修改：`app/[market]/models/[slug]/page.tsx`

- [ ] **步骤 1：读取车型页面代码，确认数据结构**

  ```bash
  cat app/[market]/models/\[slug\]/page.tsx
  ```

- [ ] **步骤 2：查询 models 数据库，确认可用字段**

  ```bash
  cat lib/db/models.ts
  ```

- [ ] **步骤 3：在 model page 的 return 中添加 Product JSON-LD**

  ```typescript
  import { JsonLd } from '@/components/JsonLd'

  // 在 JSX return 中：
  <JsonLd
    data={{
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: modelData.model_name,
      brand: {
        '@type': 'Brand',
        name: modelData.brand_name,
      },
      description: `${modelData.model_name} specifications, common fault codes, and real owner experiences.`,
      url: `${BASE_URL}/${market}/models/${slug}`,
    }}
  />
  ```

  > 注意：不要虚构 price 或 aggregateRating 字段，没有真实数据时省略这两个字段。

- [ ] **步骤 4：验证 Rich Results（可选，部署后进行）**

  ```bash
  pnpm build
  ```
  预期：构建成功，无 TypeScript 错误。

- [ ] **步骤 5：提交**

  ```bash
  git add app/[market]/models/[slug]/page.tsx
  git commit -m "seo: add Product JSON-LD to model pages"
  ```

---

### 任务 7：为充电页面添加 HowTo schema

**文件：**
- 修改：`app/[market]/charging/[model]/page.tsx`

- [ ] **步骤 1：读取充电页面代码**

  ```bash
  cat app/[market]/charging/\[model\]/page.tsx
  ```

- [ ] **步骤 2：在 charging page 的 return 中添加 HowTo JSON-LD**

  ```typescript
  <JsonLd
    data={{
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to Charge ${modelData.model_name} at Home`,
      description: `Step-by-step guide to setting up home charging for the ${modelData.model_name}.`,
      step: [
        {
          '@type': 'HowToStep',
          name: 'Choose a home charger',
          text: 'Select a Level 2 charger (7kW or 22kW) compatible with your vehicle.',
        },
        {
          '@type': 'HowToStep',
          name: 'Install the charging unit',
          text: 'Hire a licensed electrician to install a dedicated charging circuit and wall unit.',
        },
        {
          '@type': 'HowToStep',
          name: 'Connect and charge',
          text: 'Plug the charging cable into your vehicle. Use the companion app to schedule overnight charging.',
        },
      ],
    }}
  />
  ```

- [ ] **步骤 3：验证构建**

  ```bash
  pnpm build 2>&1 | tail -10
  ```
  预期：构建成功。

- [ ] **步骤 4：提交**

  ```bash
  git add "app/[market]/charging/[model]/page.tsx"
  git commit -m "seo: add HowTo JSON-LD to charging pages"
  ```

---

## 第二周：内容与 CTR 优化

---

### 任务 8：优化 DTC 列表页 meta description

**文件：**
- 修改：`app/[market]/dtc/[model]/page.tsx`

- [ ] **步骤 1：读取当前 generateMetadata 函数**

  ```bash
  sed -n '16,43p' "app/[market]/dtc/[model]/page.tsx"
  ```

- [ ] **步骤 2：查询该车型的 DTC 数量，用于在 description 中展示**

  在 `generateMetadata` 函数中，增加对 DTC 数量的查询：

  ```typescript
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { market, model } = await params
    const modelData = await getModelBySlug(model)
    if (!modelData) return {}

    const dtcs = await getDTCsByModel(modelData.model_id)
    const count = dtcs.length

    const title = `${modelData.model_name} Fault Codes — ${count} Codes Listed (${market.toUpperCase()})`
    const description = `${count} fault codes for the ${modelData.model_name} in ${market.toUpperCase()}. Find DTC meanings, severity levels, and repair tips based on real owner cases. Updated ${new Date().getFullYear()}.`
    const url = `${BASE_URL}/${market}/dtc/${model}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
      twitter: { card: 'summary', title, description },
    }
  }
  ```

- [ ] **步骤 3：验证 meta 输出**

  ```bash
  pnpm build && pnpm start &
  sleep 5
  curl -s http://localhost:3000/au/dtc/byd-atto-3 | grep -o '<meta name="description"[^>]*>'
  ```
  预期：description 中包含数字和 "fault codes"。

- [ ] **步骤 4：提交**

  ```bash
  git add "app/[market]/dtc/[model]/page.tsx"
  git commit -m "seo: improve DTC list page meta description with code count"
  ```

---

### 任务 9：优化 DTC 详情页 meta title 和 description

**文件：**
- 修改：`app/[market]/dtc/[model]/[code]/page.tsx`

- [ ] **步骤 1：读取当前 generateMetadata**

  ```bash
  grep -n "generateMetadata" "app/[market]/dtc/[model]/[code]/page.tsx" -A 30
  ```

- [ ] **步骤 2：更新 meta title 和 description 格式**

  ```typescript
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { market, model, code } = await params
    const modelData = await getModelBySlug(model)
    const dtcData = await getDTCByCode(code, modelData?.model_id)
    if (!modelData || !dtcData) return {}

    const title = `${code} ${modelData.model_name} — Cause, Fix & Cost | EVAftermarket`
    const description = `${code} on ${modelData.model_name}: ${dtcData.description?.slice(0, 100) ?? 'fault code details'}. Severity: ${dtcData.severity}. See real owner repair cases and estimated costs.`
    const url = `${BASE_URL}/${market}/dtc/${model}/${code}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'article' },
      twitter: { card: 'summary', title, description },
    }
  }
  ```

- [ ] **步骤 3：验证构建**

  ```bash
  pnpm build 2>&1 | tail -10
  ```

- [ ] **步骤 4：提交**

  ```bash
  git add "app/[market]/dtc/[model]/[code]/page.tsx"
  git commit -m "seo: improve DTC detail page meta title and description"
  ```

---

### 任务 10：创建问题分类聚合页

**文件：**
- 新建：`app/[market]/problems/page.tsx`（注意：已存在 `problems/[model]/page.tsx`，本任务是无 model slug 的入口聚合页）

- [ ] **步骤 1：确认 problems 目录结构**

  ```bash
  ls app/[market]/problems/
  ```
  预期：只有 `[model]/` 子目录，没有 `page.tsx`。

- [ ] **步骤 2：读取 models 数据库工具函数**

  ```bash
  cat lib/db/models.ts
  ```

- [ ] **步骤 3：新建 `app/[market]/problems/page.tsx`**

  ```typescript
  import type { Metadata } from 'next'
  import Link from 'next/link'
  import { notFound } from 'next/navigation'
  import { getAllMarkets } from '@/lib/db/markets'
  import { getAllModelSlugs } from '@/lib/db/models'
  import { BASE_URL } from '@/lib/config'
  import { JsonLd } from '@/components/JsonLd'

  export const revalidate = 3600

  interface Props {
    params: Promise<{ market: string }>
  }

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { market } = await params
    const title = `EV Common Problems — By Category (${market.toUpperCase()}) | EVAftermarket`
    const description = `Browse common electric vehicle problems in ${market.toUpperCase()} by category: battery, charging, software, and mechanical issues. Backed by real owner case data.`
    const url = `${BASE_URL}/${market}/problems`
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
    }
  }

  const PROBLEM_CATEGORIES = [
    { slug: 'battery', label: 'Battery Issues', description: 'Range anxiety, degradation, BMS faults' },
    { slug: 'charging', label: 'Charging Problems', description: 'Failed sessions, slow charging, cable faults' },
    { slug: 'software', label: 'Software & OTA', description: 'Update failures, infotainment bugs, connectivity' },
    { slug: 'mechanical', label: 'Mechanical Issues', description: 'Suspension, brakes, drivetrain noise' },
    { slug: 'electrical', label: 'Electrical Faults', description: 'Warning lights, sensor errors, 12V battery' },
  ]

  export default async function ProblemsIndexPage({ params }: Props) {
    const { market } = await params
    const markets = await getAllMarkets()
    if (!markets.find(m => m.market_code === market)) notFound()

    const models = await getAllModelSlugs()

    return (
      <>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${market}` },
              { '@type': 'ListItem', position: 2, name: 'Problems', item: `${BASE_URL}/${market}/problems` },
            ],
          }}
        />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">EV Common Problems</h1>
          <p className="text-gray-600 mb-8">Browse real owner-reported issues by category or vehicle model.</p>

          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Browse by Problem Category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROBLEM_CATEGORIES.map(cat => (
                <div key={cat.slug} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{cat.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Browse by Vehicle Model</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {models.map(m => (
                <li key={m.slug}>
                  <Link
                    href={`/${market}/problems/${m.slug}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {m.model_name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </>
    )
  }
  ```

- [ ] **步骤 4：确认 `getAllModelSlugs` 返回 slug 和 model_name**

  ```bash
  grep -n "getAllModelSlugs" lib/db/models.ts -A 10
  ```
  如果返回值缺少 `model_name`，调整页面中的字段引用。

- [ ] **步骤 5：验证页面可访问**

  ```bash
  pnpm build && pnpm start &
  sleep 5
  curl -s http://localhost:3000/au/problems | grep -o '<h1[^>]*>.*</h1>'
  ```
  预期：返回包含 "EV Common Problems" 的 h1 标签。

- [ ] **步骤 6：提交**

  ```bash
  git add "app/[market]/problems/page.tsx"
  git commit -m "feat: add problems index page with category and model listing"
  ```

---

### 任务 11：添加 DTC 列表页内容介绍段落

**文件：**
- 修改：`app/[market]/dtc/[model]/page.tsx`

- [ ] **步骤 1：读取 DTC 列表页完整代码**

  ```bash
  cat "app/[market]/dtc/[model]/page.tsx"
  ```

- [ ] **步骤 2：在页面标题下方添加介绍文字段落**

  在 `DtcModelPage` 的 JSX return 中，`<h1>` 后面添加：

  ```typescript
  <section className="mb-8">
    <h1 className="text-3xl font-bold mb-3">
      {modelData.model_name} Fault Codes
    </h1>
    <p className="text-gray-600 max-w-2xl">
      Below is a complete list of known fault codes (DTC) for the {modelData.model_name} in {market.toUpperCase()}.
      Each code includes its meaning, severity level, and links to real owner repair cases where available.
      Use this list to diagnose warning lights and understand potential repair costs before visiting a service centre.
    </p>
  </section>
  ```

- [ ] **步骤 3：验证页面渲染**

  ```bash
  curl -s http://localhost:3000/au/dtc/byd-atto-3 | grep -o 'Below is a complete list'
  ```
  预期：输出 "Below is a complete list"。

- [ ] **步骤 4：提交**

  ```bash
  git add "app/[market]/dtc/[model]/page.tsx"
  git commit -m "content: add intro paragraph to DTC list pages for SEO"
  ```

---

## 第三周：Analytics 与内部链接

---

### 任务 12：接入 Plausible Analytics

**文件：**
- 修改：`app/layout.tsx`

> **前提条件**：需先在 plausible.io 注册账号，创建站点，获取数据域名（如 `evaftermarket.com`）。若使用自托管 Umami，请替换 script src。

- [ ] **步骤 1：在 layout.tsx 中导入 Script**

  ```typescript
  import Script from 'next/script'
  ```

- [ ] **步骤 2：在 `<body>` 内添加 Plausible 脚本**

  ```typescript
  <Script
    defer
    data-domain="evaftermarket.com"
    src="https://plausible.io/js/script.js"
    strategy="afterInteractive"
  />
  ```

- [ ] **步骤 3：验证脚本出现在 HTML 中**

  ```bash
  curl -s http://localhost:3000/au | grep -o 'plausible'
  ```
  预期：输出 "plausible"（开发环境可能被 Next.js 过滤，部署后验证）。

- [ ] **步骤 4：提交**

  ```bash
  git add app/layout.tsx
  git commit -m "analytics: add Plausible analytics script to root layout"
  ```

---

### 任务 13：提交 sitemap 到 Google Search Console（操作步骤）

> 本任务为手动操作，无代码变更。

- [ ] **步骤 1：打开 Google Search Console**

  访问 https://search.google.com/search-console

- [ ] **步骤 2：通过 DNS TXT 验证域名所有权**

  在 DNS 供应商（如 Cloudflare、Namecheap）后台，添加 TXT 记录：
  - 主机名：`@`
  - 值：GSC 提供的验证码（格式：`google-site-verification=xxxx`）

- [ ] **步骤 3：验证完成后提交 sitemap**

  在 GSC 左侧菜单 → Sitemaps → 输入 `sitemap.xml` → 提交。
  预期：状态显示"成功"。

- [ ] **步骤 4：同样提交 Bing Webmaster Tools**

  访问 https://www.bing.com/webmasters，注册并验证域名，提交相同 sitemap URL。

- [ ] **步骤 5：手动请求收录 Top 20 页面**

  在 GSC → URL 检查 → 输入页面 URL → 请求编入索引。
  优先请求以下页面类型：
  - 市场首页（`/au`, `/uk`...）
  - 热门车型页（BYD Atto 3, MG MG4, BYD Dolphin 等）
  - 充电页（同上车型）
  - DTC 列表页（同上车型）

---

### 任务 14：优化 sitemap，添加问题聚合页

**文件：**
- 修改：`app/sitemap.ts`

- [ ] **步骤 1：读取当前 sitemap.ts**

  ```bash
  cat app/sitemap.ts
  ```

- [ ] **步骤 2：在 sitemap 中为每个 market 添加 problems 入口页**

  在生成 URL 数组的逻辑中，添加：

  ```typescript
  // 问题聚合页 — 每个市场一个
  const problemsIndexUrls = markets.map(m => ({
    url: `${BASE_URL}/${m.market_code}/problems`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  ```

  并将 `problemsIndexUrls` 合并到最终返回的数组中。

- [ ] **步骤 3：验证 sitemap 包含新 URL**

  ```bash
  pnpm build && pnpm start &
  sleep 5
  curl -s http://localhost:3000/sitemap.xml | grep "problems" | head -5
  ```
  预期：输出 `/au/problems` 等 URL。

- [ ] **步骤 4：提交**

  ```bash
  git add app/sitemap.ts
  git commit -m "seo: add problems index pages to sitemap"
  ```

---

## 第四周：变现集成

---

### 任务 15：创建 Privacy Policy 和 Contact 页面（AdSense 前提）

> AdSense 审核要求网站必须有隐私政策和联系方式页面。

**文件：**
- 新建：`app/privacy/page.tsx`
- 新建：`app/contact/page.tsx`

- [ ] **步骤 1：新建 `app/privacy/page.tsx`**

  ```typescript
  import type { Metadata } from 'next'

  export const metadata: Metadata = {
    title: 'Privacy Policy | EVAftermarket',
    description: 'EVAftermarket privacy policy — how we collect and use data.',
  }

  export default function PrivacyPage() {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">Last updated: {new Date().getFullYear()}</p>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Information We Collect</h2>
          <p>We collect anonymous usage data via Plausible Analytics. No personal information or cookies are stored.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Third-Party Services</h2>
          <p>We may display advertisements via Google AdSense. Google may use cookies to serve relevant ads based on your prior visits to this and other websites.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Affiliate Links</h2>
          <p>Some links on this site may be affiliate links. We earn a small commission if you make a purchase through these links, at no extra cost to you.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p>For privacy concerns, please contact us at the address listed on our <a href="/contact" className="text-blue-600 underline">Contact page</a>.</p>
        </section>
      </main>
    )
  }
  ```

- [ ] **步骤 2：新建 `app/contact/page.tsx`**

  ```typescript
  import type { Metadata } from 'next'

  export const metadata: Metadata = {
    title: 'Contact | EVAftermarket',
    description: 'Get in touch with the EVAftermarket team.',
  }

  export default function ContactPage() {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <p className="text-gray-600 mb-4">
          Have a question, found an error, or want to suggest a new vehicle or data source?
        </p>
        <p>
          Email: <a href="mailto:hello@evaftermarket.com" className="text-blue-600 underline">hello@evaftermarket.com</a>
        </p>
        <p className="mt-4 text-sm text-gray-500">We aim to respond within 48 hours.</p>
      </main>
    )
  }
  ```

- [ ] **步骤 3：验证两个页面可访问**

  ```bash
  curl -s http://localhost:3000/privacy | grep -o '<h1[^>]*>.*</h1>'
  curl -s http://localhost:3000/contact | grep -o '<h1[^>]*>.*</h1>'
  ```

- [ ] **步骤 4：提交**

  ```bash
  git add app/privacy/page.tsx app/contact/page.tsx
  git commit -m "feat: add Privacy Policy and Contact pages for AdSense compliance"
  ```

---

### 任务 16：在 footer 添加 Privacy/Contact 链接

**文件：**
- 修改：`app/layout.tsx`（或独立 footer 组件，以实际代码为准）

- [ ] **步骤 1：读取 layout.tsx 中的 footer 部分**

  ```bash
  grep -n "footer" app/layout.tsx -A 10
  ```

- [ ] **步骤 2：在 footer 中添加链接**

  ```typescript
  <footer className="border-t mt-16 py-8 text-sm text-gray-500">
    <div className="max-w-4xl mx-auto px-4 flex flex-wrap gap-4">
      <span>© {new Date().getFullYear()} EVAftermarket</span>
      <Link href="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
      <Link href="/contact" className="hover:text-gray-700">Contact</Link>
    </div>
  </footer>
  ```

- [ ] **步骤 3：验证 footer 在首页可见**

  ```bash
  curl -s http://localhost:3000/au | grep -o 'Privacy Policy'
  ```

- [ ] **步骤 4：提交**

  ```bash
  git add app/layout.tsx
  git commit -m "feat: add Privacy Policy and Contact links to footer"
  ```

---

### 任务 17：在充电页面添加联盟营销链接区块

**文件：**
- 修改：`app/[market]/charging/[model]/page.tsx`

> 联盟链接样式参考：使用 `rel="sponsored noopener"` 确保合规。

- [ ] **步骤 1：读取充电页面当前代码**

  ```bash
  cat "app/[market]/charging/[model]/page.tsx"
  ```

- [ ] **步骤 2：在充电页面底部添加推荐充电桩区块**

  在 JSX return 的底部（真实案例模块之后）添加：

  ```typescript
  <section className="mt-12 border-t pt-8">
    <h2 className="text-xl font-semibold mb-4">Recommended Home Chargers</h2>
    <p className="text-sm text-gray-500 mb-4">
      * Affiliate disclosure: we may earn a small commission if you purchase via these links, at no extra cost to you.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <a
        href="https://evnex.com/products/e2"
        rel="sponsored noopener noreferrer"
        target="_blank"
        className="border rounded-lg p-4 hover:border-blue-400 transition"
      >
        <div className="font-semibold">EVNEX E2 — 7.2kW</div>
        <div className="text-sm text-gray-500 mt-1">Popular in AU/NZ. Smart scheduling, app control.</div>
        <div className="text-blue-600 text-sm mt-2">View on EVNEX →</div>
      </a>
      <a
        href="https://wallbox.com/en_au/catalogue/chargers"
        rel="sponsored noopener noreferrer"
        target="_blank"
        className="border rounded-lg p-4 hover:border-blue-400 transition"
      >
        <div className="font-semibold">Wallbox Pulsar Plus — 7.4kW</div>
        <div className="text-sm text-gray-500 mt-1">Compact design, Bluetooth + WiFi, myWallbox app.</div>
        <div className="text-blue-600 text-sm mt-2">View on Wallbox →</div>
      </a>
    </div>
  </section>
  ```

- [ ] **步骤 3：验证构建**

  ```bash
  pnpm build 2>&1 | tail -10
  ```

- [ ] **步骤 4：提交**

  ```bash
  git add "app/[market]/charging/[model]/page.tsx"
  git commit -m "feat: add affiliate charger recommendations to charging pages"
  ```

---

### 任务 18：AdSense 申请（手动操作步骤）

> 本任务为手动操作，无代码变更。AdSense 审核需要网站有实际内容和一定访问量，建议上线后 2-4 周申请。

- [ ] **步骤 1：确认申请前提条件**

  - [ ] 网站已上线且可公开访问
  - [ ] Privacy Policy 页面存在（任务 15 ✓）
  - [ ] Contact 页面存在（任务 15 ✓）
  - [ ] 网站内容真实原创（✓）
  - [ ] 网站没有成人/版权/违禁内容（✓）

- [ ] **步骤 2：访问 AdSense 注册**

  打开 https://adsense.google.com，用 Google 账号注册，填写网站 URL。

- [ ] **步骤 3：等待审核（通常 2-4 周）**

  审核期间继续更新内容，增加页面数量和访问量。

- [ ] **步骤 4：审核通过后，在 layout.tsx 中添加 AdSense 代码**

  ```typescript
  // app/layout.tsx — 在 <head> 内
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
    crossOrigin="anonymous"
  />
  ```

  将 `ca-pub-XXXXXXXXXX` 替换为实际的 Publisher ID。

- [ ] **步骤 5：在 DTC 详情页添加广告位（审核通过后）**

  在 DTC 详情页内容区域中间添加：

  ```typescript
  <ins
    className="adsbygoogle"
    style={{ display: 'block' }}
    data-ad-client="ca-pub-XXXXXXXXXX"
    data-ad-slot="YYYYYYYYYY"
    data-ad-format="auto"
    data-full-width-responsive="true"
  />
  ```

---

## 上线前检查清单

### 任务 19：上线前技术审计

- [ ] **步骤 1：运行全量构建并检查错误**

  ```bash
  pnpm build 2>&1
  ```
  预期：0 错误，0 TypeScript 编译错误。

- [ ] **步骤 2：验证所有关键路由返回 200**

  ```bash
  pnpm start &
  sleep 5
  for path in /au /au/problems /au/dtc/byd-atto-3 /au/charging/byd-atto-3 /au/models/byd-atto-3 /privacy /contact; do
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$path)
    echo "$path → $status"
  done
  ```
  预期：所有路径均返回 200。

- [ ] **步骤 3：验证 sitemap 可访问**

  ```bash
  curl -s http://localhost:3000/sitemap.xml | head -30
  ```
  预期：合法 XML，包含 `<urlset>` 根节点。

- [ ] **步骤 4：验证 robots.txt 正确**

  ```bash
  curl -s http://localhost:3000/robots.txt
  ```
  预期：包含 `Sitemap:` 和 `Disallow: /api/`。

- [ ] **步骤 5：使用 Google Rich Results Test 检验结构化数据**

  - 打开 https://search.google.com/test/rich-results
  - 分别测试：市场首页、车型页、DTC 详情页、充电页
  - 预期：所有 schema 无错误（警告可接受）

- [ ] **步骤 6：运行 Lighthouse 检测 Core Web Vitals**

  ```bash
  # 需要先安装 lighthouse
  npx lighthouse http://localhost:3000/au --output=json --quiet | \
    node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const r=JSON.parse(d); console.log('Performance:', r.categories.performance.score*100, 'SEO:', r.categories.seo.score*100)"
  ```
  预期：Performance ≥ 70，SEO ≥ 90。

- [ ] **步骤 7：最终提交**

  ```bash
  git add .
  git commit -m "chore: pre-launch technical audit complete"
  ```

---

## 上线后监控（每周例行）

### 任务 20：建立每周监控习惯

> 本任务为操作规程，无代码变更。

- [ ] **每周一：检查 GSC 收录状况**

  - 打开 Search Console → Coverage
  - 核查：indexed 页面数是否在增长？是否有 error/excluded 异常？
  - 如有 crawl error，按 URL 找到对应页面并修复

- [ ] **每周一：检查 Core Web Vitals**

  - 打开 Search Console → Core Web Vitals
  - 如有 Poor/Need Improvement URL，用 PageSpeed Insights 诊断

- [ ] **每周三：分析 Analytics 数据**

  - 打开 Plausible 控制台
  - 查看：Top Pages、Traffic Sources、Countries
  - 关注：哪些页面跳出率高？哪些页面停留时间长？

- [ ] **每月初：查看 GSC 搜索词报告**

  - 打开 Search Console → Performance → Queries
  - 找出：impressions 高但 CTR 低的词（优化 meta description）
  - 找出：排名 11-20 的词（优化内容，争取进入首页）

- [ ] **每月初：更新内容**

  - 运行数据采集脚本获取新案例：
    ```bash
    pnpm collect:reddit --model byd-atto-3
    pnpm review --approve-all
    ```
  - 为有新案例的页面手动在 GSC 请求重新收录

---

