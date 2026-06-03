// app/au/buying-guide/page.tsx
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

export default function BuyingGuidePage() {
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
        {/* 面包屑 */}
        <nav style={{ padding: '12px 28px', fontSize: '13px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-soft)' }}>
          <Link href="/au" style={{ color: 'var(--text-muted)' }}>Australia</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>Buying Guide</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '28px 28px 20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            EV Buying Guide — Australia
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '600px' }}>
            Calculate the true drive-away price for Chinese EVs in Australia, including stamp duty by state and registration fees.
            Or model your Novated Lease tax savings based on your salary.
          </p>
        </div>

        {/* 计算器（客户端组件） */}
        <BuyingGuideCalculator />
      </div>
    </main>
  )
}
