import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getModelBySlug } from '@/lib/db/models'
import { VEHICLE_SPECS } from '@/lib/vehicle-specs'
import { BASE_URL } from '@/lib/config'
import { JsonLd } from '@/components/JsonLd'
import { getActiveMarketCodes, getAllSlugs } from '@/lib/db/static-params'

export const dynamicParams = true

export async function generateStaticParams() {
  const [markets, slugs] = await Promise.all([getActiveMarketCodes(), getAllSlugs()])
  return markets.flatMap((market) => slugs.map((model) => ({ market, model })))
}

interface Props {
  params: Promise<{ market: string; model: string }>
}

export const revalidate = 3600

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

export default async function ServicePage({ params }: Props) {
  const { market, model } = await params
  const vehicleModel = await getModelBySlug(model)
  if (!vehicleModel) notFound()

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
      <ServiceContent market={market} vehicleModel={vehicleModel} />
    </>
  )
}

function ServiceContent({ market, vehicleModel }: { market: string; vehicleModel: { model_name: string; slug: string; model_id: string } }) {
  const specs = VEHICLE_SPECS[vehicleModel.model_id]?.service
  const currency = market === 'au' ? 'AUD' : market === 'uk' ? 'GBP' : market === 'uae' ? 'AED' : 'NOK'
  const serviceCost = market === 'au' ? '$200–$350' : market === 'uk' ? '£150–£280' : market === 'uae' ? 'AED 700–1,200' : 'NOK 2,000–3,500'
  const brakeFluidCost = market === 'au' ? '$80–$120' : market === 'uk' ? '£60–£90' : 'Check dealer'
  const cabinFilterCost = market === 'au' ? '$40–$80' : market === 'uk' ? '£30–£60' : 'Check dealer'

  const serviceInterval = specs?.serviceInterval || '12 months / 20,000 km'
  const warrantyVehicle = specs?.warrantyVehicle || '6–8 years'
  const warrantyBattery = specs?.warrantyBattery || '8 years / 160,000 km'
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
