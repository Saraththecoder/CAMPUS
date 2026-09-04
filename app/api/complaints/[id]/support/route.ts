// app/api/complaints/[id]/support/route.ts
// POST /api/complaints/[id]/support
// Authenticated users can support a public complaint.
// Token is deterministic (same user + complaint = same token), preventing double-support.

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { deriveSubmitterHash, deriveSupportToken, deriveRateLimitKey } from '@/lib/security/hmac'
import { validateInstitutionalEmail } from '@/lib/security/hmac'

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/complaints/[id]/support'>
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!validateInstitutionalEmail(user.email)) {
      return NextResponse.json({ error: 'Institutional email required' }, { status: 403 })
    }

    const params = await ctx.params
    const { id: complaintId } = params

    // Derive tokens server-side — never from client input
    const submitterHash = deriveSubmitterHash(user.email)
    const supportToken = deriveSupportToken(submitterHash, complaintId)
    const rateLimitKey = deriveRateLimitKey(user.id, 'support')

    const { data, error } = await (adminClient.rpc('add_support', {
      p_complaint_id: complaintId,
      p_support_token: supportToken,
      p_rate_key: rateLimitKey,
    } as any) as any)

    if (error) {
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Too many support actions. Please wait.' },
          { status: 429 }
        )
      }
      if (error.message.includes('forbidden')) {
        return NextResponse.json(
          { error: 'Cannot support restricted complaints' },
          { status: 403 }
        )
      }
      console.error('[SUPPORT ERROR]', error.code)
      return NextResponse.json({ error: 'Failed to add support' }, { status: 500 })
    }

    return NextResponse.json({
      supported: data === true,
      alreadySupported: data === false,
    })
  } catch (err) {
    console.error('[SUPPORT_UNHANDLED]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
