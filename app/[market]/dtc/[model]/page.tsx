import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getModelBySlug } from '@/lib/db/models'
import { getDTCsByModel } from '@/lib/db/dtcs'
import { SeverityBadge } from '@/components/SeverityBadge'
import { JsonLd } from '@/components/JsonLd'
import type { Severity } from '@/lib/types'
import { BASE_URL } from '@/lib/config'

export const revalidate = 3600

interface Props {
  params: Promise<{ market: string; model: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}

  const dtcs = await getDTCsByModel(modelData.model_id)
  const count = dtcs.length

  const title = `${modelData.model_name} Fault Codes — ${count} Codes Listed (${market.toUpperCase()})`
  const description = `${count} fault codes for the ${modelData.model_name} in ${market.toUpperCase()}. Find DTC meanings, severity levels, and repair tips based on real owner cases. Updated ${new Date().getFullYear()}.`
  const url = `${BASE_URL}/${market}/dtc/${model}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function DtcModelPage({ params }: Props) {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const dtcs = await getDTCsByModel(modelData.model_id)

  const baseUrl = BASE_URL

  const criticalCount = dtcs.filter((d) => d.severity === 'CRITICAL').length
  const warningCount = dtcs.filter((d) => d.severity === 'WARNING').length

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${modelData.model_name} Fault Codes`,
    itemListElement: dtcs.map((dtc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${dtc.dtc_code} — ${dtc.description_en}`,
      url: `${baseUrl}/${market}/dtc/${model}/${dtc.dtc_code?.toLowerCase()}`,
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${baseUrl}/${market}` },
      { '@type': 'ListItem', position: 2, name: `${modelData.model_name} Fault Codes`, item: `${baseUrl}/${market}/dtc/${model}` },
    ],
  }

  return (
    <>
      <JsonLd schema={itemListSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <div className="page-wrapper">
        <div className="dtc-card">
          <nav className="breadcrumb">
            <a href={`/${market}`}>{market.toUpperCase()}</a>
            <span className="sep">›</span>
            <a href={`/${market}/dtc/${model}`}>{modelData.model_name}</a>
            <span className="sep">›</span>
            <span>Fault Codes</span>
          </nav>

          <div className="list-hero">
            <h1>{modelData.model_name} Fault Codes</h1>
            <p className="text-gray-600 max-w-2xl mt-2 mb-6">
              Below is a complete list of known fault codes (DTC) for the {modelData.model_name} in {market.toUpperCase()}.
              Each code includes its meaning, severity level, and links to real owner repair cases where available.
              Use this list to diagnose warning lights and understand potential repair costs before visiting a service centre.
            </p>
            <p>
              All known diagnostic trouble codes for the {modelData.model_name} in{' '}
              {market.toUpperCase()} — meanings, severity levels, and what to do.
            </p>
            {dtcs.length > 0 && (
              <div className="list-stats">
                <div className="stat">
                  <span className="stat-num">{dtcs.length}</span>
                  <span className="stat-label">Total codes</span>
                </div>
                {criticalCount > 0 && (
                  <div className="stat">
                    <span className="stat-num red">{criticalCount}</span>
                    <span className="stat-label">Critical</span>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="stat">
                    <span className="stat-num amber">{warningCount}</span>
                    <span className="stat-label">Warning</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {dtcs.length === 0 ? (
            <p style={{ padding: '32px 28px', color: 'var(--text-muted)', fontSize: '14px' }}>
              Building fault code database. Check back soon.
            </p>
          ) : (
            <ul className="dtc-list">
              {dtcs.map((dtc) => (
                <li key={dtc.dtc_id}>
                  <a
                    href={`/${market}/dtc/${model}/${dtc.dtc_code?.toLowerCase()}`}
                    className="dtc-row"
                  >
                    <div className="dtc-row-top">
                      <span className="dtc-code-cell">{dtc.dtc_code}</span>
                      {dtc.severity && <SeverityBadge severity={dtc.severity as Severity} />}
                      <span className="dtc-arrow">›</span>
                    </div>
                    <span className="dtc-desc-cell">{dtc.description_en}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
