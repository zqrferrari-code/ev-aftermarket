import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getModelBySlug } from '@/lib/db/models'
import { getPartsByModel, buildPartUrl, getAllBydModelSlugs } from '@/lib/db/parts'

export async function generateStaticParams() {
  const modelIds = await getAllBydModelSlugs()
  return modelIds.map(model => ({ market: 'au', brand: 'byd', model }))
}

interface Props {
  params: Promise<{ market: string; brand: string; model: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}

  const title = `${modelData.model_name} Parts — Import Duty & HS Codes (${market.toUpperCase()})`
  const description = `HS codes and AU import duty rates for ${modelData.model_name} replacement parts. Front bumpers, headlights, fenders and more.`
  const url = `${BASE_URL}/${market}/parts/${brand}/${model}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
  }
}

export default async function ModelPartsPage({ params }: Props) {
  const { market, brand, model } = await params
  const [modelData, parts] = await Promise.all([
    getModelBySlug(model),
    getPartsByModel(model),
  ])
  if (!modelData) notFound()

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px' }}>
      <nav style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '24px' }}>
        <a href={`/${market}/parts`} style={{ color: 'var(--accent)' }}>Parts</a>
        {' / '}
        <a href={`/${market}/parts/${brand}`} style={{ color: 'var(--accent)' }}>{brand.toUpperCase()}</a>
        {' / '}
        <span>{modelData.model_name}</span>
      </nav>

      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
        {modelData.model_name} — Import Duty & HS Codes
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '32px' }}>
        {parts.length} {parts.length === 1 ? 'part' : 'parts'} · Select a part to view HS codes and AU import duty
      </p>

      {parts.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: '14px' }}>No parts data available.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {parts.map(part => (
            <a
              key={part.id}
              href={buildPartUrl(market, brand, model, part.slug)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                textDecoration: 'none',
                color: 'var(--text-base)',
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>{part.name_en}</p>
                {part.name_cn && (
                  <p style={{ fontSize: '12px', color: 'var(--text-faint)', margin: 0 }}>{part.name_cn}</p>
                )}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-faint)', flexShrink: 0, marginLeft: '16px' }}>
                {part.category ?? ''} →
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
