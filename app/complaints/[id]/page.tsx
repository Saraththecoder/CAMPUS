// app/complaints/[id]/page.tsx
// Public complaint detail view.
// Shows state history, support count, vote actions (if resolved), and evidence list.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PublicNav from '@/components/layout/PublicNav'
import StatusBadge from '@/components/ui/StatusBadge'
import SeverityBadge from '@/components/ui/SeverityBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import { format, formatDistanceToNow } from 'date-fns'
import { MapPin, Clock, Users, Lock, AlertTriangle, Shield } from 'lucide-react'
import Link from 'next/link'
import type { ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types/database'
import VoteActions from './_components/VoteActions'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('public_complaints_feed')
    .select('title, category')
    .eq('id', id)
    .single() as any

  return {
    title: data?.title ?? 'Complaint',
    description: `Campus complaint in ${data?.category ?? 'unknown'} category.`,
  }
}

interface Props { params: Promise<{ id: string }> }

export default async function PublicComplaintDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Try public feed first
  const { data: complaint, error } = await supabase
    .from('public_complaints_feed')
    .select('*')
    .eq('id', id)
    .single() as any

  if (error || !complaint) {
    // Check if it's restricted
    const supabaseAnon = await createClient()
    const { data: restricted } = await supabaseAnon
      .from('complaints')
      .select('id, visibility')
      .eq('id', id)
      .single() as any

    if (restricted?.visibility === 'restricted') {
      return (
        <>
          <PublicNav />
          <main id="main-content" style={{ maxWidth: '640px', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
            <div className="restricted-banner">
              <Lock className="restricted-banner-icon" size={20} aria-hidden="true" />
              <div>
                <p className="restricted-banner-title">Restricted Complaint</p>
                <p className="restricted-banner-text">
                  This complaint contains sensitive information and is only accessible to authorized staff.
                </p>
              </div>
            </div>
          </main>
        </>
      )
    }
    notFound()
  }

  // Load state history
  const { data: history } = await supabase
    .from('complaint_state_history')
    .select('id, from_status, to_status, actor_type, notes, transitioned_at')
    .eq('complaint_id', id)
    .order('transitioned_at', { ascending: false }) as any

  const isInDisputeWindow = complaint.dispute_deadline
    ? new Date(complaint.dispute_deadline) > new Date()
    : false

  return (
    <>
      <PublicNav />
      <main id="main-content" style={{ maxWidth: 'var(--max-content)', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
        <div style={{ maxWidth: '800px' }}>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-4)', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            <Link href="/complaints">← Back to Feed</Link>
          </nav>

          {/* Status alerts */}
          {complaint.status === 'disputed' && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={16} aria-hidden="true" />
              <div>
                <strong>Resolution Disputed</strong>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  The community has disputed this resolution. It has been returned to staff for re-investigation.
                </p>
              </div>
            </div>
          )}

          {isInDisputeWindow && (
            <div className="alert alert-warning" role="status" style={{ marginBottom: 'var(--space-4)' }}>
              <Clock size={16} aria-hidden="true" />
              <div>
                <strong>Dispute Window Open</strong>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  This complaint has been resolved. Community members can confirm or dispute the resolution until{' '}
                  {formatDistanceToNow(new Date(complaint.dispute_deadline!), { addSuffix: true })}.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
              {complaint.title}
            </h1>
            <div className="flex gap-2 flex-wrap">
              <CategoryBadge category={complaint.category as ComplaintCategory} />
              <SeverityBadge severity={complaint.severity as ComplaintSeverity} />
              <StatusBadge status={complaint.status as ComplaintStatus} />
            </div>
          </div>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            {/* Left: Main content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="card">
                <div className="card-body">
                  <p style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{complaint.description}</p>
                </div>
                <div className="card-footer">
                  <div className="flex gap-4 flex-wrap" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {complaint.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} aria-hidden="true" /> {complaint.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={13} aria-hidden="true" /> {complaint.support_count} supporters
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} aria-hidden="true" />
                      <time dateTime={complaint.created_at}>
                        {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                      </time>
                    </span>
                    {complaint.department_name && (
                      <span>🏢 {complaint.department_name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Vote actions (if in dispute window) */}
              {isInDisputeWindow && (
                <VoteActions complaintId={id} />
              )}

              {/* Privacy notice */}
              <div className="alert alert-info">
                <Shield size={14} aria-hidden="true" />
                <div>
                  <strong>Anonymous complaint</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                    This complaint was submitted anonymously. No identity information is stored or displayed.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: State history */}
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: '1rem' }}>Status History</h2>
              </div>
              <div className="card-body">
                {(history ?? []).length === 0 ? (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No updates yet.</p>
                ) : (
                  <div className="timeline">
                    {history?.map((entry: any) => (
                      <div key={entry.id} className="timeline-item">
                        <div className="timeline-dot" aria-hidden="true" />
                        <p className="timeline-time">
                          {format(new Date(entry.transitioned_at), 'MMM d, yyyy')}
                        </p>
                        <p className="timeline-content">
                          {entry.from_status
                            ? <>{entry.from_status.replace('_', ' ')} → <strong>{entry.to_status.replace('_', ' ')}</strong></>
                            : <strong>Complaint submitted</strong>
                          }
                        </p>
                        {entry.notes && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
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
      </main>
    </>
  )
}
