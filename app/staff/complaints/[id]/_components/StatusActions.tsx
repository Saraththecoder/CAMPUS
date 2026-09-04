'use client'
// app/staff/complaints/[id]/_components/StatusActions.tsx
// Client component for staff status transitions and department reassignment.

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, Loader2 } from 'lucide-react'
import type { ComplaintStatus } from '@/types/database'

// Valid transitions per status
const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted:   ['reviewed'],
  reviewed:    ['assigned', 'closed'],
  assigned:    ['in_progress', 'reviewed'],
  in_progress: ['resolved', 'assigned'],
  resolved:    [],
  disputed:    ['in_progress', 'assigned'],
  verified:    ['closed'],
  closed:      [],
}

// Status labels for UI
const STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted:   'Submitted',
  reviewed:    'Mark as Reviewed',
  assigned:    'Assign to Department',
  in_progress: 'Mark In Progress',
  resolved:    'Resolve',
  disputed:    'Dispute',
  verified:    'Verified',
  closed:      'Close',
}

interface Department { id: string; name: string }

interface Props {
  complaintId: string
  currentStatus: ComplaintStatus
  currentDepartmentId: string
  departments: Department[]
  userRole: string
}

export default function StatusActions({
  complaintId, currentStatus, currentDepartmentId, departments, userRole
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [selectedDept, setSelectedDept] = useState(currentDepartmentId)
  const [reassignLoading, setReassignLoading] = useState(false)

  const validTransitions = VALID_TRANSITIONS[currentStatus] ?? []
  const isCompliance = ['compliance', 'admin'].includes(userRole)

  const updateStatus = async (newStatus: ComplaintStatus) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          departmentId: selectedDept || undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update status')
        return
      }

      toast.success(`Status updated to "${newStatus.replace('_', ' ')}"`)
      router.refresh()
      setNotes('')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reassign = async () => {
    if (!selectedDept || selectedDept === currentDepartmentId) {
      toast.error('Select a different department to reassign')
      return
    }
    setReassignLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaintId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: selectedDept, notes }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Reassignment failed')
        return
      }
      toast.success('Complaint reassigned')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setReassignLoading(false)
    }
  }

  if (validTransitions.length === 0 && !isCompliance) {
    return (
      <div className="card">
        <div className="card-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No further actions available for this complaint in its current state.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 style={{ fontSize: '1rem' }}>Actions</h2>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {validTransitions.length > 0 && (
          <div>
            <label className="form-label" htmlFor="status-notes">Notes (optional)</label>
            <textarea
              id="status-notes"
              className="form-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add context about this action..."
              rows={2}
              maxLength={500}
              style={{ marginTop: 'var(--space-2)' }}
            />
          </div>
        )}

        {/* Status transitions */}
        {validTransitions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Transition Status
            </p>
            {validTransitions.map(status => (
              <button
                key={status}
                className="btn btn-secondary"
                onClick={() => updateStatus(status)}
                disabled={loading}
                style={{ justifyContent: 'flex-start' }}
              >
                {loading ? <Loader2 size={14} /> : <ArrowRight size={14} />}
                {STATUS_LABELS[status] ?? status}
              </button>
            ))}
          </div>
        )}

        {/* Department reassignment */}
        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
            Reassign Department
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select
              className="filter-select"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              aria-label="Select department"
              style={{ flex: 1 }}
            >
              <option value="">Select department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary"
              onClick={reassign}
              disabled={reassignLoading || !selectedDept || selectedDept === currentDepartmentId}
            >
              {reassignLoading ? <Loader2 size={14} /> : <Check size={14} />}
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
