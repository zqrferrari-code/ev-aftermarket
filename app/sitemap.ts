import type { MetadataRoute } from 'next'
import { getAllMarkets } from '@/lib/db/markets'
import { getAllModelSlugs } from '@/lib/db/models'
import { getAllDTCCodesForSitemap } from '@/lib/db/dtcs'
import { getWarningLightBrands, getWarningLightSlugs, getWarningLightModelSlugs } from '@/lib/db/static-params'
import { BASE_URL } from '@/lib/config'

const DTC_EXCLUDED_MODELS = ['byd-dolphin', 'mg-mg4', 'mg-zs-ev']

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [markets, modelSlugs, dtcRows, wlBrands] = await Promise.all([
    getAllMarkets(),
    getAllModelSlugs(),
    getAllDTCCodesForSitemap(),
    getWarningLightBrands(),
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

  // Problems index pages
  const problemsIndexUrls = markets.map(m => ({
    url: `${BASE_URL}/${m.market_code}/problems`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  pages.push(...problemsIndexUrls)

  // Problems detail pages
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

  // Software updates pages
  for (const market of markets) {
    for (const model of modelSlugs) {
      pages.push({
        url: `${BASE_URL}/${market.market_code}/updates/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
    }
  }

  // DTC list pages — one per market × model combination present in dtcModelNotes
  const modelMarketPairs = new Set(
    dtcRows
      .filter((r) => r.market_code && r.model_slug && !DTC_EXCLUDED_MODELS.includes(r.model_slug))
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
    if (DTC_EXCLUDED_MODELS.includes(row.model_slug)) continue
    pages.push({
      url: `${BASE_URL}/${row.market_code}/dtc/${row.model_slug}/${row.dtc_code.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })
  }

  // Warning lights — AU only (brand pages)
  for (const brand of wlBrands) {
    pages.push({
      url: `${BASE_URL}/au/warnings/${brand}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })
  }

  // Warning lights — AU only (model pages)
  for (const brand of wlBrands) {
    const modelSlugsForBrand = await getWarningLightModelSlugs(brand)
    for (const slug of modelSlugsForBrand) {
      pages.push({
        url: `${BASE_URL}/au/warnings/${brand}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })
    }
  }

  // Warning lights — AU only (detail pages)
  for (const brand of wlBrands) {
    const slugs = await getWarningLightSlugs(brand)
    for (const slug of slugs) {
      pages.push({
        url: `${BASE_URL}/au/warnings/${brand}/detail/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })
    }
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
