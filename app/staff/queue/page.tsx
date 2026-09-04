// app/staff/queue/page.tsx
// Staff complaint queue — full list with filters and bulk actions.

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { Metadata } from 'next'
import StatusBadge from '@/components/ui/StatusBadge'
import SeverityBadge from '@/components/ui/SeverityBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Inbox, Lock } from 'lucide-react'
import type { ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types/database'

export const metadata: Metadata = { title: 'Complaint Queue' }

interface PageProps {
  searchParams: Promise<{
    status?: string
    category?: string
    severity?: string
    escalated?: string
    page?: string
  }>
}

export default async function StaffQueuePage({ searchParams }: PageProps) {
  const session = await requireRole(['staff', 'compliance', 'admin'])
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const pageSize = 25

  let query = adminClient
    .from('staff_complaint_queue')
    .select('*')
    .order('priority_score', { ascending: false })

  // Staff only see their department
  if (session.role === 'staff' && session.departmentId) {
    query = query.eq('department_id', session.departmentId)
  }

  if (params.status) query = query.eq('status', params.status as ComplaintStatus)
  if (params.category) query = query.eq('category', params.category as ComplaintCategory)
  if (params.severity) query = query.eq('severity', params.severity as ComplaintSeverity)
  if (params.escalated === 'true') query = query.gt('escalation_level', 0)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data: complaints, error } = await (query as any)

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Complaint Queue
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>
          {session.role === 'staff' ? 'Your department\'s complaints' : 'All complaints'}
        </p>
      </div>

      {/* Filters */}
      <div className="filter-bar" role="search" aria-label="Filter complaint queue">
        <span className="filter-bar-label">Filter:</span>

        <form style={{ display: 'contents' }}>
          <select
            name="status"
            className="filter-select"
            defaultValue={params.status ?? ''}
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
            defaultValue={params.severity ?? ''}
            aria-label="Filter by severity"
          >
            <option value="">All Severities</option>
            {['critical', 'high', 'medium', 'low'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {params.escalated && (
            <Link href="/staff/queue" className="btn btn-ghost btn-sm">Clear Escalated Filter</Link>
          )}
        </form>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">Failed to load queue. Please refresh.</div>
      ) : complaints?.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Inbox size={28} /></div>
          <p className="empty-state-title">Queue is empty</p>
          <p className="empty-state-text">No complaints match the current filters.</p>
        </div>
      ) : (
        <div className="table-container">
          <table role="table" aria-label="Complaint queue">
            <thead>
              <tr>
                <th scope="col">Complaint</th>
                <th scope="col">Category</th>
                <th scope="col">Severity</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Days Open</th>
                <th scope="col">Escalation</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {complaints?.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ maxWidth: '240px' }}>
                      <p className="truncate" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {c.visibility === 'restricted' && (
                          <Lock size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--color-danger-600)', verticalAlign: 'middle' }} aria-label="Restricted" />
                        )}
                        {c.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {c.department_name ?? 'Unassigned'}
                      </p>
                    </div>
                  </td>
                  <td><CategoryBadge category={c.category as ComplaintCategory} /></td>
                  <td><SeverityBadge severity={c.severity as ComplaintSeverity} /></td>
                  <td><StatusBadge status={c.status as ComplaintStatus} /></td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(c.priority_score).toFixed(1)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: Number(c.days_since_assigned) > 7 ? 'var(--color-danger-600)' : 'var(--text-secondary)' }}>
                    {Math.floor(Number(c.days_since_assigned))}d
                  </td>
                  <td>
                    {Number(c.escalation_level) > 0 && (
                      <span className="badge" style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-700)' }}>
                        <AlertTriangle size={10} aria-hidden="true" /> L{c.escalation_level}
                      </span>
                    )}
                  </td>
                  <td>
                    <Link href={`/staff/complaints/${c.id}`} className="btn btn-ghost btn-sm">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
