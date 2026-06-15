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
  parts: Part[]
}

const FEATURES = [
  { key: 'dtc', label: 'Fault Codes', icon: '🔧' },
  { key: 'problems', label: 'Problems', icon: '⚠️' },
  { key: 'parts', label: 'Parts', icon: '🔩' },
  { key: 'charging', label: 'Charging', icon: '⚡' },
] as const

type FeatureKey = (typeof FEATURES)[number]['key']

export default function FeatureGrid({ market, models, parts }: FeatureGridProps) {
  const [active, setActive] = useState<FeatureKey | null>(null)

  function handleCardClick(key: FeatureKey) {
    setActive((prev) => (prev === key ? null : key))
  }

  return (
    <div style={{ padding: '0 0 4px' }}>
      {/* 2×2 网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        background: 'var(--border)',
        borderTop: '1px solid var(--border)',
      }}>
        {FEATURES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => handleCardClick(key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              padding: '16px 20px',
              background: active === key ? 'oklch(97% 0.015 145)' : 'var(--card-bg, #fff)',
              border: 'none',
              borderBottom: active === key ? '2px solid var(--green)' : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: '72px',
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-cond)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: active === key ? 'var(--green-text)' : 'oklch(30% 0.01 60)',
            }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* 展开面板 */}
      {active !== null && (
        <div style={{
          borderTop: '1px solid var(--border-soft)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          {active === 'parts' ? (
            <PartsPanel market={market} models={models} parts={parts} />
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
  feature: 'dtc' | 'problems' | 'charging'
}) {
  const LABEL: Record<typeof feature, string> = {
    dtc: 'Fault Codes',
    problems: 'Problems',
    charging: 'Charging',
  }

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
        Select model → {LABEL[feature]}
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
