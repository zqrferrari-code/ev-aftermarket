# Editorial Clarity Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the entire site's design system to the "B · Editorial Clarity" direction — warm off-white background, DM Serif Display + Instrument Serif headings, generous whitespace, editorial layout with serif numerals.

**Architecture:** All visual changes live in `globals.css` (design tokens + shared classes) and the two component files. No new files needed — we restyle existing class names and add new ones for the serif/editorial patterns. Font loading moves into `app/layout.tsx` via Next.js `<link>`.

**Tech Stack:** Next.js App Router, CSS (no Tailwind for these styles — existing pattern), Google Fonts (DM Serif Display, Instrument Serif)

---

## File Map

| File | Change |
|------|--------|
| `app/layout.tsx` | Add Google Fonts `<link>` for DM Serif Display + Instrument Serif |
| `app/globals.css` | Full redesign: tokens, typography, all shared classes |
| `components/SeverityBadge.tsx` | Update badge styles to editorial palette |
| `components/DisclaimerBox.tsx` | Restyle to match new system |
| `components/RealWorldCases.tsx` | Restyle case cards |
| `app/[market]/dtc/[model]/[code]/page.tsx` | Swap inline styles + class names to new system |
| `components/BuyingGuideCalculator.tsx` | Restyle calculator UI |
| `app/[market]/buying-guide/page.tsx` | Restyle hero + page shell |

---

## Task 1: Load new fonts in root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add font preconnect + stylesheet link**

In `app/layout.tsx`, add inside `<html>` before `<body>` (Next.js allows `<head>` children in root layout via metadata, but for Google Fonts the simplest approach is adding `<link>` tags directly):

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";
import { BASE_URL } from "@/lib/config";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: {
    template: "%s | EVAftermarket",
    default: "EVAftermarket — Fault Codes, Updates & Guides for Chinese EVs",
  },
  description:
    "Fault code lookup, software updates, and owner guides for BYD, MG, Haval and other Chinese EVs in Australia, UK, UAE and Norway.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    siteName: "EVAftermarket",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary",
    site: "@evaftermarket",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&family=JetBrains+Mono:wght@500;700&family=DM+Serif+Display:ital@0;1&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <JsonLd
          schema={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'EVAftermarket',
            url: BASE_URL,
            logo: `${BASE_URL}/logo.png`,
            sameAs: [],
            description: 'Fault codes, charging guides, and owner experiences for Chinese EVs in Australia and beyond.',
          }}
        />
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>© {new Date().getFullYear()} EVAftermarket</span>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/contact" className="footer-link">Contact</Link>
          </div>
        </footer>
        <Script
          defer
          data-domain="evaftermarket.io"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify dev server starts without error**

```bash
pnpm dev
```

Expected: compiles OK, no font-related errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: load DM Serif Display + Instrument Serif fonts"
```

---

## Task 2: Rewrite design tokens and shared CSS

**Files:**
- Modify: `app/globals.css`

This is the largest task. Replace the entire file with the new Editorial Clarity design system. The new system keeps all existing class names that are used elsewhere (`.dtc-card`, `.page-wrapper`, `.breadcrumb`, `.badge`, `.list-hero`, etc.) but reskins them with the warm editorial palette.

- [ ] **Step 1: Replace globals.css**

```css
@import "tailwindcss";

/* ── Fonts ─────────────────────────────────────── */
/* Loaded via <link> in app/layout.tsx */

/* ── Design tokens ─────────────────────────────── */
:root {
  /* Warm off-white palette */
  --bg:          #f7f5f0;
  --surface:     #ffffff;
  --border:      #e0dcd6;
  --border-soft: #ede9e3;

  --text-base:   #1a1a1a;
  --text-muted:  #666666;
  --text-faint:  #999999;

  /* Green (keep existing accent) */
  --green:       #166534;
  --green-light: #edfdf5;
  --green-text:  #166534;

  /* Severity colours */
  --red:         #dc2626;
  --red-bg:      #fff5f5;
  --red-border:  #fca5a5;
  --red-text:    #991b1b;

  --amber:       #d97706;
  --amber-bg:    #fffbeb;
  --amber-border:#fcd34d;
  --amber-text:  #78350f;

  --blue-bg:     #eff6ff;
  --blue-text:   #1e40af;

  /* Typography */
  --font-ui:    'Barlow', sans-serif;
  --font-cond:  'Barlow Condensed', sans-serif;
  --font-mono:  'JetBrains Mono', monospace;
  --font-serif: 'DM Serif Display', serif;
  --font-serif-body: 'Instrument Serif', serif;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-ui);
  background: var(--bg);
  color: var(--text-base);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ── Site header ────────────────────────────────── */
.site-header {
  background: var(--surface);
  border-bottom: 2px solid var(--text-base);
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.site-logo {
  font-family: var(--font-cond);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-base);
  text-decoration: none;
}
.site-logo .accent { color: var(--green); }

.market-badge {
  font-family: var(--font-cond);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  background: var(--green-light);
  color: var(--green-text);
  padding: 3px 10px;
  border-radius: 2px;
  border: 1px solid #bbf7d0;
}

/* ── Site footer ────────────────────────────────── */
.site-footer {
  border-top: 1px solid var(--border);
  margin-top: 64px;
  padding: 28px 0;
}
.site-footer-inner {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 12.5px;
  color: var(--text-faint);
}
.footer-link {
  color: var(--text-faint);
  text-decoration: none;
}
.footer-link:hover { color: var(--text-base); }

/* ── Page wrapper ───────────────────────────────── */
.page-wrapper {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 28px 80px;
}

/* ── Card (shared shell) ────────────────────────── */
.dtc-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

/* ── Breadcrumb ─────────────────────────────────── */
.breadcrumb {
  padding: 13px 28px;
  font-size: 11.5px;
  color: var(--text-faint);
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  align-items: center;
  gap: 6px;
}
.breadcrumb a { color: var(--text-muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--text-base); }
.breadcrumb .sep { color: #ccc; }

/* ── Severity badge ─────────────────────────────── */
.badge {
  font-family: var(--font-cond);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.badge-critical {
  background: #fee2e2;
  color: var(--red-text);
}
.badge-warning {
  background: #fef3c7;
  color: #92400e;
}
.badge-info {
  background: #dbeafe;
  color: var(--blue-text);
}

/* ── LIST PAGE ──────────────────────────────────── */
.list-hero {
  padding: 32px 28px 26px;
  border-bottom: 1px solid var(--border-soft);
}
.list-hero h1 {
  font-family: var(--font-serif-body);
  font-size: 28px;
  font-weight: 400;
  color: var(--text-base);
  margin-bottom: 8px;
  line-height: 1.25;
}
.list-hero p {
  font-size: 14px;
  color: var(--text-muted);
  max-width: 58ch;
  line-height: 1.6;
}

.list-stats {
  display: flex;
  gap: 28px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border-soft);
  flex-wrap: wrap;
}
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat-num {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 400;
  color: var(--text-base);
  line-height: 1;
}
.stat-num.red   { color: var(--red); }
.stat-num.amber { color: var(--amber); }
.stat-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.filter-bar {
  padding: 10px 28px;
  display: flex;
  gap: 6px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.chip {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 13px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}
.chip.active { background: var(--text-base); color: var(--surface); border-color: var(--text-base); }
.chip.red    { border-color: #fca5a5; color: var(--red-text); }
.chip.amber  { border-color: #fcd34d; color: #92400e; }
.chip.blue   { border-color: #93c5fd; color: var(--blue-text); }

.dtc-list { list-style: none; }
.dtc-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 13px 28px;
  border-bottom: 1px solid var(--border-soft);
  text-decoration: none;
  color: inherit;
  transition: background 0.1s;
}
.dtc-row:hover { background: #f0fdf4; }
.dtc-row:last-child { border-bottom: none; }

.dtc-row-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dtc-arrow {
  margin-left: auto;
  color: var(--green);
  font-size: 14px;
  padding-left: 8px;
}
.dtc-code-cell {
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-base);
  letter-spacing: 0.02em;
}
.dtc-desc-cell {
  font-size: 12.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 641px) {
  .dtc-row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 2px 0;
  }
  .dtc-row-top    { grid-column: 1; grid-row: 1; }
  .dtc-desc-cell  { grid-column: 1; grid-row: 2; padding-left: 2px; }
  .dtc-arrow      { grid-column: 2; grid-row: 1 / 3; align-self: center; }
}

/* ── DETAIL PAGE ────────────────────────────────── */
.safety-banner {
  background: var(--red-bg);
  border-bottom: 2px solid var(--red-border);
  padding: 14px 28px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.safety-icon {
  width: 22px;
  height: 22px;
  background: var(--red);
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 900;
  margin-top: 1px;
}
.safety-text strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--red-text);
  display: block;
  margin-bottom: 3px;
}
.safety-text p {
  font-size: 13px;
  color: #b91c1c;
  line-height: 1.5;
}

/* Hero */
.detail-hero {
  padding: 36px 28px 28px;
  border-bottom: 1px solid var(--border);
}
.code-row {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 12px;
}
.big-code {
  font-family: var(--font-serif);
  font-size: 64px;
  font-weight: 400;
  color: var(--text-base);
  letter-spacing: -0.01em;
  line-height: 1;
}
.detail-h1 {
  font-family: var(--font-serif-body);
  font-size: 22px;
  font-weight: 400;
  color: var(--text-base);
  line-height: 1.35;
  margin-bottom: 8px;
  max-width: 54ch;
}
.detail-system {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-system::before {
  content: '';
  width: 20px;
  height: 1px;
  background: var(--border);
  display: inline-block;
}

/* Meta stats row under hero */
.detail-meta-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 24px;
  padding-top: 22px;
  border-top: 1px solid var(--border-soft);
  flex-wrap: wrap;
}
.detail-meta-item { display: flex; flex-direction: column; gap: 3px; }
.detail-meta-n {
  font-family: var(--font-serif);
  font-size: 26px;
  color: var(--text-base);
  line-height: 1;
}
.detail-meta-l {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.detail-meta-div {
  width: 1px;
  height: 34px;
  background: var(--border-soft);
  flex-shrink: 0;
}

.detail-description {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detail-description p {
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--text-muted);
  max-width: 68ch;
  margin: 0;
}

/* Drive advisory box */
.drive-box {
  margin: 28px 28px 0;
  display: grid;
  grid-template-columns: 5px 1fr;
  border: 1px solid var(--amber-border);
  border-radius: 3px;
  overflow: hidden;
}
.drive-box-accent {
  background: var(--amber);
}
.drive-box-inner {
  padding: 14px 18px;
}
.drive-box-inner h2 {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b45309;
  margin-bottom: 5px;
}
.drive-box-inner p {
  font-size: 13.5px;
  color: var(--amber-text);
  line-height: 1.6;
}
.drive-box.critical {
  border-color: var(--red-border);
}
.drive-box.critical .drive-box-accent {
  background: var(--red);
}
.drive-box.critical .drive-box-inner h2 { color: var(--red-text); }
.drive-box.critical .drive-box-inner p  { color: #b91c1c; }

/* Body sections */
.detail-body { padding: 0 28px; }
.section {
  padding: 28px 0;
  border-bottom: 1px solid var(--border-soft);
}
.section:last-child { border-bottom: none; }
.section-label {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 400;
  color: var(--text-base);
  margin-bottom: 20px;
  display: block;
}

/* Causes — editorial numbered list */
.causes { list-style: none; display: flex; flex-direction: column; }
.cause-item {
  display: grid;
  grid-template-columns: 44px 1fr;
  padding: 13px 0;
  border-bottom: 1px solid var(--border-soft);
}
.cause-item:last-child { border-bottom: none; }
.cause-n {
  font-family: var(--font-serif);
  font-size: 22px;
  color: #d4c9b8;
  line-height: 1.2;
}
.cause-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-base);
  padding-top: 2px;
}

/* Actions */
.actions { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.action-item {
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: start;
}
.action-n {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--text-base);
  color: var(--surface);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.action-content { font-size: 13.5px; color: var(--text-base); line-height: 1.5; }
.action-title { font-weight: 600; color: var(--text-base); display: block; margin-bottom: 3px; }
.action-body {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
}

/* Cases */
.cases { display: flex; flex-direction: column; gap: 14px; }
.case-card {
  padding: 18px 20px;
  background: var(--surface);
  border-radius: 3px;
  border: 1px solid var(--border);
}
.case-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.case-source {
  font-family: var(--font-cond);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.case-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 2px;
  background: #fef3c7;
  color: #92400e;
}
.case-dot { color: #ddd; font-size: 10px; }
.case-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-base);
  margin-bottom: 5px;
}
.case-body {
  font-size: 13.5px;
  color: var(--text-muted);
  line-height: 1.65;
  margin-bottom: 10px;
}
.case-resolution {
  font-size: 13px;
  color: var(--green-text);
  font-weight: 600;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}
.case-resolution-icon {
  width: 18px;
  height: 18px;
  background: var(--green);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Related codes */
.related-section {
  padding: 22px 28px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.related-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
.related-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  text-decoration: none;
  font-size: 12px;
  transition: border-color 0.1s;
  cursor: pointer;
}
.related-chip:hover { border-color: var(--text-base); }
.related-chip code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-base);
}
.related-chip span {
  color: var(--text-muted);
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Disclaimer */
.disclaimer {
  padding: 15px 28px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-faint);
  display: flex;
  gap: 6px;
  line-height: 1.6;
}

.confidence-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 2px;
  background: var(--green-light);
  color: var(--green-text);
  border: 1px solid #bbf7d0;
  vertical-align: middle;
}

/* ── Climate note ───────────────────────────────── */
.climate-note {
  font-size: 13px;
  color: var(--blue-text);
  background: var(--blue-bg);
  border-radius: 3px;
  padding: 11px 14px;
  margin-top: 12px;
  line-height: 1.55;
}

/* ── MODEL PAGE ─────────────────────────────────── */
.model-hero {
  padding: 32px 28px 26px;
  border-bottom: 1px solid var(--border);
}
.model-hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.model-h1 {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 400;
  color: var(--text-base);
  line-height: 1.1;
  margin-bottom: 8px;
}
.model-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.model-type-badge {
  font-family: var(--font-cond);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--green-light);
  color: var(--green-text);
  padding: 3px 8px;
  border-radius: 2px;
  border: 1px solid #bbf7d0;
}
.model-years {
  font-size: 13px;
  color: var(--text-muted);
}
.model-section-head {
  padding: 11px 28px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-soft);
}
.model-empty {
  padding: 24px 28px;
  font-size: 13px;
  color: var(--text-faint);
}
.model-dtc-row {
  padding: 16px 28px;
  border-bottom: 1px solid var(--border-soft);
  list-style: none;
}
.model-dtc-row:last-child { border-bottom: none; }
.model-dtc-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.model-dtc-code {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-base);
  text-decoration: none;
  letter-spacing: 0.02em;
}
.model-dtc-code:hover { color: var(--green); }
.model-conf-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 2px;
  background: var(--green-light);
  color: var(--green-text);
  border: 1px solid #bbf7d0;
}
.model-dtc-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 8px;
  max-width: 68ch;
}
.model-detail-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 4px;
}
.model-detail-label {
  font-family: var(--font-cond);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
  white-space: nowrap;
  padding-top: 1px;
  min-width: 48px;
}
.model-inline-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.model-inline-list li {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.45;
  padding-left: 10px;
  position: relative;
}
.model-inline-list li::before {
  content: '–';
  position: absolute;
  left: 0;
  color: var(--border);
}
.model-more {
  font-size: 11.5px;
  color: var(--green);
  font-weight: 600;
}
.model-more::before { content: none !important; }

/* Updates */
.model-updates-list { list-style: none; }
.model-update-row {
  padding: 14px 28px;
  border-bottom: 1px solid var(--border-soft);
}
.model-update-row:last-child { border-bottom: none; }
.model-update-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}
.model-update-version {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-base);
}
.model-method-tag {
  font-family: var(--font-cond);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 2px;
  background: var(--blue-bg);
  color: var(--blue-text);
}
.model-update-date {
  font-size: 12px;
  color: var(--text-faint);
  margin-left: auto;
}
.model-update-log {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
  max-width: 68ch;
}

/* ── RESPONSIVE ─────────────────────────────────── */
@media (max-width: 640px) {
  .site-header { padding: 0 16px; }
  .page-wrapper { padding: 0 0 48px; }
  .dtc-card { border-radius: 0; border-left: none; border-right: none; }

  .breadcrumb,
  .list-hero,
  .filter-bar,
  .detail-hero,
  .detail-body { padding-left: 16px; padding-right: 16px; }

  .list-hero h1 { font-size: 22px; }
  .list-hero p  { font-size: 13px; }
  .filter-bar { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 10px; }
  .chip { white-space: nowrap; flex-shrink: 0; }
  .dtc-row { padding: 12px 16px; }
  .dtc-desc-cell { white-space: normal; }

  .safety-banner { padding: 12px 16px; }

  .detail-hero { padding: 24px 16px 20px; }
  .big-code { font-size: 44px; }
  .detail-h1 { font-size: 18px; }
  .detail-meta-row { gap: 16px; }

  .drive-box { margin: 20px 16px 0; }

  .related-section { padding: 18px 16px; }
  .related-chip { flex: 1 1 calc(50% - 4px); min-width: 0; }
  .related-chip span { max-width: none; }

  .disclaimer { padding: 12px 16px; flex-direction: column; gap: 4px; }

  .model-hero { padding: 20px 16px 18px; }
  .model-h1 { font-size: 26px; }
  .model-section-head { padding: 10px 16px; }
  .model-empty { padding: 20px 16px; }
  .model-dtc-row { padding: 14px 16px; }
  .model-update-row { padding: 12px 16px; }
  .model-update-date { margin-left: 0; }
  .model-dtc-desc { max-width: none; }
  .model-update-log { max-width: none; }
}

@media (max-width: 390px) {
  .big-code { font-size: 36px; }
  .list-stats { gap: 16px; }
  .stat-num { font-size: 20px; }
  .related-chip { flex: 1 1 100%; }
}
```

- [ ] **Step 2: Check dev server visually**

Open http://localhost:3000/au — confirm warm background, new font in hero heading, dark header border.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: redesign tokens and shared CSS to Editorial Clarity"
```

---

## Task 3: Restyle RealWorldCases component

The existing component uses `.case-card`, `.case-meta`, `.case-source`, `.case-body`, `.case-resolution` — these are now restyled in globals.css. But the resolution currently uses a `::before` pseudo-element trick. We need to switch it to the new icon pattern.

**Files:**
- Modify: `components/RealWorldCases.tsx`

- [ ] **Step 1: Update RealWorldCases**

```tsx
import type { Case } from '@/lib/types'

interface Props {
  cases: Case[]
}

export function RealWorldCases({ cases }: Props) {
  if (cases.length === 0) return null

  return (
    <div className="section">
      <span className="section-label">Real-World Cases</span>
      <div className="cases">
        {cases.map((c) => (
          <div key={c.case_id} className="case-card">
            <div className="case-meta">
              <span className="case-source">{c.source_name}</span>
              {c.location && (
                <>
                  <span className="case-dot">·</span>
                  <span className="case-source">{c.location}</span>
                </>
              )}
              {c.report_date && (
                <>
                  <span className="case-dot">·</span>
                  <span className="case-source">{c.report_date}</span>
                </>
              )}
              {c.source_language === 'zh' && (
                <span className="case-tag">From Chinese market (translated)</span>
              )}
            </div>
            {c.symptom_summary && (
              <p className="case-body">{c.symptom_summary}</p>
            )}
            {c.resolution && (
              <div className="case-resolution">
                <div className="case-resolution-icon">✓</div>
                <span>{c.resolution}</span>
              </div>
            )}
            {c.cost_info && (
              <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '6px' }}>
                Cost: {c.cost_info}
              </p>
            )}
            {c.source_url && (
              <a
                href={c.source_url}
                style={{ fontSize: '11px', color: 'var(--green)', display: 'block', marginTop: '8px' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Original source ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/RealWorldCases.tsx
git commit -m "feat: restyle RealWorldCases to editorial card layout"
```

---

## Task 4: Restyle DisclaimerBox component

**Files:**
- Modify: `components/DisclaimerBox.tsx`

No structural changes needed — the existing `.disclaimer` and `.confidence-pill` classes are restyled in globals.css. Just verify it renders correctly.

- [ ] **Step 1: Verify in browser**

Open any DTC detail page, e.g. http://localhost:3000/au/dtc/byd-atto-3/b110a — confirm disclaimer bar shows warm background, green confidence pill.

- [ ] **Step 2: Commit (only if any changes made)**

```bash
git add components/DisclaimerBox.tsx
git commit -m "feat: disclaimer box picks up new design tokens"
```

---

## Task 5: Redesign DTC detail page hero + structure

The detail page currently renders the drive advisory with a simple `<div className="drive-box">`. We need to update it to use the new two-column accent-stripe structure. Also update the `.section-label` usage and the causes/actions lists.

**Files:**
- Modify: `app/[market]/dtc/[model]/[code]/page.tsx`

- [ ] **Step 1: Replace the JSX return in DtcCodePage**

Replace the entire `return (...)` block (lines 176–323) with:

```tsx
  return (
    <>
      <JsonLd schema={faqSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <div className="page-wrapper">
        <article className="dtc-card">

          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <a href={`/${market}`}>{market.toUpperCase()}</a>
            <span className="sep">›</span>
            <a href={`/${market}/dtc/${model}`}>{modelData.model_name} Fault Codes</a>
            <span className="sep">›</span>
            <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>{dtcCode}</span>
          </nav>

          {/* Safety banner (Critical only) */}
          {isCritical && dtc.safety_warning && (
            <div className="safety-banner">
              <div className="safety-icon">!</div>
              <div className="safety-text">
                <strong>Safety Warning</strong>
                <p>{dtc.safety_warning}</p>
              </div>
            </div>
          )}

          {/* Hero */}
          <div className="detail-hero">
            <div className="code-row">
              <span className="big-code">{dtcCode}</span>
              {dtc.severity && <SeverityBadge severity={dtc.severity as Severity} />}
            </div>
            <h1 className="detail-h1">
              {dtc.description_en
                ? `${dtc.description_en.split(/[.。]/)[0]} — ${modelData.model_name}`
                : `${modelData.model_name} ${dtcCode}`}
            </h1>
            {dtc.related_system && (
              <div className="detail-system">{dtc.related_system}</div>
            )}
            {dtc.description_en && (
              <div className="detail-description">
                {dtc.description_en.split(/(?<=\.)\s+(?=[A-Z])/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            {/* Meta stats */}
            {(casesRaw.length > 0 || parsedCauses.length > 0) && (
              <div className="detail-meta-row">
                {casesRaw.length > 0 && (
                  <>
                    <div className="detail-meta-item">
                      <div className="detail-meta-n">{casesRaw.length}</div>
                      <div className="detail-meta-l">Cases Logged</div>
                    </div>
                    <div className="detail-meta-div" />
                  </>
                )}
                {parsedCauses.length > 0 && (
                  <div className="detail-meta-item">
                    <div className="detail-meta-n">{parsedCauses.length}</div>
                    <div className="detail-meta-l">Causes</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drive advisory (Warning or Critical) */}
          {(isCritical || isWarning) && (
            <div className={`drive-box${isCritical ? ' critical' : ''}`} style={{ margin: '28px 28px 0' }}>
              <div className="drive-box-accent" />
              <div className="drive-box-inner">
                <h2>Can I still drive?</h2>
                {isCritical ? (
                  <p>
                    The vehicle has a critical fault that may affect safety. Avoid driving until this is
                    repaired. Book a dealer appointment today.
                  </p>
                ) : (
                  <p>
                    In most cases, yes — but schedule a service appointment soon. Monitor the warning
                    closely. If additional symptoms appear (loss of power, unusual noises), pull over safely
                    and contact your dealer.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Body sections */}
          <div className="detail-body" style={{ paddingTop: '4px' }}>

            {/* Likely Causes */}
            {parsedCauses.length > 0 && (
              <div className="section">
                <span className="section-label">Likely Causes — {modelData.model_name}</span>
                <ul className="causes">
                  {parsedCauses.map((cause, i) => (
                    <li key={i} className="cause-item">
                      <span className="cause-n">{i + 1}</span>
                      <span className="cause-text">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What To Do */}
            {parsedActions.length > 0 && (
              <div className="section">
                <span className="section-label">What To Do</span>
                <ul className="actions">
                  {parsedActions.map((action, i) => (
                    <li key={i} className="action-item">
                      <div className="action-n">{i + 1}</div>
                      <div className="action-content">
                        <span className="action-title">{action.title}</span>
                        {action.body && (
                          <span className="action-body">{action.body}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Climate notes */}
            {note?.climate_notes && (
              <div className="section">
                <span className="section-label">Climate &amp; Environment Notes</span>
                <p className="climate-note">{note.climate_notes}</p>
              </div>
            )}

            {/* Real-world cases */}
            {casesRaw.length > 0 && (
              <RealWorldCases cases={casesRaw as unknown as Case[]} />
            )}

          </div>

          {/* Related codes */}
          {relatedDtcs.length > 0 && (
            <div className="related-section">
              <span className="section-label" style={{ fontSize: '13px', fontFamily: 'var(--font-cond)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                Other {modelData.model_name} Fault Codes
              </span>
              <div className="related-grid">
                {relatedDtcs.map((related) => (
                  <a
                    key={related.dtc_id}
                    href={`/${market}/dtc/${model}/${related.dtc_code?.toLowerCase()}`}
                    className="related-chip"
                  >
                    <code>{related.dtc_code}</code>
                    <span>{related.description_en}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <DisclaimerBox
            confidence={(note?.data_confidence ?? 'community') as DataConfidence}
            sourceUrls={parsedSourceUrls}
          />
        </article>
      </div>
    </>
  )
```

- [ ] **Step 2: Check detail page in browser**

Open http://localhost:3000/au/dtc/byd-atto-3/b110a — confirm:
- Large serif code (B110A)
- Italic serif h1
- Drive advisory with amber left stripe
- Causes using serif numerals
- Actions with dark circle numbers

- [ ] **Step 3: Commit**

```bash
git add app/[market]/dtc/[model]/[code]/page.tsx
git commit -m "feat: redesign DTC detail page to editorial layout"
```

---

## Task 6: Redesign Buying Guide page + Calculator

**Files:**
- Modify: `app/[market]/buying-guide/page.tsx`
- Modify: `components/BuyingGuideCalculator.tsx`

- [ ] **Step 1: Rewrite buying-guide page.tsx**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { BuyingGuideCalculator } from '@/components/BuyingGuideCalculator'

export const metadata: Metadata = {
  title: 'EV Buying Guide Australia — Stamp Duty, Drive-Away Price & Novated Lease Calculator',
  description:
    'Calculate the true drive-away price for BYD, MG, GWM Ora and other Chinese EVs in Australia. Includes stamp duty by state, Rego estimate, and Novated Lease FBT tax saving calculator.',
  alternates: { canonical: `${BASE_URL}/au/buying-guide` },
}

export default async function BuyingGuidePage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params

  return (
    <main className="page-wrapper">
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'EV Buying Guide Australia',
          description: metadata.description as string,
          url: `${BASE_URL}/au/buying-guide`,
        }}
      />
      <div className="dtc-card">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href={`/${market}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Australia
          </Link>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>Buying Guide</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '36px 28px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--text-base)',
            lineHeight: 1.2,
            marginBottom: '10px',
          }}>
            EV Buying Guide<br />
            <em style={{ color: 'var(--text-muted)', fontSize: '26px' }}>Australia</em>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '54ch', lineHeight: 1.7 }}>
            Calculate the true drive-away price for Chinese EVs in Australia, including stamp duty by
            state and registration fees. Or model your Novated Lease tax savings based on your salary.
          </p>
        </div>

        <BuyingGuideCalculator />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Rewrite BuyingGuideCalculator.tsx**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { getBrands, getVehiclesByBrand } from '@/lib/buying-guide/vehicles'
import { STATE_LABELS, type State } from '@/lib/buying-guide/tax-rates'
import { calcDriveAway, calcNovatedLease } from '@/lib/buying-guide/calculations'

const STATES = Object.keys(STATE_LABELS) as State[]

function fmt(n: number) {
  return 'A$' + Math.round(n).toLocaleString('en-AU')
}
function pct(r: number) {
  return (r * 100).toFixed(1) + '%'
}

const stepHead: React.CSSProperties = {
  padding: '11px 28px',
  background: 'var(--bg)',
  borderTop: '1px solid var(--border-soft)',
  borderBottom: '1px solid var(--border-soft)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  fontFamily: 'var(--font-cond)',
}

const stepBody: React.CSSProperties = {
  padding: '22px 28px',
}

const label: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  display: 'block',
  marginBottom: '6px',
  fontFamily: 'var(--font-cond)',
}

const selectStyle: React.CSSProperties = {
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  fontSize: '14px',
  color: 'var(--text-base)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-ui)',
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  fontSize: '14px',
  color: 'var(--text-base)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-mono)',
  width: '148px',
}

export function BuyingGuideCalculator() {
  const brands = getBrands()
  const [brand, setBrand] = useState(brands[0])
  const [variantIdx, setVariantIdx] = useState(0)
  const [state, setState] = useState<State>('NSW')
  const [mode, setMode] = useState<'driveaway' | 'novated'>('driveaway')
  const [salary, setSalary] = useState(90000)
  const [leaseTerm, setLeaseTerm] = useState<3 | 5>(5)

  const vehicles = getVehiclesByBrand(brand)
  const vehicle = vehicles[variantIdx] ?? vehicles[0]

  const driveAway = useMemo(
    () => calcDriveAway(vehicle.msrp, state, vehicle.eligible_fbt),
    [vehicle, state]
  )
  const novated = useMemo(
    () => calcNovatedLease(vehicle.msrp, salary, leaseTerm, vehicle.eligible_fbt),
    [vehicle, salary, leaseTerm]
  )

  return (
    <div>
      {/* Step 1 */}
      <div style={stepHead}>1 — Select Vehicle</div>
      <div style={{ ...stepBody, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={label}>Brand</label>
            <select
              value={brand}
              onChange={e => { setBrand(e.target.value); setVariantIdx(0) }}
              style={selectStyle}
            >
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Model / Variant</label>
            <select
              value={variantIdx}
              onChange={e => setVariantIdx(Number(e.target.value))}
              style={{ ...selectStyle, minWidth: '220px' }}
            >
              {vehicles.map((v, i) => (
                <option key={i} value={i}>{v.model} — {v.variant}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          MSRP:{' '}
          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-base)' }}>
            {fmt(vehicle.msrp)}
          </strong>
          <span style={{ marginLeft: '6px', fontSize: '12px' }}>(incl. GST, excl. on-road costs)</span>
          {!vehicle.eligible_fbt && (
            <span style={{ marginLeft: '10px', color: 'var(--amber)', fontSize: '12px' }}>
              ⚠ PHEV — not FBT exempt
            </span>
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div style={stepHead}>2 — Select State / Territory</div>
      <div style={{ ...stepBody, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={label}>State / Territory</label>
          <select
            value={state}
            onChange={e => setState(e.target.value as State)}
            style={selectStyle}
          >
            {STATES.map(s => <option key={s} value={s}>{s} — {STATE_LABELS[s]}</option>)}
          </select>
        </div>
        <div style={{ fontSize: '13px' }}>
          {driveAway.stamp_duty_exempt ? (
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              ✓ {STATE_LABELS[state]} — stamp duty exempt for EVs
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              {STATE_LABELS[state]} stamp duty approx.:{' '}
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-base)' }}>
                {fmt(driveAway.stamp_duty)}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Step 3 — Mode tabs */}
      <div style={stepHead}>3 — Calculation Mode</div>
      <div style={{ padding: '0 28px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['driveaway', 'novated'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: mode === m ? 700 : 500,
                border: 'none',
                borderBottom: mode === m ? '2px solid var(--text-base)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                color: mode === m ? 'var(--text-base)' : 'var(--text-faint)',
                marginBottom: '-1px',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {m === 'driveaway' ? 'Drive-Away Price' : 'Novated Lease Saving'}
            </button>
          ))}
        </div>
      </div>

      {/* Mode A: Drive-Away */}
      {mode === 'driveaway' && (
        <div style={stepBody}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Vehicle MSRP', fmt(driveAway.msrp)],
                [
                  'Stamp Duty',
                  driveAway.stamp_duty_exempt
                    ? `${fmt(0)} (${STATE_LABELS[state]} exempt)`
                    : fmt(driveAway.stamp_duty),
                ],
                ['Registration (est.)', `${fmt(driveAway.rego_min)} – ${fmt(driveAway.rego_max)}`],
                ['Dealer Delivery (est.)', `${fmt(driveAway.dealer_delivery_min)} – ${fmt(driveAway.dealer_delivery_max)}`],
              ].map(([lbl, value]) => (
                <tr key={lbl} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>{lbl}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-base)' }}>{value}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 0 8px', fontWeight: 700, fontSize: '14.5px' }}>Drive-Away Total</td>
                <td style={{ padding: '16px 0 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '20px', color: 'var(--text-base)' }}>
                  {fmt(driveAway.total_min)} – {fmt(driveAway.total_max)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.6 }}>
            ⚠ Stamp duty rates and EV exemption policies may change. Data based on 2025 public information — verify with your state&apos;s revenue office before purchasing.
          </p>
        </div>
      )}

      {/* Mode B: Novated Lease */}
      {mode === 'novated' && (
        <div style={stepBody}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '22px' }}>
            <div>
              <label style={label}>Annual Salary (AUD, pre-tax)</label>
              <input
                type="number"
                min={18200}
                max={500000}
                step={1000}
                value={salary}
                onChange={e => setSalary(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={label}>Lease Term</label>
              <div style={{ display: 'flex' }}>
                {([3, 5] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setLeaseTerm(t)}
                    style={{
                      padding: '9px 18px',
                      border: '1px solid var(--border)',
                      borderRadius: t === 3 ? '3px 0 0 3px' : '0 3px 3px 0',
                      borderLeft: t === 5 ? 'none' : undefined,
                      fontSize: '13px',
                      fontWeight: 600,
                      background: leaseTerm === t ? 'var(--text-base)' : 'transparent',
                      color: leaseTerm === t ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {t} yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!vehicle.eligible_fbt ? (
            <div style={{
              padding: '14px 16px',
              background: 'var(--amber-bg)',
              borderLeft: '4px solid var(--amber)',
              borderRadius: '0 3px 3px 0',
              fontSize: '13px',
              color: 'var(--amber-text)',
              lineHeight: 1.6,
            }}>
              ⚠ This vehicle (PHEV) lost FBT exemption from 1 April 2025. Novated Lease tax savings
              are significantly reduced — consider purchasing outright.
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Annual lease cost (est.)', `${fmt(novated.annual_lease_cost)} / yr`],
                    ['Pre-tax salary deduction', `${fmt(novated.pre_tax_deduction)} / yr (100% pre-tax — FBT exempt)`],
                    ['Marginal tax rate', pct(novated.marginal_rate)],
                    ['Annual income tax saving', `${fmt(novated.annual_tax_saving)} / yr`],
                    ['Monthly out-of-pocket', `${fmt(novated.monthly_out_of_pocket)} / mo`],
                  ].map(([lbl, value]) => (
                    <tr key={lbl} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>{lbl}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-base)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{
                marginTop: '16px',
                padding: '13px 15px',
                background: 'var(--bg)',
                borderRadius: '3px',
                border: '1px solid var(--border-soft)',
                fontSize: '12px',
                color: 'var(--text-faint)',
                lineHeight: 1.65,
              }}>
                ⚠ <strong style={{ color: 'var(--text-muted)' }}>RFBA notice:</strong> This benefit will be
                recorded as a Reportable Fringe Benefits Amount (RFBA) on your income statement, which may
                affect Medicare Levy Surcharge, HECS/HELP repayments, and government benefit
                eligibility.<br />
                Novated Lease figures are estimates only. Actual savings depend on your employer&apos;s plan
                and individual tax circumstances — consult a licensed financial adviser.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Check buying guide in browser**

Open http://localhost:3000/au/buying-guide — confirm serif heading, step headers use condensed caps, table rows clean with mono values, mode tabs use underline style.

- [ ] **Step 4: Commit**

```bash
git add app/[market]/buying-guide/page.tsx components/BuyingGuideCalculator.tsx
git commit -m "feat: redesign buying guide page and calculator to editorial layout"
```

---

## Task 7: Mobile QA pass

- [ ] **Step 1: Test on mobile viewport**

In Chrome DevTools, switch to iPhone 14 Pro (390px). Check each page:
- `/au` — model list
- `/au/dtc/byd-atto-3/b110a` — DTC detail
- `/au/buying-guide` — calculator

Verify no horizontal overflow, font sizes legible, drive advisory box renders correctly, table values don't overflow.

- [ ] **Step 2: Fix any regressions**

If any `.dtc-card` has `border-radius` on mobile but is full-width it looks wrong — globals.css already sets `border-radius: 0; border-left: none; border-right: none` at ≤640px, so this should be fine.

- [ ] **Step 3: Commit any fixes**

```bash
git add -p
git commit -m "fix: mobile layout adjustments after editorial redesign"
```

---

## Self-Review

**Spec coverage:**
- ✅ New fonts (DM Serif Display + Instrument Serif) loaded in layout — Task 1
- ✅ Warm off-white palette (`#f7f5f0`) — Task 2 tokens
- ✅ Serif numerals in causes list — Task 5
- ✅ Meta stats row (cases count, causes count) in DTC hero — Task 5
- ✅ Drive advisory with left accent stripe — Task 5
- ✅ Editorial buying guide layout with step headers — Task 6
- ✅ Full mobile responsiveness — Task 7
- ✅ Footer restyled — Task 1 (new `.site-footer` classes in globals.css Task 2)

**Placeholder scan:** No TBDs, all code blocks complete.

**Type consistency:** `ActionStep`, `Case`, `Severity`, `DataConfidence` — all imported from `@/lib/types`, unchanged throughout. `calcDriveAway` / `calcNovatedLease` signatures unchanged.
