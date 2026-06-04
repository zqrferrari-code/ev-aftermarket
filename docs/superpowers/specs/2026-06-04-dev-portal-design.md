# Dev Portal Page Design

**Goal:** A static `/dev` page listing all application routes for fast local development navigation.

**Audience:** Developers only. Not linked from production, not indexed by SEO.

---

## Architecture

- **Route:** `app/dev/page.tsx` — new file, no changes to existing routes
- **Data:** Fully static — all links are hardcoded strings, no database queries
- **Styling:** Uses existing Editorial Clarity design system (`globals.css` tokens and classes)
- **Layout:** `page-wrapper` + `dtc-card`, 2-column grid of feature group cards

## Page Structure

### Header strip
Dark bar (`background: #1a1a1a`) with site name + green **DEV** badge. Signals non-production environment.

### Title block
"Dev Portal" heading + subtitle "All routes for local development. Not linked in production."

### Feature group cards (2-column grid)
Eight cards, one per feature area. Each card has:
- A section header (icon + uppercase label)
- 1–2 representative links (monospace, green)
- A faint note: "mg-mg4, byd-dolphin 等同理"

| Group | Representative links |
|---|---|
| 🔧 DTC Fault Codes | `/au/dtc/byd-atto-3`, `/au/dtc/byd-atto-3/b110a` |
| 📋 Models | `/au`, `/au/models/byd-atto-3` |
| ⚡ Charging | `/au/charging/byd-atto-3` |
| 🔩 Service | `/au/service/byd-atto-3` |
| ⚠️ Problems | `/au/problems`, `/au/problems/byd-atto-3` |
| 🔄 Updates | `/au/updates/byd-atto-3` |
| 🏪 Dealers | `/au/dealers/byd/nsw` |
| 📄 Static Pages | `/au/buying-guide`, `/contact`, `/privacy` |

All links use Next.js `<Link>` for client-side navigation.

## What This Is NOT

- No authentication or access control (dev-only tool)
- No dynamic data from database
- No SEO metadata (`noindex` robots tag to be safe)
- No tests needed (static page with hardcoded links)
