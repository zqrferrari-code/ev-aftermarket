import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllModelsWithBrand } from '@/lib/db/models'
import { getDTCNoteCount } from '@/lib/db/dtcs'
import { getProblemCasesCount } from '@/lib/db/cases'
import { BASE_URL } from '@/lib/config'
import { getActiveMarketCodes } from '@/lib/db/static-params'



export async function generateStaticParams() {
  const codes = await getActiveMarketCodes()
  return codes.map((market) => ({ market }))
}

interface Props {
  params: Promise<{ market: string }>
}

const MARKET_LABELS: Record<string, string> = {
  au: 'Australia',
  uk: 'United Kingdom',
  uae: 'UAE',
  no: 'Norway',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params
  const label = MARKET_LABELS[market] ?? market.toUpperCase()
  const title = `Chinese EV Fault Codes, Problems & Guides — ${label}`
  const description = `Fault code lookup, software updates, common problems, and service guides for BYD, MG and other Chinese EVs in ${label}.`
  const url = `${BASE_URL}/${market}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'EVAftermarket',
      locale: 'en_AU',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function MarketHomePage({ params }: Props) {
  const { market } = await params
  const label = MARKET_LABELS[market] ?? market.toUpperCase()

  const [models, dtcCount, casesCount] = await Promise.all([
    getAllModelsWithBrand(),
    getDTCNoteCount(),
    getProblemCasesCount(),
  ])

  // Group by brand
  const brands: Record<string, typeof models> = {}
  for (const m of models) {
    const b = m.brand_name_en ?? 'Other'
    if (!brands[b]) brands[b] = []
    brands[b].push(m)
  }

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Hero */}
        <div className="list-hero">
          <h1>Chinese EV Resource — {label}</h1>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '56ch' }}>
            Fault code lookup, owner problem reports, software updates, charging guides and service costs for BYD, MG and other Chinese EVs.
          </p>
          <div className="list-stats">
            <div className="stat">
              <span className="stat-num">{models.length}</span>
              <span className="stat-label">Models</span>
            </div>
            <div className="stat">
              <span className="stat-num">{dtcCount.toLocaleString()}</span>
              <span className="stat-label">Fault Codes</span>
            </div>
            <div className="stat">
              <span className="stat-num">{casesCount}</span>
              <span className="stat-label">Owner Reports</span>
            </div>
          </div>
        </div>

        {/* Model list grouped by brand */}
        {Object.entries(brands).map(([brandName, brandModels]) => (
          <div key={brandName}>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">{brandName}</span>
            </div>

            <ul className="dtc-list">
              {brandModels.map((m) => (
                <li key={m.model_id}>
                  <a href={`/${market}/models/${m.slug}`} className="dtc-row">
                    <div className="dtc-row-top">
                      <span className="dtc-code-cell" style={{ fontFamily: 'inherit', fontSize: '14px', fontWeight: 600 }}>
                        {m.model_name}
                      </span>
                      {m.vehicle_type && (
                        <span style={{
                          fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          background: 'oklch(93% 0.06 145)', color: 'var(--green-text)',
                          padding: '2px 7px', borderRadius: '3px',
                        }}>{m.vehicle_type}</span>
                      )}
                      <span className="dtc-arrow">›</span>
                    </div>
                    <span className="dtc-desc-cell">
                      {m.years ?? ''}
                      {m.years ? ' · ' : ''}
                      Fault codes, problems, charging &amp; service guide
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Quick links */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Find a Dealer</span>
        </div>

        <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {market === 'au' && (
            <>
              {(['byd', 'mg'] as const).map((brand) => (
                ['nsw', 'vic', 'qld', 'wa', 'sa'].map((state) => (
                  <a
                    key={`${brand}-${state}`}
                    href={`/${market}/dealers/${brand}/${state}`}
                    style={{
                      padding: '7px 12px',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-cond)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      color: 'oklch(36% 0.01 60)',
                      background: 'oklch(99% 0 0)',
                    }}
                  >
                    {brand.toUpperCase()} {state.toUpperCase()}
                  </a>
                ))
              ))}
              <Link
                href="/au/buying-guide"
                style={{
                  display: 'inline-block',
                  padding: '7px 12px',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-cond)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'oklch(36% 0.01 60)',
                  textDecoration: 'none',
                }}
              >
                Buying Guide & Tax Calculator
              </Link>
            </>
          )}
        </div>

      </article>
    </div>
  )
}
