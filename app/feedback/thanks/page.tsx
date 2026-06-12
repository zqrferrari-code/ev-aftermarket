import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Thanks for your feedback | EVAftermarket',
  robots: { index: false, follow: false },
}

export default function ThanksPage() {
  return (
    <main className="page-wrapper">
      <div className="dtc-card">
        <div style={{ padding: '48px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>✓</div>
          <h1 style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '26px',
            fontWeight: 400,
            color: 'var(--text-base)',
            marginBottom: '12px',
          }}>
            Thanks for your feedback
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '40ch', margin: '0 auto 28px' }}>
            We review every submission and use it to improve the site. If you left an email, we'll follow up if needed.
          </p>
          <Link
            href="/au"
            style={{
              display: 'inline-block',
              fontSize: '13px',
              fontFamily: 'var(--font-cond)',
              fontWeight: 700,
              color: 'var(--green)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
