// app/admin/page.tsx
// Main Admin Portal Overview Dashboard

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Shield, Users, FileText, Lock, FileSpreadsheet, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import SeverityBadge from '@/components/ui/SeverityBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import type { ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types/database'

export const metadata: Metadata = { title: 'Admin Control Center' }

async function getAdminOverview() {
  let complaintsCount = 0
  let usersCount = 0
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
    const { data } = await adminClient
      .from('complaints')
      .select('*, departments(name)')
      .order('created_at', { ascending: false })
      .limit(6) as any
    recentComplaints = (data ?? []).map((c: any) => ({
      ...c,
      department_name: c.departments?.name ?? 'Unassigned',
    }))
  } catch {}

  return { complaintsCount, usersCount, recentComplaints }
}

export default async function AdminDashboardPage() {
  const session = await requireRole(['admin', 'compliance'])
  const { complaintsCount, usersCount, recentComplaints } = await getAdminOverview()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Hero Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
              <Shield style={{ color: 'var(--green-bright)' }} size={24} />
              <h1 style={{ fontSize: '1.625rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                Admin Control Center
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
              Clearance Level: Level 4 Admin · Institutional Domain: {process.env.COLLEGE_DOMAIN ?? 'aits-tpt.edu.in'}
            </p>
          </div>

          <Link href="/admin/users" className="btn btn-terminal">
            <FileSpreadsheet size={15} /> Upload Excel / Add Users
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ gap: '1.25rem' }}>
        {[
          { label: 'Registered Users', value: usersCount, icon: Users, link: '/admin/users' },
          { label: 'Total Complaints', value: complaintsCount, icon: FileText, link: '/staff/queue' },
          { label: 'Compliance Vault', value: 'Level 4', icon: Lock, link: '/compliance' },
          { label: 'Audit Trail', value: 'Immutable', icon: Shield, link: '/compliance/audit' },
        ].map(({ label, value, icon: Icon, link }) => (
          <Link key={label} href={link} className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-card-icon" style={{ background: 'var(--green-faint)', color: 'var(--green-bright)' }}>
              <Icon size={18} />
            </div>
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-value">{value}</div>
          </Link>
        ))}
      </div>

      {/* Quick Nav Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        <Link href="/admin/users" className="card" style={{ padding: '1.25rem', textDecoration: 'none', transition: 'all 150ms ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--green-bright)' }} />
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Manage Users &amp; Accounts</p>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Create student &amp; staff accounts manually or batch upload student lists via Excel (.xlsx).
          </p>
        </Link>

        <Link href="/staff/queue" className="card" style={{ padding: '1.25rem', textDecoration: 'none', transition: 'all 150ms ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--green-bright)' }} />
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Triage &amp; Queue</p>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            View and manage all active complaint reports across all campus departments.
          </p>
        </Link>

        <Link href="/compliance" className="card" style={{ padding: '1.25rem', textDecoration: 'none', transition: 'all 150ms ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Lock size={18} style={{ color: 'var(--purple-bright)' }} />
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Compliance Vault</p>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Restricted vault for sensitive cases (*Harassment, Conduct, Safety*) and active token grants.
          </p>
        </Link>
      </div>

      {/* Recent Complaints Stream */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Reports Activity</h2>
          <Link href="/staff/queue" className="btn btn-ghost btn-sm">View Full Queue →</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentComplaints.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No complaint records found.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Report Title</th>
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
                      <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.title}</td>
                      <td><CategoryBadge category={c.category as ComplaintCategory} /></td>
                      <td><SeverityBadge severity={c.severity as ComplaintSeverity} /></td>
                      <td><StatusBadge status={c.status as ComplaintStatus} /></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.department_name}</td>
                      <td>
                        <Link href={`/staff/complaints/${c.id}`} className="btn btn-ghost btn-sm">View →</Link>
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
