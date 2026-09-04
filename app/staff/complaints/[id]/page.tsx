// app/staff/complaints/[id]/page.tsx
// Individual complaint detail view for staff.
// Includes status management, state history, and for compliance: access grant controls.

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import StatusBadge from '@/components/ui/StatusBadge'
import SeverityBadge from '@/components/ui/SeverityBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import StatusActions from './_components/StatusActions'
import { format, formatDistanceToNow } from 'date-fns'
import { MapPin, Clock, AlertTriangle, Lock, Users } from 'lucide-react'
import type { ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types/database'

export const metadata: Metadata = { title: 'Complaint Detail' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function StaffComplaintDetailPage({ params }: Props) {
  const session = await requireRole(['staff', 'compliance', 'admin'])
  const { id } = await params

  // Load complaint
  const { data: complaint, error } = await adminClient
    .from('complaints')
    .select('*, departments(name, head_email)')
    .eq('id', id)
    .single() as any

  if (error || !complaint) notFound()

  // For restricted complaints, verify access
  if (complaint.visibility === 'restricted' && !['compliance', 'admin'].includes(session.role)) {
    const { count } = await adminClient
      .from('active_restricted_access_grants')
      .select('*', { count: 'exact', head: true })
      .eq('complaint_id', id)
      .eq('granted_to', session.userId)

    if ((count ?? 0) === 0) {
      // Staff doesn't have a grant — show restricted notice
      return (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="restricted-banner">
            <Lock className="restricted-banner-icon" size={24} />
            <div>
              <p className="restricted-banner-title">Restricted Complaint</p>
              <p className="restricted-banner-text">
                You do not have access to this complaint. Contact a compliance officer to request access if you believe this falls within your jurisdiction.
              </p>
            </div>
          </div>
        </div>
      )
    }
  }

  // Load state history
  const { data: history } = await adminClient
    .from('complaint_state_history')
    .select('*')
    .eq('complaint_id', id)
    .order('transitioned_at', { ascending: false }) as any

  // Load departments for reassignment
  const { data: departments } = await adminClient
    .from('departments')
    .select('id, name') as any

  // Load support count
  const { data: supportData } = await adminClient
    .from('complaint_support_counts')
    .select('support_count')
    .eq('complaint_id', id)
    .single() as any

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        <a href="/staff/queue" className="btn btn-ghost btn-sm" style={{ gap: '0.35rem', padding: '0.25rem 0.5rem' }}>
          ← Back to Triage Queue
        </a>
        {['admin', 'compliance'].includes(session.role) && (
          <>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <a href="/admin" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
              Admin Panel
            </a>
          </>
        )}
      </div>

      <div style={{ marginBottom: 'var(--space-5)' }}>
        {complaint.visibility === 'restricted' && (
          <div className="restricted-banner" style={{ marginBottom: 'var(--space-4)' }}>
            <Lock className="restricted-banner-icon" size={18} aria-hidden="true" />
            <div>
              <p className="restricted-banner-title">Restricted Complaint</p>
              <p className="restricted-banner-text">Access to this complaint is fully audit-logged.</p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
              {complaint.title}
            </h1>
            <div className="flex gap-2 flex-wrap">
              <CategoryBadge category={complaint.category as ComplaintCategory} />
              <SeverityBadge severity={complaint.severity as ComplaintSeverity} />
              <StatusBadge status={complaint.status as ComplaintStatus} />
              {complaint.escalation_level > 0 && (
                <span className="badge" style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-700)' }}>
                  <AlertTriangle size={10} aria-hidden="true" /> L{complaint.escalation_level} Escalated
                </span>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Priority Score</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: complaint.priority_score > 15 ? 'var(--color-danger-600)' : 'var(--text-primary)' }}>
              {Number(complaint.priority_score).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-5)' }}>
        {/* Left column: details + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: '1rem' }}>Complaint Details</h2></div>
            <div className="card-body">
              <p style={{ lineHeight: 1.7, marginBottom: 'var(--space-4)' }}>{complaint.description}</p>

              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <tbody>
                  {[
                    complaint.location && { label: 'Location', icon: MapPin, value: complaint.location },
                    { label: 'Submitted', icon: Clock, value: format(new Date(complaint.created_at), 'PPP p') },
                    { label: 'Department', value: (complaint.departments as any)?.name ?? 'Unassigned' },
                    { label: 'Anonymous ID', value: complaint.anonymous_id },
                    { label: 'Support', icon: Users, value: `${supportData?.support_count ?? 0} supporters` },
                    complaint.resolved_at && { label: 'Resolved', value: format(new Date(complaint.resolved_at), 'PPP') },
                    complaint.dispute_deadline && { label: 'Dispute Deadline', value: format(new Date(complaint.dispute_deadline), 'PPP') },
                  ].filter(Boolean).map((item: any) => (
                    <tr key={item.label}>
                      <td style={{ padding: '5px 0', fontWeight: 600, color: 'var(--text-secondary)', width: '130px' }}>
                        {item.label}
                      </td>
                      <td style={{ padding: '5px 0' }}>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Actions (client component) */}
          <StatusActions
            complaintId={id}
            currentStatus={complaint.status as ComplaintStatus}
            currentDepartmentId={complaint.department_id ?? ''}
            departments={departments ?? []}
            userRole={session.role}
          />
        </div>

        {/* Right column: state history */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: '1rem' }}>State History</h2>
          </div>
          <div className="card-body">
            {(history ?? []).length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No history yet.</p>
            ) : (
              <div className="timeline">
                {history?.map((entry: any) => (
                  <div key={entry.id} className="timeline-item">
                    <div className="timeline-dot" aria-hidden="true" />
                    <p className="timeline-time">
                      {format(new Date(entry.transitioned_at), 'MMM d, yyyy p')}
                    </p>
                    <p className="timeline-content">
                      {entry.from_status
                        ? <><span className="badge badge-submitted" style={{ fontSize: '0.7rem' }}>{entry.from_status}</span> → <span className={`badge badge-${entry.to_status}`} style={{ fontSize: '0.7rem' }}>{entry.to_status}</span></>
                        : <span className="badge badge-submitted" style={{ fontSize: '0.7rem' }}>Submitted</span>
                      }
                    </p>
                    {entry.actor_type && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        by {entry.actor_type}
                      </p>
                    )}
                    {entry.notes && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, background: 'var(--color-neutral-50)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                        {entry.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
