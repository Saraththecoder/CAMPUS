// app/api/complaints/[id]/reassign/route.ts
// POST — Reassign complaint to a different department (staff/compliance/admin only)

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { ActorType } from '@/types/database'

const ReassignSchema = z.object({
  departmentId: z.string().uuid(),
  notes: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  ctx: RouteContext
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const role = user.app_metadata?.role ?? 'student'
    if (!['staff', 'compliance', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const params = await ctx.params
    const { id: complaintId } = params

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = ReassignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const { error } = await adminClient.rpc('staff_reassign_complaint', {
      p_complaint_id: complaintId,
      p_new_department_id: parsed.data.departmentId,
      p_actor_id: user.id,
      p_actor_type: role as ActorType,
      p_notes: parsed.data.notes,
    } as any)

    if (error) {
      console.error('[REASSIGN ERROR]', error.code)
      return NextResponse.json({ error: 'Reassignment failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
