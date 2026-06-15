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
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '24px' }}>
          <a href={`/${market}/parts`} style={{ color: 'var(--accent)' }}>Parts</a>
          {' / '}
          <a href={`/${market}/parts/${brand}`} style={{ color: 'var(--accent)' }}>{brand.toUpperCase()}</a>
          {' / '}
          <a href={`/${market}/parts/${brand}/${model}`} style={{ color: 'var(--accent)' }}>{modelName}</a>
          {' / '}
          <span>{partData.name_en}</span>
        </nav>

        {/* Header */}
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          {partData.name_en}
        </h1>
        {partData.name_cn && (
          <p style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '8px' }}>
            {partData.name_cn}
          </p>
        )}
        <p style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '32px' }}>
          Compatible with: {partData.compatible_models.map(m => m.model_name).join(', ')}
          {modelInfo?.years && ` · ${modelInfo.years}`}
        </p>

        {/* Part meta */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {partData.category && <MetaChip label="Category" value={partData.category} />}
          {partData.material && <MetaChip label="Material" value={partData.material} />}
          {partData.is_dangerous && <MetaChip label="Dangerous Goods" value="Yes" warn />}
        </div>

        {/* HS code link */}
        {auHsCode && (
          <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px' }}>
            AU HS Code:{' '}
            <a href={buildHsCodeUrl(market, auHsCode.hs_code)} style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
              {auHsCode.hs_code}
            </a>
            {' '}— view all parts under this code
          </p>
        )}

        {/* Main sections */}
        <div style={{ display: 'grid', gap: '24px' }}>
          <TariffSummary cnHsCode={cnHsCode} auHsCode={auHsCode} tariffRate={tariffRate} />
          <CostCalculator dutyRate={dutyRate} vatRate={vatRate} />
          <AliexpressCards part={partData} modelName={modelName} />
        </div>

      </div>
    </>
  )
}

function MetaChip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <span style={{
      fontSize: '12px',
      padding: '3px 10px',
      borderRadius: '3px',
      border: `1px solid ${warn ? 'var(--warn, #f59e0b)' : 'var(--border)'}`,
      color: warn ? 'var(--warn, #f59e0b)' : 'var(--text-faint)',
    }}>
      <strong>{label}：</strong>{value}
    </span>
  )
}
