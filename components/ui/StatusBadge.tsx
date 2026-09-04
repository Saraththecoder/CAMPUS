// components/ui/StatusBadge.tsx
import type { ComplaintStatus } from '@/types/database'

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted: 'Submitted',
  reviewed: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  disputed: 'Disputed',
  verified: 'Verified',
  closed: 'Closed',
}

const STATUS_DOTS: Record<ComplaintStatus, string> = {
  submitted: '#94a3b8',
  reviewed: '#3b82f6',
  assigned: '#8b5cf6',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  disputed: '#ef4444',
  verified: '#059669',
  closed: '#64748b',
}

export default function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={`badge badge-${status}`}
      aria-label={`Status: ${STATUS_LABELS[status]}`}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: STATUS_DOTS[status],
          display: 'inline-block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
