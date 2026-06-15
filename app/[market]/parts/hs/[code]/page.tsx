import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import {
  getHsCodePageData,
  getAllHsCodesForSitemap,
  buildPartUrl,
  buildAliexpressSearchUrl,
} from '@/lib/db/parts'
import TariffSummary from '@/components/parts/TariffSummary'

export async function generateStaticParams() {
  const hsCodes = await getAllHsCodesForSitemap('AU')
  return hsCodes.map(code => ({ market: 'au', code }))
}

interface Props {
  params: Promise<{ market: string; code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, code } = await params
  const data = await getHsCodePageData(code, market.toUpperCase())
  if (!data) return {}

  const desc = data.hsCode.description_en ?? `HS code ${code}`
  const title = `HS Code ${code} — ${market.toUpperCase()} Import Duty & Compatible EV Parts`
  const description = `${desc}. Check AU import tariff rate, GST, and which BYD EV parts use HS code ${code}.`
  const url = `${BASE_URL}/${market}/parts/hs/${code}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function HsCodePage({ params }: Props) {
  const { market, code } = await params
  const data = await getHsCodePageData(code, market.toUpperCase())
  if (!data) notFound()

  const { hsCode, tariffRate, relatedParts } = data

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `HS Code ${code} — ${market.toUpperCase()} Import Duty`,
    description: hsCode.description_en ?? `HS code ${code} import duty information for ${market.toUpperCase()}`,
    url: `${BASE_URL}/${market}/parts/hs/${code}`,
  }

  return (
    <>
      <JsonLd schema={jsonLd} />
      <div className="page-wrapper">
        <article className="dtc-card">

          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <a href={`/${market}/parts`}>Parts</a>
            <span className="sep">›</span>
            <a href={`/${market}/parts/hs`}>HS Codes</a>
            <span className="sep">›</span>
            <span style={{ fontWeight: 600, color: 'var(--text-base)', fontFamily: 'var(--font-mono)' }}>{code}</span>
          </nav>

          {/* Hero */}
          <div className="detail-hero">
            <div className="code-row">
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '36px',
                fontWeight: 700,
                color: 'var(--text-base)',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}>
                {code}
              </span>
            </div>

            {hsCode.description_en && (
              <h1 className="detail-h1">{hsCode.description_en}</h1>
            )}
            {!hsCode.description_en && (
              <h1 className="detail-h1">{market.toUpperCase()} import HS code</h1>
            )}

            {hsCode.description_local && (
              <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginTop: '4px' }}>
                {hsCode.description_local}
              </p>
            )}
          </div>

          {/* Tariff summary */}
          <TariffSummary cnHsCode={null} auHsCode={hsCode} tariffRate={tariffRate} />

          {/* Declaration elements */}
          {hsCode.declaration_elements && (
            <div style={{ borderTop: '1px solid var(--border-soft)' }}>
              <div className="model-section-head">
                <span style={{
                  fontFamily: 'var(--font-cond)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                }}>
                  Declaration Elements
                </span>
              </div>
              <div style={{ padding: '16px 28px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {hsCode.declaration_elements}
                </p>
              </div>
            </div>
          )}

          {/* Related parts */}
          {relatedParts.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-soft)' }}>
              <div className="model-section-head">
                <span style={{
                  fontFamily: 'var(--font-cond)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                }}>
                  Parts Using This Code
                </span>
              </div>

              <ul className="dtc-list">
                {relatedParts.map(part => (
                  <li key={part.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <div style={{ padding: '14px 28px' }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>{part.name_en}</p>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {part.model_slugs.map(modelSlug => (
                          <a
                            key={modelSlug}
                            href={buildPartUrl(market, 'byd', modelSlug, part.slug)}
                            style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}
                          >
                            {modelSlug} →
                          </a>
                        ))}
                        <span style={{ color: 'var(--border-soft)' }}>·</span>
                        <a
                          href={buildAliexpressSearchUrl(part.name_en)}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          style={{ fontSize: '12px', color: 'var(--text-faint)' }}
                        >
                          Search AliExpress ↗
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </article>
      </div>
    </>
  )
}
