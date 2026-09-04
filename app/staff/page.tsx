// app/staff/page.tsx
// Aegis-7 Staff Queue Dashboard

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { AlertTriangle, CheckCircle2, Clock, FileText, Inbox, Loader2, TrendingUp, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { ComplaintStatus } from '@/types/database'

export const metadata: Metadata = { title: 'Dashboard | Aegis-7' }

async function getStaffStats(departmentId: string | null, role: string) {
  let query = adminClient.from('complaints').select('status, visibility, escalation_level')
  if (role === 'staff' && departmentId) query = query.eq('department_id', departmentId)
  const { data } = await (query as any)
  const complaints: any[] = data ?? []
  return {
    total: complaints.length,
    submitted: complaints.filter(c => c.status === 'submitted').length,
    reviewed: complaints.filter(c => c.status === 'reviewed').length,
    assigned: complaints.filter(c => c.status === 'assigned').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    disputed: complaints.filter(c => c.status === 'disputed').length,
    verified: complaints.filter(c => c.status === 'verified').length,
    escalated: complaints.filter(c => c.escalation_level > 0 && !['closed', 'verified'].includes(c.status)).length,
    awaitingTriage: complaints.filter(c => ['submitted', 'reviewed'].includes(c.status)).length,
  }
}

async function getRecentComplaints(departmentId: string | null, role: string) {
  try {
    let query = adminClient.from('staff_complaint_queue').select('*').order('priority_score', { ascending: false }).limit(6)
    if (role === 'staff' && departmentId) query = query.eq('department_id', departmentId)
    const { data, error } = await (query as any)
    if (!error && data) return data

    let fallbackQuery = adminClient.from('complaints').select('*, departments(name)').order('priority_score', { ascending: false }).limit(6)
    if (role === 'staff' && departmentId) fallbackQuery = fallbackQuery.eq('department_id', departmentId)
    const { data: fallbackData } = await (fallbackQuery as any)
    return (fallbackData ?? []).map((c: any) => ({
      ...c,
      department_name: c.departments?.name ?? 'Unassigned',
      days_since_assigned: Math.max(0, (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    }))
  } catch {
    return []
  }
}

function agsId(id: string): string {
  const short = id.replace(/-/g, '').slice(0, 4).toUpperCase()
  return `AGS-${short}-${id.slice(-1).toUpperCase()}`
}

export default async function StaffDashboardPage() {
  const session = await requireRole(['staff', 'compliance', 'admin'])
  const [stats, recentComplaints] = await Promise.all([
    getStaffStats(session.departmentId, session.role),
    getRecentComplaints(session.departmentId, session.role),
  ])

  const statCards = [
    { label: 'Awaiting Triage', value: stats.awaitingTriage, icon: Inbox, color: '#60a5fa', bg: 'rgba(59,130,246,0.10)', urgent: stats.awaitingTriage > 5 },
    { label: 'In Progress', value: stats.in_progress, icon: Loader2, color: 'var(--amber-bright)', bg: 'var(--amber-faint)', urgent: false },
    { label: 'Escalated', value: stats.escalated, icon: AlertTriangle, color: 'var(--red-bright)', bg: 'var(--red-faint)', urgent: stats.escalated > 0 },
    { label: 'Disputed', value: stats.disputed, icon: XCircle, color: 'var(--red-bright)', bg: 'var(--red-faint)', urgent: stats.disputed > 0 },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'var(--green-bright)', bg: 'var(--green-faint)', urgent: false },
    { label: 'Total Active', value: stats.total, icon: FileText, color: 'var(--text-secondary)', bg: 'var(--bg-elevated)', urgent: false },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
          Staff Queue Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
          {session.role === 'staff' ? 'Department complaint queue' : 'All departments — full access'}
          {' // '}
          <span style={{ color: stats.escalated > 0 ? 'var(--red-bright)' : 'var(--text-muted)', fontWeight: 700 }}>
            {stats.escalated} escalated
          </span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid-3" role="list" aria-label="Dashboard statistics">
        {statCards.map(({ label, value, icon: Icon, color, bg, urgent }) => (
          <div
            key={label}
            className="stat-card"
            role="listitem"
            style={urgent ? { borderColor: `${color}40`, borderLeftColor: color, borderLeftWidth: 3 } : undefined}
            aria-label={`${label}: ${value}`}
          >
            <div className="stat-card-icon" style={{ background: bg, color }}>
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-value" style={{ color: urgent ? color : 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown + Quick actions */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Status Breakdown</h2>
          </div>
          <div className="card-body">
            {(['submitted', 'reviewed', 'assigned', 'in_progress', 'resolved', 'disputed', 'verified'] as ComplaintStatus[]).map(status => {
              const count = stats[status as keyof typeof stats] as number
              const max = Math.max(stats.total, 1)
              const pct = Math.round((count / max) * 100)
              const color = status === 'disputed' ? 'var(--red-bright)'
                : status === 'verified' || status === 'resolved' ? 'var(--green-bright)'
                : status === 'in_progress' ? 'var(--amber-bright)'
                : 'var(--blue-bright)'
              return (
                <div key={status} style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>
                      {status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{count}</span>
                  </div>
                  <div className="priority-bar" aria-hidden="true">
                    <div className="priority-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Quick Actions</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Link href="/staff/queue" className="btn btn-terminal" style={{ justifyContent: 'flex-start' }}>
              <TrendingUp size={14} /> View Full Queue
            </Link>
            {stats.disputed > 0 && (
              <Link href="/staff/queue?status=disputed" className="btn btn-danger" style={{ justifyContent: 'flex-start' }}>
                <XCircle size={14} /> Review Disputed ({stats.disputed})
              </Link>
            )}
            {stats.escalated > 0 && (
              <Link href="/staff/queue?escalated=true" className="btn btn-secondary" style={{ justifyContent: 'flex-start', borderColor: 'var(--amber-border)', color: 'var(--amber-bright)' }}>
                <AlertTriangle size={14} /> Review Escalated ({stats.escalated})
              </Link>
            )}
            {stats.awaitingTriage > 0 && (
              <Link href="/staff/queue?status=submitted" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Inbox size={14} /> Triage Queue ({stats.awaitingTriage})
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Priority queue table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={15} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Top Priority Queue</h2>
          </div>
          <Link href="/staff/queue" className="btn btn-ghost btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem' }}>
            View All →
          </Link>
        </div>
        {recentComplaints.length === 0 ? (
          <div className="empty-state" style={{ padding: '2.5rem' }}>
            <div className="empty-state-icon"><Inbox size={20} /></div>
            <p className="empty-state-title">No active complaints</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table role="table" aria-label="High priority complaints">
              <thead>
                <tr>
                  <th>ID / Title</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Age</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {recentComplaints.map(c => (
                  <tr key={c.id}>
                    <td>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--green-bright)', marginBottom: '0.2rem' }}>{agsId(c.id)}</p>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                      {c.visibility === 'restricted' && (
                        <span className="badge badge-restricted" style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>RESTRICTED</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', textTransform: 'capitalize', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                        {c.category}
                      </span>
                    </td>
                    <td><span className={`badge badge-${c.severity}`}>{c.severity}</span></td>
                    <td><span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span></td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {Number(c.priority_score).toFixed(1)}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {Math.floor(Number(c.days_since_assigned))}d
                    </td>
                    <td>
                      <Link href={`/staff/complaints/${c.id}`} className="btn btn-ghost btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem' }}>
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
    </div>
  )
}
