// app/recover/page.tsx
// Aegis-7 Anonymous recovery — look up complaint status via recovery code.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, Key, Loader2, ArrowRight, Lock, Clock, CheckCircle2 } from 'lucide-react'

interface RecoveredComplaint {
  complaint_id: string
  anonymous_id: string
  category: string
  title: string
  status: string
  severity: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  dispute_deadline: string | null
  department_name: string | null
}

function statusColor(status: string): string {
  if (['resolved', 'verified'].includes(status)) return 'var(--green-bright)'
  if (status === 'disputed') return 'var(--amber-bright)'
  if (status === 'closed') return 'var(--text-muted)'
  return '#60a5fa'
}

export default function RecoverPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecoveredComplaint | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Recovery failed. Check your code and try again.')
        return
      }
      setResult(data.complaint)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-default)', height: 52, display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '0.5rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--green-bright)', fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
          <img src="/logo.png" alt="Campus Compliance Logo" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} /> Campus Compliance
        </Link>
        <div style={{ flex: 1 }} />
        <Link href="/complaints" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          Public Feed →
        </Link>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--green-faint)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--green-bright)' }}>
              <Key size={24} />
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Cryptographic Recovery Protocol
            </p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Recover Report
            </h1>
          </div>

          {/* Form */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '1.75rem', marginBottom: '1.25rem' }}>
            <form onSubmit={handleRecover}>
              <div className="form-group">
                <label htmlFor="recovery-code" className="form-label">Recovery Code</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                  <input
                    id="recovery-code"
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                      color: 'var(--green-bright)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      letterSpacing: '0.03em',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-terminal btn-full" disabled={loading || !code.trim()}>
                {loading
                  ? <><Loader2 size={14} className="btn-loading" /> Decrypting...</>
                  : <><ArrowRight size={14} /> Retrieve Report Status</>
                }
              </button>
            </form>

            <p style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              Rate-limited to 5 lookups / 15 min. Your recovery code was shown once at submission.
            </p>
          </div>

          {/* Result */}
          {result && (
            <div style={{ background: 'var(--bg-card)', border: `1px solid ${statusColor(result.status)}40`, borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={16} style={{ color: statusColor(result.status) }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: statusColor(result.status) }}>
                  Report Located
                </p>
              </div>

              {[
                { label: 'Status', value: result.status.replace('_', ' ').toUpperCase() },
                { label: 'Category', value: result.category },
                { label: 'Severity', value: result.severity },
                { label: 'Department', value: result.department_name ?? '—' },
                { label: 'Filed', value: new Date(result.created_at).toLocaleDateString() },
                { label: 'Last Update', value: new Date(result.updated_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: label === 'Status' ? statusColor(result.status) : 'var(--text-primary)', textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}

              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.02em', color: 'var(--text-primary)', marginTop: '0.875rem' }}>
                {result.title}
              </p>

              {result.dispute_deadline && new Date(result.dispute_deadline) > new Date() && (
                <div style={{ marginTop: '1rem', padding: '0.625rem 0.875rem', background: 'var(--green-faint)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={13} style={{ color: 'var(--green-bright)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--green-bright)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    7-Day Dispute Window Active
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-sidebar)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>© 2024 Aegis-7 Security. Session: Encrypted-AES256</p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {['Privacy Policy', 'Compliance Standards', 'Audit Log'].map(l => (
            <Link key={l} href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
