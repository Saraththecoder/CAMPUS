// app/api/complaints/[id]/status/route.ts
// POST /api/complaints/[id]/status
// Staff-only: transition complaint status.
// All authorization is enforced server-side (RLS + SECURITY DEFINER function).

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { ComplaintStatus, ActorType } from '@/types/database'

const StatusUpdateSchema = z.object({
  status: z.enum([
    'reviewed', 'assigned', 'in_progress', 'resolved', 'disputed', 'verified', 'closed'
  ] as const),
  departmentId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const role = user.app_metadata?.role ?? 'student'
    if (!['staff', 'compliance', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: complaintId } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = StatusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { status, departmentId, notes } = parsed.data
    const deptId = departmentId ?? user.app_metadata?.department_id ?? null

    const { error } = await adminClient.rpc('staff_update_complaint_status', {
      p_complaint_id: complaintId,
      p_new_status: status as ComplaintStatus,
      p_actor_id: user.id,
      p_actor_type: role as ActorType,
      p_department_id: deptId,
      p_notes: notes,
    } as any)

    if (error) {
      if (error.message.includes('not_found')) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
      }
      if (error.message.includes('forbidden')) {
        return NextResponse.json({ error: 'Transition not permitted for your role' }, { status: 403 })
      }
      console.error('[STATUS_UPDATE ERROR]', error.code)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('[STATUS_UPDATE_UNHANDLED]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
