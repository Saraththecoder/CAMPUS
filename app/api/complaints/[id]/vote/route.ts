// app/api/complaints/[id]/vote/route.ts
// POST /api/complaints/[id]/vote
// Cast a resolution vote (confirm or dispute) during the 7-day dispute window.

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { deriveSubmitterHash, deriveVoteToken, deriveRateLimitKey } from '@/lib/security/hmac'
import { validateInstitutionalEmail } from '@/lib/security/hmac'
import type { VoteType } from '@/types/database'

const VoteSchema = z.object({
  voteType: z.enum(['confirm', 'dispute'] as const),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: complaintId } = await params

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = VoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 422 })
    }

    const submitterHash = deriveSubmitterHash(user.email)
    const voteToken = deriveVoteToken(submitterHash, complaintId)
    const rateLimitKey = deriveRateLimitKey(user.id, 'vote')

    const { data, error } = await (adminClient.rpc('cast_resolution_vote', {
      p_complaint_id: complaintId,
      p_vote_token: voteToken,
      p_vote_type: parsed.data.voteType as VoteType,
      p_rate_key: rateLimitKey,
    } as any) as any)

    if (error) {
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json({ error: 'Too many vote attempts.' }, { status: 429 })
      }
      if (error.message.includes('Dispute window has closed')) {
        return NextResponse.json({ error: 'The dispute window has closed.' }, { status: 400 })
      }
      if (error.message.includes('not in resolved state')) {
        return NextResponse.json({ error: 'Complaint is not in resolved state.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
    }

    return NextResponse.json({
      voted: data === true,
      alreadyVoted: data === false,
    })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
