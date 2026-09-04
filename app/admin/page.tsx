// app/admin/page.tsx
// Main Admin Portal Control Center

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Shield, Users, FileText, Lock, FileSpreadsheet,
  BookOpen, ArrowUpRight, AlertTriangle, Layers
} from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import SeverityBadge from '@/components/ui/SeverityBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import type { ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types/database'

export const metadata: Metadata = { title: 'Admin Control Center' }

async function getAdminOverview() {
  let complaintsCount = 0
  let usersCount = 0
  let activeEscalationsCount = 0
  let recentComplaints: any[] = []

  try {
    const { count } = await adminClient.from('complaints').select('*', { count: 'exact', head: true })
    complaintsCount = count ?? 0
  } catch {}

  try {
    const { data: usersData } = await adminClient.auth.admin.listUsers()
    usersCount = usersData?.users?.length ?? 0
  } catch {}

  try {
    const { count } = await adminClient.from('complaints').select('*', { count: 'exact', head: true }).gt('escalation_level', 0)
    activeEscalationsCount = count ?? 0
  } catch {}

  try {
    const { data } = await adminClient
      .from('complaints')
      .select('*, departments(name)')
      .order('created_at', { ascending: false })
      .limit(8) as any
    recentComplaints = (data ?? []).map((c: any) => ({
      ...c,
      department_name: c.departments?.name ?? 'Unassigned',
    }))
  } catch {}

  return { complaintsCount, usersCount, activeEscalationsCount, recentComplaints }
}

export default async function AdminDashboardPage() {
  const session = await requireRole(['admin', 'compliance'])
  const { complaintsCount, usersCount, activeEscalationsCount, recentComplaints } = await getAdminOverview()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Hero Header & Action Bar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
              <Shield style={{ color: 'var(--green-bright)' }} size={24} />
              <h1 style={{ fontSize: '1.625rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Admin Control Center
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              Clearance: Level 4 Administrator // Domain: {process.env.COLLEGE_DOMAIN ?? 'aits-tpt.edu.in'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/admin/users" className="btn btn-terminal">
              <FileSpreadsheet size={15} /> User Management &amp; Excel
            </Link>
            <Link href="/staff/queue" className="btn btn-secondary">
              <FileText size={15} /> Triage Queue
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stat Metrics */}
      <div className="grid-4" style={{ gap: '1.25rem' }}>
        {[
          { label: 'Registered Accounts', value: usersCount, icon: Users, link: '/admin/users', color: 'var(--green-bright)', bg: 'var(--green-faint)' },
          { label: 'Active Reports', value: complaintsCount, icon: FileText, link: '/staff/queue', color: 'var(--blue-bright)', bg: 'rgba(59,130,246,0.10)' },
          { label: 'Escalated Incidents', value: activeEscalationsCount, icon: AlertTriangle, link: '/staff/queue?escalated=true', color: 'var(--red-bright)', bg: 'var(--red-faint)' },
          { label: 'System Audit Log', value: 'Immutable', icon: BookOpen, link: '/compliance/audit', color: 'var(--purple-bright)', bg: 'var(--purple-faint)' },
        ].map(({ label, value, icon: Icon, link, color, bg }) => (
          <Link key={label} href={link} className="stat-card" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div className="stat-card-icon" style={{ background: bg, color }}>
                <Icon size={18} />
              </div>
              <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="stat-card-label" style={{ marginTop: '0.5rem' }}>{label}</div>
            <div className="stat-card-value" style={{ color }}>{value}</div>
          </Link>
        ))}
      </div>

      {/* Main Admin Stream */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Live Incident Stream</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>Real-time overview of latest filed reports across all campus departments.</p>
          </div>
          <Link href="/staff/queue" className="btn btn-ghost btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            Open Full Queue →
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentComplaints.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No incident records found.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Incident Title</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Department</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComplaints.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{c.title}</p>
                          {c.visibility === 'restricted' && (
                            <span className="badge badge-restricted" style={{ fontSize: '0.65rem', marginTop: 2 }}>
                              <Lock size={10} style={{ display: 'inline', marginRight: 3 }} /> RESTRICTED
                            </span>
                          )}
                        </div>
                      </td>
                      <td><CategoryBadge category={c.category as ComplaintCategory} /></td>
                      <td><SeverityBadge severity={c.severity as ComplaintSeverity} /></td>
                      <td><StatusBadge status={c.status as ComplaintStatus} /></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.department_name}</td>
                      <td>
                        <Link href={`/staff/complaints/${c.id}`} className="btn btn-ghost btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          View Details →
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

    </div>
  )
}
