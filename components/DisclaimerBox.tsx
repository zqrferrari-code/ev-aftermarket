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
      </div>
    </div>
  )
}
