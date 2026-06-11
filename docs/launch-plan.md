# 页面发布节奏计划

> 目标：避免一次性向 Google 提交大量低优先级页面，优先让高质量、高搜索量的页面先获得收录和权重，再逐步扩展。

---

## 当前数据概览

| 页面类型 | 总数 | 备注 |
|---|---|---|
| Market home | 4 | AU / UK / UAE / NO |
| Model overview | 32 | 4 市场 × 8 车型 |
| Problems index | 4 | 每市场一页 |
| Problems detail | 32 | 4 市场 × 8 车型 |
| Charging pages | 32 | 4 市场 × 8 车型（数据待核实） |
| Service pages | 32 | 4 市场 × 8 车型（数据待核实） |
| Updates pages | 32 | 4 市场 × 8 车型（数据稀薄，暂缓） |
| DTC list pages | 5 | 仅 AU，5 个有完整数据的 BYD 车型 |
| DTC detail pages | ~4,572 | 仅 AU + 5 BYD 车型 |
| Warning light brand pages | 1 | 仅 AU BYD |
| Warning light model pages | 2 | 仅 AU |
| Warning light detail pages | 58 | 仅 AU BYD，内容完整 |
| Dealer pages | 10 | AU BYD + MG × 5 州 |

**暂不发布：**
- `byd-dolphin`、`mg-mg4`、`mg-zs-ev` 的所有 DTC 页面（各仅 2 条记录，thin content 风险）
- Updates pages（仅 7 条 OTA 记录，内容不足）
- 非 AU 市场的 warning light 页面（重复内容风险）

---

## 发布批次

### 第一批 — 立即发布（约 82 页）

**目标：** 建立站点基础权重，让 Google 先认识这个站点

| 页面 | 数量 | sitemap priority |
|---|---|---|
| Market home（4 市场）| 4 | 1.0 |
| Model overview（4 市场 × 8 车型）| 32 | 0.9 |
| Problems index（4 市场）| 4 | 0.8 |
| Problems detail（4 市场 × 8 车型）| 32 | 0.8 |
| Dealer pages（AU BYD + MG × 5 州）| 10 | 0.6 |

**操作：**
1. sitemap 暂只包含以上页面（其余批次对应的 section 先注释掉）
2. 部署上线后，Google Search Console 手动提交 sitemap
3. 等待 1～2 周观察收录率

**收录率目标：** >70% 才进入第二批

---

### 第二批 — Warning Lights（约 61 页，第 1～2 周）

**前提：** 第一批收录率 >70%

**目标：** 推出内容质量最高的专题页，FAQPage + BreadcrumbList JSON-LD 已就绪，有望获得 Google 富摘要

| 页面 | 数量 | sitemap priority |
|---|---|---|
| Warning light brand page（AU BYD）| 1 | 0.8 |
| Warning light model pages（AU）| 2 | 0.8 |
| Warning light detail pages（AU BYD，58 条）| 58 | 0.8 |

**操作：**
1. 在 sitemap 中解注释 Warning Lights section
2. 重新提交 sitemap
3. 用 Google Search Console 的「URL 检查」工具抽查 5～10 条详情页，确认 FAQPage 富摘要被识别

---

### 第三批 — Charging + Service（约 64 页，第 3～4 周）

**前提：** 第二批有明显收录信号（Search Console 展示量开始增长）

**注意：** 发布前需人工抽查每个车型的 charging / service 页面内容是否足够丰富，避免 thin content

| 页面 | 数量 | sitemap priority |
|---|---|---|
| Charging pages（4 市场 × 8 车型）| 32 | 0.8 |
| Service pages（4 市场 × 8 车型）| 32 | 0.8 |

**操作：**
1. 本地访问 `localhost:3000/au/charging/byd-atto-3` 等页面，确认每页有实质内容
2. 确认无问题后解注释 sitemap 对应 section，重新提交

---

### 第四批 — DTC 详情页（约 4,577 页，第 6 周）

**前提：** 站点已有一定权重（Search Console 每周展示量 >500），Google 对本站内容质量有正向信号

**数据范围：** 仅 AU 市场，5 个有完整数据的 BYD 车型

| 车型 | DTC 数量 |
|---|---|
| byd-atto-3 | 916 |
| byd-atto-8 | 914 |
| byd-qin-plus | 914 |
| byd-seal-6-ev | 914 |
| byd-seal-u | 914 |
| DTC list pages | 5 |
| **合计** | **4,577** |

**操作：**
1. 解注释 sitemap 的 DTC section
2. 重新提交 sitemap
3. 观察 Search Console 覆盖率报告，正常情况下 Google 会在 2～4 周内逐步抓取，不会全量立即收录

**注意：** 4,000+ 页一次性进入 sitemap 是正常操作，Google 会按自己的节奏抓取。不需要再次拆分，但需要确保服务器响应速度正常（ISR 缓存已配置，revalidate=1800）

---

### 第五批 — 补全车型数据后发布（待定）

以下内容待数据充足后再纳入发布计划：

| 内容 | 当前状态 | 发布条件 |
|---|---|---|
| byd-dolphin DTC 页（~900 页）| 仅 2 条记录 | 补全至 500+ 条 |
| mg-mg4 DTC 页（~900 页）| 仅 2 条记录 | 补全至 500+ 条 |
| mg-zs-ev DTC 页（~900 页）| 仅 2 条记录 | 补全至 500+ 条 |
| Updates pages（32 页）| 仅 7 条 OTA 记录 | 每车型至少 3 个版本 |
| 非 AU 市场 warning lights | 重复内容 | 内容本地化后再开放 |
| Service pages 内容 | serviceCosts 表为空 | 补充价格数据后发布 |

---

## sitemap 分批控制方法

在 `app/sitemap.ts` 里，各 section 对应批次如下。发布时逐步取消注释：

```
// ✅ 第一批（已启用）
// - Market home pages
// - Model overview pages
// - Problems index pages
// - Problems detail pages
// - Dealers pages

// ⏳ 第二批（第 1～2 周解注释）
// - Warning lights brand/model/detail pages（AU only）

// ⏳ 第三批（第 3～4 周解注释，内容确认后）
// - Charging pages
// - Service pages

// ⏳ 第四批（第 6 周解注释）
// - DTC list pages
// - DTC detail pages
```

---

## 监控指标

每次发布后在 Google Search Console 观察：

| 指标 | 健康值 | 警告信号 |
|---|---|---|
| 收录率（已收录/已提交）| >60% | <30%（内容质量问题）|
| 平均展示量增长 | 每批次 +20% | 连续 2 周零增长 |
| 覆盖率报告「已排除」原因 | 主要是「已爬取但未编入索引」| 出现「重复内容」或「薄弱内容」需立即处理 |
| Core Web Vitals | LCP <2.5s | LCP >4s 影响排名 |
