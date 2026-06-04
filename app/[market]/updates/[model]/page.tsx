import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUpdatesByModel } from '@/lib/db/updates'
import { getModelBySlug } from '@/lib/db/models'
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const revalidate = 3600

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}

interface Props {
  params: Promise<{ market: string; model: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}
  return {
    title: `${modelData.model_name} Software Updates — Version History & Changelog (${market.toUpperCase()})`,
    description: `Complete ${modelData.model_name} software update history for ${market.toUpperCase()}: firmware versions, OTA update instructions, and what each update fixes.`,
  }
}

function methodBadgeStyle(method: string | null): React.CSSProperties {
  if (method === 'OTA') {
    return { background: 'var(--green-light)', color: 'var(--green-text)', border: '1px solid #bbf7d0' }
  }
  if (method === 'dealer_only') {
    return { background: 'var(--amber-bg)', color: 'var(--amber-text)', border: '1px solid var(--amber-border)' }
  }
  return {} // usb — default .model-method-tag blue
}

function methodLabel(method: string | null): string {
  if (method === 'OTA') return 'OTA'
  if (method === 'dealer_only') return 'Dealer Only'
  if (method === 'usb') return 'USB'
  return 'Unknown'
}

export default async function UpdatesListPage({ params }: Props) {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const updates = await getUpdatesByModel(modelData.model_id, market)

  const otaCount = updates.filter((u) => u.update_method === 'OTA').length
  const latestYear = updates
    .map((u) => u.release_date?.slice(0, 4))
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  return (
    <main className="page-wrapper">
      <div className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href={`/${market}`}>{market.toUpperCase()}</Link>
          <span className="sep">›</span>
          <Link href={`/${market}/models/${model}`}>{modelData.model_name}</Link>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>Software Updates</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '32px 28px 24px', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--text-base)',
            lineHeight: 1.2,
            marginBottom: '10px',
          }}>
            Software Updates<br />
            <em style={{ color: 'var(--text-muted)', fontSize: '26px' }}>
              {modelData.model_name} · {market.toUpperCase()}
            </em>
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '54ch', lineHeight: 1.65 }}>
            Firmware and software version history. Data sourced from community reports and official release notes.
          </p>

          {/* Stats strip */}
          {updates.length > 0 && (
            <div className="list-stats">
              <div className="stat">
                <div className="stat-num">{updates.length}</div>
                <div className="stat-label">Versions tracked</div>
              </div>
              {otaCount > 0 && (
                <div className="stat">
                  <div className="stat-num" style={{ color: 'var(--green)' }}>{otaCount}</div>
                  <div className="stat-label">OTA capable</div>
                </div>
              )}
              {latestYear && (
                <div className="stat">
                  <div className="stat-num">{latestYear}</div>
                  <div className="stat-label">Latest release</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Update list */}
        <div className="model-section-head">Update History</div>

        {updates.length > 0 ? (
          <ul style={{ listStyle: 'none' }}>
            {updates.map((update) => (
              <li key={update.update_id} className="model-update-row">
                <a
                  href={`/${market}/updates/${model}/${update.version}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div className="model-update-top">
                    <div>
                      <div className="model-update-version">{update.version}</div>
                      {update.release_date && (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--text-faint)',
                          fontFamily: 'var(--font-cond)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          marginTop: '2px',
                        }}>
                          {update.release_date}
                        </div>
                      )}
                    </div>
                    {update.update_method && (
                      <span
                        className="model-method-tag"
                        style={methodBadgeStyle(update.update_method)}
                      >
                        {methodLabel(update.update_method)}
                      </span>
                    )}
                  </div>
                  {update.changelog_en && (
                    <p className="model-update-log" style={{ marginTop: '6px' }}>
                      {update.changelog_en}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="disclaimer" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '28px', gap: '6px' }}>
            <p>No software updates recorded yet for this market.</p>
            <p>
              Know of a recent update?{' '}
              <Link href="/contact" style={{ color: 'var(--green)' }}>Let us know →</Link>
            </p>
          </div>
        )}

        {/* Confidence footer */}
        {updates.length > 0 && (
          <div className="disclaimer">
            <span>⚠</span>
            <span>
              Data sourced from community reports and owner forums. Version numbers may not be exhaustive.{' '}
              <Link href="/contact" style={{ color: 'var(--green)' }}>Submit a missing update →</Link>
            </span>
          </div>
        )}

      </div>
    </main>
  )
}
