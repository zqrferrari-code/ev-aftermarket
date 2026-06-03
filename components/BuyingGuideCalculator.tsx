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

  const sectionHeader = {
    padding: '10px 28px',
    background: 'oklch(97.5% 0.003 60)',
    borderTop: '1px solid var(--border-soft)',
    borderBottom: '1px solid var(--border-soft)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'oklch(36% 0.01 60)',
  }

  return (
    <div>
      {/* Step 1: 车型选择 */}
      <div style={sectionHeader}>1 — 选择车型</div>
      <div style={{ padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>品牌</label>
            <select
              value={brand}
              onChange={e => { setBrand(e.target.value); setVariantIdx(0) }}
              style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px' }}
            >
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>车型 / 配置</label>
            <select
              value={variantIdx}
              onChange={e => setVariantIdx(Number(e.target.value))}
              style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px' }}
            >
              {vehicles.map((v, i) => (
                <option key={i} value={i}>{v.model} — {v.variant}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          MSRP：<span style={{ fontWeight: 700, color: 'oklch(22% 0.01 60)', fontFamily: 'monospace' }}>{fmt(vehicle.msrp)}</span>
          <span style={{ marginLeft: '6px', fontSize: '12px' }}>（含 GST，不含上路费）</span>
          {!vehicle.eligible_fbt && (
            <span style={{ marginLeft: '10px', color: 'var(--amber)', fontSize: '12px' }}>⚠ PHEV — 不满足 FBT 豁免</span>
          )}
        </div>
      </div>

      {/* Step 2: 州选择 */}
      <div style={sectionHeader}>2 — 选择州 / 地区</div>
      <div style={{ padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>居住州</label>
          <select
            value={state}
            onChange={e => setState(e.target.value as State)}
            style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px' }}
          >
            {STATES.map(s => <option key={s} value={s}>{s} — {STATE_LABELS[s]}</option>)}
          </select>
        </div>
        <div style={{ fontSize: '13px' }}>
          {driveAway.stamp_duty_exempt ? (
            <span style={{ color: 'var(--green)' }}>✓ {STATE_LABELS[state]}免征印花税</span>
          ) : (
            <span style={{ color: 'oklch(36% 0.01 60)' }}>
              {STATE_LABELS[state]}印花税约：
              <span style={{ fontWeight: 700, fontFamily: 'monospace', marginLeft: '4px' }}>{fmt(driveAway.stamp_duty)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Step 3: 计算模式 */}
      <div style={sectionHeader}>3 — 计算模式</div>
      <div style={{ padding: '18px 28px 0' }}>
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-soft)', marginBottom: '0' }}>
          {(['driveaway', 'novated'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: mode === m ? 700 : 400,
                border: 'none',
                borderBottom: mode === m ? '2px solid oklch(36% 0.01 60)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                color: mode === m ? 'oklch(22% 0.01 60)' : 'var(--text-muted)',
                marginBottom: '-2px',
              }}
            >
              {m === 'driveaway' ? '落地价' : 'Novated Lease 节税'}
            </button>
          ))}
        </div>
      </div>

      {/* 模式 A：落地价 */}
      {mode === 'driveaway' && (
        <div style={{ padding: '18px 28px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              {[
                ['车辆 MSRP', fmt(driveAway.msrp)],
                [
                  '印花税',
                  driveAway.stamp_duty_exempt
                    ? `${fmt(0)}（${STATE_LABELS[state]}豁免）`
                    : fmt(driveAway.stamp_duty),
                ],
                ['注册费（估算）', `${fmt(driveAway.rego_min)} – ${fmt(driveAway.rego_max)}`],
                ['经销商交付费（估算）', `${fmt(driveAway.dealer_delivery_min)} – ${fmt(driveAway.dealer_delivery_max)}`],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '10px 0', color: 'var(--text-muted)' }}>{label}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace' }}>{value}</td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: '14px 0 6px', fontWeight: 700 }}>落地总价</td>
                <td style={{ padding: '14px 0 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: 'oklch(22% 0.01 60)' }}>
                  {fmt(driveAway.total_min)} – {fmt(driveAway.total_max)}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            ⚠ 印花税税率及 EV 豁免政策随时可能调整。本页数据基于 2025 年公开信息估算，购车前请向所在州税务局核实最新政策。
          </p>
        </div>
      )}

      {/* 模式 B：Novated Lease */}
      {mode === 'novated' && (
        <div style={{ padding: '18px 28px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>税前年收入（澳元）</label>
              <input
                type="number"
                min={18200}
                max={500000}
                step={1000}
                value={salary}
                onChange={e => setSalary(Number(e.target.value))}
                style={{ padding: '7px 10px', border: '1px solid var(--border-soft)', borderRadius: '5px', fontSize: '14px', width: '140px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>租赁期限</label>
              <div style={{ display: 'flex', gap: '0' }}>
                {([3, 5] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setLeaseTerm(t)}
                    style={{
                      padding: '7px 16px',
                      border: '1px solid var(--border-soft)',
                      borderRadius: t === 3 ? '5px 0 0 5px' : '0 5px 5px 0',
                      fontSize: '13px',
                      background: leaseTerm === t ? 'oklch(22% 0.01 60)' : 'transparent',
                      color: leaseTerm === t ? '#fff' : 'oklch(36% 0.01 60)',
                      cursor: 'pointer',
                    }}
                  >
                    {t} 年
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!vehicle.eligible_fbt ? (
            <div style={{ padding: '14px', background: 'oklch(97% 0.01 60)', borderRadius: '6px', fontSize: '13px', color: 'var(--amber)' }}>
              ⚠ 该车型（PHEV）自 2025年4月1日起不再享有 FBT 豁免，Novated Lease 节税效果大幅降低，建议直接购买。
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  {[
                    ['年度租赁成本（估算）', `${fmt(novated.annual_lease_cost)} / 年`],
                    ['税前工资扣款', `${fmt(novated.pre_tax_deduction)} / 年（100% 税前 — FBT 豁免）`],
                    ['边际税率', pct(novated.marginal_rate)],
                    ['年度节省个人所得税', `${fmt(novated.annual_tax_saving)} / 年`],
                    ['每月实际支出', `${fmt(novated.monthly_out_of_pocket)} / 月`],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '10px 0', color: 'var(--text-muted)' }}>{label}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '14px', padding: '12px 14px', background: 'oklch(97.5% 0.003 60)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                ⚠ <strong>RFBA 提示：</strong>此福利将作为应报告附加福利金额（RFBA）记录在收入报表中，可能影响 Medicare Levy Surcharge、HECS/HELP 还款额及政府福利资格核查。<br />
                Novated Lease 节税计算仅供参考，实际节税金额取决于雇主方案及个人税务情况，建议咨询持牌财务顾问。
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
