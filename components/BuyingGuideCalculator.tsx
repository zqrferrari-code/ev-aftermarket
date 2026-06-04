'use client'

import { useState, useMemo } from 'react'
import { getBrands, getVehiclesByBrand } from '@/lib/buying-guide/vehicles'
import { STATE_LABELS, type State } from '@/lib/buying-guide/tax-rates'
import { calcDriveAway, calcNovatedLease } from '@/lib/buying-guide/calculations'

const STATES = Object.keys(STATE_LABELS) as State[]

function fmt(n: number) {
  return 'A$' + Math.round(n).toLocaleString('en-AU')
}
function pct(r: number) {
  return (r * 100).toFixed(1) + '%'
}

const stepHead: React.CSSProperties = {
  padding: '11px 28px',
  background: 'var(--bg)',
  borderTop: '1px solid var(--border-soft)',
  borderBottom: '1px solid var(--border-soft)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  fontFamily: 'var(--font-cond)',
}

const stepBody: React.CSSProperties = {
  padding: '22px 28px',
}

const label: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  display: 'block',
  marginBottom: '6px',
  fontFamily: 'var(--font-cond)',
}

const selectStyle: React.CSSProperties = {
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  fontSize: '14px',
  color: 'var(--text-base)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-ui)',
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  fontSize: '14px',
  color: 'var(--text-base)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-mono)',
  width: '100%',
  maxWidth: '148px',
}

export function BuyingGuideCalculator() {
  const brands = getBrands()
  const [brand, setBrand] = useState(brands[0])
  const [variantIdx, setVariantIdx] = useState(0)
  const [state, setState] = useState<State>('NSW')
  const [mode, setMode] = useState<'driveaway' | 'novated'>('driveaway')
  const [salary, setSalary] = useState(90000)
  const [leaseTerm, setLeaseTerm] = useState<3 | 5>(5)

  const vehicles = getVehiclesByBrand(brand)
  const vehicle = vehicles[variantIdx] ?? vehicles[0]

  const driveAway = useMemo(
    () => calcDriveAway(vehicle.msrp, state, vehicle.eligible_fbt),
    [vehicle, state]
  )
  const novated = useMemo(
    () => calcNovatedLease(vehicle.msrp, salary, leaseTerm, vehicle.eligible_fbt),
    [vehicle, salary, leaseTerm]
  )

  return (
    <div>
      {/* Step 1 */}
      <div style={stepHead}>1 — Select Vehicle</div>
      <div style={{ ...stepBody, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={label}>Brand</label>
            <select
              value={brand}
              onChange={e => { setBrand(e.target.value); setVariantIdx(0) }}
              style={selectStyle}
            >
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Model / Variant</label>
            <select
              value={variantIdx}
              onChange={e => setVariantIdx(Number(e.target.value))}
              style={{ ...selectStyle, minWidth: '180px', maxWidth: '100%' }}
            >
              {vehicles.map((v, i) => (
                <option key={i} value={i}>{v.model} — {v.variant}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          MSRP:{' '}
          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-base)' }}>
            {fmt(vehicle.msrp)}
          </strong>
          <span style={{ marginLeft: '6px', fontSize: '12px' }}>(incl. GST, excl. on-road costs)</span>
          {!vehicle.eligible_fbt && (
            <span style={{ marginLeft: '10px', color: 'var(--amber)', fontSize: '12px' }}>
              ⚠ PHEV — not FBT exempt
            </span>
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div style={stepHead}>2 — Select State / Territory</div>
      <div style={{ ...stepBody, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={label}>State / Territory</label>
          <select
            value={state}
            onChange={e => setState(e.target.value as State)}
            style={selectStyle}
          >
            {STATES.map(s => <option key={s} value={s}>{s} — {STATE_LABELS[s]}</option>)}
          </select>
        </div>
        <div style={{ fontSize: '13px' }}>
          {driveAway.stamp_duty_exempt ? (
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              ✓ {STATE_LABELS[state]} — stamp duty exempt for EVs
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              {STATE_LABELS[state]} stamp duty approx.:{' '}
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-base)' }}>
                {fmt(driveAway.stamp_duty)}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Step 3 — Mode tabs */}
      <div style={stepHead}>3 — Calculation Mode</div>
      <div style={{ padding: '0 28px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['driveaway', 'novated'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: mode === m ? 700 : 500,
                border: 'none',
                borderBottom: mode === m ? '2px solid var(--text-base)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                color: mode === m ? 'var(--text-base)' : 'var(--text-faint)',
                marginBottom: '-1px',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {m === 'driveaway' ? 'Drive-Away Price' : 'Novated Lease Saving'}
            </button>
          ))}
        </div>
      </div>

      {/* Mode A: Drive-Away */}
      {mode === 'driveaway' && (
        <div style={stepBody}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Vehicle MSRP', fmt(driveAway.msrp)],
                [
                  'Stamp Duty',
                  driveAway.stamp_duty_exempt
                    ? `${fmt(0)} (${STATE_LABELS[state]} exempt)`
                    : fmt(driveAway.stamp_duty),
                ],
                ['Registration (est.)', `${fmt(driveAway.rego_min)} – ${fmt(driveAway.rego_max)}`],
                ['Dealer Delivery (est.)', `${fmt(driveAway.dealer_delivery_min)} – ${fmt(driveAway.dealer_delivery_max)}`],
              ].map(([lbl, value]) => (
                <tr key={lbl} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>{lbl}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-base)' }}>{value}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 0 8px', fontWeight: 700, fontSize: '14.5px' }}>Drive-Away Total</td>
                <td style={{ padding: '16px 0 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '20px', color: 'var(--text-base)' }}>
                  {fmt(driveAway.total_min)} – {fmt(driveAway.total_max)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.6 }}>
            ⚠ Stamp duty rates and EV exemption policies may change. Data based on 2025 public information — verify with your state&apos;s revenue office before purchasing.
          </p>
        </div>
      )}

      {/* Mode B: Novated Lease */}
      {mode === 'novated' && (
        <div style={stepBody}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '22px' }}>
            <div>
              <label style={label}>Annual Salary (AUD, pre-tax)</label>
              <input
                type="number"
                min={18200}
                max={500000}
                step={1000}
                value={salary}
                onChange={e => setSalary(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={label}>Lease Term</label>
              <div style={{ display: 'flex' }}>
                {([3, 5] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setLeaseTerm(t)}
                    style={{
                      padding: '9px 18px',
                      border: '1px solid var(--border)',
                      borderRadius: t === 3 ? '3px 0 0 3px' : '0 3px 3px 0',
                      borderLeft: t === 5 ? 'none' : undefined,
                      fontSize: '13px',
                      fontWeight: 600,
                      background: leaseTerm === t ? 'var(--text-base)' : 'transparent',
                      color: leaseTerm === t ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {t} yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!vehicle.eligible_fbt ? (
            <div style={{
              padding: '14px 16px',
              background: 'var(--amber-bg)',
              borderLeft: '4px solid var(--amber)',
              borderRadius: '0 3px 3px 0',
              fontSize: '13px',
              color: 'var(--amber-text)',
              lineHeight: 1.6,
            }}>
              ⚠ This vehicle (PHEV) lost FBT exemption from 1 April 2025. Novated Lease tax savings
              are significantly reduced — consider purchasing outright.
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Annual lease cost (est.)', `${fmt(novated.annual_lease_cost)} / yr`],
                    ['Pre-tax salary deduction', `${fmt(novated.pre_tax_deduction)} / yr (100% pre-tax — FBT exempt)`],
                    ['Marginal tax rate', pct(novated.marginal_rate)],
                    ['Annual income tax saving', `${fmt(novated.annual_tax_saving)} / yr`],
                    ['Monthly out-of-pocket', `${fmt(novated.monthly_out_of_pocket)} / mo`],
                  ].map(([lbl, value]) => (
                    <tr key={lbl} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>{lbl}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-base)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{
                marginTop: '16px',
                padding: '13px 15px',
                background: 'var(--bg)',
                borderRadius: '3px',
                border: '1px solid var(--border-soft)',
                fontSize: '12px',
                color: 'var(--text-faint)',
                lineHeight: 1.65,
              }}>
                ⚠ <strong style={{ color: 'var(--text-muted)' }}>RFBA notice:</strong> This benefit will be
                recorded as a Reportable Fringe Benefits Amount (RFBA) on your income statement, which may
                affect Medicare Levy Surcharge, HECS/HELP repayments, and government benefit
                eligibility.<br />
                Novated Lease figures are estimates only. Actual savings depend on your employer&apos;s plan
                and individual tax circumstances — consult a licensed financial adviser.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
