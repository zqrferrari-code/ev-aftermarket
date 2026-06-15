import type { Metadata } from 'next'
import { getAllModelsWithBrand } from '@/lib/db/models'
import { getDTCNoteCount } from '@/lib/db/dtcs'
import { getProblemCasesCount } from '@/lib/db/cases'
import { getPartsForHome, getModelsWithParts } from '@/lib/db/parts'
import { BASE_URL } from '@/lib/config'
import FeatureGrid from '@/components/home/FeatureGrid'

export async function generateStaticParams() {
  return [{ market: 'au' }]
}

interface Props {
  params: Promise<{ market: string }>
}

export async function generateMetadata(): Promise<Metadata> {
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

  const [models, dtcCount, casesCount, parts, modelsWithParts] = await Promise.all([
    getAllModelsWithBrand(),
    getDTCNoteCount(),
    getProblemCasesCount(),
    getPartsForHome(),
    getModelsWithParts(),
  ])

  const featureModels = models.map((m) => ({
    model_id: m.model_id,
    model_name: m.model_name,
    brand_id: m.brand_id,
    slug: m.slug,
  }))

  const partModels = featureModels.filter(m => modelsWithParts.includes(m.model_id))

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
        <FeatureGrid market={market} models={featureModels} partModels={partModels} parts={parts} />

        {/* 次级链接栏 — 仅 AU 市场 */}
        {market === 'au' && (
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{
              padding: '8px 14px 8px 0',
              display: 'flex',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'Find a Dealer', icon: '📍', href: '/au/dealers/byd/nsw' },
                { label: 'Software Updates', icon: '↺', href: '/au/updates/byd-atto-3' },
                { label: 'Warning Lights', icon: '△', href: '/au/warnings/byd' },
                { label: 'Buying Guide', icon: '◎', href: '/au/buying-guide' },
                { label: 'Service Costs', icon: '⚙', href: '/au/service/byd-atto-3' },
              ].map(({ label, icon, href }) => (
                <a
                  key={href}
                  href={href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-cond)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ fontSize: '13px', opacity: 0.7 }}>{icon}</span>
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}

      </article>
    </div>
  )
}
