import type { Case } from '@/lib/types'

interface Props {
  cases: Case[]
}

export function RealWorldCases({ cases }: Props) {
  if (cases.length === 0) return null

  return (
    <div className="section">
      <span className="section-label">Real-World Cases</span>
      <div className="cases">
        {cases.map((c) => (
          <div key={c.case_id} className="case-card">
            <div className="case-meta">
              <span className="case-source">{c.source_name}</span>
              {c.location && (
                <>
                  <span className="case-dot">·</span>
                  <span className="case-source">{c.location}</span>
                </>
              )}
              {c.report_date && (
                <>
                  <span className="case-dot">·</span>
                  <span className="case-source">{c.report_date}</span>
                </>
              )}
            </div>
            {c.symptom_summary && (
              <p className="case-body">{c.symptom_summary}</p>
            )}
            {c.resolution && (
              <div className="case-resolution">
                <div className="case-resolution-icon">✓</div>
                <span>{c.resolution}</span>
              </div>
            )}
            {c.cost_info && (
              <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '6px' }}>
                Cost: {c.cost_info}
              </p>
            )}
            {c.source_url && (
              <a
                href={c.source_url}
                style={{ fontSize: '11px', color: 'var(--green)', display: 'block', marginTop: '8px' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Original source ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
