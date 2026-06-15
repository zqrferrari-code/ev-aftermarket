import type { TariffRate, HsCode } from '@/lib/db/parts'

interface TariffSummaryProps {
  cnHsCode: HsCode | null
  auHsCode: HsCode | null
  tariffRate: TariffRate | null
}

export default function TariffSummary({ cnHsCode, auHsCode, tariffRate }: TariffSummaryProps) {
  return (
    <div>
      <div className="model-section-head">
        <span style={{
          fontFamily: 'var(--font-cond)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
        }}>
          Import Duty Summary
        </span>
      </div>

      <div style={{ padding: '20px 28px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            <TariffRow label="CN Export HS Code" value={cnHsCode ? formatHsCode(cnHsCode.hs_code, 'CN') : '—'} mono />
            <TariffRow label="AU Import HS Code" value={auHsCode ? formatHsCode(auHsCode.hs_code, 'AU') : '—'} mono />
            <TariffRow label="AU MFN Duty Rate" value={tariffRate?.mfn_rate != null ? `${tariffRate.mfn_rate}%` : '—'} bold />
            {tariffRate?.fta_name && tariffRate.fta_rate != null && (
              <TariffRow label={`${tariffRate.fta_name} FTA Rate`} value={`${tariffRate.fta_rate}%`} />
            )}
            <TariffRow label="GST" value={tariffRate?.vat_rate != null ? `${tariffRate.vat_rate}%` : '10%'} />
            {tariffRate?.additional_duties && (
              <TariffRow label="Additional Duties" value={tariffRate.additional_duties} />
            )}
          </tbody>
        </table>

        {(tariffRate?.mfn_rate === '0.00' || tariffRate?.mfn_rate === '0') && (
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.6, display: 'flex', gap: '6px' }}>
            <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
            AU MFN duty rate is 0% for this part. No certificate of origin required — only 10% GST applies.
          </p>
        )}

        {tariffRate?.source_url && (
          <p style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-base)' }}>
            Source:{' '}
            <a href={tariffRate.source_url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--green)' }}>
              ABF Working Tariff
            </a>
            {tariffRate.last_verified && ` · Verified ${tariffRate.last_verified}`}
          </p>
        )}
      </div>
    </div>
  )
}

function TariffRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <td style={{ padding: '9px 0', color: 'var(--text-base)', width: '55%', fontSize: '13px' }}>{label}</td>
      <td style={{
        padding: '9px 0',
        fontWeight: bold ? 700 : 400,
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        color: 'var(--text-base)',
        textAlign: 'right',
        fontSize: mono ? '12px' : '13px',
      }}>
        {value}
      </td>
    </tr>
  )
}

function formatHsCode(code: string, country: string): string {
  if (country === 'CN' && code.length === 10) {
    return `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}`
  }
  if (country === 'AU' && code.length === 8) {
    return `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}`
  }
  return code
}
