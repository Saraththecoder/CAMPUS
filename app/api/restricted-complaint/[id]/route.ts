// app/api/restricted-complaint/[id]/route.ts
// POST /api/restricted-complaint/[id]
// Break-glass access for restricted complaints.
// Requires non-empty reason. Logs every access.

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { ActorType } from '@/types/database'

const AccessSchema = z.object({
  reason: z.string().min(10).max(500),
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
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = AccessSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'A detailed reason (at least 10 characters) is required to access restricted complaints' },
        { status: 422 }
      )
    }

    const { reason } = parsed.data

    const { data, error } = await (adminClient.rpc('access_restricted_complaint', {
      p_complaint_id: complaintId,
      p_actor_id: user.id,
      p_actor_type: role as ActorType,
      p_reason: reason,
    } as any) as any)

    if (error) {
      if (error.message.includes('forbidden')) {
        return NextResponse.json(
          { error: 'Access denied. You need an active access grant from a compliance officer.' },
          { status: 403 }
        )
      }
      if (error.message.includes('not_found')) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
      }
      if (error.message.includes('validation')) {
        return NextResponse.json({ error: 'A valid reason is required' }, { status: 422 })
      }
      console.error('[RESTRICTED_ACCESS ERROR]', error.code)
      return NextResponse.json({ error: 'Access failed' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    return NextResponse.json({ complaint: data[0] })
  } catch (err) {
    console.error('[RESTRICTED_ACCESS_UNHANDLED]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
