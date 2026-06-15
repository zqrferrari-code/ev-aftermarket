import { buildAliexpressSearchUrl } from '@/lib/db/parts'
import type { Part } from '@/lib/db/parts'

interface AliexpressCardsProps {
  part: Part
  modelName: string
}

export default function AliexpressCards({ part, modelName }: AliexpressCardsProps) {
  const queries = [
    `${modelName} ${part.name_en}`,
    part.name_cn ? `${part.name_cn} 比亚迪` : null,
  ].filter(Boolean) as string[]

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
          AliExpress Sourcing
        </span>
      </div>

      <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {queries.map((q, i) => (
          <a
            key={i}
            href={buildAliexpressSearchUrl(q)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 14px',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              textDecoration: 'none',
              color: 'var(--text-base)',
              background: 'var(--bg)',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🛒</span>
            <span style={{ flex: 1 }}>
              <span style={{
                display: 'block',
                fontFamily: 'var(--font-cond)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                marginBottom: '2px',
              }}>
                {i === 0 ? 'English search' : 'Chinese search'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{q}</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>
              AliExpress ↗
            </span>
          </a>
        ))}

        <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px', lineHeight: 1.6 }}>
          These links open AliExpress search results. Always verify fitment and year compatibility before ordering.
        </p>
      </div>
    </div>
  )
}
