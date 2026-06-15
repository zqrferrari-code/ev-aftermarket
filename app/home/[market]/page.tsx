import type { Metadata } from 'next'
import { getAllModelsWithBrand } from '@/lib/db/models'
import { getDTCNoteCount } from '@/lib/db/dtcs'
import { getProblemCasesCount } from '@/lib/db/cases'
import { getPartsForHome } from '@/lib/db/parts'
import { BASE_URL } from '@/lib/config'
import FeatureGrid from '@/components/home/FeatureGrid'

export async function generateStaticParams() {
  return [{ market: 'au' }]
}

interface Props {
  params: Promise<{ market: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params
  const title = 'Chinese EV Fault Codes, Problems & Parts — Australia'
  const description =
    'Fault code lookup, owner problem reports, import duty for parts, charging guides and service costs for BYD, MG and other Chinese EVs in Australia.'
  const url = `${BASE_URL}/home/au`
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
    twitter: { card: 'summary', title, description },
  }
}

export default async function HomeMarketPage({ params }: Props) {
  const { market } = await params

  const [models, dtcCount, casesCount, parts] = await Promise.all([
    getAllModelsWithBrand(),
    getDTCNoteCount(),
    getProblemCasesCount(),
    getPartsForHome(),
  ])

  // 按品牌分组
  const brandGroups: Record<string, typeof models> = {}
  for (const m of models) {
    const brand = m.brand_name_en ?? 'Other'
    if (!brandGroups[brand]) brandGroups[brand] = []
    brandGroups[brand].push(m)
  }

  const featureModels = models.map((m) => ({
    model_id: m.model_id,
    model_name: m.model_name,
    brand_id: m.brand_id,
    slug: m.slug,
  }))

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Hero */}
        <div className="list-hero">
          <h1>Chinese EV Resource — Australia</h1>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '56ch' }}>
            Fault codes · Problems · Parts · Guides for BYD, MG and other Chinese EVs
          </p>
          <div className="list-stats">
            <div className="stat">
              <span className="stat-num">{dtcCount.toLocaleString()}</span>
              <span className="stat-label">Fault Codes</span>
            </div>
            <div className="stat">
              <span className="stat-num">{models.length}</span>
              <span className="stat-label">Models</span>
            </div>
            <div className="stat">
              <span className="stat-num">{casesCount}</span>
              <span className="stat-label">Owner Reports</span>
            </div>
            <div className="stat">
              <span className="stat-num">AU</span>
              <span className="stat-label">Market</span>
            </div>
          </div>
        </div>

        {/* 功能卡片网格（交互） */}
        <FeatureGrid market={market} models={featureModels} parts={parts} />

        {/* 车型列表，按品牌分组 */}
        {Object.entries(brandGroups).map(([brandName, brandModels]) => (
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
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.model_name}</span>
                      {m.years && <span className="dtc-desc-cell">{m.years}</span>}
                      <span className="dtc-arrow">›</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* 次级链接栏 — 仅 AU 市场 */}
        {market === 'au' && (
          <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-soft)' }}>
            {[
              { label: '🏪 Find a Dealer', href: '/au/dealers/byd/nsw' },
              { label: '🔄 Updates', href: '/au/updates/byd-atto-3' },
              { label: '⚠️ Warning Lights', href: '/au/warnings/byd' },
              { label: '📖 Buying Guide', href: '/au/buying-guide' },
              { label: '🔧 Service', href: '/au/service/byd-atto-3' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                style={{
                  padding: '6px 12px',
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
                {label}
              </a>
            ))}
          </div>
        )}

      </article>
    </div>
  )
}
