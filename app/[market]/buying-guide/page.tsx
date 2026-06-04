import type { Metadata } from 'next'
import Link from 'next/link'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { BuyingGuideCalculator } from '@/components/BuyingGuideCalculator'

export const metadata: Metadata = {
  title: 'EV Buying Guide Australia — Stamp Duty, Drive-Away Price & Novated Lease Calculator',
  description:
    'Calculate the true drive-away price for BYD, MG, GWM Ora and other Chinese EVs in Australia. Includes stamp duty by state, Rego estimate, and Novated Lease FBT tax saving calculator.',
  alternates: { canonical: `${BASE_URL}/au/buying-guide` },
}

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
        <div style={{ padding: '36px 28px 28px', borderBottom: '1px solid var(--border-soft)' }}>
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
      </div>
    </main>
  )
}
