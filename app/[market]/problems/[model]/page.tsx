import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getModelBySlug } from '@/lib/db/models'
import { getProblemCasesForModel } from '@/lib/db/cases'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'

interface Props {
  params: Promise<{ market: string; model: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const vehicleModel = await getModelBySlug(model)
  if (!vehicleModel) return {}

  const title = `${vehicleModel.model_name} Common Problems & Reliability — Owner Reports (${market.toUpperCase()})`
  const description = `Honest overview of ${vehicleModel.model_name} common problems reported by real owners: issues, resolutions, and costs.`
  const url = `${BASE_URL}/${market}/problems/${model}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'EVAftermarket',
      locale: 'en_AU',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function ProblemsPage({ params }: Props) {
  const { market, model } = await params
  const vehicleModel = await getModelBySlug(model)
  if (!vehicleModel) notFound()

  const problemCases = await getProblemCasesForModel(vehicleModel.model_id, market)

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <a href={`/${market}/models/${model}`}>{vehicleModel.model_name}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>Problems</span>
        </nav>

        {/* Hero */}
        <div className="list-hero">
          <h1>{vehicleModel.model_name} — Common Problems</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Real owner reports from Australian EV communities.
          </p>
          {problemCases.length > 0 && (
            <div className="list-stats">
              <div className="stat">
                <span className="stat-num">{problemCases.length}</span>
                <span className="stat-label">Owner Reports</span>
              </div>
              {problemCases.filter(c => c.resolution).length > 0 && (
                <div className="stat">
                  <span className="stat-num" style={{ color: 'var(--green)' }}>
                    {problemCases.filter(c => c.resolution).length}
                  </span>
                  <span className="stat-label">Resolved</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section header */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Owner Reports</span>
        </div>

        {problemCases.length === 0 ? (
          <p style={{ padding: '32px 28px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No owner problem reports collected yet for this model.
          </p>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {problemCases.map((c, idx) => (
              <li key={c.case_id} style={{
                padding: '18px 28px',
                borderBottom: idx < problemCases.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
              }}>
                <p style={{ fontSize: '14px', color: 'oklch(22% 0.01 60)', lineHeight: 1.6, marginBottom: c.resolution || c.cost_info || c.location ? '10px' : 0 }}>
                  {c.symptom_summary}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {c.resolution && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{
                        fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px',
                      }}>Resolution</span>
                      <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>{c.resolution}</span>
                    </div>
                  )}
                  {c.cost_info && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{
                        fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px',
                      }}>Cost</span>
                      <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>{c.cost_info}</span>
                    </div>
                  )}
                  {c.location && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{
                        fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px',
                      }}>Location</span>
                      <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>{c.location}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {c.source_name && (
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                      via {c.source_name}
                    </span>
                  )}
                  {c.report_date && (
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{c.report_date}</span>
                  )}
                  {c.source_url && (
                    <a
                      href={c.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}
                    >
                      Source →
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Link back to fault codes */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--border)',
          background: 'oklch(97.5% 0.003 60)',
        }}>
          <a href={`/${market}/models/${model}`} style={{
            fontSize: '13px', color: 'var(--green)', fontWeight: 600, textDecoration: 'none',
          }}>
            ← View fault codes for {vehicleModel.model_name}
          </a>
        </div>

        <JsonLd schema={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${BASE_URL}/${market}` },
            { '@type': 'ListItem', position: 2, name: vehicleModel.model_name, item: `${BASE_URL}/${market}/models/${model}` },
            { '@type': 'ListItem', position: 3, name: 'Common Problems', item: `${BASE_URL}/${market}/problems/${model}` },
          ],
        }} />
        {problemCases.length > 0 && (
          <JsonLd schema={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: problemCases.slice(0, 3).map(c => ({
              '@type': 'Question',
              name: c.symptom_summary.slice(0, 120),
              acceptedAnswer: {
                '@type': 'Answer',
                text: c.resolution ?? 'No confirmed resolution yet — monitor for updates.',
              },
            })),
          }} />
        )}

      </article>
    </div>
  )
}
