import { notFound } from 'next/navigation'
import { MarketSelector } from '@/components/MarketSelector'

const VALID_MARKETS = ['au', 'uk', 'uae', 'no']

export default async function MarketLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ market: string }>
}) {
  const { market } = await params

  if (!VALID_MARKETS.includes(market)) {
    notFound()
  }

  return (
    <div>
      <header className="site-header">
        <a href={`/${market}`} className="site-logo">
          EV<span className="accent">Aftermarket</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="market-badge">{market.toUpperCase()}</span>
          <MarketSelector currentMarket={market} />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
