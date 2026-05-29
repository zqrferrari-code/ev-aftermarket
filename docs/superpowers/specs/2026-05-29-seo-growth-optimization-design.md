---
title: SEO Growth Optimization Design
date: 2026-05-29
status: draft
priority: A (indexing) > B (ranking) > C (CTR) > D (revenue)
timeline: 1 month to launch
budget: Small (free tools primarily)
---

# SEO Growth Optimization Design

## Executive Summary

This design outlines a comprehensive SEO optimization strategy to improve:
- **A. Google indexing rate** (收录率) - Priority 1
- **B. Search ranking/hit rate** (搜索命中率) - Priority 2
- **C. User click-through rate** (点击率) - Priority 3
- **D. Revenue rate** (收益率) - Priority 4

**Timeline**: 1 month to launch
**Budget**: Small (primarily free tools)
**Technical approach**: Simple, managed services
**Current state**: Pre-launch, strong SEO foundation already in place (sitemap, structured data, meta tags)

## 1. Technical SEO Foundation (Week 1)

### 1.1 Performance Optimization (Core Web Vitals)

**Goal**: Achieve "Good" ratings for LCP, FID, CLS to improve indexing and ranking.

**Image Optimization**:
- Configure Next.js Image component globally:
  ```typescript
  // next.config.js
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  }
  ```
- Add `priority` prop to above-the-fold images on DTC pages
- Implement lazy loading for below-the-fold images
- Compress existing images in `/public` directory

**Font Optimization**:
- Use `next/font` to load fonts with `display: 'swap'`
- Preload critical fonts in root layout
- Remove unused font weights/styles

**Code Splitting**:
- Audit bundle size with `@next/bundle-analyzer`
- Move large dependencies (Anthropic SDK, mysql2) to API routes only
- Use dynamic imports for non-critical components

**ISR Tuning**:
- High-traffic pages (market home, popular models): `revalidate: 1800` (30 min)
- Medium-traffic pages (DTC lists, problem pages): `revalidate: 3600` (1 hour)
- Low-traffic pages (individual DTC details): `revalidate: 7200` (2 hours)

### 1.2 Mobile Optimization

**Responsive Testing**:
- Test all page types at 375px, 768px, 1024px widths
- Fix any layout breaks or horizontal scroll issues

**Touch Targets**:
- Ensure all interactive elements are ≥48×48px
- Add adequate spacing between clickable elements

**Viewport Configuration**:
- Verify `viewport` meta tag: `width=device-width, initial-scale=1`

### 1.3 Structured Data Expansion

**Product Schema** (for model pages):
```json
{
  "@type": "Product",
  "name": "BYD Atto 3",
  "brand": "BYD",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "AUD",
    "lowPrice": "44990"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.2",
    "reviewCount": "15"
  }
}
```

**HowTo Schema** (for charging/service guides):
```json
{
  "@type": "HowTo",
  "name": "How to Charge BYD Atto 3 at Home",
  "step": [...]
}
```

**Organization Schema** (root layout):
```json
{
  "@type": "Organization",
  "name": "EVAftermarket",
  "url": "https://evaftermarket.com",
  "logo": "https://evaftermarket.com/logo.png"
}
```

### 1.4 Internal Linking Optimization

**Related Models Module**:
- Add "Related Models" section to each model page
- Link to 3-5 similar models (same brand, similar price range, same market)

**Problem Category Pages**:
- Create `/[market]/problems` aggregation page
- Categorize by: Battery, Charging, Software, Mechanical, Electrical
- Each category links to relevant DTC codes and case studies

**Breadcrumb Enhancement**:
- Already implemented ✓
- Ensure all pages have proper breadcrumb trails

**Cross-linking Strategy**:
- DTC detail pages → related DTCs ✓
- Model pages → common DTCs for that model
- Charging pages → related service centers
- Problem pages → relevant charging guides

## 2. Analytics & Monitoring Setup (Week 1)

### 2.1 Google Search Console

**Setup**:
- Verify domain ownership via DNS TXT record
- Submit sitemap: `https://evaftermarket.com/sitemap.xml`
- Enable all available reports

**Monitoring**:
- Track indexing coverage (target: >95% indexed)
- Monitor Core Web Vitals
- Track search queries and impressions
- Identify crawl errors and fix immediately

### 2.2 Privacy-Friendly Analytics

**Tool Selection**: Plausible Analytics (recommended) or Umami
- **Why**: GDPR-compliant, no cookie banner needed, lightweight (<1KB)
- **Cost**: Plausible $9/month (10k pageviews), Umami self-hosted (free)

**Implementation**:
```typescript
// app/layout.tsx
<Script
  defer
  data-domain="evaftermarket.com"
  src="https://plausible.io/js/script.js"
/>
```

**Key Metrics to Track**:
- Pageviews by page type (DTC, model, charging, problems)
- Traffic sources (organic, direct, referral)
- Top landing pages
- Bounce rate by page type
- Geographic distribution

### 2.3 Performance Monitoring

**Tool**: Vercel Analytics (free tier)
- Real User Monitoring (RUM) for Core Web Vitals
- Automatic performance insights
- No code changes required (built into Vercel)

**Alternative**: PageSpeed Insights API
- Weekly automated checks via GitHub Actions
- Alert if any page drops below "Good" threshold

## 3. Content Strategy (Week 2-3)

### 3.1 Keyword Research & Targeting

**Primary Keywords** (already targeting):
- `[brand] [model] fault codes` ✓
- `[brand] [model] DTC codes` ✓
- `[brand] [model] problems` ✓

**Secondary Keywords** (expand to):
- `[brand] [model] charging guide`
- `[brand] [model] service centers [city]`
- `[brand] [model] software update`
- `[brand] [model] warranty issues`
- `[brand] [model] battery problems`

**Long-tail Keywords**:
- `how to fix [DTC code] [brand] [model]`
- `[brand] [model] charging at home cost`
- `best home charger for [brand] [model]`
- `[brand] [model] vs [competitor]` (comparison pages)

### 3.2 Content Expansion Plan

**Phase 1: Enhance Existing Pages** (Week 2)
- Add 200-300 word introductions to all DTC list pages
- Expand DTC detail pages with:
  - Common causes (3-5 bullet points)
  - DIY troubleshooting steps (if safe)
  - When to see a mechanic
  - Estimated repair costs (from case data)
- Add FAQ sections to model pages (3-5 questions each)

**Phase 2: Create New Content** (Week 3)
- **Charging Guides** (10 pages):
  - `/[market]/charging/[model]` - already exists ✓
  - Add: "Charging Cost Calculator" section
  - Add: "Public Charging Network Comparison" table
- **Service Center Guides** (5 pages):
  - `/[market]/service/[city]` - expand with:
    - Authorized vs independent shops
    - Average labor rates
    - Customer reviews from case data
- **Software Update Guides** (5 pages):
  - `/[market]/updates/[model]` - already exists ✓
  - Add: Update history timeline
  - Add: Known issues fixed by each update
- **Comparison Pages** (5 pages):
  - `/[market]/compare/[model-a]-vs-[model-b]`
  - Side-by-side specs, pricing, common issues
  - Link to relevant DTC codes for each model

**Content Generation Workflow**:
1. Extract data from database (cases, DTCs, models)
2. Generate draft with Claude API (use existing pattern from collect-reddit.ts)
3. Human review for accuracy and tone
4. Publish with proper metadata and structured data

### 3.3 Content Quality Guidelines

**E-E-A-T Principles**:
- **Experience**: Use real case data, cite sources (ProductReview, Whirlpool)
- **Expertise**: Reference official service manuals, manufacturer bulletins
- **Authoritativeness**: Link to official brand websites, government recall databases
- **Trustworthiness**: Always include disclaimers, show data sources, update dates

**Writing Style**:
- Clear, concise, scannable (short paragraphs, bullet points)
- Technical but accessible (explain jargon)
- Action-oriented (what to do, not just what's wrong)
- Localized (AUD pricing, Australian service centers, local regulations)

## 4. Indexing Optimization (Week 1-2)

### 4.1 Sitemap Enhancements

**Current State**: Dynamic sitemap with 3600s revalidation ✓

**Improvements**:
- Add `<priority>` tags:
  - Market home pages: 1.0
  - Model pages: 0.9
  - DTC list pages: 0.8
  - DTC detail pages: 0.7
  - Charging/service pages: 0.8
  - Individual cases: 0.5
- Add `<changefreq>` tags:
  - Market/model pages: weekly
  - DTC pages: monthly
  - Case pages: yearly
- Split into multiple sitemaps if >50,000 URLs:
  - `/sitemap-dtc.xml`
  - `/sitemap-models.xml`
  - `/sitemap-content.xml`
  - `/sitemap-index.xml` (master)

### 4.2 Robots.txt Optimization

**Current State**: Basic allow-all ✓

**Improvements**:
```
User-agent: *
Allow: /

# Prevent indexing of API routes
Disallow: /api/

# Prevent indexing of admin/internal pages (if any)
Disallow: /admin/

# Crawl-delay for aggressive bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

Sitemap: https://evaftermarket.com/sitemap.xml
```

### 4.3 Canonical URLs

**Current State**: Implemented in metadata ✓

**Verification**:
- Ensure all pages have `<link rel="canonical">`
- Verify no duplicate content issues (e.g., `/au/dtc/byd-atto-3` vs `/au/dtc/byd-atto-3/`)
- Add canonical tags to paginated pages pointing to page 1

### 4.4 XML Sitemap Submission

**Actions**:
1. Submit sitemap to Google Search Console
2. Submit sitemap to Bing Webmaster Tools (free, easy setup)
3. Monitor indexing status weekly
4. Re-submit after major content updates

## 5. Click-Through Rate (CTR) Optimization (Week 2-3)

### 5.1 Meta Description Optimization

**Current State**: Basic descriptions ✓

**Improvements**:
- **Length**: 150-160 characters (mobile-optimized)
- **Format**: Problem + Solution + CTA
- **Examples**:
  - DTC page: "P0A0F fault code on BYD Atto 3? Learn causes, fixes & costs from real owner cases. Get expert help →"
  - Charging page: "Complete BYD Dolphin home charging guide: costs, charger recommendations & installation tips. Save $500/year →"
  - Model page: "BYD Atto 3 common problems, fault codes & owner experiences. 47 real cases analyzed. Find solutions →"

**Dynamic Descriptions**:
- Include case count: "Based on {count} real owner reports"
- Include price ranges: "Repair costs: ${min}-${max} AUD"
- Include update info: "Last updated {date}"

### 5.2 Title Tag Optimization

**Current State**: Template-based ✓

**Improvements**:
- **Format**: `[Primary Keyword] | [Secondary Keyword] | EVAftermarket`
- **Length**: 50-60 characters (avoid truncation)
- **Examples**:
  - DTC: `P0A0F BYD Atto 3 | Causes, Fixes & Costs | EVAftermarket`
  - Charging: `BYD Dolphin Charging Guide | Home & Public | EVAftermarket`
  - Model: `BYD Atto 3 Problems & Fault Codes | Real Owner Cases`

**Dynamic Titles**:
- Include year for model pages: "2024 BYD Atto 3..."
- Include location for service pages: "BYD Service Sydney..."

### 5.3 Rich Snippets

**Goal**: Appear in Google's rich results (FAQ, HowTo, Product)

**Implementation**:
- FAQ schema on DTC detail pages ✓
- HowTo schema on charging guides (new)
- Product schema on model pages (new)
- BreadcrumbList schema ✓

**Testing**:
- Use Google Rich Results Test tool
- Fix any validation errors
- Monitor Search Console for rich result impressions

### 5.4 Featured Snippet Optimization

**Target Queries**:
- "What is [DTC code]?"
- "How to fix [DTC code]?"
- "How much does [repair] cost?"
- "How to charge [model] at home?"

**Content Structure**:
- Start with direct answer (40-60 words)
- Use `<h2>` for question headings
- Use numbered lists for steps
- Use bullet lists for options/causes
- Include a summary table where applicable

## 6. Monetization Implementation (Week 3-4)

### 6.1 Phase 1: Google AdSense

**Setup**:
1. Apply for AdSense account (requires 6+ months domain age, may need to wait)
2. Add AdSense code to root layout
3. Configure ad units

**Ad Placement Strategy**:
- **DTC Detail Pages** (highest traffic):
  - In-article ad after first paragraph
  - Sidebar ad (desktop only)
  - Bottom ad before related DTCs
- **Model Pages**:
  - Top banner (below hero)
  - In-content ad after problem list
- **Charging/Service Pages**:
  - Sidebar ad (desktop)
  - Bottom ad before footer

**Ad Optimization**:
- Use responsive ad units
- Enable auto ads for testing
- Monitor performance in AdSense dashboard
- A/B test placements after 2 weeks

**Expected Revenue** (conservative estimate):
- 1,000 pageviews/day × $2 RPM = $60/month
- 5,000 pageviews/day × $2 RPM = $300/month
- 10,000 pageviews/day × $2 RPM = $600/month

### 6.2 Phase 2: Affiliate Marketing

**Timeline**: Start after 1 month of traffic data

**Affiliate Programs**:
1. **EV Charger Affiliates**:
   - EVNEX (New Zealand, may have AU program)
   - Wallbox (global)
   - ChargePoint (AU/NZ)
   - Commission: 5-10% per sale ($50-$150 per charger)

2. **Car Parts Affiliates**:
   - Sparesbox (AU)
   - Repco (AU)
   - Supercheap Auto (AU)
   - Commission: 3-8% per sale

3. **Insurance Affiliates**:
   - Compare the Market (AU)
   - iSelect (AU)
   - Commission: $20-$50 per lead

**Implementation**:
- Add "Recommended Products" sections to charging pages
- Add "Find Parts" links to DTC detail pages
- Add "Get Insurance Quote" CTA to model pages
- Use `rel="sponsored"` on all affiliate links
- Disclose affiliate relationships clearly

**Tracking**:
- Use affiliate network dashboards
- Track clicks with analytics events
- Calculate conversion rates by page type
- Optimize placements based on performance

### 6.3 Revenue Tracking

**Metrics to Monitor**:
- AdSense: RPM, CTR, CPC by page type
- Affiliates: Clicks, conversions, commission by program
- Total revenue per 1,000 visitors (RPV)
- Revenue by traffic source (organic, direct, referral)

**Tools**:
- Google AdSense dashboard
- Affiliate network dashboards
- Custom analytics events in Plausible/Umami
- Monthly revenue spreadsheet

## 7. Launch Checklist (Week 4)

### 7.1 Pre-Launch Technical Audit

- [ ] All pages return 200 status codes
- [ ] No broken internal links
- [ ] All images have alt text
- [ ] All pages have unique titles and descriptions
- [ ] Structured data validates in Rich Results Test
- [ ] Sitemap generates correctly and includes all pages
- [ ] Robots.txt allows all important pages
- [ ] Core Web Vitals in "Good" range (LCP <2.5s, FID <100ms, CLS <0.1)
- [ ] Mobile-friendly test passes
- [ ] HTTPS enabled with valid certificate
- [ ] Canonical URLs set correctly
- [ ] OpenGraph and Twitter cards configured

### 7.2 Analytics & Monitoring Setup

- [ ] Google Search Console verified and sitemap submitted
- [ ] Plausible/Umami installed and tracking pageviews
- [ ] Vercel Analytics enabled
- [ ] AdSense code installed (if approved)
- [ ] Affiliate tracking links tested

### 7.3 Content Quality Check

- [ ] All DTC pages have descriptions and case data
- [ ] All model pages have FAQs and problem summaries
- [ ] All charging pages have cost estimates and charger recommendations
- [ ] All service pages have location and contact info
- [ ] All pages have proper disclaimers
- [ ] All external links open in new tabs
- [ ] All data sources cited

### 7.4 SEO Final Check

- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Request indexing for top 20 pages in GSC
- [ ] Share site on relevant forums (Whirlpool, Reddit r/evaustralia)
- [ ] Add site to EV directories (if any exist)

## 8. Post-Launch Monitoring (Month 2+)

### 8.1 Weekly Tasks

- Check Google Search Console for:
  - New indexed pages
  - Crawl errors
  - Core Web Vitals issues
  - Manual actions
- Review analytics:
  - Top landing pages
  - Traffic sources
  - Bounce rate by page type
- Monitor revenue:
  - AdSense earnings
  - Affiliate clicks/conversions

### 8.2 Monthly Tasks

- Analyze search queries in GSC:
  - Identify new keyword opportunities
  - Find pages with high impressions but low CTR (optimize titles/descriptions)
  - Find pages ranking 11-20 (optimize content to reach page 1)
- Content updates:
  - Add new case data to existing pages
  - Create new pages for trending queries
  - Update outdated information
- Performance audit:
  - Run PageSpeed Insights on top 10 pages
  - Fix any new performance issues
- Backlink check:
  - Monitor new backlinks in GSC
  - Reach out to sites linking to competitors

### 8.3 Quarterly Tasks

- Comprehensive SEO audit:
  - Technical SEO health check
  - Content gap analysis
  - Competitor analysis
- Revenue optimization:
  - A/B test ad placements
  - Try new affiliate programs
  - Optimize high-traffic pages for conversions
- Content refresh:
  - Update top 20 pages with new data
  - Expand thin content pages
  - Remove or consolidate low-performing pages

## 9. Success Metrics

### 9.1 Indexing (Priority A)

**Target**: >95% of pages indexed within 2 weeks of launch

**Measurement**:
- Google Search Console → Coverage report
- Track: Indexed pages / Total pages ratio

**Success Criteria**:
- Week 1: >50% indexed
- Week 2: >80% indexed
- Week 4: >95% indexed

### 9.2 Ranking (Priority B)

**Target**: Top 10 rankings for primary keywords within 3 months

**Measurement**:
- Google Search Console → Performance report
- Track: Average position by query

**Success Criteria**:
- Month 1: Average position <50 for primary keywords
- Month 2: Average position <30 for primary keywords
- Month 3: Average position <20 for primary keywords
- Month 6: Average position <10 for primary keywords

### 9.3 CTR (Priority C)

**Target**: >3% average CTR from search results

**Measurement**:
- Google Search Console → Performance report
- Track: Clicks / Impressions ratio

**Success Criteria**:
- Month 1: >1% CTR
- Month 2: >2% CTR
- Month 3: >3% CTR

### 9.4 Revenue (Priority D)

**Target**: $300/month by Month 3

**Measurement**:
- AdSense dashboard + Affiliate dashboards
- Track: Total revenue / month

**Success Criteria**:
- Month 1: $50/month (AdSense only, low traffic)
- Month 2: $150/month (AdSense + early affiliate)
- Month 3: $300/month (optimized placements)
- Month 6: $600/month (growing traffic)

## 10. Risk Mitigation

### 10.1 Indexing Risks

**Risk**: Google doesn't index pages quickly
**Mitigation**:
- Manually request indexing for top 20 pages in GSC
- Build backlinks from high-authority sites (Whirlpool, Reddit)
- Ensure sitemap is submitted and error-free

**Risk**: Pages get indexed but then drop out
**Mitigation**:
- Monitor GSC Coverage report weekly
- Fix any crawl errors immediately
- Ensure content is unique and valuable (not thin/duplicate)

### 10.2 Ranking Risks

**Risk**: Pages rank but for wrong keywords
**Mitigation**:
- Use exact-match keywords in titles and H1s
- Add keyword variations in content naturally
- Build internal links with keyword-rich anchor text

**Risk**: Competitors outrank us
**Mitigation**:
- Analyze competitor content and improve ours
- Build more backlinks
- Update content more frequently

### 10.3 Revenue Risks

**Risk**: AdSense application rejected
**Mitigation**:
- Ensure site meets AdSense policies (original content, privacy policy, contact page)
- Apply again after 1 month if rejected
- Use alternative ad networks (Media.net, Ezoic) as backup

**Risk**: Low ad revenue despite traffic
**Mitigation**:
- Optimize ad placements (A/B test)
- Try different ad formats (display, in-article, matched content)
- Focus more on affiliate marketing (higher margins)

## 11. Tools & Resources

### 11.1 Free Tools

- **Google Search Console**: Indexing, performance, Core Web Vitals
- **Bing Webmaster Tools**: Additional search engine coverage
- **Google PageSpeed Insights**: Performance testing
- **Google Rich Results Test**: Structured data validation
- **Vercel Analytics**: Real User Monitoring (included with Vercel)
- **Plausible/Umami**: Privacy-friendly analytics ($0-9/month)

### 11.2 Paid Tools (Optional)

- **Ahrefs/SEMrush**: Keyword research, competitor analysis ($99+/month)
- **Screaming Frog**: Technical SEO audits (free up to 500 URLs)
- **Google Ads**: Keyword research via Keyword Planner (free with account)

### 11.3 Development Tools

- **Next.js Bundle Analyzer**: `@next/bundle-analyzer`
- **Lighthouse CI**: Automated performance testing
- **GitHub Actions**: Automated sitemap checks, performance monitoring

## 12. Implementation Timeline

### Week 1: Technical Foundation
- Day 1-2: Performance optimization (images, fonts, code splitting)
- Day 3-4: Analytics setup (GSC, Plausible, Vercel Analytics)
- Day 5-7: Structured data expansion (Product, HowTo, Organization)

### Week 2: Content Enhancement
- Day 8-10: Enhance existing DTC pages (add intros, FAQs, troubleshooting)
- Day 11-12: Optimize meta titles and descriptions
- Day 13-14: Create internal linking structure (related models, problem categories)

### Week 3: Content Expansion
- Day 15-17: Create new charging guides (cost calculators, network comparisons)
- Day 18-19: Create service center guides (city-specific)
- Day 20-21: Create comparison pages (model vs model)

### Week 4: Monetization & Launch
- Day 22-23: AdSense setup (if approved) or prepare application
- Day 24-25: Affiliate link integration (chargers, parts, insurance)
- Day 26-27: Pre-launch audit and testing
- Day 28: Launch and submit sitemaps

### Month 2+: Monitoring & Optimization
- Weekly: GSC monitoring, analytics review, content updates
- Monthly: SEO audit, revenue optimization, new content creation
- Quarterly: Comprehensive audit, strategy adjustment

## Conclusion

This design prioritizes **indexing first** (technical SEO, sitemaps, GSC), then **ranking** (content quality, keywords, internal linking), then **CTR** (meta optimization, rich snippets), and finally **revenue** (AdSense, affiliates).

The approach is **simple and budget-friendly**, using mostly free tools and leveraging existing Next.js/Vercel infrastructure. The timeline is **realistic for 1 month to launch**, with clear post-launch monitoring and optimization plans.

**Key Success Factors**:
1. Strong technical foundation (performance, mobile, structured data)
2. High-quality, data-driven content (real case studies, not generic advice)
3. Aggressive internal linking (every page connects to related pages)
4. Consistent monitoring and iteration (weekly GSC checks, monthly audits)
5. Patient revenue growth (AdSense first, then affiliates as traffic grows)
