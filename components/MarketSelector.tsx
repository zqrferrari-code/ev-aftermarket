'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MARKETS = [
  { code: 'au', label: 'AU' },
  { code: 'uk', label: 'UK' },
  { code: 'uae', label: 'UAE' },
  { code: 'no', label: 'NO' },
]

export function MarketSelector({ currentMarket }: { currentMarket: string }) {
  const pathname = usePathname()

  function switchMarket(newMarket: string) {
    const segments = pathname.split('/')
    segments[1] = newMarket
    return segments.join('/')
  }

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {MARKETS.filter((m) => m.code !== currentMarket).map((m) => (
        <Link
          key={m.code}
          href={switchMarket(m.code)}
          style={{
            fontFamily: 'var(--font-cond)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            padding: '3px 8px',
          }}
        >
          {m.label}
        </Link>
      ))}
    </div>
  )
}
