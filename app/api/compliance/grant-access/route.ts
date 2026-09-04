// app/api/compliance/grant-access/route.ts
// POST — Grant restricted complaint access to a staff member
// DELETE — Revoke an existing grant

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const GrantSchema = z.object({
  complaintId: z.string().uuid(),
  grantTo: z.string().uuid(),
  reason: z.string().min(10).max(500),
  expiresDays: z.number().int().min(1).max(90).optional().default(30),
})

const RevokeSchema = z.object({
  grantId: z.string().uuid(),
  reason: z.string().min(5).max(500),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const role = user.app_metadata?.role ?? 'student'
    if (!['compliance', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Compliance officer access required' }, { status: 403 })
    }

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = GrantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const { complaintId, grantTo, reason, expiresDays } = parsed.data

    const { data, error } = await (adminClient.rpc('grant_restricted_access', {
      p_complaint_id: complaintId,
      p_grant_to: grantTo,
      p_reason: reason,
      p_actor_id: user.id,
      p_expires_days: expiresDays,
    } as any) as any)

    if (error) {
      if (error.message.includes('validation')) {
        return NextResponse.json({ error: 'A reason is required' }, { status: 422 })
      }
      return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
    }

    return NextResponse.json({ grantId: data })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const role = user.app_metadata?.role ?? 'student'
    if (!['compliance', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Compliance officer access required' }, { status: 403 })
    }

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = RevokeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 422 })
    }

    const { grantId, reason } = parsed.data

    const { error } = await (adminClient.rpc('revoke_restricted_access', {
      p_grant_id: grantId,
      p_actor_id: user.id,
      p_reason: reason,
    } as any) as any)

    if (error) {
      if (error.message.includes('not_found')) {
        return NextResponse.json({ error: 'Active grant not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
