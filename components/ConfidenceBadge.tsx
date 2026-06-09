import type { DataConfidence } from '@/lib/types'

const styles: Record<DataConfidence, string> = {
  official: 'bg-green-100 text-green-800',
  community: 'bg-gray-100 text-gray-700',
  ai_generated: 'bg-purple-100 text-purple-800',
}

const labels: Record<DataConfidence, string> = {
  official: 'Official',
  community: 'Community',
  ai_generated: 'AI Generated',
}

export function ConfidenceBadge({ confidence }: { confidence: DataConfidence }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  )
}
