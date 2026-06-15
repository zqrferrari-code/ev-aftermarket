import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getModelsByBrand } from '@/lib/db/models'

export async function generateStaticParams() {
  return [{ market: 'au', brand: 'byd' }]
}

interface Props {
  params: Promise<{ market: string; brand: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand } = await params
  const title = `${brand.toUpperCase()} EV Parts — Import Duty & HS Codes (${market.toUpperCase()})`
  const description = `HS codes and AU import duty for ${brand.toUpperCase()} EV parts. Select your model to see duty-free import details.`
  const url = `${BASE_URL}/${market}/parts/${brand}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
  }
}

export default async function BrandPartsPage({ params }: Props) {
  const { market, brand } = await params
  const models = await getModelsByBrand(brand)
  if (models.length === 0) notFound()

  return (
    <div className="page-wrapper">
      <article className="dtc-card">
        <nav className="breadcrumb">
          <a href={`/${market}/parts`}>Parts</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>{brand.toUpperCase()}</span>
        </nav>

        <div className="list-hero">
          <h1>{brand.toUpperCase()} Parts — Import Duty & HS Codes</h1>
          <p>Select a model to view HS codes and AU import duty details.</p>
        </div>

        <div className="model-section-head">
          <span style={{
            fontFamily: 'var(--font-cond)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
          }}>
            Select a model
          </span>
        </div>

        <ul className="dtc-list">
          {models.map((model: { model_id: string; slug: string; model_name: string }) => (
            <li key={model.model_id}>
              <a
                href={`/${market}/parts/${brand}/${model.model_id}`}
                className="dtc-row"
              >
                <div className="dtc-row-top">
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{model.model_name}</span>
                </div>
                <span className="dtc-arrow">→</span>
              </a>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
