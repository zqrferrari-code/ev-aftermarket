import type { Metadata } from 'next'
import { BASE_URL } from '@/lib/config'
import { getModelsByBrand } from '@/lib/db/models'

export async function generateStaticParams() {
  return [{ market: 'au' }]
}

interface Props {
  params: Promise<{ market: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params
  const title = 'BYD EV Parts — Import Duty & HS Codes for Australia'
  const description = 'Find HS codes and Australian import duty rates for BYD EV replacement parts sourced from China. Front bumpers, headlights, fenders and more.'
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
    <div className="page-wrapper">
      <article className="dtc-card">
        <div className="list-hero">
          <h1>BYD EV Parts — Import Duty & HS Codes</h1>
          <p>
            Look up Australian import HS codes and duty rates for BYD EV replacement parts sourced from China.
            Includes a landed cost calculator and AliExpress sourcing links.
          </p>
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
                href={`/${market}/parts/byd/${model.model_id}`}
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
