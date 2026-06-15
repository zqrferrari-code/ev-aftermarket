import type { TariffRate, HsCode } from '@/lib/db/parts'

interface TariffSummaryProps {
  cnHsCode: HsCode | null
  auHsCode: HsCode | null
  tariffRate: TariffRate | null
}

export default function TariffSummary({ cnHsCode, auHsCode, tariffRate }: TariffSummaryProps) {
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
        进口税费概览
      </div>

      <div style={{ padding: '16px 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            <TariffRow label="中国出口海关编码" value={cnHsCode ? formatHsCode(cnHsCode.hs_code, 'CN') : '—'} />
            <TariffRow label="澳洲进口海关编码" value={auHsCode ? formatHsCode(auHsCode.hs_code, 'AU') : '—'} />
            <TariffRow label="澳洲 MFN 关税" value={tariffRate?.mfn_rate != null ? `${tariffRate.mfn_rate}%` : '—'} highlight />
            {tariffRate?.fta_name && tariffRate.fta_rate != null && (
              <TariffRow label={`${tariffRate.fta_name} FTA 税率`} value={`${tariffRate.fta_rate}%`} />
            )}
            <TariffRow label="GST（增值税）" value={tariffRate?.vat_rate != null ? `${tariffRate.vat_rate}%` : '10%'} />
            {tariffRate?.additional_duties && (
              <TariffRow label="其他附加税" value={tariffRate.additional_duties} />
            )}
          </tbody>
        </table>

        {tariffRate?.mfn_rate === '0.00' || tariffRate?.mfn_rate === '0' ? (
          <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.5 }}>
            ✓ 澳洲对该类配件 MFN 关税为 0%，无需原产地证书，仅需缴纳 10% GST。
          </p>
        ) : null}

        {tariffRate?.source_url && (
          <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-faint)' }}>
            数据来源：
            <a href={tariffRate.source_url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}>
              ABF Working Tariff
            </a>
            {tariffRate.last_verified && ` · 核实日期：${tariffRate.last_verified}`}
          </p>
        )}
      </div>
    </div>
  )
}

function TariffRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <td style={{ padding: '8px 0', color: 'var(--text-faint)', width: '55%' }}>{label}</td>
      <td style={{
        padding: '8px 0',
        fontWeight: highlight ? 700 : 400,
        color: highlight ? 'var(--text-base)' : 'var(--text-soft)',
        textAlign: 'right',
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
