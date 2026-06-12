import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getModelBySlug } from '@/lib/db/models'
import { getServiceCasesForModel } from '@/lib/db/cases'
import { VEHICLE_SPECS } from '@/lib/vehicle-specs'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'
import { FeedbackButton } from '@/components/FeedbackButton'


export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}

interface Props {
  params: Promise<{ market: string; model: string }>
}


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const vehicleModel = await getModelBySlug(model)
  if (!vehicleModel) return {}

  const title = `${vehicleModel.model_name} Service Cost & Centres — ${market.toUpperCase()}`
  const description = `${vehicleModel.model_name} servicing costs: annual service price, what is included, authorised service centre locations, and whether independent mechanics can service your vehicle.`
  const url = `${BASE_URL}/${market}/service/${model}`

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

function getServiceValues(market: string, modelId: string) {
  const specs = VEHICLE_SPECS[modelId]?.service
  const serviceCost = market === 'au' ? '$200–$350' : market === 'uk' ? '£150–£280' : market === 'uae' ? 'AED 700–1,200' : 'NOK 2,000–3,500'
  const serviceInterval = specs?.serviceInterval || '12 months / 20,000 km'
  const warrantyBattery = specs?.warrantyBattery || '8 years / 160,000 km'
  return { specs, serviceCost, serviceInterval, warrantyBattery }
}

export default async function ServicePage({ params }: Props) {
  const { market, model } = await params
  const vehicleModel = await getModelBySlug(model)
  if (!vehicleModel) notFound()

  const serviceCases = await getServiceCasesForModel(vehicleModel.model_id, market)

  const { serviceCost, serviceInterval, warrantyBattery } = getServiceValues(market, vehicleModel.model_id)

  return (
    <>
      <JsonLd schema={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${BASE_URL}/${market}` },
          { '@type': 'ListItem', position: 2, name: vehicleModel.model_name, item: `${BASE_URL}/${market}/models/${vehicleModel.slug}` },
          { '@type': 'ListItem', position: 3, name: 'Service Costs', item: `${BASE_URL}/${market}/service/${vehicleModel.slug}` },
        ],
      }} />
      <JsonLd schema={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `How much does it cost to service a ${vehicleModel.model_name} in ${market.toUpperCase()}?`,
            acceptedAnswer: { '@type': 'Answer', text: `Annual service for the ${vehicleModel.model_name} typically costs ${serviceCost} at an authorised dealer. This includes a multi-point inspection, software update check, brake fluid top-up, and battery health check.` },
          },
          {
            '@type': 'Question',
            name: `How often does the ${vehicleModel.model_name} need servicing?`,
            acceptedAnswer: { '@type': 'Answer', text: `The ${vehicleModel.model_name} requires a service every ${serviceInterval}, whichever comes first.` },
          },
          {
            '@type': 'Question',
            name: `Can an independent mechanic service my ${vehicleModel.model_name}?`,
            acceptedAnswer: { '@type': 'Answer', text: `Independent mechanics can handle tyres, brakes, cabin filters, and general electrical work. However, software updates, BMS-related faults, HV system diagnostics, and warranty repairs must be done at an authorised dealer to maintain warranty coverage.` },
          },
          {
            '@type': 'Question',
            name: `What is the battery warranty on the ${vehicleModel.model_name}?`,
            acceptedAnswer: { '@type': 'Answer', text: `The ${vehicleModel.model_name} comes with a ${warrantyBattery} high-voltage battery warranty.` },
          },
        ],
      }} />
      <ServiceContent market={market} vehicleModel={vehicleModel} serviceCases={serviceCases} />
    </>
  )
}

function ServiceContent({ market, vehicleModel, serviceCases }: {
  market: string
  vehicleModel: { model_name: string; slug: string; model_id: string }
  serviceCases: Array<{
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
  const { specs, serviceCost, serviceInterval, warrantyBattery } = getServiceValues(market, vehicleModel.model_id)
  const currency = market === 'au' ? 'AUD' : market === 'uk' ? 'GBP' : market === 'uae' ? 'AED' : 'NOK'
  const brakeFluidCost = market === 'au' ? '$80–$120' : market === 'uk' ? '£60–£90' : 'Check dealer'
  const cabinFilterCost = market === 'au' ? '$40–$80' : market === 'uk' ? '£30–£60' : 'Check dealer'

  const warrantyVehicle = specs?.warrantyVehicle || '6–8 years'
  const brakeFluidInterval = specs?.brakeFluidInterval || '24 months'
  const cabinFilterInterval = specs?.cabinFilterInterval || '12-24 months'

  return (
    <div className="page-wrapper">
      <article className="dtc-card">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href={`/${market}`}>{market.toUpperCase()}</a>
          <span className="sep">›</span>
          <a href={`/${market}/models/${vehicleModel.slug}`}>{vehicleModel.model_name}</a>
          <span className="sep">›</span>
          <span style={{ fontWeight: 600, color: 'oklch(22% 0.01 60)' }}>Service</span>
        </nav>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 28px 0' }}>
          <FeedbackButton context={`${vehicleModel.model_name} Service — ${market.toUpperCase()}`} defaultType="error" />
        </div>

        {/* Hero */}
        <div className="list-hero">
          <h1>{vehicleModel.model_name} — Service Costs</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '14px' }}>
            What to expect when servicing your {vehicleModel.model_name}.
          </p>
        </div>

        {/* Service Schedule */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Service Schedule</span>
        </div>

        <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-soft)' }}>
          <p style={{ fontSize: '14px', color: 'oklch(22% 0.01 60)', lineHeight: 1.6, marginBottom: '12px' }}>
            The {vehicleModel.model_name} requires a service every <strong>{serviceInterval}</strong>, whichever comes first.
          </p>

          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'oklch(97.5% 0.003 60)' }}>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px', textAlign: 'left' }}>Service</th>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px', textAlign: 'left' }}>Interval</th>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px', textAlign: 'left' }}>Est. Cost ({currency})</th>
                <th style={{ border: '1px solid var(--border-soft)', padding: '8px', textAlign: 'left' }}>Dealer Only?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>Annual Service</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>{serviceInterval}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>{serviceCost}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 600 }}>For warranty</span>
                </td>
              </tr>
              <tr style={{ background: 'oklch(97.5% 0.003 60)' }}>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>Brake Fluid</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>{brakeFluidInterval}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>{brakeFluidCost}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>No</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>Cabin Air Filter</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>{cabinFilterInterval}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>{cabinFilterCost}</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>No</td>
              </tr>
              <tr style={{ background: 'oklch(97.5% 0.003 60)' }}>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>Battery Health Check</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>Annually</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>Included in service</td>
                <td style={{ border: '1px solid var(--border-soft)', padding: '8px' }}>Yes</td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '8px' }}>
            Costs are estimates based on community reports. Verify with your local dealer.
          </p>
        </div>

        {/* Independent Mechanics */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Can an Independent Mechanic Service My EV?</span>
        </div>

        <ul style={{ listStyle: 'none' }}>
          <li style={{ padding: '14px 28px', borderBottom: '1px solid oklch(93.5% 0.003 60)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', color: 'var(--green)', fontWeight: 700, minWidth: '20px' }}>✓</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '4px' }}>
                Safe for independent shops:
              </p>
              <p style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>
                Tyres, brakes, wiper blades, cabin air filter, general electrical
              </p>
            </div>
          </li>
          <li style={{ padding: '14px 28px', borderBottom: '1px solid oklch(93.5% 0.003 60)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', color: 'var(--amber)', fontWeight: 700, minWidth: '20px' }}>⚠</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '4px' }}>
                Recommended to use authorised dealer:
              </p>
              <p style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>
                Software/firmware updates, BMS-related faults, high-voltage system diagnostics
              </p>
            </div>
          </li>
          <li style={{ padding: '14px 28px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', color: 'var(--red)', fontWeight: 700, minWidth: '20px' }}>✗</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'oklch(22% 0.01 60)', marginBottom: '4px' }}>
                Must use authorised dealer:
              </p>
              <p style={{ fontSize: '12.5px', color: 'oklch(36% 0.01 60)' }}>
                Battery warranty repairs, recall rectifications, HV battery replacement
              </p>
            </div>
          </li>
        </ul>

        {/* Warranty Info */}
        <div style={{
          padding: '10px 28px',
          background: 'oklch(97.5% 0.003 60)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <span className="section-label">Warranty Reminder</span>
        </div>

        <div style={{ padding: '18px 28px' }}>
          <div className="climate-note">
            <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
              The {vehicleModel.model_name} comes with a <strong>{warrantyVehicle} vehicle warranty</strong> and{' '}
              <strong>{warrantyBattery} HV battery warranty</strong>. Servicing at non-authorised workshops
              may affect warranty coverage — check your warranty booklet for specific terms.
            </p>
          </div>
        </div>

        {/* Owner Service Reports */}
        {serviceCases.length > 0 && (
          <>
            <div style={{ padding: '10px 28px', background: 'oklch(97.5% 0.003 60)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border-soft)' }}>
              <span className="section-label">Owner Service Reports ({serviceCases.length})</span>
            </div>
            <ul style={{ listStyle: 'none' }}>
              {serviceCases.map((c, idx) => (
                <li key={c.case_id} style={{ padding: '18px 28px', borderBottom: idx < serviceCases.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none' }}>
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
                    {c.source_url && <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>Source →</a>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Service FAQ */}
        <div style={{ padding: '10px 28px', background: 'oklch(97.5% 0.003 60)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border-soft)' }}>
          <span className="section-label">Frequently Asked Questions</span>
        </div>

        <div style={{ borderBottom: '1px solid var(--border-soft)' }}>
          {SERVICE_FAQ(vehicleModel.model_name, market, serviceCost, serviceInterval, warrantyBattery).map((item, idx, arr) => (
            <div key={idx} style={{ padding: '16px 28px', borderBottom: idx < arr.length - 1 ? '1px solid oklch(93.5% 0.003 60)' : 'none' }}>
              <p style={{ fontWeight: 600, fontSize: '13.5px', color: 'oklch(22% 0.01 60)', marginBottom: '6px', lineHeight: 1.4 }}>{item.q}</p>
              <p style={{ fontSize: '13px', color: 'oklch(36% 0.01 60)', lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>

        {/* Link back */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--border)',
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

function SERVICE_FAQ(modelName: string, market: string, serviceCost: string, serviceInterval: string, warrantyBattery: string): { q: string; a: string }[] {
  return [
    {
      q: `How much does it cost to service a ${modelName} in ${market.toUpperCase()}?`,
      a: `Annual service for the ${modelName} typically costs ${serviceCost} at an authorised dealer. This includes a multi-point inspection, software update check, brake fluid top-up, and battery health check.`,
    },
    {
      q: `How often does the ${modelName} need servicing?`,
      a: `The ${modelName} requires a service every ${serviceInterval}, whichever comes first.`,
    },
    {
      q: `Can an independent mechanic service my ${modelName}?`,
      a: `Independent mechanics can handle tyres, brakes, cabin filters, and general electrical work. However, software updates, BMS-related faults, HV system diagnostics, and warranty repairs must be done at an authorised dealer to maintain warranty coverage.`,
    },
    {
      q: `What is the battery warranty on the ${modelName}?`,
      a: `The ${modelName} comes with a ${warrantyBattery} high-voltage battery warranty.`,
    },
  ]
}
