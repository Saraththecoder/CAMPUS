'use client'
// components/complaints/FilterBar.tsx
// Aegis-7 dark filter bar for the public complaint feed.

import { useRouter, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'

interface Props {
  currentParams: {
    q?: string
    category?: string
    status?: string
    severity?: string
    sort?: string
    page?: string
  }
}

export default function FilterBar({ currentParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams()
    Object.entries(currentParams).forEach(([k, v]) => {
      if (k !== 'page' && k !== key && v) params.set(k, v)
    })
    if (value) params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0.45rem 2rem 0.45rem 0.875rem',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%237a9180' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.625rem center',
    transition: 'border-color 150ms ease',
  }

  return (
    <div role="search" aria-label="Filter complaints" className="filter-bar" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', width: '100%' }}>

        {/* Search */}
        <div className="filter-search" style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by ID or keywords..."
            className="filter-search-input"
            style={{ paddingLeft: '2.25rem' }}
            aria-label="Search complaints"
            onChange={e => updateFilter('q', e.target.value)}
            defaultValue={currentParams.q ?? ''}
          />
        </div>

        {/* Category */}
        <label htmlFor="filter-category" className="sr-only">Category</label>
        <select
          id="filter-category"
          className="filter-select"
          style={selectStyle}
          value={currentParams.category ?? ''}
          onChange={e => updateFilter('category', e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">Category: All</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="academic">Academic</option>
          <option value="hostel">Hostel</option>
          <option value="mess">Mess</option>
          <option value="facilities">Facilities</option>
        </select>

        {/* Status */}
        <label htmlFor="filter-status" className="sr-only">Status</label>
        <select
          id="filter-status"
          className="filter-select"
          style={selectStyle}
          value={currentParams.status ?? ''}
          onChange={e => updateFilter('status', e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">Status: All</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Under Review</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="disputed">Disputed</option>
          <option value="verified">Verified</option>
        </select>

        {/* Severity */}
        <label htmlFor="filter-severity" className="sr-only">Severity</label>
        <select
          id="filter-severity"
          className="filter-select"
          style={selectStyle}
          value={currentParams.severity ?? ''}
          onChange={e => updateFilter('severity', e.target.value)}
          aria-label="Filter by severity"
        >
          <option value="">Severity: All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {Object.values(currentParams).some(v => v && v !== '1') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push(pathname)}
            aria-label="Clear all filters"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--red-bright)', letterSpacing: '0.04em' }}
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  )
}
