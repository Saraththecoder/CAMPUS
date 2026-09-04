// app/api/compliance/reclassify/route.ts
// POST — Reclassify complaint category or severity (compliance/admin only)

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { ComplaintCategory, ComplaintSeverity } from '@/types/database'

const ReclassifySchema = z.object({
  complaintId: z.string().uuid(),
  category: z.enum([
    'infrastructure', 'academic', 'hostel', 'mess', 'facilities',
    'conduct', 'harassment', 'discrimination', 'safety'
  ] as const).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const).optional(),
  reason: z.string().min(10).max(500),
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

    const parsed = ReclassifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const { complaintId, category, severity, reason } = parsed.data

    if (!category && !severity) {
      return NextResponse.json(
        { error: 'At least one of category or severity must be provided' },
        { status: 422 }
      )
    }

    const { error } = await (adminClient.rpc('compliance_reclassify_complaint', {
      p_complaint_id: complaintId,
      p_new_category: (category as ComplaintCategory) ?? null,
      p_new_severity: (severity as ComplaintSeverity) ?? null,
      p_actor_id: user.id,
      p_reason: reason,
    } as any) as any)

    if (error) {
      if (error.message.includes('not_found')) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Reclassification failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
