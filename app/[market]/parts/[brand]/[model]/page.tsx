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
    <div className="page-wrapper">
      <article className="dtc-card">
        <nav className="breadcrumb">
          <a href={`/${market}/parts`}>Parts</a>
          <span className="sep">›</span>
          <a href={`/${market}/parts/${brand}`}>{brand.toUpperCase()}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>{modelData.model_name}</span>
        </nav>

        <div className="list-hero">
          <h1>{modelData.model_name} — Import Duty & HS Codes</h1>
          <p>
            {parts.length} {parts.length === 1 ? 'part' : 'parts'} available.
            Select a part to view its HS code and AU import duty.
          </p>
        </div>

        {parts.length === 0 ? (
          <div className="model-empty">No parts data available.</div>
        ) : (
          <ul className="dtc-list">
            {parts.map(part => (
              <li key={part.id}>
                <a href={buildPartUrl(market, brand, model, part.slug)} className="dtc-row">
                  <div className="dtc-row-top">
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{part.name_en}</span>
                    {part.category && (
                      <span className="badge badge-info" style={{ textTransform: 'capitalize', fontSize: '10px' }}>
                        {part.category}
                      </span>
                    )}
                  </div>
                  {part.material && (
                    <span className="dtc-desc-cell">{part.material}</span>
                  )}
                  <span className="dtc-arrow">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
