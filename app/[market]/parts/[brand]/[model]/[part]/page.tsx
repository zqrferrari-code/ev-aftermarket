import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import {
  getPartPageData,
  getAllPartSlugsForModel,
  getAllBydModelSlugs,
  buildHsCodeUrl,
} from '@/lib/db/parts'
import TariffSummary from '@/components/parts/TariffSummary'
import CostCalculator from '@/components/parts/CostCalculator'
import AliexpressCards from '@/components/parts/AliexpressCards'

export async function generateStaticParams() {
  const modelSlugs = await getAllBydModelSlugs()
  const params: { market: string; brand: string; model: string; part: string }[] = []
  for (const modelSlug of modelSlugs) {
    const partSlugs = await getAllPartSlugsForModel(modelSlug)
    for (const partSlug of partSlugs) {
      params.push({ market: 'au', brand: 'byd', model: modelSlug, part: partSlug })
    }
  }
  return params
}

interface Props {
  params: Promise<{ market: string; brand: string; model: string; part: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, model, part } = await params
  const data = await getPartPageData(model, part, market.toUpperCase())
  if (!data) return {}

  const partName = data.part.name_en
  const modelName = data.part.compatible_models.find(m => m.model_id === model)?.model_name ?? model
  const title = `${partName} for ${modelName} — Import Duty & HS Code (${market.toUpperCase()})`
  const description = `${partName} HS code and import duty for ${modelName} to ${market.toUpperCase()}. AU customs code, tariff rate, GST, and AliExpress sourcing links.`
  const url = `${BASE_URL}/${market}/parts/${brand}/${model}/${part}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function PartDetailPage({ params }: Props) {
  const { market, brand, model, part } = await params
  const data = await getPartPageData(model, part, market.toUpperCase())
  if (!data) notFound()

  const { part: partData, cnHsCode, auHsCode, tariffRate } = data
  const modelInfo = partData.compatible_models.find(m => m.model_id === model)
  const modelName = modelInfo?.model_name ?? model
  const dutyRate = tariffRate?.mfn_rate ? parseFloat(tariffRate.mfn_rate) : 0
  const vatRate = tariffRate?.vat_rate ? parseFloat(tariffRate.vat_rate) : 10

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: partData.name_en,
    description: `${partData.name_en} compatible with ${modelName}`,
    brand: { '@type': 'Brand', name: 'BYD' },
  }

  return (
    <>
      <JsonLd schema={jsonLd} />
      <div className="page-wrapper">
        <article className="dtc-card">

          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <a href={`/${market}/parts`}>Parts</a>
            <span className="sep">›</span>
            <a href={`/${market}/parts/${brand}`}>{brand.toUpperCase()}</a>
            <span className="sep">›</span>
            <a href={`/${market}/parts/${brand}/${model}`}>{modelName}</a>
            <span className="sep">›</span>
            <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>{partData.name_en}</span>
          </nav>

          {/* Hero */}
          <div className="detail-hero">
            <h1 className="detail-h1">{partData.name_en}</h1>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {partData.category && (
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{partData.category}</span>
              )}
              {partData.material && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{partData.material}</span>
              )}
              {partData.is_dangerous && (
                <span className="badge badge-critical">Dangerous Goods</span>
              )}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Compatible with: {partData.compatible_models.map(m => m.model_name).join(', ')}
              {modelInfo?.years && ` · ${modelInfo.years}`}
            </p>

            {auHsCode && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                AU HS Code:{' '}
                <a href={buildHsCodeUrl(market, auHsCode.hs_code)}
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 600 }}>
                  {auHsCode.hs_code}
                </a>
                {' '}— view all parts under this code
              </p>
            )}
          </div>

          {/* Tariff summary */}
          <TariffSummary cnHsCode={cnHsCode} auHsCode={auHsCode} tariffRate={tariffRate} />

          {/* Cost calculator */}
          <CostCalculator dutyRate={dutyRate} vatRate={vatRate} />

          {/* AliExpress */}
          <AliexpressCards part={partData} modelName={modelName} />

        </article>
      </div>
    </>
  )
}
