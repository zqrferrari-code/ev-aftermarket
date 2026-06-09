import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWarningLightsForBrand } from '@/lib/db/warning-lights'
import { getWarningLightBrands, getActiveMarketCodes } from '@/lib/db/static-params'
import { getAllModelsWithBrand } from '@/lib/db/models'
import { SeverityBadge } from '@/components/SeverityBadge'
import { BASE_URL } from '@/lib/config'
import type { Severity, WarningLight } from '@/lib/types'

export const revalidate = 1800
export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, brands] = await Promise.all([
    getActiveMarketCodes(),
    getWarningLightBrands(),
  ])
  return markets.flatMap((market) => brands.map((brand) => ({ market, brand })))
}

interface Props {
  params: Promise<{ market: string; brand: string }>
}

const BRAND_LABELS: Record<string, string> = {
  byd: 'BYD',
  mg: 'MG',
}

const MARKET_LABELS: Record<string, string> = {
  au: 'Australia',
  uk: 'United Kingdom',
  uae: 'UAE',
  no: 'Norway',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand } = await params
  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()
  const marketLabel = MARKET_LABELS[market] ?? market.toUpperCase()
  const title = `${brandLabel} Warning Lights — What They Mean | EVAftermarket ${marketLabel}`
  const description = `Complete guide to ${brandLabel} dashboard warning lights for ${marketLabel} owners. Warning lights explained with severity, causes, and what to do.`
  const url = `${BASE_URL}/${market}/warnings/${brand}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

function groupByCategory(lights: WarningLight[]): Record<string, WarningLight[]> {
  const groups: Record<string, WarningLight[]> = {}
  for (const l of lights) {
    if (!groups[l.category]) groups[l.category] = []
    groups[l.category].push(l)
  }
  return groups
}

export default async function WarningLightsBrandPage({ params }: Props) {
  const { market, brand } = await params
  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()

  const [lights, allModels] = await Promise.all([
    getWarningLightsForBrand(brand),
    getAllModelsWithBrand(),
  ])

  if (lights.length === 0) notFound()

  const brandModels = allModels.filter((m) => m.brand_id === brand)
  const groups = groupByCategory(lights)
  const criticalCount = lights.filter((l) => l.severity === 'CRITICAL').length
  const warningCount = lights.filter((l) => l.severity === 'WARNING').length

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>{brandLabel} Warning Lights</span>
        </nav>

        {/* Hero */}
        <div className="list-hero">
          <h1>{brandLabel} Warning Lights — {MARKET_LABELS[market] ?? market.toUpperCase()}</h1>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '56ch' }}>
            Dashboard warning light meanings, severity, and what to do for {brandLabel} vehicles.
          </p>
          <div className="list-stats">
            <div className="stat">
              <span className="stat-num">{lights.length}</span>
              <span className="stat-label">Warning Lights</span>
            </div>
            {criticalCount > 0 && (
              <div className="stat">
                <span className="stat-num red">{criticalCount}</span>
                <span className="stat-label">Critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="stat">
                <span className="stat-num amber">{warningCount}</span>
                <span className="stat-label">Warning</span>
              </div>
            )}
          </div>
        </div>

        {/* Lights grouped by category */}
        {Object.entries(groups).map(([category, categoryLights]) => (
          <div key={category}>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">{category}</span>
            </div>
            <ul className="dtc-list">
              {categoryLights.map((light) => (
                <li key={light.id}>
                  <a
                    href={light.model_id
                      ? `/${market}/warnings/${brand}/${light.model_id}`
                      : `#${light.id}`}
                    className="dtc-row"
                    style={{ cursor: light.model_id ? 'pointer' : 'default', textDecoration: 'none' }}
                  >
                    <div className="dtc-row-top">
                      <span className="dtc-code-cell" style={{ fontFamily: 'inherit', fontSize: '14px', fontWeight: 600 }}>
                        {light.name_en}
                      </span>
                      {light.severity && <SeverityBadge severity={light.severity as Severity} />}
                      {light.model_id && <span className="dtc-arrow">›</span>}
                    </div>
                    <span className="dtc-desc-cell">
                      {light.name_cn && <span style={{ color: 'var(--text-faint)', marginRight: '8px' }}>{light.name_cn}</span>}
                      {light.description_en?.split('.')[0]}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Browse by Model */}
        {brandModels.length > 0 && (
          <>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">Browse by Model</span>
            </div>
            <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {brandModels.map((m) => (
                <a
                  key={m.model_id}
                  href={`/${market}/warnings/${brand}/${m.slug}`}
                  style={{
                    padding: '7px 12px',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-cond)',
                    letterSpacing: '0.06em',
                    textDecoration: 'none',
                    color: 'oklch(36% 0.01 60)',
                    background: 'oklch(99% 0 0)',
                  }}
                >
                  {m.model_name}
                </a>
              ))}
            </div>
          </>
        )}

      </article>
    </div>
  )
}
