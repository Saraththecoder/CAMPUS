// app/compliance/restricted/page.tsx
// Compliance view of all restricted complaints.

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import SeverityBadge from '@/components/ui/SeverityBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import { formatDistanceToNow } from 'date-fns'
import { Lock, AlertTriangle } from 'lucide-react'
import type { ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types/database'

export const metadata: Metadata = { title: 'Restricted Complaints' }

export default async function RestrictedComplaintsPage() {
  await requireRole(['compliance', 'admin'])

  const { data: complaints, error } = await adminClient
    .from('complaints')
    .select('*, departments(name)')
    .eq('visibility', 'restricted')
    .order('priority_score', { ascending: false }) as any

  return (
    <div>
      {/* Breadcrumbs Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <Link href="/admin" style={{ color: 'var(--green-bright)', textDecoration: 'none' }}>Admin Control Center</Link>
        <span>/</span>
        <Link href="/compliance" style={{ color: 'var(--purple-bright)', textDecoration: 'none' }}>Compliance Vault</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Restricted Complaints</span>
      </div>

      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Lock size={22} style={{ color: 'var(--color-danger-600)' }} aria-hidden="true" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Restricted Complaints
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Sensitive complaints — harassment, discrimination, conduct, safety.
          Only compliance officers and explicitly authorized staff can view these.
        </p>
      </div>

      <div className="restricted-banner" style={{ marginBottom: 'var(--space-6)' }}>
        <AlertTriangle className="restricted-banner-icon" size={20} aria-hidden="true" />
        <div>
          <p className="restricted-banner-title">Restricted Information</p>
          <p className="restricted-banner-text">
            Access to these complaints is fully audit-logged. Every view, status change, and action is recorded with your identity and timestamp.
          </p>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">Failed to load restricted complaints.</div>
      ) : (complaints ?? []).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Lock size={24} /></div>
          <p className="empty-state-title">No restricted complaints</p>
          <p className="empty-state-text">No active restricted complaints at this time.</p>
        </div>
      ) : (
        <div className="table-container">
          <table role="table" aria-label="Restricted complaints">
            <thead>
              <tr>
                <th scope="col">Complaint</th>
                <th scope="col">Category</th>
                <th scope="col">Severity</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
                <th scope="col">Escalation</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {complaints?.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ maxWidth: '240px' }}>
                      <p className="truncate" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {c.departments?.name ?? 'Unassigned'}
                      </p>
                    </div>
                  </td>
                  <td><CategoryBadge category={c.category as ComplaintCategory} /></td>
                  <td><SeverityBadge severity={c.severity as ComplaintSeverity} /></td>
                  <td><StatusBadge status={c.status as ComplaintStatus} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </td>
                  <td>
                    {c.escalation_level > 0 && (
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
