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
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '24px' }}>
          <a href={`/${market}/parts`} style={{ color: 'var(--accent)' }}>Parts</a>
          {' / '}
          <a href={`/${market}/parts/hs`} style={{ color: 'var(--accent)' }}>HS Codes</a>
          {' / '}
          <span style={{ fontFamily: 'monospace' }}>{code}</span>
        </nav>

        {/* Header */}
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px', fontFamily: 'monospace' }}>
          {code}
        </h1>
        {hsCode.description_en && (
          <p style={{ fontSize: '15px', color: 'var(--text-soft)', marginBottom: '8px' }}>
            {hsCode.description_en}
          </p>
        )}
        {hsCode.description_local && (
          <p style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '24px' }}>
            {hsCode.description_local}
          </p>
        )}
        {!hsCode.description_en && !hsCode.description_local && (
          <p style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '24px' }}>
            {market.toUpperCase()} import HS code
          </p>
        )}

        {/* Tariff card */}
        <div style={{ marginBottom: '32px' }}>
          <TariffSummary cnHsCode={null} auHsCode={hsCode} tariffRate={tariffRate} />
        </div>

        {/* Declaration elements */}
        {hsCode.declaration_elements && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>
              Declaration Elements
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.6 }}>
              {hsCode.declaration_elements}
            </p>
          </section>
        )}

        {/* Related parts */}
        {relatedParts.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>
              Parts Using This Code
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {relatedParts.map(part => (
                <div key={part.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: '3px',
                  padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{part.name_en}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {part.model_slugs.map(modelSlug => (
                        <a
                          key={modelSlug}
                          href={buildPartUrl(market, 'byd', modelSlug, part.slug)}
                          style={{ fontSize: '12px', color: 'var(--accent)', whiteSpace: 'nowrap' }}
                        >
                          {modelSlug} →
                        </a>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={buildAliexpressSearchUrl(`${part.name_en}`)}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      style={{ fontSize: '12px', color: 'var(--text-faint)' }}
                    >
                      Search AliExpress ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </>
  )
}
