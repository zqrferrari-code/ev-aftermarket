import type { Metadata } from 'next'
import Link from 'next/link'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { BuyingGuideCalculator } from '@/components/BuyingGuideCalculator'

export function generateStaticParams() {
  return [{ market: 'au' }]
}

export const metadata: Metadata = {
  title: 'EV Buying Guide Australia — Stamp Duty, Drive-Away Price & Novated Lease Calculator',
  description:
    'Calculate the true drive-away price for BYD, MG, GWM Ora and other Chinese EVs in Australia. Includes stamp duty by state, Rego estimate, and Novated Lease FBT tax saving calculator.',
  alternates: { canonical: `${BASE_URL}/au/buying-guide` },
}

const MODEL_LINKS = [
  { name: 'BYD Atto 3', slug: 'byd-atto-3' },
  { name: 'BYD Dolphin', slug: 'byd-dolphin' },
  { name: 'BYD Seal', slug: 'byd-seal' },
  { name: 'BYD Sealion 6', slug: 'byd-seal-6-ev' },
  { name: 'MG4', slug: 'mg-mg4' },
  { name: 'MG ZS EV', slug: 'mg-zs-ev' },
  { name: 'GWM Ora', slug: 'gwm-ora' },
]

export default async function BuyingGuidePage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params

  return (
    <main className="page-wrapper">
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'EV Buying Guide Australia',
          description: metadata.description as string,
          url: `${BASE_URL}/au/buying-guide`,
        }}
      />
      <div className="dtc-card">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href={`/${market}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Australia
          </Link>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>Buying Guide</span>
        </nav>

        {/* Hero */}
        <div className="guide-hero" style={{ padding: '36px 28px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--text-base)',
            lineHeight: 1.2,
            marginBottom: '10px',
          }}>
            EV Buying Guide<br />
            <em style={{ color: 'var(--text-muted)', fontSize: '26px' }}>Australia</em>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '54ch', lineHeight: 1.7 }}>
            Calculate the true drive-away price for Chinese EVs in Australia, including stamp duty by
            state and registration fees. Or model your Novated Lease tax savings based on your salary.
          </p>
        </div>

        <BuyingGuideCalculator />

        {/* Model links */}
        <div style={{ padding: '24px 28px', borderTop: '1px solid var(--border-soft)' }}>
          <span style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            fontFamily: 'var(--font-cond)',
            marginBottom: '14px',
          }}>
            Model Reliability &amp; Service Info
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {MODEL_LINKS.map(({ name, slug }) => (
              <Link
                key={slug}
                href={`/${market}/models/${slug}`}
                style={{
                  fontSize: '13px',
                  color: 'var(--green)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  padding: '6px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '3px',
                  background: 'var(--surface)',
                }}
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
