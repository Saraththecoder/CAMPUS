'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, ShieldAlert, Loader2 } from 'lucide-react'

export function RevokeGrantButton({ grantId }: { grantId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this restricted access token immediately?')) return

    setLoading(true)
    try {
      const res = await fetch('/api/compliance/grant-access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId, reason: 'Revoked via Compliance Vault Control' }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to revoke token')
        return
      }

      toast.success('Access grant revoked successfully')
      router.refresh()
    } catch {
      toast.error('Network error revoking access token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={loading}
      className="btn btn-danger btn-sm"
      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', gap: '0.25rem' }}
    >
      {loading ? <Loader2 size={12} className="btn-loading" /> : <ShieldAlert size={12} />}
      {loading ? 'REVOKING...' : 'REVOKE'}
    </button>
  )
}

export function ForceRotateKeysButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRotate = async () => {
    if (!confirm('Re-keying AES-256 vault encryption tokens. Proceed with key rotation?')) return

    setLoading(true)
    try {
      const res = await fetch('/api/compliance/rotate-keys', {
        method: 'POST',
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Key rotation failed')
        return
      }

      toast.success('Encryption keys rotated! Active sessions re-encrypted and logged.')
      router.refresh()
    } catch {
      toast.error('Network error performing key rotation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRotate}
      disabled={loading}
      className="btn btn-secondary btn-full"
      style={{
        marginTop: '0.75rem',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        gap: '0.5rem',
      }}
    >
      <RefreshCw size={14} className={loading ? 'btn-loading' : ''} />
      {loading ? 'Rotating Vault Keys...' : '↻ Force Rotate Keys'}
    </button>
  )
}
