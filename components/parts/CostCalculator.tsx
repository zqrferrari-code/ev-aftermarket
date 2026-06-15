'use client'

import { useState, useMemo } from 'react'
import { calculateTariff } from '@/lib/db/parts'

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
    <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{
        padding: '11px 20px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border-soft)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-faint)',
        fontFamily: 'var(--font-cond)',
      }}>
        到岸费用估算
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>配件价格（CNY 或 AUD）</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={partPrice}
              onChange={e => setPartPrice(e.target.value)}
              placeholder="例：500"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>运费</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shipping}
              onChange={e => setShipping(e.target.value)}
              placeholder="例：80"
              style={inputStyle}
            />
          </label>
        </div>

        {result ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <ResultRow label="CIF（货价+运费）" value={fmt(result.cif)} />
              <ResultRow label={`关税（${dutyRate}%）`} value={fmt(result.duty)} />
              <ResultRow label={`GST（${vatRate}%）`} value={fmt(result.vat)} />
              <ResultRow label="合计到岸费用" value={fmt(result.total)} bold />
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-faint)', margin: 0 }}>
            输入配件价格后自动计算
          </p>
        )}

        <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.5, margin: '12px 0 0' }}>
          仅供估算参考，实际费用以海关核定为准。汇率波动可能影响最终金额。
        </p>
      </div>
    </div>
  )
}

function ResultRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <td style={{ padding: '8px 0', color: 'var(--text-faint)', width: '55%' }}>{label}</td>
      <td style={{
        padding: '8px 0',
        fontWeight: bold ? 700 : 400,
        color: bold ? 'var(--text-base)' : 'var(--text-soft)',
        textAlign: 'right',
      }}>
        {value}
      </td>
    </tr>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  display: 'block',
  marginBottom: '6px',
  fontFamily: 'var(--font-cond)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  fontSize: '14px',
  color: 'var(--text-base)',
  background: 'var(--bg)',
  boxSizing: 'border-box',
}
