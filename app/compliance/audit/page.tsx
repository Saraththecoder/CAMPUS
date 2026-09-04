// app/compliance/audit/page.tsx
// Audit log viewer for compliance officers.

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Audit Log' }

interface PageProps {
  searchParams: Promise<{ page?: string; action?: string; actor?: string }>
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  await requireRole(['compliance', 'admin'])
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const pageSize = 50
  const from = (page - 1) * pageSize

  let query = adminClient
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (params.action) query = query.eq('action', params.action)
  if (params.actor) query = query.eq('actor_type', params.actor)

  const { data: entries, error } = await (query as any)

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Audit Log</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>
          Immutable record of all actions taken in the system. Append-only.
        </p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)' }}>
        This log is immutable. No entries can be modified or deleted, even by administrators.
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">Failed to load audit log.</div>
      ) : (
        <div className="table-container">
          <table role="table" aria-label="Audit log">
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Action</th>
                <th scope="col">Actor Type</th>
                <th scope="col">Target</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map((entry: any) => (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
                      {entry.action}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${entry.actor_type === 'system' ? 'closed' : entry.actor_type === 'admin' ? 'critical' : 'reviewed'}`}>
                      {entry.actor_type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {entry.target_table && `${entry.target_table} / ${entry.target_id?.slice(0, 8)}...`}
                  </td>
                  <td style={{ fontSize: '0.875rem', maxWidth: '300px' }}>
                    <span className="truncate" style={{ display: 'block' }}>
                      {entry.reason ?? '—'}
                    </span>
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
