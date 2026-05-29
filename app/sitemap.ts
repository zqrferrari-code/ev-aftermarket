import type { MetadataRoute } from 'next'
import { getAllMarkets } from '@/lib/db/markets'
import { getAllModelSlugs } from '@/lib/db/models'
import { getAllDTCCodesForSitemap } from '@/lib/db/dtcs'
import { BASE_URL } from '@/lib/config'

export const revalidate = 3600

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
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    })
  }

  // Model overview pages
  for (const market of markets) {
    for (const model of modelSlugs) {
      pages.push({
        url: `${BASE_URL}/${market.market_code}/models/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      })
    }
  }

  // Problems pages
  for (const market of markets) {
    for (const model of modelSlugs) {
      pages.push({
        url: `${BASE_URL}/${market.market_code}/problems/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })
    }
  }

  // Charging pages
  for (const market of markets) {
    for (const model of modelSlugs) {
      pages.push({
        url: `${BASE_URL}/${market.market_code}/charging/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })
    }
  }

  // Service pages
  for (const market of markets) {
    for (const model of modelSlugs) {
      pages.push({
        url: `${BASE_URL}/${market.market_code}/service/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })
    }
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
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })
  }

  // DTC detail pages — one per market × model × code
  for (const row of dtcRows) {
    if (!row.market_code || !row.model_slug || !row.dtc_code) continue
    pages.push({
      url: `${BASE_URL}/${row.market_code}/dtc/${row.model_slug}/${row.dtc_code.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })
  }

  // Dealers pages — AU only for now, BYD + MG × 5 states
  const AU_STATES = ['nsw', 'vic', 'qld', 'wa', 'sa']
  for (const brand of ['byd', 'mg']) {
    for (const state of AU_STATES) {
      pages.push({
        url: `${BASE_URL}/au/dealers/${brand}/${state}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })
    }
  }

  return pages
}
