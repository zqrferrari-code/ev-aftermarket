import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getModelsByBrand } from '@/lib/db/models'
import { getPartsByModel } from '@/lib/db/parts'

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
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px' }}>
      <nav style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '24px' }}>
        <a href={`/${market}/parts`} style={{ color: 'var(--accent)' }}>Parts</a>
        {' / '}
        <span>{brand.toUpperCase()}</span>
      </nav>

      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
        {brand.toUpperCase()} Parts — Import Duty & HS Codes
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '32px' }}>
        Select a model to view HS codes and AU import duty details.
      </p>

      <div style={{ display: 'grid', gap: '8px' }}>
        {models.map((model: { model_id: string; slug: string; model_name: string }) => (
          <a
            key={model.model_id}
            href={`/${market}/parts/${brand}/${model.model_id}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              textDecoration: 'none',
              color: 'var(--text-base)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <span>{model.model_name}</span>
            <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>View parts →</span>
          </a>
        ))}
      </div>
    </div>
  )
}
