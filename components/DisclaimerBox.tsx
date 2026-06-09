import type { DataConfidence } from '@/lib/types'

const confidenceLabel: Record<DataConfidence, string> = {
  official: 'Official',
  community: 'Community',
  ai_generated: 'AI-generated',
}

interface Props {
  confidence: DataConfidence
  sourceUrls?: string[]
}

export function DisclaimerBox({ confidence, sourceUrls }: Props) {
  return (
    <div className="disclaimer">
      <div style={{ flex: 1 }}>
        <span>
          Data confidence:{' '}
          <span className="confidence-pill">{confidenceLabel[confidence]}</span>
          {'  '}
          This information is for reference only. Always consult a qualified technician for
          diagnosis and repair. Do not attempt high-voltage system repairs yourself.
        </span>
        {sourceUrls && sourceUrls.length > 0 && (
          <span>
            {' '}Sources:{' '}
            {sourceUrls.map((url, i) => (
              <span key={i}>
                <a
                  href={url}
                  style={{ color: 'var(--green)', textDecoration: 'underline' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  [{i + 1}]
                </a>
                {i < sourceUrls.length - 1 && ' '}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
