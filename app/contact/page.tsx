import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact | EVAftermarket',
  description: 'Get in touch with the EVAftermarket team — report errors, suggest vehicles, or submit missing data.',
}

const TOPICS = [
  {
    icon: '🐛',
    label: 'Report an error',
    desc: 'Wrong fault code, incorrect spec, bad translation — let us know.',
  },
  {
    icon: '🚗',
    label: 'Suggest a vehicle',
    desc: 'Missing a model you own or want to see covered.',
  },
  {
    icon: '📋',
    label: 'Submit data',
    desc: 'Software update version, service interval, charging data from your car.',
  },
  {
    icon: '💬',
    label: 'General enquiry',
    desc: 'Anything else — partnerships, press, or feedback.',
  },
]

export default function ContactPage() {
  return (
    <main className="page-wrapper">
      <div className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href="/au">AU</Link>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>Contact</span>
        </nav>

        {/* Hero */}
        <div style={{ padding: '32px 28px 28px', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--text-base)',
            lineHeight: 1.2,
            marginBottom: '10px',
          }}>
            Get in Touch
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '52ch', lineHeight: 1.65 }}>
            Found an error, want to submit data, or have a question? We rely on community contributions to keep this site accurate.
          </p>
        </div>

        {/* Topic cards */}
        <div className="model-section-head">What can we help with?</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid var(--border)',
        }}>
          {TOPICS.map((t, i) => (
            <div
              key={t.label}
              style={{
                padding: '18px 24px',
                borderBottom: i < 2 ? '1px solid var(--border-soft)' : undefined,
                borderRight: i % 2 === 0 ? '1px solid var(--border-soft)' : undefined,
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{t.icon}</div>
              <div style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-base)',
                marginBottom: '4px',
              }}>
                {t.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {t.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Email CTA */}
        <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-cond)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            marginBottom: '10px',
          }}>
            Email us directly
          </div>
          <a
            href="mailto:zqrferrari@gmail.com"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono)',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--green)',
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            zqrferrari@gmail.com
          </a>
          <p style={{
            marginTop: '10px',
            fontSize: '12.5px',
            color: 'var(--text-faint)',
          }}>
            We aim to respond within 48 hours.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer">
          <span>ℹ</span>
          <span>
            All data submissions are reviewed before publishing. By submitting, you confirm the information is accurate to the best of your knowledge.
          </span>
        </div>

      </div>
    </main>
  )
}
