import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getModelBySlug } from '@/lib/db/models'
import { getChargingCasesForModel } from '@/lib/db/cases'
import { VEHICLE_SPECS } from '@/lib/vehicle-specs'
import { AU_CHARGING_NETWORKS, UK_CHARGING_NETWORKS, HOME_CHARGER_MODELS, HOME_CHARGER_FAQ, HOME_CHARGER_INSTALL_STEPS, HOME_CHARGER_DATA_NOTE } from '@/lib/charging-data'
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

  const title = `${vehicleModel.model_name} Charging Guide — Networks, Home Charger & Costs (${market.toUpperCase()})`
  const description = `${vehicleModel.model_name} charging guide: public network pricing, home wallbox installation cost, charge times, and compatible networks in ${market.toUpperCase()}.`
  const url = `${BASE_URL}/${market}/charging/${model}`

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

export default async function ChargingPage({ params }: Props) {
  const { market, model } = await params
  const vehicleModel = await getModelBySlug(model)
  if (!vehicleModel) notFound()

  const chargingCases = await getChargingCasesForModel(vehicleModel.model_id, market)

  return (
    <>
      <JsonLd schema={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${BASE_URL}/${market}` },
          { '@type': 'ListItem', position: 2, name: vehicleModel.model_name, item: `${BASE_URL}/${market}/models/${vehicleModel.slug}` },
          { '@type': 'ListItem', position: 3, name: 'Charging Guide', item: `${BASE_URL}/${market}/charging/${vehicleModel.slug}` },
        ],
      }} />
      <JsonLd schema={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: HOME_CHARGER_FAQ.slice(0, 4).map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }} />
      <JsonLd schema={{
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `How to Charge ${vehicleModel.model_name} at Home`,
        description: `Step-by-step guide to setting up home charging for the ${vehicleModel.model_name}.`,
        step: [
          {
            '@type': 'HowToStep',
            name: 'Choose a home charger',
            text: 'Select a Level 2 charger (7kW or 22kW) compatible with your vehicle.',
          },
          {
            '@type': 'HowToStep',
            name: 'Install the charging unit',
            text: 'Hire a licensed electrician to install a dedicated charging circuit and wall unit.',
          },
          {
            '@type': 'HowToStep',
            name: 'Connect and charge',
            text: 'Plug the charging cable into your vehicle. Use the companion app to schedule overnight charging.',
          },
        ],
      }} />
      <ChargingContent market={market} vehicleModel={vehicleModel} chargingCases={chargingCases} />
    </>
  )
}

// ─── section header helper ───────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '10px 28px',
      background: 'oklch(97.5% 0.003 60)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border-soft)',
    }}>
      <span className="section-label">{label}</span>
    </div>
  )
}

// ─── main content ─────────────────────────────────────────────────────────────
function ChargingContent({ market, vehicleModel, chargingCases }: {
  market: string
  vehicleModel: { model_name: string; slug: string; model_id: string }
  chargingCases: Array<{
    case_id: number
    symptom_summary: string
    resolution: string | null
    cost_info: string | null
    location: string | null
    report_date: string | null
    source_name: string | null
    source_url: string | null
  }>
}) {
  const specs = VEHICLE_SPECS[vehicleModel.model_id]?.charging
  const networks = market === 'au' ? AU_CHARGING_NETWORKS : market === 'uk' ? UK_CHARGING_NETWORKS : []
  const currency = market === 'au' ? 'AUD' : market === 'uk' ? 'GBP' : 'USD'

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <a href={`/${market}/models/${vehicleModel.slug}`}>{vehicleModel.model_name}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>Charging Guide</span>
        </nav>

        {/* Hero */}
        <div className="list-hero">
          <h1>{vehicleModel.model_name} — Charging Guide</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '60ch' }}>
            Public charging networks with pricing, home wallbox recommendations, installation costs, and battery tips.
          </p>
        </div>

        {/* ── Vehicle Charging Specs ── */}
        <SectionHeader label="Vehicle Charging Specs" />

        <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <p style={{ fontSize: '14px', color: 'oklch(22% 0.01 60)', lineHeight: 1.6, marginBottom: '14px' }}>
            The {vehicleModel.model_name} uses a <strong>{specs?.chargingPort ?? 'CCS2'}</strong> (Combined Charging System Type 2) port —
            one socket for both AC and DC charging.
          </p>

          {/* Spec grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1px',
            background: 'var(--border-soft)',
            border: '1px solid var(--border-soft)',
            borderRadius: '5px',
            overflow: 'hidden',
            marginBottom: '14px',
          }}>
            {[
              { label: 'Battery', value: specs?.batteryCapacity ?? '—' },
              { label: 'Range (WLTP)', value: specs?.range ?? '—' },
              { label: 'AC Charging', value: specs?.acChargePower ? `Up to ${specs.acChargePower}` : '7.4 kW' },
              { label: 'DC Fast Charging', value: specs?.dcChargePower ? `Up to ${specs.dcChargePower}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'oklch(99% 0.002 60)', padding: '12px 16px' }}>
                <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-cond)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Charge time table */}
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'oklch(97.5% 0.003 60)' }}>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Charger Type</th>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Speed</th>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>20% → 80%</th>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Full Charge</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>Granny cable (10A)</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>2.4 kW</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>~14–18 hrs</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>~24–28 hrs</td>
              </tr>
              <tr style={{ background: 'oklch(98.5% 0.002 60)' }}>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>Home wallbox (Level 2)</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>{specs?.acChargePower ?? '7.4 kW'}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>{specs?.acTime_20_80 ?? '~4–5 hrs'}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>{specs?.acTime_full ?? '~8–10 hrs'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>DC fast charging</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>{specs?.dcChargePower ?? '60–80 kW'}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>{specs?.dcTime_20_80 ?? '~30–40 min'}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px 10px' }}>{specs?.dcTime_full ?? '~50–60 min'}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '8px' }}>
            Times are estimates. Vary with temperature, battery state, and charger output. Real-world ±15%.
          </p>
        </div>

        {/* ── Public Charging Networks ── */}
        {networks.length > 0 && (
          <>
            <SectionHeader label={`Public Charging Networks — ${market.toUpperCase()}`} />

            <ul style={{ listStyle: 'none' }}>
              {networks.map((n, idx) => (
                <li key={n.name} style={{
                  padding: '16px 28px',
                  borderBottom: idx < networks.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontWeight: 700, fontSize: '15px',
                        color: n.ok ? 'var(--green)' : 'var(--red)',
                        minWidth: '18px',
                      }}>
                        {n.ok ? '✓' : '✗'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'oklch(22% 0.01 60)' }}>{n.name}</span>
                      <span style={{
                        fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: 'oklch(93% 0.003 60)', color: 'oklch(46% 0.01 60)',
                        padding: '2px 7px', borderRadius: '3px',
                      }}>{n.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <a
                        href={n.pricingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: 'var(--font-cond)', fontSize: '11px', fontWeight: 700,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: 'oklch(36% 0.12 145)', textDecoration: 'none',
                          padding: '3px 9px', border: '1px solid oklch(80% 0.06 145)',
                          borderRadius: '3px', background: 'oklch(97% 0.006 145)',
                        }}
                      >
                        View pricing →
                      </a>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'oklch(36% 0.01 60)', lineHeight: 1.5, marginBottom: '6px', paddingLeft: '28px' }}>
                    {n.note}
                  </p>

                  <div style={{ paddingLeft: '28px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                      {n.stationCount}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                      Max: {n.maxSpeed}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                      Pay: {n.paymentOptions.join(', ')}
                    </span>
                    {n.pricingNote && (
                      <span style={{ fontSize: '12px', color: 'oklch(56% 0.08 85)', fontStyle: 'italic' }}>
                        {n.pricingNote}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Station finder */}
            <StationFinder market={market} />
          </>
        )}

        {/* ── Home Charger (EVSE) ── */}
        <SectionHeader label="Home Charger (EVSE) — Buying Guide" />

        <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <p style={{ fontSize: '14px', color: 'oklch(22% 0.01 60)', lineHeight: 1.6, marginBottom: '16px' }}>
            The included granny cable (2.4 kW / 10A) works for overnight charging, but a dedicated Level 2 wallbox charges
            3× faster and is more reliable for daily use. Cost to own and install: <strong>A$1,200–$2,000 all-in</strong>.
          </p>

          <ul style={{ listStyle: 'none' }}>
            {HOME_CHARGER_MODELS.map((evse, idx) => (
              <li key={evse.name} style={{
                padding: '16px 0',
                borderTop: idx > 0 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'oklch(22% 0.01 60)' }}>{evse.name}</span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>{evse.brand}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600,
                      color: 'oklch(46% 0.01 60)',
                    }}>{evse.price}</span>
                    <span style={{
                      fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: 'oklch(93% 0.06 145)', color: 'var(--green-text)',
                      padding: '2px 7px', borderRadius: '3px',
                    }}>{evse.type}</span>
                  </div>
                </div>
                {evse.note && (
                  <p style={{ fontSize: '13px', color: 'oklch(36% 0.01 60)', lineHeight: 1.5, marginBottom: '8px' }}>
                    {evse.note}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {evse.features.map(f => (
                    <span key={f} style={{
                      fontSize: '11.5px', color: 'oklch(36% 0.01 60)',
                      background: 'oklch(96% 0.003 60)', border: '1px solid var(--border-soft)',
                      padding: '3px 8px', borderRadius: '3px',
                    }}>{f}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '12px', fontStyle: 'italic' }}>
            {HOME_CHARGER_DATA_NOTE}
          </p>
        </div>

        {/* ── Installation Steps ── */}
        <SectionHeader label="Home Charger Installation" />

        <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <ol style={{ listStyle: 'none', display: 'grid', gap: '16px' }}>
            {HOME_CHARGER_INSTALL_STEPS.map((step) => (
              <li key={step.step} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: '12px', alignItems: 'start' }}>
                <span style={{
                  width: '28px', height: '28px',
                  borderRadius: '50%',
                  background: 'oklch(50% 0.18 145)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: '13px',
                  flexShrink: 0,
                }}>
                  {step.step}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'oklch(22% 0.01 60)', marginBottom: '3px' }}>
                    {step.title}
                  </div>
                  <p style={{ fontSize: '13px', color: 'oklch(46% 0.01 60)', lineHeight: 1.55 }}>
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="climate-note" style={{ marginTop: '16px' }}>
            <strong>Rebates available:</strong> Check your state government website for EV charger rebates before purchasing.
            Victoria (Solar Victoria), NSW, and ACT all have active programs in 2025. Some require specific approved charger models.
          </div>
        </div>

        {/* ── Charging FAQ ── */}
        <SectionHeader label="Home Charging FAQ" />

        <div style={{ borderBottom: '1px solid var(--border-soft)' }}>
          {HOME_CHARGER_FAQ.map((item, idx) => (
            <div key={idx} style={{
              padding: '16px 28px',
              borderBottom: idx < HOME_CHARGER_FAQ.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
            }}>
              <p style={{ fontWeight: 600, fontSize: '13.5px', color: 'oklch(22% 0.01 60)', marginBottom: '6px', lineHeight: 1.4 }}>
                {item.q}
              </p>
              <p style={{ fontSize: '13px', color: 'oklch(36% 0.01 60)', lineHeight: 1.6 }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>

        {/* ── Charging Tips ── */}
        <SectionHeader label="Battery & Charging Tips" />

        <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <ul style={{ listStyle: 'none', display: 'grid', gap: '10px' }}>
            {[
              { title: 'Charge to 80% for daily use', body: 'Reduces cell stress and charging time. Reserve 100% for road trips only.' },
              { title: 'Precondition before DC fast charging', body: 'In cold weather, warm the battery first (via scheduled charging or cabin pre-heat) for faster DC speeds.' },
              { title: 'DC slows above 80% — that\'s normal', body: 'Battery management intentionally limits current above 80% to protect longevity. Not a fault.' },
              { title: 'Overnight AC is gentler than frequent DC', body: 'Daily Level 2 home charging is the best long-term habit. Reserve DC fast charging for long trips.' },
              { title: 'Keep above 10% when parked long-term', body: 'Lithium cells degrade faster when stored at very low state of charge. Aim for 20–50% if storing > 2 weeks.' },
            ].map((tip, idx) => (
              <li key={idx} style={{
                display: 'grid', gridTemplateColumns: '20px 1fr', gap: '10px', alignItems: 'start',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'oklch(50% 0.18 145)',
                  display: 'block', marginTop: '7px', flexShrink: 0,
                }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'oklch(22% 0.01 60)' }}>{tip.title}</span>
                  {' — '}
                  <span style={{ fontSize: '13px', color: 'oklch(46% 0.01 60)' }}>{tip.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Owner Charging Reports ── */}
        {chargingCases.length > 0 && (
          <>
            <SectionHeader label={`Owner Charging Reports (${chargingCases.length})`} />
            <ul style={{ listStyle: 'none' }}>
              {chargingCases.map((c, idx) => (
                <li key={c.case_id} style={{
                  padding: '18px 28px',
                  borderBottom: idx < chargingCases.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none',
                }}>
                  <p style={{ fontSize: '14px', color: 'oklch(22% 0.01 60)', lineHeight: 1.6, marginBottom: c.resolution || c.cost_info || c.location ? '10px' : 0 }}>
                    {c.symptom_summary}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {c.resolution && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px' }}>Resolution</span>
                        <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>{c.resolution}</span>
                      </div>
                    )}
                    {c.cost_info && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px' }}>Cost</span>
                        <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>{c.cost_info}</span>
                      </div>
                    )}
                    {c.location && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: 'var(--font-cond)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(56% 0.02 60)', whiteSpace: 'nowrap', paddingTop: '1px' }}>Location</span>
                        <span style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>{c.location}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {c.source_name && <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>via {c.source_name}</span>}
                    {c.report_date && <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{c.report_date}</span>}
                    {c.source_url && (
                      <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>
                        Source →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Recommended Home Chargers (Affiliate) ── */}
        <section className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Recommended Home Chargers</h2>
          <p className="text-sm text-gray-500 mb-4">
            * Affiliate disclosure: we may earn a small commission if you purchase via these links, at no extra cost to you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://evnex.com/products/e2"
              rel="sponsored noopener noreferrer"
              target="_blank"
              className="border rounded-lg p-4 hover:border-blue-400 transition"
            >
              <div className="font-semibold">EVNEX E2 — 7.2kW</div>
              <div className="text-sm text-gray-500 mt-1">Popular in AU/NZ. Smart scheduling, app control.</div>
              <div className="text-blue-600 text-sm mt-2">View on EVNEX →</div>
            </a>
            <a
              href="https://wallbox.com/en_au/catalogue/chargers"
              rel="sponsored noopener noreferrer"
              target="_blank"
              className="border rounded-lg p-4 hover:border-blue-400 transition"
            >
              <div className="font-semibold">Wallbox Pulsar Plus — 7.4kW</div>
              <div className="text-sm text-gray-500 mt-1">Compact design, Bluetooth + WiFi, myWallbox app.</div>
              <div className="text-blue-600 text-sm mt-2">View on Wallbox →</div>
            </a>
          </div>
        </section>

        {/* ── Back link ── */}
        <div style={{
          padding: '16px 28px',
          background: 'oklch(97.5% 0.003 60)',
        }}>
          <a href={`/${market}/models/${vehicleModel.slug}`} style={{
            fontSize: '13px', color: 'var(--green)', fontWeight: 600, textDecoration: 'none',
          }}>
            ← Back to {vehicleModel.model_name} overview
          </a>
        </div>

      </article>
    </div>
  )
}

// ─── Station finder ───────────────────────────────────────────────────────────
const AU_CITIES = [
  { label: 'Sydney', plugshare: 'https://www.plugshare.com/location/sydney-nsw', chargefox: 'https://www.chargefox.com/map/?lat=-33.8688&lng=151.2093' },
  { label: 'Melbourne', plugshare: 'https://www.plugshare.com/location/melbourne-vic', chargefox: 'https://www.chargefox.com/map/?lat=-37.8136&lng=144.9631' },
  { label: 'Brisbane', plugshare: 'https://www.plugshare.com/location/brisbane-qld', chargefox: 'https://www.chargefox.com/map/?lat=-27.4698&lng=153.0251' },
  { label: 'Perth', plugshare: 'https://www.plugshare.com/location/perth-wa', chargefox: 'https://www.chargefox.com/map/?lat=-31.9505&lng=115.8605' },
  { label: 'Adelaide', plugshare: 'https://www.plugshare.com/location/adelaide-sa', chargefox: 'https://www.chargefox.com/map/?lat=-34.9285&lng=138.6007' },
]

const UK_CITIES = [
  { label: 'London', plugshare: 'https://www.plugshare.com/location/london-uk', zapmap: 'https://www.zap-map.com/charge-points/map/?lat=51.5074&lng=-0.1278' },
  { label: 'Manchester', plugshare: 'https://www.plugshare.com/location/manchester-uk', zapmap: 'https://www.zap-map.com/charge-points/map/?lat=53.4808&lng=-2.2426' },
  { label: 'Birmingham', plugshare: 'https://www.plugshare.com/location/birmingham-uk', zapmap: 'https://www.zap-map.com/charge-points/map/?lat=52.4862&lng=-1.8904' },
  { label: 'Edinburgh', plugshare: 'https://www.plugshare.com/location/edinburgh-uk', zapmap: 'https://www.zap-map.com/charge-points/map/?lat=55.9533&lng=-3.1883' },
]

function StationFinder({ market }: { market: string }) {
  const isAu = market === 'au'
  const isUk = market === 'uk'
  const cities = isAu ? AU_CITIES : isUk ? UK_CITIES : []

  return (
    <div style={{ borderTop: '1px solid oklch(91% 0.01 145)' }}>
      {/* Primary CTA */}
      <div style={{ padding: '18px 28px', background: 'oklch(98.5% 0.004 145)', borderBottom: '1px solid oklch(91% 0.01 145)' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'oklch(28% 0.04 145)', marginBottom: '10px' }}>
          Find charging stations near you
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <a
            href="https://www.plugshare.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px',
              background: 'oklch(50% 0.18 145)', color: '#fff',
              borderRadius: '5px', fontSize: '13px', fontWeight: 700,
              textDecoration: 'none', fontFamily: 'var(--font-cond)',
              letterSpacing: '0.04em',
            }}
          >
            Open PlugShare →
          </a>
          {isAu && (
            <>
              <a href="https://chargefox.com/map/" target="_blank" rel="noopener noreferrer" style={linkChipStyle}>Chargefox Map →</a>
              <a href="https://www.evie.com.au/map" target="_blank" rel="noopener noreferrer" style={linkChipStyle}>Evie Map →</a>
              <a href="https://www.mynrma.com.au/electric-vehicles/ev-charging/map" target="_blank" rel="noopener noreferrer" style={linkChipStyle}>NRMA EV Map →</a>
            </>
          )}
          {isUk && (
            <>
              <a href="https://www.zap-map.com/" target="_blank" rel="noopener noreferrer" style={linkChipStyle}>Zap-Map →</a>
              <a href="https://pod-point.com/pod-point-network" target="_blank" rel="noopener noreferrer" style={linkChipStyle}>Pod Point Map →</a>
            </>
          )}
        </div>
        <p style={{ fontSize: '11px', color: 'oklch(46% 0.04 145)', marginTop: '8px' }}>
          PlugShare has the most comprehensive community-verified station data including real-time check-ins.
        </p>
      </div>

      {/* City quick links */}
      {cities.length > 0 && (
        <div style={{ padding: '14px 28px', background: 'oklch(99% 0.002 60)' }}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--font-cond)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Quick links by city
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {cities.map(city => (
              <a
                key={city.label}
                href={city.plugshare}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '5px 11px',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '4px',
                  fontSize: '12px', fontWeight: 600,
                  fontFamily: 'var(--font-cond)',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                  color: 'oklch(36% 0.01 60)',
                  background: 'oklch(98.5% 0.002 60)',
                }}
              >
                {city.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── link chip style ──────────────────────────────────────────────────────────
const linkChipStyle: React.CSSProperties = {
  padding: '7px 14px',
  border: '1px solid oklch(85% 0.04 145)',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 600,
  fontFamily: 'var(--font-cond)',
  letterSpacing: '0.05em',
  textDecoration: 'none',
  color: 'oklch(36% 0.12 145)',
  background: 'oklch(98% 0.006 145)',
  display: 'inline-flex',
  alignItems: 'center',
}
