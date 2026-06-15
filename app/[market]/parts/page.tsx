import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getModelsByBrand } from '@/lib/db/models'
import { getPartsByModel } from '@/lib/db/parts'

export async function generateStaticParams() {
  return [{ market: 'au' }]
}

interface Props {
  params: Promise<{ market: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params
  const title = 'BYD EV Parts — Import Duty & HS Codes for Australia'
  const description = 'Find HS codes and Australian import duty rates for BYD EV replacement parts. Front bumpers, headlights, tail lights, fenders and more.'
  const url = `${BASE_URL}/${market}/parts`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
  }
}

export default async function PartsIndexPage({ params }: Props) {
  const { market } = await params
  const models = await getModelsByBrand('byd')

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
        BYD EV 配件进口税费查询
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-faint)', marginBottom: '32px', lineHeight: 1.6 }}>
        查询澳洲进口中国产 BYD 配件的海关编码（HS Code）和关税税率，包含到岸费用估算和速卖通采购链接。
      </p>

      <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: '12px' }}>
        选择车型
      </h2>

      <div style={{ display: 'grid', gap: '8px' }}>
        {models.map((model: { model_id: string; slug: string; model_name: string }) => (
          <a
            key={model.model_id}
            href={`/${market}/parts/byd/${model.slug ?? model.model_id}`}
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
            <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>查看配件 →</span>
          </a>
        ))}
      </div>
    </div>
  )
}
