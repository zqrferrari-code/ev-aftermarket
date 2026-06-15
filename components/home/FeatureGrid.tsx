'use client'

import { useState } from 'react'

interface Model {
  model_id: string
  model_name: string
  brand_id: string
  slug: string
}

interface Part {
  slug: string
  name_en: string
}

export interface FeatureGridProps {
  market: string
  models: Model[]
  partModels: Model[]
  parts: Part[]
}

const FEATURES = [
  { key: 'dtc', label: 'Fault Codes', icon: '🔧' },
  { key: 'problems', label: 'Problems', icon: '⚠️' },
  { key: 'parts', label: 'Parts', icon: '🔩' },
  { key: 'charging', label: 'Charging', icon: '⚡' },
] as const

type FeatureKey = (typeof FEATURES)[number]['key']

const FEATURE_LABELS: Record<Exclude<FeatureKey, 'parts'>, string> = {
  dtc: 'Fault Codes',
  problems: 'Problems',
  charging: 'Charging',
}

const FEATURE_DESCS: Record<FeatureKey, string> = {
  dtc: 'Look up fault codes by model',
  problems: 'Owner-reported issues & fixes',
  parts: 'Import duty & HS codes for parts',
  charging: 'Real-world charging data',
}

export default function FeatureGrid({ market, models, partModels, parts }: FeatureGridProps) {
  const [active, setActive] = useState<FeatureKey | null>(null)

  function handleCardClick(key: FeatureKey) {
    setActive((prev) => (prev === key ? null : key))
  }

  return (
    <div>
      {/* 功能卡片列表 */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {FEATURES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => handleCardClick(key)}
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '52px 1fr auto',
              alignItems: 'center',
              gap: '0',
              padding: '0',
              background: active === key ? 'oklch(97.5% 0.012 145)' : '#fff',
              border: 'none',
              borderBottom: '1px solid var(--border-soft)',
              borderLeft: active === key ? '3px solid var(--green)' : '3px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
          >
            {/* 图标列 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '20px 0',
              fontSize: '22px',
              borderRight: '1px solid var(--border-soft)',
            }}>
              {icon}
            </div>
            {/* 文字列 */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{
                fontFamily: 'var(--font-cond)',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: active === key ? 'var(--green-text)' : 'var(--text-base)',
                lineHeight: 1,
              }}>
                {label}
              </span>
              <span style={{
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}>
                {FEATURE_DESCS[key]}
              </span>
            </div>
            {/* 箭头列 */}
            <div style={{
              padding: '0 20px',
              color: active === key ? 'var(--green)' : 'var(--text-faint)',
              fontSize: '18px',
              fontWeight: 300,
              transition: 'transform 0.15s',
              transform: active === key ? 'rotate(90deg)' : 'none',
            }}>
              ›
            </div>
          </button>
        ))}
      </div>

      {/* 展开面板 */}
      {active !== null && (
        <div style={{ background: 'oklch(98.5% 0.003 145)', borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
          {active === 'parts' ? (
            <PartsPanel market={market} models={partModels} parts={parts} />
          ) : (
            <ModelListPanel market={market} models={models} feature={active} />
          )}
        </div>
      )}
    </div>
  )
}

function ModelListPanel({
  market,
  models,
  feature,
}: {
  market: string
  models: Model[]
  feature: Exclude<FeatureKey, 'parts'>
}) {
  return (
    <div>
      <div style={{
        padding: '8px 20px',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'var(--font-cond)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border-soft)',
      }}>
        Select model → {FEATURE_LABELS[feature]}
      </div>
      <ul className="dtc-list" style={{ margin: 0 }}>
        {models.map((m) => (
          <li key={m.model_id}>
            <a href={`/${market}/${feature}/${m.slug}`} className="dtc-row">
              <div className="dtc-row-top">
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.model_name}</span>
                <span className="dtc-arrow">›</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PartsPanel({
  market,
  models,
  parts,
}: {
  market: string
  models: Model[]
  parts: Part[]
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' }}>
      {/* 按车型列 */}
      <div style={{ background: 'var(--card-bg, #fff)' }}>
        <div style={{
          padding: '8px 16px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-cond)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          按车型
        </div>
        <ul className="dtc-list" style={{ margin: 0 }}>
          {models.map((m) => (
            <li key={m.model_id}>
              <a href={`/${market}/parts/${m.brand_id}/${m.model_id}`} className="dtc-row">
                <div className="dtc-row-top">
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{m.model_name}</span>
                  <span className="dtc-arrow">›</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* 按配件类型列 */}
      <div style={{ background: 'var(--card-bg, #fff)' }}>
        <div style={{
          padding: '8px 16px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-cond)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          按配件类型
        </div>
        <ul className="dtc-list" style={{ margin: 0 }}>
          {parts.map((p) => (
            <li key={p.slug}>
              <a href={`/${market}/parts/byd/byd-atto-3/${p.slug}`} className="dtc-row">
                <div className="dtc-row-top">
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{p.name_en}</span>
                  <span className="dtc-arrow">›</span>
                </div>
              </a>
            </li>
          ))}
          <li>
            <a href={`/${market}/parts`} className="dtc-row">
              <div className="dtc-row-top">
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--green-text)' }}>
                  查看全部配件 ↗
                </span>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
