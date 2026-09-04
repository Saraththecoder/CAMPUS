'use client'

import { useState } from 'react'
import { Key, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import SeverityBadge from '@/components/ui/SeverityBadge'
import { formatDistanceToNow, format } from 'date-fns'
import type { ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types/database'

interface RecoveryResult {
  id: string
  anonymousId: string
  category: ComplaintCategory
  title: string
  status: ComplaintStatus
  severity: ComplaintSeverity
  visibility: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  disputeDeadline: string | null
  departmentName: string | null
}

export default function RecoverForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecoveryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase().trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many attempts. Please wait before trying again.')
        } else if (res.status === 404) {
          setError('Recovery code not found. Please check the code and try again.')
        } else {
          setError(data.error ?? 'Lookup failed. Please try again.')
        }
        return
      }

      setResult(data.complaint)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const isInDisputeWindow = result?.disputeDeadline
    ? new Date(result.disputeDeadline) > new Date()
    : false

  return (
    <>
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="recovery-code" className="form-label form-label-required">
                Recovery Code
              </label>
              <input
                id="recovery-code"
                type="text"
                className={`form-input${error ? ' error' : ''}`}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                placeholder="TIGER-CANAL-9241"
                required
                spellCheck={false}
                autoCapitalize="characters"
                autoComplete="off"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', letterSpacing: '0.1em', textAlign: 'center' }}
                aria-describedby="recovery-code-hint"
              />
              <p id="recovery-code-hint" className="form-hint">
                Format: WORD-WORD-NNNN (e.g., TIGER-CANAL-9241)
              </p>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <AlertTriangle size={16} aria-hidden="true" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-terminal btn-full glitch-hover"
              disabled={loading || code.length < 10}
            >
              {loading ? (
                <><Loader2 size={16} aria-hidden="true" /> Looking up...</>
              ) : (
                <><Key size={16} aria-hidden="true" /> Look Up Complaint</>
              )}
            </button>
          </form>
        </div>
      </div>

      {result && (
        <div className="card" role="region" aria-label="Complaint status">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: '1.125rem' }}>{result.title}</h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 4 }}>
                ID: {result.anonymousId}
              </p>
            </div>
            <StatusBadge status={result.status} />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <CategoryBadge category={result.category} />
              <SeverityBadge severity={result.severity} />
              {result.visibility === 'restricted' && (
                <span className="badge badge-restricted">
                  <ShieldCheck size={10} aria-hidden="true" /> Restricted
                </span>
              )}
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                {[
                  { label: 'Submitted', value: format(new Date(result.createdAt), 'PPP') },
                  { label: 'Last Updated', value: formatDistanceToNow(new Date(result.updatedAt), { addSuffix: true }) },
                  { label: 'Department', value: result.departmentName ?? 'Not yet assigned' },
                  result.resolvedAt && { label: 'Resolved', value: format(new Date(result.resolvedAt), 'PPP') },
                ].filter(Boolean).map(({ label, value }: any) => (
                  <tr key={label}>
                    <td style={{ padding: '6px 0', fontWeight: 600, color: 'var(--text-secondary)', width: '130px' }}>{label}</td>
                    <td style={{ padding: '6px 0' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isInDisputeWindow && (
              <div className="alert alert-warning" style={{ marginTop: 'var(--space-4)' }}>
                <AlertTriangle size={14} />
                <div>
                  <strong>Resolution dispute window is open</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                    Closes {formatDistanceToNow(new Date(result.disputeDeadline!), { addSuffix: true })}.
                    Sign in to confirm or dispute this resolution.
                  </p>
                </div>
              </div>
            )}

            {result.status === 'disputed' && (
              <div className="alert alert-danger" style={{ marginTop: 'var(--space-4)' }} role="alert">
                <AlertTriangle size={14} />
                <div>
                  <strong>Resolution Disputed</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                    The community has disputed this resolution. It has been returned for re-investigation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
