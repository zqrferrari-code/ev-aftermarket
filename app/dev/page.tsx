import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dev Portal',
  robots: { index: false, follow: false },
}

type RouteGroup = {
  icon: string
  label: string
  links: { href: string; note?: string }[]
  hint?: string
}

const GROUPS: RouteGroup[] = [
  {
    icon: '🔧',
    label: 'DTC Fault Codes',
    links: [
      { href: '/au/dtc/byd-atto-3' },
      { href: '/au/dtc/byd-atto-3/b110a', note: 'detail page' },
    ],
    hint: 'mg-mg4, byd-dolphin 等同理',
  },
  {
    icon: '📋',
    label: 'Models',
    links: [
      { href: '/au', note: 'market home' },
      { href: '/au/models/byd-atto-3' },
    ],
    hint: 'mg-mg4, byd-dolphin 等同理',
  },
  {
    icon: '⚡',
    label: 'Charging',
    links: [{ href: '/au/charging/byd-atto-3' }],
    hint: 'mg-mg4, byd-dolphin 等同理',
  },
  {
    icon: '🔩',
    label: 'Service',
    links: [{ href: '/au/service/byd-atto-3' }],
    hint: 'mg-mg4, byd-dolphin 等同理',
  },
  {
    icon: '⚠️',
    label: 'Problems',
    links: [
      { href: '/au/problems' },
      { href: '/au/problems/byd-atto-3' },
    ],
    hint: 'mg-mg4, byd-dolphin 等同理',
  },
  {
    icon: '🔄',
    label: 'Updates',
    links: [{ href: '/au/updates/byd-atto-3' }],
    hint: 'mg-mg4, byd-dolphin 等同理',
  },
  {
    icon: '🏪',
    label: 'Dealers',
    links: [{ href: '/au/dealers/byd/nsw' }],
    hint: 'byd/vic, mg/nsw 等同理',
  },
  {
    icon: '📄',
    label: 'Static Pages',
    links: [
      { href: '/au/buying-guide' },
      { href: '/contact' },
      { href: '/privacy' },
    ],
  },
]

export default function DevPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-ui)' }}>
      {/* Dev header strip */}
      <div style={{
        background: '#1a1a1a',
        color: 'white',
        padding: '10px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: '13px' }}>
          ⚡ EVAFTERMARKET
        </span>
        <span style={{
          background: 'var(--green)',
          color: 'white',
          fontSize: '10px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '2px',
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-cond)',
        }}>
          DEV
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#888', fontFamily: 'var(--font-mono)' }}>
          localhost:3000
        </span>
      </div>

      <div className="page-wrapper">
        <div className="dtc-card">
          {/* Title */}
          <div style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid var(--border)',
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '4px' }}>
              Dev Portal
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--text-faint)' }}>
              All routes for local development. Not linked in production.
            </p>
          </div>

          {/* 2-column grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0',
          }}>
            {GROUPS.map((group, i) => (
              <div
                key={group.label}
                style={{
                  borderBottom: i < GROUPS.length - 2 ? '1px solid var(--border-soft)' : undefined,
                  borderRight: i % 2 === 0 ? '1px solid var(--border-soft)' : undefined,
                }}
              >
                {/* Card header */}
                <div style={{
                  padding: '9px 20px',
                  background: 'var(--bg)',
                  borderBottom: '1px solid var(--border-soft)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-cond)',
                }}>
                  {group.icon} {group.label}
                </div>

                {/* Links */}
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.links.map(({ href, note }) => (
                    <div key={href} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <Link
                        href={href}
                        style={{
                          fontSize: '12px',
                          color: 'var(--green)',
                          textDecoration: 'none',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {href}
                      </Link>
                      {note && (
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{note}</span>
                      )}
                    </div>
                  ))}
                  {group.hint && (
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-faint)',
                      paddingTop: '4px',
                      borderTop: '1px solid var(--border-soft)',
                      marginTop: '2px',
                    }}>
                      {group.hint}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
