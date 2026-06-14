import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getModelBySlug } from '@/lib/db/models'
import { getDTCsForModel } from '@/lib/db/dtcs'
import { getUpdatesForModel } from '@/lib/db/updates'
import { SeverityBadge } from '@/components/SeverityBadge'
import type { Severity } from '@/lib/types'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'
import { FeedbackButton } from '@/components/FeedbackButton'
import { getPurchasePricesForModel } from '@/lib/db/purchase-prices'
import { getReviewsForModel } from '@/lib/db/cases'
import { getAggregateRatingForModel } from '@/lib/db/aggregate-ratings'



export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((slug) => ({ market, slug })))
}

interface Props {
  params: Promise<{ market: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, slug } = await params
  const model = await getModelBySlug(slug)
  if (!model) return {}

  const title = `${model.model_name} — Fault Codes, Updates & Guides (${market.toUpperCase()})`
  const description = `Complete ${model.model_name} resource: fault codes, software updates, common problems, charging guide, and service costs for ${market.toUpperCase()} owners.`
  const url = `${BASE_URL}/${market}/models/${slug}`

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
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

function toStr(val: unknown): string {
  if (typeof val === 'string') return val
  if (val == null) return ''
  return JSON.stringify(val)
}

function toArr(val: unknown): unknown[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val as string) } catch { return [] }
}

function methodLabel(m: string) {
  if (m === 'OTA') return 'Over-the-Air'
  if (m === 'dealer_only') return 'Dealer Required'
  if (m === 'usb') return 'USB'
  return m
}

export default async function ModelPage({
  params,
}: Props) {
  const { market, slug } = await params
  const model = await getModelBySlug(slug)
  if (!model) notFound()

  const [dtcNotes, updates, purchasePrices, reviews, aggregateRating] = await Promise.all([
    getDTCsForModel(model.model_id),
    getUpdatesForModel(model.model_id, market),
    getPurchasePricesForModel(model.model_id, market),
    getReviewsForModel(model.model_id, market),
    getAggregateRatingForModel(model.model_id, market),
  ])

  const criticalCount = dtcNotes.filter(n => n.severity === 'CRITICAL').length
  const warningCount = dtcNotes.filter(n => n.severity === 'WARNING').length

  return (
    <>
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: model.model_name,
          ...(model.image_url && { image: model.image_url }),
          brand: {
            '@type': 'Brand',
            name: model.brand_id,
          },
          description: `${model.model_name} specifications, common fault codes, and real owner experiences.`,
          url: `${BASE_URL}/${market}/models/${slug}`,
          ...(purchasePrices.length > 0 && {
            offers: purchasePrices.map((p) => ({
              '@type': 'Offer',
              name: p.variant_name,
              price: p.price,
              priceCurrency: p.currency,
              url: `${BASE_URL}/${market}/models/${slug}`,
              availability: 'https://schema.org/InStock',
              priceValidUntil: `${new Date().getFullYear() + 1}-01-01`,
            })),
          }),
          ...(aggregateRating && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: aggregateRating.rating_value,
              reviewCount: aggregateRating.review_count,
              bestRating: 5,
              worstRating: 1,
            },
          }),
          ...(reviews.length > 0 && {
            review: reviews.slice(0, 5).map((r) => ({
              '@type': 'Review',
              author: { '@type': 'Person', name: r.source_name ?? 'Verified Owner' },
              datePublished: r.report_date ?? undefined,
              reviewBody: r.symptom_summary,
              ...(r.rating != null && {
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: r.rating,
                  bestRating: 5,
                  worstRating: 1,
                },
              }),
            })),
          }),
        }}
      />
      <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>{model.model_name}</span>
        </nav>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 28px 0' }}>
          <FeedbackButton context={`${model.model_name} — ${market.toUpperCase()}`} defaultType="missing" />
        </div>

        {/* Hero — reuse .list-hero */}
        <div className="list-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1>{model.model_name}</h1>
            {model.vehicle_type && (
              <span style={{
                fontFamily: 'var(--font-cond)', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: 'oklch(93% 0.06 145)', color: 'var(--green-text)',
                padding: '3px 8px', borderRadius: '3px', lineHeight: 1,
                alignSelf: 'center',
              }}>{model.vehicle_type}</span>
            )}
          </div>
          <p>{model.years ?? ' '}</p>
          {dtcNotes.length > 0 && (
            <div className="list-stats">
              <div className="stat">
                <span className="stat-num">{dtcNotes.length}</span>
                <span className="stat-label">Fault Codes</span>
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
              {updates.length > 0 && (
                <div className="stat">
                  <span className="stat-num">{updates.length}</span>
                  <span className="stat-label">SW Updates</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fault Codes section header */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Fault Codes</span>
        </div>

        {dtcNotes.length === 0 ? (
          <p style={{ padding: '32px 28px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No fault codes recorded yet for this model.
          </p>
        ) : (
          <ul className="dtc-list">
            {dtcNotes.map((n) => {
              const causes = toArr(n.likely_causes)
              const actions = toArr(n.suggested_actions)
              const desc = toStr(n.description_en)
              const climate = toStr(n.climate_notes)

              return (
                <li key={n.note_id}>
                  {/* Code row — click goes to DTC detail */}
                  <a
                    href={`/${market}/dtc/${slug}/${n.dtc_code?.toLowerCase()}`}
                    className="dtc-row"
                  >
                    <div className="dtc-row-top">
                      <span className="dtc-code-cell">{n.dtc_code}</span>
                      {n.severity && <SeverityBadge severity={n.severity as Severity} />}
                      <span className="dtc-arrow">›</span>
                    </div>
                    <span className="dtc-desc-cell">{desc}</span>
                  </a>

                  {/* Expandable detail below the row — causes / actions / climate */}
                  {(causes.length > 0 || actions.length > 0 || climate) && (
                    <div style={{
                      padding: '0 28px 14px',
                      borderBottom: '1px solid oklch(93.5% 0.003 60)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      {causes.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{
                            fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px',
                            minWidth: '52px',
                          }}>Causes</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {causes.slice(0, 3).map((c, i) => (
                              <span key={i} style={{
                                fontSize: '12.5px', color: 'oklch(36% 0.01 60)', lineHeight: 1.45,
                              }}>
                                — {typeof c === 'string' ? c : toStr(c)}
                              </span>
                            ))}
                            {causes.length > 3 && (
                              <a
                                href={`/${market}/dtc/${slug}/${n.dtc_code?.toLowerCase()}`}
                                style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}
                              >
                                +{causes.length - 3} more →
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {actions.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{
                            fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px',
                            minWidth: '52px',
                          }}>Actions</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {actions.slice(0, 2).map((a, i) => (
                              <span key={i} style={{
                                fontSize: '12.5px', color: 'oklch(36% 0.01 60)', lineHeight: 1.45,
                              }}>
                                — {typeof a === 'string' ? a : (a as { title?: string }).title ?? toStr(a)}
                              </span>
                            ))}
                            {actions.length > 2 && (
                              <a
                                href={`/${market}/dtc/${slug}/${n.dtc_code?.toLowerCase()}`}
                                style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}
                              >
                                +{actions.length - 2} more →
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {climate && (
                        <p className="climate-note" style={{ marginTop: '2px' }}>{climate}</p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Software Updates */}
        {updates.length > 0 && (
          <>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">Software Updates</span>
            </div>
            <ul style={{ listStyle: 'none' }}>
              {updates.map((u, idx) => (
                <li key={u.update_id} style={{
                  padding: '14px 28px',
                  borderBottom: idx < updates.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700,
                      color: 'oklch(20% 0.01 60)',
                    }}>{u.version}</span>
                    {u.update_method && (
                      <span style={{
                        fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: '3px',
                        background: 'oklch(93% 0.05 230)', color: 'oklch(34% 0.14 230)',
                      }}>{methodLabel(u.update_method)}</span>
                    )}
                    {u.release_date && (
                      <span style={{ fontSize: '12px', color: 'var(--text-faint)', marginLeft: 'auto' }}>
                        {u.release_date}
                      </span>
                    )}
                  </div>
                  {u.changelog_en && (
                    <p style={{ fontSize: '13px', color: 'oklch(34% 0.01 60)', lineHeight: 1.55, maxWidth: '68ch' }}>
                      {typeof u.changelog_en === 'string' ? u.changelog_en : JSON.stringify(u.changelog_en)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Owner Reviews */}
        {(aggregateRating || reviews.length > 0) && (
          <>
            <div style={{
              padding: '10px 28px',
              background: 'oklch(97.5% 0.003 60)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border-soft)',
            }}>
              <span className="section-label">Owner Reviews</span>
            </div>

            {aggregateRating && (
              <div style={{
                padding: '16px 28px',
                borderBottom: '1px solid var(--border-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}>
                <span style={{ fontSize: '32px', fontWeight: 700, color: 'oklch(22% 0.01 60)', lineHeight: 1 }}>
                  {aggregateRating.rating_value.toFixed(1)}
                </span>
                <div>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '3px' }}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{
                        fontSize: '16px',
                        color: i <= Math.round(aggregateRating.rating_value) ? 'oklch(75% 0.15 80)' : 'oklch(85% 0.01 60)',
                      }}>★</span>
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {aggregateRating.review_count} reviews via{' '}
                    <a href={aggregateRating.source_url ?? '#'} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--green)', textDecoration: 'none' }}>
                      ProductReview.com.au
                    </a>
                  </span>
                </div>
              </div>
            )}

            {reviews.length > 0 && (
              <ul style={{ listStyle: 'none' }}>
                {reviews.slice(0, 5).map((r, idx) => (
                  <li key={r.case_id} style={{
                    padding: '14px 28px',
                    borderBottom: idx < Math.min(reviews.length, 5) - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {r.rating != null && (
                        <div style={{ display: 'flex', gap: '1px' }}>
                          {[1,2,3,4,5].map(i => (
                            <span key={i} style={{
                              fontSize: '13px',
                              color: i <= r.rating! ? 'oklch(75% 0.15 80)' : 'oklch(85% 0.01 60)',
                            }}>★</span>
                          ))}
                        </div>
                      )}
                      {r.report_date && (
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{r.report_date}</span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: 'oklch(34% 0.01 60)', lineHeight: 1.55 }}>
                      {r.symptom_summary}
                    </p>
                    {r.source_url && (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}>
                        via {r.source_name} →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Quick Links */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">More Resources</span>
        </div>

        <div style={{ padding: '18px 28px', display: 'grid', gap: '12px' }}>
          <a
            href={`/${market}/problems/${slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              border: '1px solid var(--border-soft)',
              borderRadius: '6px',
              textDecoration: 'none',
              background: 'oklch(99% 0 0)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '2px' }}>
                Common Problems
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Real owner reports from Australian EV communities
              </div>
            </div>
            <span style={{ color: 'var(--green)', fontSize: '18px' }}>›</span>
          </a>

          <a
            href={`/${market}/charging/${slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              border: '1px solid var(--border-soft)',
              borderRadius: '6px',
              textDecoration: 'none',
              background: 'oklch(99% 0 0)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '2px' }}>
                Charging Guide
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                CCS2 port specs, charge times, compatible networks
              </div>
            </div>
            <span style={{ color: 'var(--green)', fontSize: '18px' }}>›</span>
          </a>

          <a
            href={`/${market}/service/${slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              border: '1px solid var(--border-soft)',
              borderRadius: '6px',
              textDecoration: 'none',
              background: 'oklch(99% 0 0)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '2px' }}>
                Service Costs
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Annual service price, what's included, dealer vs independent
              </div>
            </div>
            <span style={{ color: 'var(--green)', fontSize: '18px' }}>›</span>
          </a>

          <a
            href={`/${market}/warnings/${model.brand_id}/${slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              border: '1px solid var(--border-soft)',
              borderRadius: '6px',
              textDecoration: 'none',
              background: 'oklch(99% 0 0)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '2px' }}>
                Warning Lights
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Dashboard warning light meanings and what to do
              </div>
            </div>
            <span style={{ color: 'var(--green)', fontSize: '18px' }}>›</span>
          </a>

          {market === 'au' && (
            <a
              href={`/${market}/dealers/${model.brand_id}/nsw`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: '1px solid var(--border-soft)',
                borderRadius: '6px',
                textDecoration: 'none',
                background: 'oklch(99% 0 0)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '2px' }}>
                  Find a Dealer
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Authorised service centres and dealer locations
                </div>
              </div>
              <span style={{ color: 'var(--green)', fontSize: '18px' }}>›</span>
            </a>
          )}
        </div>

      </article>
    </div>
    </>
  )
}
