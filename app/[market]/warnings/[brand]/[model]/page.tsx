import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWarningLightsForModel } from '@/lib/db/warning-lights'
import { getModelBySlug } from '@/lib/db/models'
import { getWarningLightBrands, getWarningLightModelSlugs, getActiveMarketCodes } from '@/lib/db/static-params'
import { SeverityBadge } from '@/components/SeverityBadge'
import { DisclaimerBox } from '@/components/DisclaimerBox'
import { BASE_URL } from '@/lib/config'
import type { Severity, WarningLightWithDtcs } from '@/lib/types'

export const revalidate = 1800
export const dynamicParams = true

export async function generateStaticParams() {
  const markets = await getActiveMarketCodes()
  const brands = await getWarningLightBrands()
  const pairs: { market: string; brand: string; model: string }[] = []
  for (const brand of brands) {
    const slugs = await getWarningLightModelSlugs(brand)
    for (const market of markets) {
      for (const model of slugs) {
        pairs.push({ market, brand, model })
      }
    }
  }
  return pairs
}

interface Props {
  params: Promise<{ market: string; brand: string; model: string }>
}

const BRAND_LABELS: Record<string, string> = { byd: 'BYD', mg: 'MG' }
const MARKET_LABELS: Record<string, string> = { au: 'Australia', uk: 'United Kingdom', uae: 'UAE', no: 'Norway' }

const CAN_DRIVE_CONFIG = {
  yes: { label: 'Yes — safe to drive', color: 'oklch(34% 0.14 145)', bg: 'oklch(93% 0.06 145)' },
  caution: { label: 'With caution — monitor closely', color: 'oklch(40% 0.12 70)', bg: 'oklch(95% 0.06 70)' },
  no: { label: 'No — stop driving', color: 'oklch(40% 0.18 25)', bg: 'oklch(95% 0.05 25)' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, brand, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}
  const title = `${modelData.model_name} Warning Lights — Meanings & What To Do | EVAftermarket`
  const description = `Complete guide to ${modelData.model_name} dashboard warning lights: what each light means, whether you can drive, and what to do next.`
  const url = `${BASE_URL}/${market}/warnings/${brand}/${model}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'EVAftermarket', locale: 'en_AU', type: 'article' },
    twitter: { card: 'summary', title, description },
  }
}

function groupByCategory(lights: WarningLightWithDtcs[]): Record<string, WarningLightWithDtcs[]> {
  const groups: Record<string, WarningLightWithDtcs[]> = {}
  for (const l of lights) {
    if (!groups[l.category]) groups[l.category] = []
    groups[l.category].push(l)
  }
  return groups
}

export default async function WarningLightsModelPage({ params }: Props) {
  const { market, brand, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const lights = await getWarningLightsForModel(brand, modelData.model_id)

  const brandLabel = BRAND_LABELS[brand] ?? brand.toUpperCase()
  const groups = groupByCategory(lights)
  const criticalCount = lights.filter((l) => l.severity === 'CRITICAL').length
  const warningCount = lights.filter((l) => l.severity === 'WARNING').length

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <a href={`/${market}/warnings/${brand}`}>{brandLabel} Warning Lights</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>{modelData.model_name}</span>
        </nav>

        {/* Hero */}
        <div className="list-hero">
          <h1>{modelData.model_name} Warning Lights</h1>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '56ch' }}>
            Dashboard warning light meanings and guidance for {modelData.model_name} owners in {MARKET_LABELS[market] ?? market.toUpperCase()}.
          </p>
          <div className="list-stats">
            <div className="stat">
              <span className="stat-num">{lights.length}</span>
              <span className="stat-label">Warning Lights</span>
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
        </div>

        {/* Lights grouped by category */}
        <div className="detail-body" style={{ paddingTop: '4px' }}>
          {Object.entries(groups).map(([category, categoryLights]) => (
            <div key={category} className="section">
              <span className="section-label">{category}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {categoryLights.map((light) => {
                  const canDriveCfg = light.can_drive ? CAN_DRIVE_CONFIG[light.can_drive] : null
                  const causes = light.causes ?? []
                  return (
                    <div key={light.id} style={{
                      border: '1px solid var(--border-soft)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'oklch(99.5% 0 0)',
                    }}>
                      {/* Card header */}
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'oklch(18% 0.01 60)' }}>
                            {light.name_en}
                          </span>
                          {light.severity && <SeverityBadge severity={light.severity as Severity} />}
                        </div>
                      </div>

                      {/* Card body */}
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {light.description_en && (
                          <p style={{ fontSize: '13px', color: 'oklch(28% 0.01 60)', lineHeight: 1.55 }}>
                            {light.description_en}
                          </p>
                        )}

                        {/* Can I drive? */}
                        {canDriveCfg && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '2px', minWidth: '80px',
                            }}>Can I drive?</span>
                            <span style={{
                              fontSize: '12.5px', fontWeight: 600, padding: '2px 8px',
                              borderRadius: '4px', background: canDriveCfg.bg, color: canDriveCfg.color,
                            }}>{canDriveCfg.label}</span>
                          </div>
                        )}

                        {/* Causes */}
                        {causes.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px', minWidth: '80px',
                            }}>Causes</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {causes.map((c, i) => (
                                <span key={i} style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)', lineHeight: 1.45 }}>
                                  — {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action */}
                        {light.action_en && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px', minWidth: '80px',
                            }}>What to do</span>
                            <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)', lineHeight: 1.45 }}>
                              {light.action_en}
                            </span>
                          </div>
                        )}

                        {/* Related DTCs */}
                        {light.dtcs.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{
                              fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '4px', minWidth: '80px',
                            }}>Fault Codes</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {light.dtcs.map((d) => (
                                <a
                                  key={d.dtc_id}
                                  href={`/${market}/dtc/${model}/${d.dtc_code.toLowerCase()}`}
                                  style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700,
                                    padding: '3px 8px', borderRadius: '4px',
                                    background: 'oklch(93% 0.01 60)', color: 'oklch(28% 0.01 60)',
                                    textDecoration: 'none', border: '1px solid var(--border-soft)',
                                  }}
                                  title={d.description_en}
                                >
                                  {d.dtc_code}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <DisclaimerBox confidence="community" sourceUrls={[]} />
      </article>
    </div>
  )
}
