import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWarningLightBySlug } from '@/lib/db/warning-lights'
import { getWarningLightBrands, getWarningLightSlugs, getActiveMarketCodes } from '@/lib/db/static-params'
import { SeverityBadge } from '@/components/SeverityBadge'
import { DisclaimerBox } from '@/components/DisclaimerBox'
import { BASE_URL } from '@/lib/config'
import type { Severity } from '@/lib/types'

export const revalidate = 1800
export const dynamicParams = true

export async function generateStaticParams() {
  const markets = await getActiveMarketCodes()
  const brands = await getWarningLightBrands()
  const params: { market: string; brand: string; slug: string }[] = []
  for (const brand of brands) {
    const slugs = await getWarningLightSlugs(brand)
    for (const market of markets) {
      for (const slug of slugs) {
        params.push({ market, brand, slug })
      }
    }
  }
  return params
}

interface Props {
  params: Promise<{ market: string; brand: string; slug: string }>
}

const BRAND_LABELS: Record<string, string> = { byd: 'BYD', mg: 'MG' }
const MARKET_LABELS: Record<string, string> = { au: 'Australia', uk: 'United Kingdom', uae: 'UAE', no: 'Norway' }

const CAN_DRIVE_CONFIG = {
  yes: { label: 'Yes — safe to drive', color: 'oklch(34% 0.14 145)', bg: 'oklch(93% 0.06 145)', border: 'oklch(80% 0.10 145)' },
  caution: { label: 'With caution', color: 'oklch(40% 0.12 70)', bg: 'oklch(95% 0.06 70)', border: 'oklch(82% 0.10 70)' },
  no: { label: 'Stop driving immediately', color: 'oklch(40% 0.18 25)', bg: 'oklch(95% 0.05 25)', border: 'oklch(82% 0.12 25)' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, slug } = await params
  const wl = await getWarningLightBySlug(brand, slug)
  if (!wl) return {}
  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()
  const title = `${wl.name_en} Warning Light — ${brandLabel} | EVAftermarket`
  const description = `${wl.name_cn ? wl.name_cn + ' — ' : ''}${wl.description_en?.slice(0, 140) ?? 'Warning light meaning, causes and what to do.'}`
  const url = `${BASE_URL}/${market}/warnings/${brand}/detail/${slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'article' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function WarningLightDetailPage({ params }: Props) {
  const { market, brand, slug } = await params
  const wl = await getWarningLightBySlug(brand, slug)
  if (!wl) notFound()

  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()
  const canDriveCfg = wl.can_drive ? CAN_DRIVE_CONFIG[wl.can_drive] : null
  const causes = wl.causes ?? []

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <a href={`/${market}/warnings/${brand}`}>{brandLabel} Warning Lights</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>{wl.name_en}</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '28px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'oklch(14% 0.01 60)', margin: 0, lineHeight: 1.25 }}>
              {wl.name_en}
            </h1>
            {wl.severity && <SeverityBadge severity={wl.severity as Severity} />}
          </div>
          {wl.name_cn && (
            <div style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '8px' }}>
              {wl.name_cn}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-cond)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {brandLabel} · {wl.category}
          </div>
        </div>

        <div className="detail-body">

          {/* What does this light mean? */}
          {wl.description_en && (
            <div className="section">
              <span className="section-label">What does this warning light mean?</span>
              <p style={{ marginTop: '10px', fontSize: '14px', color: 'oklch(26% 0.01 60)', lineHeight: 1.65 }}>
                {wl.description_en}
              </p>
            </div>
          )}

          {/* Can I drive? */}
          {canDriveCfg && (
            <div className="section">
              <span className="section-label">Can I drive?</span>
              <div style={{
                marginTop: '10px',
                padding: '12px 16px',
                borderRadius: '6px',
                background: canDriveCfg.bg,
                border: `1px solid ${canDriveCfg.border}`,
                display: 'inline-block',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: canDriveCfg.color }}>
                  {canDriveCfg.label}
                </span>
              </div>
            </div>
          )}

          {/* What to do */}
          {wl.action_en && (
            <div className="section">
              <span className="section-label">What to do</span>
              <p style={{ marginTop: '10px', fontSize: '14px', color: 'oklch(26% 0.01 60)', lineHeight: 1.65 }}>
                {wl.action_en}
              </p>
            </div>
          )}

          {/* Technical info — causes */}
          {causes.length > 0 && (
            <div className="section">
              <span className="section-label">Likely causes</span>
              <ul style={{ marginTop: '10px', paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {causes.map((c, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-faint)', fontSize: '14px', lineHeight: 1.5, flexShrink: 0 }}>—</span>
                    <span style={{ fontSize: '14px', color: 'oklch(30% 0.01 60)', lineHeight: 1.55 }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related fault codes */}
          {wl.dtcs.length > 0 && (
            <div className="section">
              <span className="section-label">Related fault codes</span>
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {wl.dtcs.map((d) => (
                  <a
                    key={d.dtc_id}
                    href={`/${market}/dtc/${wl.model_id ?? brand}/${d.dtc_code.toLowerCase()}`}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700,
                      padding: '5px 10px', borderRadius: '5px',
                      background: 'oklch(93% 0.01 60)', color: 'oklch(24% 0.01 60)',
                      textDecoration: 'none', border: '1px solid var(--border-soft)',
                    }}
                    title={d.description_en}
                  >
                    {d.dtc_code}
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

        <DisclaimerBox confidence="community" sourceUrls={[]} />
      </article>
    </div>
  )
}
