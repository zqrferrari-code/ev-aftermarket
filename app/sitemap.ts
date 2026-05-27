import type { MetadataRoute } from 'next'
import { getAllMarkets } from '@/lib/db/markets'
import { getAllModelSlugs } from '@/lib/db/models'
import { getAllDTCCodesForSitemap } from '@/lib/db/dtcs'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [markets, modelSlugs, dtcRows] = await Promise.all([
    getAllMarkets(),
    getAllModelSlugs(),
    getAllDTCCodesForSitemap(),
  ])

  const pages: MetadataRoute.Sitemap = []

  // Market home pages
  for (const market of markets) {
    pages.push({
      url: `${BASE_URL}/${market.market_code}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  // DTC list pages — one per market × model combination present in dtcModelNotes
  const modelMarketPairs = new Set(
    dtcRows
      .filter((r) => r.market_code && r.model_slug)
      .map((r) => `${r.market_code}|${r.model_slug}`)
  )
  for (const pair of modelMarketPairs) {
    const [market, modelSlug] = pair.split('|')
    pages.push({
      url: `${BASE_URL}/${market}/dtc/${modelSlug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // DTC detail pages — one per market × model × code
  for (const row of dtcRows) {
    if (!row.market_code || !row.model_slug || !row.dtc_code) continue
    pages.push({
      url: `${BASE_URL}/${row.market_code}/dtc/${row.model_slug}/${row.dtc_code.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return pages
}
