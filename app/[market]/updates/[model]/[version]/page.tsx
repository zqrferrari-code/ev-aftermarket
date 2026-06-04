import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUpdateByVersion } from '@/lib/db/updates'
import { getModelBySlug } from '@/lib/db/models'

interface Props {
  params: Promise<{ market: string; model: string; version: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model, version } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}
  return {
    title: `${modelData.model_name} Software Update ${version} — What's New (${market.toUpperCase()})`,
    description: `Details on ${modelData.model_name} firmware version ${version}: what changed, how to install, and whether it's available via OTA or dealer only.`,
  }
}

function methodBadgeStyle(method: string | null): React.CSSProperties {
  if (method === 'OTA') {
    return { background: 'var(--green-light)', color: 'var(--green-text)', border: '1px solid #bbf7d0' }
  }
  if (method === 'dealer_only') {
    return { background: 'var(--amber-bg)', color: 'var(--amber-text)', border: '1px solid var(--amber-border)' }
  }
  return {}
}

function methodLabel(method: string | null): string {
  if (method === 'OTA') return 'OTA Available'
  if (method === 'dealer_only') return 'Dealer Only'
  if (method === 'usb') return 'USB'
  return 'Unknown'
}

export default async function UpdateVersionPage({ params }: Props) {
  const { market, model, version } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const update = await getUpdateByVersion(modelData.model_id, version)
  if (!update) notFound()

  return (
    <main className="page-wrapper">
      <div className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href={`/${market}`}>{market.toUpperCase()}</Link>
          <span className="sep">›</span>
          <Link href={`/${market}/models/${model}`}>{modelData.model_name}</Link>
          <span className="sep">›</span>
          <Link href={`/${market}/updates/${model}`}>Software Updates</Link>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)', fontFamily: 'var(--font-mono)' }}>{version}</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '32px 28px 28px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-cond)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            marginBottom: '10px',
          }}>
            Firmware Version
          </div>
          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '36px',
            fontWeight: 700,
            color: 'var(--text-base)',
            lineHeight: 1.1,
            marginBottom: '14px',
            letterSpacing: '0.02em',
          }}>
            {version}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {update.release_date && (
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-cond)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {update.release_date}
              </span>
            )}
            {update.update_method && (
              <span className="model-method-tag" style={methodBadgeStyle(update.update_method)}>
                {methodLabel(update.update_method)}
              </span>
            )}
            {update.data_confidence && (
              <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-cond)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                padding: '2px 8px',
                borderRadius: '2px',
              }}>
                {update.data_confidence}
              </span>
            )}
          </div>
        </div>

        {/* Changelog */}
        {update.changelog_en && (
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
            <div className="model-section-head" style={{ margin: '-24px -28px 20px', padding: '10px 28px' }}>
              What&apos;s Changed
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-base)',
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
            }}>
              {update.changelog_en}
            </p>
          </div>
        )}

        {/* Source */}
        {update.source_url && (
          <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Source:{' '}
              <a
                href={update.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--green)', textDecoration: 'none' }}
              >
                original report →
              </a>
            </span>
          </div>
        )}

        {/* Disclaimer */}
        <div className="disclaimer">
          <span>⚠</span>
          <span>
            Software update information is sourced from community reports. Verify with your dealer before attempting any updates.{' '}
            <Link href="/contact" style={{ color: 'var(--green)' }}>Contact us →</Link>
          </span>
        </div>

      </div>
    </main>
  )
}
