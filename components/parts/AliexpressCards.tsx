import { buildAliexpressSearchUrl } from '@/lib/db/parts'
import type { Part } from '@/lib/db/parts'

interface AliexpressCardsProps {
  part: Part
  modelName: string
}

export default function AliexpressCards({ part, modelName }: AliexpressCardsProps) {
  const queries = [
    `${modelName} ${part.name_en}`,
    `${part.name_cn ?? part.name_en} 比亚迪`,
  ]

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
        速卖通采购参考
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {queries.map((q, i) => (
          <a
            key={i}
            href={buildAliexpressSearchUrl(q)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              textDecoration: 'none',
              color: 'var(--text-base)',
              fontSize: '13px',
              background: 'var(--bg)',
            }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>🛒</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600 }}>
                {i === 0 ? '英文搜索' : '中文搜索'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{q}</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', flexShrink: 0 }}>
              速卖通 ↗
            </span>
          </a>
        ))}

        <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '4px 0 0', lineHeight: 1.5 }}>
          以上链接直达速卖通搜索结果，请自行核对规格与适配年份后下单。
        </p>
      </div>
    </div>
  )
}
