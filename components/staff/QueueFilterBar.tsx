'use client'
// components/staff/QueueFilterBar.tsx
// Interactive client filter bar for the staff triage queue.

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Props {
  currentStatus?: string
  currentSeverity?: string
  isEscalated?: boolean
}

export default function QueueFilterBar({ currentStatus, currentSeverity, isEscalated }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="filter-bar" role="search" aria-label="Filter complaint queue" style={{ marginBottom: '1.25rem' }}>
      <span className="filter-bar-label">Filter:</span>

      <select
        name="status"
        className="filter-select"
        value={currentStatus ?? ''}
        onChange={e => updateFilter('status', e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {['submitted', 'reviewed', 'assigned', 'in_progress', 'resolved', 'disputed'].map(s => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </select>

      <select
        name="severity"
        className="filter-select"
        value={currentSeverity ?? ''}
        onChange={e => updateFilter('severity', e.target.value)}
        aria-label="Filter by severity"
      >
        <option value="">All Severities</option>
        {['critical', 'high', 'medium', 'low'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {(currentStatus || currentSeverity || isEscalated) && (
        <Link href="/staff/queue" className="btn btn-ghost btn-sm" style={{ color: 'var(--red-bright)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          CLEAR FILTERS
        </Link>
      )}
    </div>
  )
}
