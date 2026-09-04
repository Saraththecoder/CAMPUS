'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronRight, ChevronLeft, ShieldCheck, Copy, CheckCircle2,
  AlertTriangle, Upload, X, Loader2, Users, Globe, Lock
} from 'lucide-react'
import CategoryBadge from '@/components/ui/CategoryBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import type { ComplaintCategory, ComplaintSeverity } from '@/types/database'
import { isRestrictedCategory } from '@/types/database'

type Step = 'category' | 'details' | 'evidence' | 'duplicates' | 'review' | 'success'

interface FormData {
  category: ComplaintCategory | ''
  severity: ComplaintSeverity
  title: string
  description: string
  location: string
}

interface DuplicateResult {
  complaint_id: string
  title: string
  category: ComplaintCategory
  status: string
  similarity: number
  support_count: number
  created_at: string
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'details', label: 'Details' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'review', label: 'Review' },
]

function StepIndicator({ current }: { current: Step }) {
  const stepKeys = STEPS.map(s => s.key)
  const currentIdx = stepKeys.indexOf(current as Step)

  return (
    <div
      className="step-indicator"
      style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', width: '100%' }}
      role="progressbar"
      aria-label="Submission progress"
      aria-valuenow={currentIdx + 1}
      aria-valuemax={STEPS.length}
    >
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx
        const isActive = step.key === current

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem', fontWeight: 700,
                background: isActive ? 'var(--green-bright)' : isDone ? 'var(--green-faint)' : 'var(--bg-elevated)',
                color: isActive ? '#060a07' : isDone ? 'var(--green-bright)' : 'var(--text-muted)',
                border: `1px solid ${isActive ? 'var(--green-bright)' : isDone ? 'var(--green-border)' : 'var(--border-default)'}`,
              }}>
                {isDone ? <CheckCircle2 size={13} aria-hidden="true" /> : i + 1}
              </div>
              <span className="step-label" style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.67rem', fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                color: isActive ? 'var(--green-bright)' : 'var(--text-muted)',
              }}>
                {step.label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: 1,
                margin: '0 0.35rem',
                marginBottom: '1rem',
                background: isDone ? 'var(--green-bright)' : 'var(--border-default)',
              }} aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ComplaintWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('category')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    category: '',
    severity: 'medium',
    title: '',
    description: '',
    location: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([])
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [complaintId, setComplaintId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const isRestricted = formData.category ? isRestrictedCategory(formData.category as ComplaintCategory) : false

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!formData.category) newErrors.category = 'Please select a category'
    if (formData.title.length < 5) newErrors.title = 'Title must be at least 5 characters'
    if (formData.title.length > 200) newErrors.title = 'Title must be under 200 characters'
    if (formData.description.length < 20) newErrors.description = 'Description must be at least 20 characters'
    if (formData.description.length > 5000) newErrors.description = 'Description must be under 5000 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const checkDuplicates = useCallback(async () => {
    if (!formData.category || !formData.title) return []
    try {
      const res = await fetch(
        `/api/complaints/check-duplicates?title=${encodeURIComponent(formData.title)}&category=${formData.category}`
      )
      const data = await res.json()
      return data.duplicates ?? []
    } catch { return [] }
  }, [formData.category, formData.title])

  const handleNextFromDetails = async () => {
    if (!validate()) return
    setLoading(true)
    const dups = await checkDuplicates()
    setLoading(false)
    if (dups.length > 0) { setDuplicates(dups); setStep('duplicates') }
    else setStep('evidence')
  }

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    const valid = newFiles.filter(f => allowed.includes(f.type) && f.size <= 10 * 1024 * 1024)
    if (valid.length < newFiles.length) toast.error('Some files were rejected (must be image/PDF under 10MB)')
    setFiles(prev => [...prev, ...valid].slice(0, 3))
    e.target.value = ''
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          severity: formData.severity,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { toast.error('Please sign in before submitting a complaint'); router.push('/login?redirect=/complaints/new'); return }
        if (res.status === 429) { toast.error(data.error); return }
        toast.error(data.error ?? 'Submission failed'); return
      }
      setRecoveryCode(data.recoveryCode)
      setComplaintId(data.complaintId)
      setStep('success')
      if (files.length > 0 && data.complaintId) {
        for (const file of files) {
          try {
            const metaRes = await fetch(`/api/complaints/${data.complaintId}/evidence`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSizeBytes: file.size }),
            })
            const { uploadUrl } = await metaRes.json()
            if (uploadUrl) await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          } catch { /* Non-fatal */ }
        }
      }
    } catch { toast.error('An unexpected error occurred. Please try again.') }
    finally { setLoading(false) }
  }

  const copyRecoveryCode = async () => {
    if (!recoveryCode) return
    await navigator.clipboard.writeText(recoveryCode)
    setCopied(true)
    toast.success('Recovery code copied to clipboard')
    setTimeout(() => setCopied(false), 3000)
  }

  // ── CATEGORY STEP ──────────────────────────────────────────────────────────
  if (step === 'category') {
    const publicCats: ComplaintCategory[] = ['infrastructure', 'academic', 'hostel', 'mess', 'facilities']
    const restrictedCats: ComplaintCategory[] = ['conduct', 'harassment', 'discrimination', 'safety']

    const catBtnStyle = (cat: string, isRestrictedCat = false): React.CSSProperties => {
      const selected = formData.category === cat
      return {
        padding: '0.875rem 1rem',
        border: `1px solid ${selected
          ? (isRestrictedCat ? 'var(--red-bright)' : 'var(--green-bright)')
          : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-lg)',
        // Dark backgrounds — NO white
        background: selected
          ? (isRestrictedCat ? 'rgba(248,113,113,0.08)' : 'var(--green-faint)')
          : 'var(--bg-elevated)',
        cursor: 'pointer',
        textAlign: 'left' as const,
        transition: 'all 150ms ease',
        fontWeight: 600,
        fontSize: '0.875rem',
        textTransform: 'capitalize' as const,
        color: selected
          ? (isRestrictedCat ? 'var(--red-bright)' : 'var(--green-bright)')
          : 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }
    }

    return (
      <main id="main-content" style={{ maxWidth: '720px', margin: '2rem auto 4rem', padding: '0 1.5rem' }}>
        <StepIndicator current="category" />

        {/* Page title — outside card, on dark bg */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Initiate Secure Report
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.375rem', fontFamily: 'var(--font-mono)' }}>
            Anonymous Submission Protocol · AES-256 Encrypted
          </p>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              {/* Public channel */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1.25rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Globe size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Public Feed (100% Anonymous)</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>100% Anonymous · Visible on campus transparency feed for community support</p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', letterSpacing: '0.04em' }}>
                    Standard Routing
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.625rem' }}>
                  {publicCats.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, category: cat }))}
                      aria-pressed={formData.category === cat}
                      style={catBtnStyle(cat)}
                    >
                      {formData.category === cat && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-bright)', flexShrink: 0 }} />}
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Private vault */}
              <div style={{
                padding: '1.25rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--purple-border)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--purple-faint)', border: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-bright)' }}>
                    <Lock size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Private Vault (100% Anonymous &amp; Confidential)</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>100% Anonymous · Hidden from public feed · Compliance Officers only</p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--purple-bright)', background: 'var(--purple-faint)', border: '1px solid var(--purple-border)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple-bright)', display: 'inline-block' }} />
                    End-to-End Encrypted
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.625rem' }}>
                  {restrictedCats.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, category: cat }))}
                      aria-pressed={formData.category === cat}
                      style={catBtnStyle(cat, true)}
                    >
                      <Lock size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            {formData.category && isRestricted && (
              <div className="restricted-banner" style={{ marginTop: '1rem' }}>
                <ShieldCheck className="restricted-banner-icon" size={18} aria-hidden="true" />
                <div>
                  <p className="restricted-banner-title">Restricted Complaint</p>
                  <p className="restricted-banner-text">
                    Only compliance officers and explicitly authorized staff can view this. Your identity remains protected.
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                className="btn btn-terminal"
                onClick={() => { if (formData.category) setStep('details') }}
                disabled={!formData.category}
                aria-label="Continue to complaint details"
              >
                Proceed_to_Details
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── DETAILS STEP ───────────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <main id="main-content" style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <StepIndicator current="details" />

        <div className="card">
          <div className="card-header">
            <div>
              <h1 style={{ fontSize: '1.375rem' }}>Describe the Issue</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                Be specific and factual. Do not include personal identifying information.
              </p>
            </div>
            {formData.category && <CategoryBadge category={formData.category as ComplaintCategory} />}
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="complaint-title" className="form-label form-label-required">Title</label>
              <input
                id="complaint-title"
                type="text"
                className={`form-input${errors.title ? ' error' : ''}`}
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="Brief, specific title (e.g. 'Water leakage in Block C bathroom')"
                maxLength={200}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {errors.title ? <p className="form-error" role="alert">{errors.title}</p> : <span />}
                <span className="form-hint">{formData.title.length}/200</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="complaint-description" className="form-label form-label-required">Description</label>
              <textarea
                id="complaint-description"
                className={`form-textarea${errors.description ? ' error' : ''}`}
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue in detail. Include dates, frequency, and observable impacts."
                maxLength={5000}
                rows={6}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {errors.description ? <p className="form-error" role="alert">{errors.description}</p> : <span />}
                <span className="form-hint">{formData.description.length}/5000</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="complaint-location" className="form-label">
                Location <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="complaint-location"
                type="text"
                className="form-input"
                value={formData.location}
                onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g., Block C, 2nd Floor, Room 204"
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
                <legend className="form-label form-label-required" style={{ marginBottom: '0.5rem' }}>Severity Level</legend>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.625rem' }} role="radiogroup" aria-label="Severity level">
                  {(['low', 'medium', 'high', 'critical'] as ComplaintSeverity[]).map(sev => {
                    const isSelected = formData.severity === sev
                    const sevColors: Record<ComplaintSeverity, { border: string; bg: string; text: string }> = {
                      low: { border: 'rgba(100, 116, 139, 0.4)', bg: 'rgba(100, 116, 139, 0.12)', text: '#94a3b8' },
                      medium: { border: 'var(--amber-border)', bg: 'var(--amber-faint)', text: 'var(--amber-bright)' },
                      high: { border: 'rgba(251, 146, 60, 0.4)', bg: 'rgba(251, 146, 60, 0.12)', text: '#fb923c' },
                      critical: { border: 'var(--red-border)', bg: 'var(--red-faint)', text: 'var(--red-bright)' },
                    }
                    const activeStyle = sevColors[sev]
                    return (
                      <button
                        key={sev}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setFormData(f => ({ ...f, severity: sev }))}
                        style={{
                          padding: '0.625rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isSelected ? activeStyle.border : 'var(--border-default)'}`,
                          background: isSelected ? activeStyle.bg : 'var(--bg-input)',
                          color: isSelected ? activeStyle.text : 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isSelected ? activeStyle.text : 'var(--text-muted)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }} />
                        {sev}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep('category')}>
                <ChevronLeft size={16} aria-hidden="true" /> Back
              </button>
              <button
                className="btn btn-terminal"
                onClick={handleNextFromDetails}
                disabled={loading}
              >
                {loading ? <><Loader2 size={14} className="btn-loading" /> Checking...</> : <>Check for Duplicates <ChevronRight size={14} aria-hidden="true" /></>}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── DUPLICATES STEP ────────────────────────────────────────────────────────
  if (step === 'duplicates') {
    return (
      <main id="main-content" style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <StepIndicator current="details" />

        <div className="card">
          <div className="card-header">
            <div>
              <h1 style={{ fontSize: '1.375rem' }}>Similar Complaints Found</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                Consider supporting these instead of filing a duplicate.
              </p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {duplicates.map(dup => (
                <div key={dup.complaint_id} className="card">
                  <div className="card-body" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, marginBottom: '0.375rem', fontSize: '0.9rem' }}>{dup.title}</p>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <CategoryBadge category={dup.category} />
                          <StatusBadge status={dup.status as any} />
                          <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                            <Users size={10} aria-hidden="true" /> {dup.support_count} supports
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {Math.round(dup.similarity * 100)}% similar
                          </span>
                        </div>
                      </div>
                      <a href={`/complaints/${dup.complaint_id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
              Supporting an existing complaint increases its priority and makes your voice heard.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep('details')}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn btn-terminal" onClick={() => setStep('evidence')}>
                Submit as New Complaint <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── EVIDENCE STEP ──────────────────────────────────────────────────────────
  if (step === 'evidence') {
    return (
      <main id="main-content" style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <StepIndicator current="evidence" />

        <div className="card">
          <div className="card-header">
            <div>
              <h1 style={{ fontSize: '1.375rem' }}>Attach Evidence</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                Optional. Upload photos or PDFs (max 3 files, 10MB each).
              </p>
            </div>
          </div>
          <div className="card-body">
            <label
              htmlFor="evidence-upload"
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '0.75rem', padding: '2.5rem',
                border: '1px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                cursor: files.length >= 3 ? 'not-allowed' : 'pointer',
                /* Dark bg — no white */
                background: 'var(--bg-elevated)',
                transition: 'border-color 150ms ease',
                opacity: files.length >= 3 ? 0.5 : 1,
              }}
            >
              <Upload size={28} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Click to upload files</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Images (JPEG, PNG, WebP, GIF) and PDFs — up to 10MB each
                </p>
              </div>
              <input
                id="evidence-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                multiple
                onChange={handleFileAdd}
                disabled={files.length >= 3}
                style={{ display: 'none' }}
                aria-label="Upload evidence files"
              />
            </label>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {files.map((file, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 1rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{file.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep('details')}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn btn-terminal" onClick={() => setStep('review')}>
                Review &amp; Submit <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── REVIEW STEP ────────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <main id="main-content" style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <StepIndicator current="review" />

        <div className="card">
          <div className="card-header">
            <h1 style={{ fontSize: '1.375rem' }}>Review Your Report</h1>
          </div>
          <div className="card-body">
            {isRestricted && (
              <div className="restricted-banner" style={{ marginBottom: '1.25rem' }}>
                <ShieldCheck className="restricted-banner-icon" size={18} />
                <div>
                  <p className="restricted-banner-title">Restricted Complaint</p>
                  <p className="restricted-banner-text">Only compliance officers can view this — not the public or regular staff.</p>
                </div>
              </div>
            )}

            {/* Summary table */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', overflow: 'hidden', marginBottom: '1.25rem' }}>
              {[
                { label: 'Category', value: <CategoryBadge category={formData.category as ComplaintCategory} /> },
                { label: 'Severity', value: <span className={`badge badge-${formData.severity}`}>{formData.severity}</span> },
                { label: 'Title', value: formData.title },
                { label: 'Location', value: formData.location || '—' },
                { label: 'Evidence', value: files.length > 0 ? `${files.length} file(s) attached` : 'None' },
              ].map(({ label, value }, idx, arr) => (
                <div key={label} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', borderBottom: idx < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', width: 90, flexShrink: 0, paddingTop: 2 }}>{label}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Description preview */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', padding: '1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>Description</p>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>{formData.description}</p>
            </div>

            <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
              <ShieldCheck size={14} />
              <div>
                <strong>Your anonymity is protected.</strong> Your identity will not be stored. You will receive a recovery code to track status.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep('evidence')}>
                <ChevronLeft size={16} /> Back
              </button>
              <button
                className="btn btn-terminal"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <><Loader2 size={14} className="btn-loading" /> Submitting...</> : 'Submit Report →'}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── SUCCESS STEP ───────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <main id="main-content" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-xl)',
            background: 'var(--green-faint)', border: '1px solid var(--green-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }} aria-hidden="true">
            <CheckCircle2 size={26} style={{ color: 'var(--green-bright)' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Report Submitted</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Anonymously filed. Save your recovery code to track its status.
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="recovery-code-box glitch-code-box" role="region" aria-label="Recovery code">
              <p className="recovery-code-label">Your Recovery Code</p>
              <p className="recovery-code-value glitch-text" data-text={recoveryCode ?? ''} aria-live="polite">{recoveryCode}</p>
              <button
                className="btn btn-secondary"
                onClick={copyRecoveryCode}
                aria-label="Copy recovery code to clipboard"
              >
                {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy Code</>}
              </button>
              <div className="recovery-code-warning" role="alert">
                ⚠ <strong>Treat this like a password.</strong> Anyone with this code can view your complaint status. This is the only time it will be shown.
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                What Happens Next
              </h2>
              <ol style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'decimal' }}>
                <li>Your report will be reviewed by staff within 1–2 business days</li>
                <li>It will be routed to the relevant department for investigation</li>
                <li>When resolved, you have 7 days to confirm or dispute the resolution</li>
                <li>Use your recovery code on the <a href="/recover" style={{ color: 'var(--green-bright)' }}>recover page</a> to track progress</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <a href="/complaints" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                View Public Feed
              </a>
              {complaintId && (
                <a href={`/complaints/${complaintId}`} className="btn btn-terminal" style={{ flex: 1, justifyContent: 'center' }}>
                  View Report →
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return null
}
