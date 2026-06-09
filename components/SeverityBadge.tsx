import type { Severity } from '@/lib/types'

const label: Record<Severity, string> = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  INFO: 'Info',
}

const cls: Record<Severity, string> = {
  CRITICAL: 'badge badge-critical',
  WARNING: 'badge badge-warning',
  INFO: 'badge badge-info',
}

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return null
  return (
    <span className={cls[severity]}>{label[severity]}</span>
  )
}
