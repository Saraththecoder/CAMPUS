'use client'
// app/complaints/[id]/_components/VoteActions.tsx
// Vote confirm/dispute during the resolution window. Requires auth.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ThumbsUp, ThumbsDown, LogIn, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Props { complaintId: string }

export default function VoteActions({ complaintId }: Props) {
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState<'confirm' | 'dispute' | null>(null)
  const router = useRouter()

  const vote = async (type: 'confirm' | 'dispute') => {
    setLoading(type)
    try {
      const res = await fetch(`/api/complaints/${complaintId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType: type }),
      })

      const data = await res.json()

      if (res.status === 401) {
        toast.error('Please sign in to vote on resolutions')
        router.push(`/login?redirect=/complaints/${complaintId}`)
        return
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Vote failed. Please try again.')
        return
      }

      if (data.alreadyVoted) {
        toast.info('You have already voted on this resolution')
        return
      }

      setVoted(true)
      toast.success(type === 'confirm' ? 'You confirmed this resolution ✓' : 'You disputed this resolution')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  if (voted) {
    return (
      <div className="alert alert-success" role="status">
        <ThumbsUp size={16} aria-hidden="true" />
        <span>Your vote has been recorded anonymously.</span>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 style={{ fontSize: '1rem' }}>Is this resolution satisfactory?</h2>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Vote to confirm or dispute this resolution. Your vote is anonymous and deterministic — you can only vote once per complaint.
          If disputes outnumber confirmations, the complaint will be re-opened.
        </p>
        <div className="flex gap-3">
          <button
            className="btn btn-primary"
            onClick={() => vote('confirm')}
            disabled={loading !== null}
            style={{ flex: 1 }}
          >
            {loading === 'confirm' ? <Loader2 size={14} aria-hidden="true" /> : <ThumbsUp size={14} aria-hidden="true" />}
            Confirm Resolution
          </button>
          <button
            className="btn btn-danger"
            onClick={() => vote('dispute')}
            disabled={loading !== null}
            style={{ flex: 1 }}
          >
            {loading === 'dispute' ? <Loader2 size={14} aria-hidden="true" /> : <ThumbsDown size={14} aria-hidden="true" />}
            Dispute Resolution
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
          <Link href="/login">Sign in with your institutional email</Link> to vote.
        </p>
      </div>
    </div>
  )
}
