'use client'
// components/complaints/ComplaintCard.tsx
// Aegis-7 AGS-style complaint card for the public feed with real-time support action.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Clock, RefreshCw, Loader2, ThumbsUp } from 'lucide-react'
import type { PublicComplaint } from '@/types/database'
import CategoryBadge from '@/components/ui/CategoryBadge'
import StatusBadge from '@/components/ui/StatusBadge'

interface Props { complaint: PublicComplaint }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function disputeTimeLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return '0d 0h 0m'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${d}d ${h}h ${m}m`
}

// Generate a short AGS-style ID from the complaint UUID
function agsId(id: string): string {
  const short = id.replace(/-/g, '').slice(0, 4).toUpperCase()
  const suffix = id.slice(-1).toUpperCase()
  return `AGS-${short}-${suffix}`
}

export default function ComplaintCard({ complaint }: Props) {
  const router = useRouter()
  const [supportCount, setSupportCount] = useState(complaint.support_count)
  const [supporting, setSupporting] = useState(false)
  const [hasSupported, setHasSupported] = useState(false)

  const isResolved = ['resolved', 'verified'].includes(complaint.status)
  const isDisputed = complaint.status === 'disputed'
  const isCritical = complaint.severity === 'critical'
  const inDisputeWindow = isResolved && complaint.dispute_deadline && new Date(complaint.dispute_deadline) > new Date()

  const leftBorder = isResolved ? 'var(--green-bright)'
    : isCritical ? 'var(--red-bright)'
    : isDisputed ? 'var(--amber-bright)'
    : 'transparent'

  const handleSupport = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (supporting) return
    setSupporting(true)

    try {
      const res = await fetch(`/api/complaints/${complaint.id}/support`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Please sign in to support this complaint')
          router.push(`/login?redirect=/complaints/${complaint.id}`)
          return
        }
        toast.error(data.error ?? 'Failed to add support')
        return
      }

      if (data.supported) {
        setSupportCount(prev => prev + 1)
        setHasSupported(true)
        toast.success('Support added to complaint')
      } else if (data.alreadySupported) {
        setHasSupported(true)
        toast.info('You have already supported this complaint')
      }
    } catch {
      toast.error('Error adding support')
    } finally {
      setSupporting(false)
    }
  }

  return (
    <article
      className="ags-card animate-fade-up"
      style={{ borderLeft: `3px solid ${leftBorder}` }}
      aria-label={`Complaint: ${complaint.title}`}
    >
      {/* Card Header */}
      <div className="ags-card-header">
        <div className="ags-card-meta">
          <div className="ags-avatar" aria-hidden="true">
            <FileText size={15} />
          </div>
          <div>
            <p className="ags-id">ID: {agsId(complaint.id)}</p>
            <p className="ags-time">
              Reported: {timeAgo(complaint.created_at)}
              {complaint.department_name && ` · ${complaint.department_name}`}
            </p>
          </div>
        </div>
        <div className="ags-card-badges">
          {isCritical && (
            <span className="badge badge-critical" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              Critical
            </span>
          )}
          {!isCritical && complaint.severity !== 'low' && (
            <span className={`badge badge-${complaint.severity}`}>
              {complaint.severity.charAt(0).toUpperCase() + complaint.severity.slice(1)}
            </span>
          )}
          <CategoryBadge category={complaint.category} />
        </div>
      </div>

      {/* Body */}
      <div className="ags-card-body">
        <Link href={`/complaints/${complaint.id}`} style={{ textDecoration: 'none' }}>
          <h2 className="ags-title">{complaint.title}</h2>
        </Link>
        <p className="ags-description" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {complaint.description}
        </p>

        {/* Resolved by line */}
        {isResolved && (
          <p style={{ marginTop: '0.625rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            Resolved by: Operator {complaint.anonymous_id.slice(0, 2).toUpperCase()}
          </p>
        )}
      </div>

      {/* Dispute window banner */}
      {inDisputeWindow && complaint.dispute_deadline && (
        <div className="dispute-banner">
          <div>
            <p className="dispute-banner-label">
              <Clock size={12} />
              7-Day Dispute Window Active
            </p>
            <p className="dispute-timer">Time remaining: {disputeTimeLeft(complaint.dispute_deadline)}</p>
          </div>
          <div className="dispute-actions">
            <Link href={`/complaints/${complaint.id}`} className="btn btn-secondary btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              Dispute
            </Link>
            <Link href={`/complaints/${complaint.id}`} className="btn btn-primary btn-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              Confirm Resolution
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="ags-card-footer">
        <div className="ags-status">
          <RefreshCw size={11} />
          <span>{complaint.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {complaint.has_evidence && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              📎 Evidence
            </span>
          )}
          <div className="ags-support-btn">
            <button
              type="button"
              onClick={handleSupport}
              disabled={supporting}
              className={`ags-support-action ${hasSupported ? 'active' : ''}`}
              aria-label={`Support complaint ${complaint.id}`}
              style={{
                background: hasSupported ? 'var(--green-faint)' : undefined,
                color: hasSupported ? 'var(--green-bright)' : undefined,
              }}
            >
              {supporting ? (
                <Loader2 size={12} className="btn-loading" />
              ) : (
                <><ThumbsUp size={12} /> {hasSupported ? 'Supported' : '+1 Support'}</>
              )}
            </button>
            <span className="ags-support-count" style={{ color: hasSupported ? 'var(--green-bright)' : undefined }}>
              {supportCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

