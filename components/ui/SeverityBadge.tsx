// components/ui/SeverityBadge.tsx
import type { ComplaintSeverity } from '@/types/database'

const SEVERITY_LABELS: Record<ComplaintSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export default function SeverityBadge({ severity }: { severity: ComplaintSeverity }) {
  return (
    <span
      className={`badge badge-${severity}`}
      aria-label={`Severity: ${SEVERITY_LABELS[severity]}`}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  )
}
