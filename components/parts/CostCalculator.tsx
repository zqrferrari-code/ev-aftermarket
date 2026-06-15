'use client'

import { useState, useMemo } from 'react'

function calculateTariff(params: {
  partPrice: number
  shipping: number
  dutyRate: number
  vatRate: number
}) {
  const { partPrice, shipping, dutyRate, vatRate } = params
  const cif = partPrice + shipping
  const duty = cif * (dutyRate / 100)
  const vat = (cif + duty) * (vatRate / 100)
  const total = cif + duty + vat
  return {
    cif: Math.round(cif * 100) / 100,
    duty: Math.round(duty * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

interface CostCalculatorProps {
  dutyRate: number
  vatRate: number
}

function fmt(n: number) {
  return 'A$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CostCalculator({ dutyRate, vatRate }: CostCalculatorProps) {
  const [partPrice, setPartPrice] = useState('')
  const [shipping, setShipping] = useState('')

  const result = useMemo(() => {
    const p = parseFloat(partPrice)
    const s = parseFloat(shipping) || 0
    if (isNaN(p) || p <= 0) return null
    return calculateTariff({ partPrice: p, shipping: s, dutyRate, vatRate })
  }, [partPrice, shipping, dutyRate, vatRate])

  return (
    <div style={{ borderTop: '1px solid var(--border-soft)' }}>
      <div className="model-section-head">
        <span style={{
          fontFamily: 'var(--font-cond)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
        }}>
          Landed Cost Estimator
        </span>
      </div>

      <div style={{ padding: '20px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Part Price (CNY or AUD)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={partPrice}
              onChange={e => setPartPrice(e.target.value)}
              placeholder="e.g. 500"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Shipping</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shipping}
              onChange={e => setShipping(e.target.value)}
              placeholder="e.g. 80"
              style={inputStyle}
            />
          </label>
        </div>

        {result ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <ResultRow label={`CIF (Part + Shipping)`} value={fmt(result.cif)} />
              <ResultRow label={`Import Duty (${dutyRate}%)`} value={fmt(result.duty)} />
              <ResultRow label={`GST (${vatRate}%)`} value={fmt(result.vat)} />
              <ResultRow label="Total Landed Cost" value={fmt(result.total)} bold />
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>
            Enter a part price to calculate
          </p>
        )}

        <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.6 }}>
          Estimate only. Actual charges are determined by Australian Border Force at time of import.
        </p>
      </div>
    </div>
  )
}

function ResultRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <td style={{ padding: '9px 0', color: 'var(--text-faint)', width: '55%' }}>{label}</td>
      <td style={{
        padding: '9px 0',
        fontWeight: bold ? 700 : 400,
        color: bold ? 'var(--text-base)' : 'var(--text-muted)',
        textAlign: 'right',
      }}>
        {value}
      </td>
    </tr>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-cond)',
  fontSize: '10.5px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  display: 'block',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  fontSize: '14px',
  fontFamily: 'var(--font-ui)',
  color: 'var(--text-base)',
  background: 'var(--surface)',
  boxSizing: 'border-box',
}
