import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BRAND_INFO, DEALERS, STATE_LABELS } from '@/lib/dealers-data'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'

interface Props {
  params: Promise<{ market: string; brand: string; state: string }>
}

export const revalidate = 86400

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, state } = await params
  const brandInfo = BRAND_INFO[brand]
  const stateLabel = STATE_LABELS[state] ?? state.toUpperCase()
  if (!brandInfo) return {}

  const title = `${brandInfo.name} Dealers & Service Centres — ${stateLabel}`
  const description = `Find authorised ${brandInfo.name} dealers and service centres in ${stateLabel}. Phone numbers, addresses, hours, and warranty service information.`
  const url = `${BASE_URL}/${market}/dealers/${brand}/${state}`

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

export default async function DealersPage({ params }: Props) {
  const { market, brand, state } = await params
  const brandInfo = BRAND_INFO[brand]
  if (!brandInfo) notFound()
  const stateLabel = STATE_LABELS[state]
  if (!stateLabel) notFound()

  const dealers = DEALERS[market]?.[brand]?.[state] ?? []

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>
            {brandInfo.name} Dealers — {stateLabel}
          </span>
        </nav>

        {/* Hero */}
        <div className="list-hero">
          <h1>{brandInfo.name} Authorised Dealers</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '14px' }}>
            {stateLabel} — sales, servicing &amp; warranty repairs
          </p>
          {dealers.length > 0 && (
            <div className="list-stats">
              <div className="stat">
                <span className="stat-num">{dealers.length}</span>
                <span className="stat-label">Locations</span>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{
          margin: '0',
          padding: '12px 28px',
          background: 'oklch(98% 0.015 85)',
          borderBottom: '1px solid oklch(91% 0.03 85)',
        }}>
          <p style={{ fontSize: '12px', color: 'oklch(46% 0.04 60)', lineHeight: 1.5 }}>
            Dealer details change frequently.{' '}
            <a
              href={brandInfo.dealerLocatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}
            >
              Verify at the official {brandInfo.name} dealer locator →
            </a>
            {' '}before visiting. Last reviewed May 2025.
          </p>
        </div>

        {/* Dealer list */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Authorised Locations</span>
        </div>

        {dealers.length === 0 ? (
          <div style={{ padding: '32px 28px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              We don&apos;t have specific dealer listings for this region yet.
            </p>
            <a
              href={brandInfo.dealerLocatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: 'var(--green)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Find a {brandInfo.name} dealer on the official site →
            </a>
          </div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {dealers.map((dealer, idx) => (
              <li
                key={idx}
                style={{
                  padding: '16px 28px',
                  borderBottom: idx < dealers.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '3px' }}>
                      {dealer.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'oklch(46% 0.01 60)', marginBottom: '2px' }}>
                      {dealer.address}, {dealer.suburb}
                    </div>
                    {dealer.hours && (
                      <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                        {dealer.hours}
                      </div>
                    )}
                  </div>
                  {dealer.phone && (
                    <a
                      href={`tel:${dealer.phone.replace(/[^+\d]/g, '')}`}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--green)',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dealer.phone}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Brand contact */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">{brandInfo.name} Contact</span>
        </div>

        <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: 'oklch(36% 0.01 60)' }}>
              <strong>Customer Service:</strong> {brandInfo.customerServicePhone}
            </div>
            <div style={{ fontSize: '13px', color: 'oklch(36% 0.01 60)' }}>
              <strong>Roadside Assistance:</strong> 24/7 — number in your vehicle documentation
            </div>
            <div style={{ fontSize: '13px', color: 'oklch(36% 0.01 60)' }}>
              <strong>Website:</strong>{' '}
              <a
                href={brandInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}
              >
                {brandInfo.website.replace('https://', '')}
              </a>
            </div>
          </div>
        </div>

        {/* Warranty reminder */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Warranty</span>
        </div>

        <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <div className="climate-note">
            <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
              {brandInfo.warrantyNote}. For warranty repairs, software updates, and recall work,
              always use an authorised dealer.
            </p>
          </div>
        </div>

        {/* State switcher */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Other States</span>
        </div>

        <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(['nsw', 'vic', 'qld', 'wa', 'sa'] as const).map((s) => (
            <a
              key={s}
              href={`/${market}/dealers/${brand}/${s}`}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'var(--font-cond)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                background: s === state ? 'var(--green)' : 'oklch(93% 0.003 60)',
                color: s === state ? '#fff' : 'oklch(46% 0.01 60)',
              }}
            >
              {s.toUpperCase()}
            </a>
          ))}
        </div>

        <JsonLd schema={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${BASE_URL}/${market}` },
            { '@type': 'ListItem', position: 2, name: `${brandInfo.name} Dealers`, item: `${BASE_URL}/${market}/dealers/${brand}/${state}` },
          ],
        }} />
        {dealers.length > 0 && (
          <JsonLd schema={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: dealers.map((d, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'AutoDealer',
                name: d.name,
                address: { '@type': 'PostalAddress', streetAddress: d.address, addressLocality: d.suburb, addressCountry: market === 'au' ? 'AU' : 'GB' },
                telephone: d.phone ?? undefined,
                openingHours: d.hours ?? undefined,
              },
            })),
          }} />
        )}

      </article>
    </div>
  )
}
