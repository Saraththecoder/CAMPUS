// app/compliance/page.tsx
// Aegis-7 Compliance Vault — restricted access dashboard.

import { requireRole } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock, BookOpen, AlertTriangle, ShieldCheck, Key } from 'lucide-react'

export const metadata: Metadata = { title: 'Compliance Vault | Aegis-7' }

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19)
}

import { RevokeGrantButton, ForceRotateKeysButton } from './_components/ComplianceVaultActions'

export default async function CompliancePage() {
  await requireRole(['compliance', 'admin'])

  const [
    { data: restrictedComplaints },
    { data: activeGrants },
    { count: auditCount },
    { data: disputedComplaints },
    { data: recentAudit },
  ] = await Promise.all([
    adminClient.from('complaints').select('id, title, status, category, severity, escalation_level').eq('visibility', 'restricted').neq('status', 'closed') as any,
    adminClient.from('active_restricted_access_grants').select('id, complaint_id, granted_to, granted_at, expires_at') as any,
    adminClient.from('audit_log').select('*', { count: 'exact', head: true }) as any,
    adminClient.from('complaints').select('id, title, status, category').eq('status', 'disputed') as any,
    adminClient.from('audit_log').select('id, action, actor_type, target_id, created_at').order('created_at', { ascending: false }).limit(6) as any,
  ])

  const actionColor = (action: string) => {
    if (action.startsWith('SYS_') || action === 'status_change') return 'var(--green-bright)'
    if (action === 'grant_access' || action === 'USR_GRANT_ACCESS') return 'var(--purple-bright)'
    if (action.includes('FAIL') || action === 'revoke_access') return 'var(--red-bright)'
    return 'var(--text-secondary)'
  }

  return (
    <div>
      {/* Purple clearance banner */}
      <div className="clearance-banner">
        <AlertTriangle size={12} />
        <span>CLEARANCE: COMPLIANCE OFFICER // ENCRYPTED SESSION</span>
        <AlertTriangle size={12} />
      </div>

      {/* Page header */}
      <div style={{ padding: '1.75rem 2rem 0' }}>
        <p className="restricted-label">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red-bright)', display: 'inline-block' }} />
          RESTRICTED AREA
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.025em', marginTop: '0.375rem' }}>
          Compliance Vault
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Authorized personnel only. All actions are logged and encrypted.
        </p>
      </div>

      <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Stat row */}
        <div className="grid-4">
          {[
            { label: 'Restricted Complaints', value: restrictedComplaints?.length ?? 0, icon: Lock, color: 'var(--red-bright)', bg: 'var(--red-faint)' },
            { label: 'Active Access Grants', value: activeGrants?.length ?? 0, icon: Key, color: 'var(--purple-bright)', bg: 'var(--purple-faint)' },
            { label: 'Disputed Complaints', value: disputedComplaints?.length ?? 0, icon: AlertTriangle, color: 'var(--amber-bright)', bg: 'var(--amber-faint)' },
            { label: 'Audit Entries', value: auditCount ?? 0, icon: BookOpen, color: 'var(--green-bright)', bg: 'var(--green-faint)' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card" aria-label={`${label}: ${value}`}>
              <div className="stat-card-icon" style={{ background: bg, color }}><Icon size={18} aria-hidden="true" /></div>
              <div className="stat-card-label">{label}</div>
              <div className="stat-card-value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Main row */}
        <div className="grid-2">

          {/* Active Access Tokens */}
          <div className="card" style={{ borderColor: 'var(--purple-border)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={15} style={{ color: 'var(--purple-bright)' }} aria-hidden="true" />
                <h2 style={{ fontSize: '0.925rem', fontWeight: 700 }}>Active Access Tokens</h2>
              </div>
              <Link href="/compliance/restricted" className="btn btn-ghost btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem' }}>View All →</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table role="table" aria-label="Active access grants">
                <thead>
                  <tr>
                    <th>Operative</th>
                    <th>Clearance</th>
                    <th>Access Expiry</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeGrants ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: '1.5rem' }}>
                        No active grants
                      </td>
                    </tr>
                  ) : (
                    (activeGrants ?? []).slice(0, 5).map((g: any, i: number) => {
                      const initials = (g.granted_to ?? 'XX').slice(0, 2).toUpperCase()
                      const expiresAt = new Date(g.expires_at)
                      const msLeft = expiresAt.getTime() - Date.now()
                      const hLeft = Math.max(0, Math.floor(msLeft / 3600000))
                      const mLeft = Math.max(0, Math.floor((msLeft % 3600000) / 60000))
                      return (
                        <tr key={g.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--purple-faint)', border: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--purple-bright)' }}>
                                {initials}
                              </div>
                              <div>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>Operator {i + 1}</p>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>ID: {truncateHash(g.complaint_id)}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'var(--purple-faint)', color: 'var(--purple-bright)', borderColor: 'var(--purple-border)' }}>
                              Level {2 + i}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--purple-bright)', background: 'var(--purple-faint)', border: '1px solid var(--purple-border)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              ⏱ {String(hLeft).padStart(2, '0')}:{String(mLeft).padStart(2, '0')}:00
                            </span>
                          </td>
                          <td>
                            <RevokeGrantButton grantId={g.id} />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vault Status */}
          <div className="card" style={{ borderColor: 'var(--border-default)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={15} style={{ color: 'var(--green-bright)' }} aria-hidden="true" />
                <h2 style={{ fontSize: '0.925rem', fontWeight: 700 }}>Vault Status</h2>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Encryption Status', value: 'AES-256', color: 'var(--green-bright)' },
                { label: 'Active Tokens', value: String(activeGrants?.length ?? 0), color: 'var(--purple-bright)' },
                { label: 'Restricted Files', value: String(restrictedComplaints?.length ?? 0), color: 'var(--red-bright)' },
                { label: 'Audit Entries', value: String(auditCount ?? 0), color: 'var(--text-primary)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {label === 'Encryption Status' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />}
                    {value}
                  </span>
                </div>
              ))}

              <ForceRotateKeysButton />
            </div>
          </div>
        </div>

        {/* Immutable Audit Log */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={15} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
              <h2 style={{ fontSize: '0.925rem', fontWeight: 700 }}>Immutable Audit Log</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--green-bright)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-bright)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Live
              </span>
              <Link href="/compliance/audit" className="btn btn-ghost btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem' }}>View Full Log →</Link>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table role="table" aria-label="Audit log entries">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Action</th>
                  <th>Target Hash</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(recentAudit ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: '1.5rem' }}>
                      No audit entries yet
                    </td>
                  </tr>
                ) : (
                  (recentAudit ?? []).map((entry: any) => (
                    <tr key={entry.id}>
                      <td className="td-mono" style={{ fontSize: '0.775rem' }}>{formatTimestamp(entry.created_at)}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.775rem', fontWeight: 700, color: actionColor(entry.action), letterSpacing: '0.03em' }}>
                          {entry.action.toUpperCase().replace(/_/g, '_')}
                        </span>
                      </td>
                      <td className="td-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {entry.target_id ? truncateHash(entry.target_id.replace(/-/g, '')) : '—'}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: entry.action.includes('FAIL') || entry.action === 'revoke_access' ? 'var(--red-bright)' : 'var(--green-bright)' }}>
                          {entry.action.includes('FAIL') || entry.action === 'revoke_access' ? 'DENIED' : 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/compliance/audit" className="btn btn-secondary">
            <BookOpen size={15} /> View Full Audit Log
          </Link>
          <Link href="/compliance/restricted" className="btn btn-secondary" style={{ borderColor: 'var(--red-border)', color: 'var(--red-bright)' }}>
            <Lock size={15} /> Manage Restricted Files
          </Link>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
