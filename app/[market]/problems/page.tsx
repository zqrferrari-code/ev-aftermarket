import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllMarkets } from '@/lib/db/markets'
import { getAllModelsWithBrand } from '@/lib/db/models'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { getActiveMarketCodes } from '@/lib/db/static-params'

export const revalidate = 3600

export const dynamicParams = true

export async function generateStaticParams() {
  const codes = await getActiveMarketCodes()
  return codes.map((market) => ({ market }))
}

interface Props {
  params: Promise<{ market: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params
  const title = `EV Common Problems — By Category (${market.toUpperCase()}) | EVAftermarket`
  const description = `Browse common electric vehicle problems in ${market.toUpperCase()} by category: battery, charging, software, and mechanical issues. Backed by real owner case data.`
  const url = `${BASE_URL}/${market}/problems`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
  }
}

const PROBLEM_CATEGORIES = [
  { slug: 'battery', label: 'Battery Issues', description: 'Range anxiety, degradation, BMS faults' },
  { slug: 'charging', label: 'Charging Problems', description: 'Failed sessions, slow charging, cable faults' },
  { slug: 'software', label: 'Software & OTA', description: 'Update failures, infotainment bugs, connectivity' },
  { slug: 'mechanical', label: 'Mechanical Issues', description: 'Suspension, brakes, drivetrain noise' },
  { slug: 'electrical', label: 'Electrical Faults', description: 'Warning lights, sensor errors, 12V battery' },
]

export default async function ProblemsIndexPage({ params }: Props) {
  const { market } = await params
  const markets = await getAllMarkets()
  if (!markets.find(m => m.market_code === market)) notFound()

  const models = await getAllModelsWithBrand()

  return (
    <>
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${market}` },
            { '@type': 'ListItem', position: 2, name: 'Problems', item: `${BASE_URL}/${market}/problems` },
          ],
        }}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">EV Common Problems</h1>
        <p className="text-gray-600 mb-8">Browse real owner-reported issues by category or vehicle model.</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Browse by Problem Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROBLEM_CATEGORIES.map(cat => (
              <div key={cat.slug} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">{cat.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Browse by Vehicle Model</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {models.map(m => (
              <li key={m.slug}>
                <Link
                  href={`/${market}/problems/${m.slug}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  {m.model_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}
