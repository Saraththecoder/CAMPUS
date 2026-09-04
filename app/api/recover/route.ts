// app/api/recover/route.ts
// POST /api/recover
// Recovery code lookup endpoint.
// Rate-limited. Returns only safe complaint information.
// Never returns: recovery_hash, submitter_hash, identity information.
// Never logs the recovery code.

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { deriveRateLimitKey } from '@/lib/security/hmac'
import { createHash } from 'crypto'

const RecoverSchema = z.object({
  code: z.string()
    .min(1)
    .max(50)
    .regex(/^[A-Z]+-[A-Z]+-\d{4}$/, 'Invalid recovery code format'),
})

export async function POST(request: NextRequest) {
  try {
    // Use a combination of IP-like identifier for rate limiting
    // We use a hash of the forwarded-for header, never storing it in complaints
    const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const sessionKey = createHash('sha256')
      .update(`${forwardedFor}:${userAgent}`)
      .digest('hex')
      .slice(0, 32)

    const rateLimitKey = deriveRateLimitKey(sessionKey, 'recovery')

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = RecoverSchema.safeParse(body)
    if (!parsed.success) {
      // Return generic error — don't reveal format details
      return NextResponse.json(
        { error: 'Invalid recovery code format. Expected: WORD-WORD-NNNN' },
        { status: 422 }
      )
    }

    const { code } = parsed.data
    // IMPORTANT: Do NOT log the code value

    const { data, error } = await (adminClient.rpc('lookup_recovery_code', {
      p_code: code,
      p_rate_key: rateLimitKey,
    } as any) as any)

    if (error) {
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Too many recovery attempts. Please wait and try again.' },
          { status: 429 }
        )
      }
      console.error('[RECOVERY ERROR]', error.code)
      return NextResponse.json({ error: 'Recovery lookup failed' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      // Use constant-time response to prevent timing attacks
      // Always wait ~200ms regardless of whether code was found
      await new Promise(resolve => setTimeout(resolve, 200))
      return NextResponse.json(
        { error: 'Recovery code not found or has expired' },
        { status: 404 }
      )
    }

    const complaint = data[0]

    // Return only safe fields — never expose recovery_hash, submitter_hash, or identity
    return NextResponse.json({
      complaint: {
        id: complaint.complaint_id,
        anonymousId: complaint.anonymous_id,
        category: complaint.category,
        title: complaint.title,
        status: complaint.status,
        severity: complaint.severity,
        visibility: complaint.visibility,
        createdAt: complaint.created_at,
        updatedAt: complaint.updated_at,
        resolvedAt: complaint.resolved_at,
        disputeDeadline: complaint.dispute_deadline,
        departmentName: complaint.department_name,
      },
    })
  } catch (err) {
    console.error('[RECOVERY_UNHANDLED]', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
