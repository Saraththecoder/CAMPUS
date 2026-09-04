// app/api/complaints/route.ts
// POST /api/complaints — Complaint submission endpoint
// This is the only legitimate path to create a complaint.
// Never accepts visibility, submitter_hash, or recovery_hash from the client.

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { deriveSubmitterHash, deriveRateLimitKey, validateInstitutionalEmail } from '@/lib/security/hmac'
import { generateRecoveryCode, hashRecoveryCode } from '@/lib/security/recovery'
import type { ComplaintCategory, ComplaintSeverity } from '@/types/database'

const SubmitSchema = z.object({
  category: z.enum([
    'infrastructure', 'academic', 'hostel', 'mess', 'facilities',
    'conduct', 'harassment', 'discrimination', 'safety'
  ] as const),
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  location: z.string().max(200).optional().default(''),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const),
  // evidence file IDs are handled separately after upload
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate — require a verified session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Validate institutional email
    if (!validateInstitutionalEmail(user.email)) {
      return NextResponse.json(
        { error: 'Institutional email required' },
        { status: 403 }
      )
    }

    // 3. Check email verification status
    const isVerified = user.user_metadata?.email_verified === true ||
                       user.app_metadata?.verified === true ||
                       Boolean(user.email_confirmed_at)
    if (!isVerified) {
      return NextResponse.json(
        { error: 'Email verification required before submitting complaints' },
        { status: 403 }
      )
    }

    // 4. Parse and validate the request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = SubmitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { category, title, description, location, severity } = parsed.data

    // 5. Get college ID from user metadata or environment default
    const collegeId = user.app_metadata?.college_id ??
                      process.env.DEFAULT_COLLEGE_ID ??
                      '00000000-0000-0000-0000-000000000001'

    if (!collegeId) {
      return NextResponse.json(
        { error: 'College configuration error' },
        { status: 500 }
      )
    }

    // Ensure college record exists in database to satisfy foreign key constraint
    const collegeDomain = process.env.COLLEGE_DOMAIN ?? 'aits-tpt.edu.in'
    await (adminClient.from('colleges') as any).upsert({
      id: collegeId,
      name: 'Campus University',
      domain: collegeDomain,
    }, { onConflict: 'id' })

    // 6. Derive security hashes server-side — NEVER from client input
    const submitterHash = deriveSubmitterHash(user.email)
    const rateLimitKey = deriveRateLimitKey(user.id, 'submit')

    // 7. Generate recovery code — one-time, never stored as plaintext
    const recoveryCode = generateRecoveryCode()
    const recoveryHash = await hashRecoveryCode(recoveryCode)

    // 8. Call SECURITY DEFINER function — this handles rate limiting internally
    const { data, error: submitError } = await (adminClient.rpc('submit_complaint', {
      p_college_id: collegeId,
      p_category: category as ComplaintCategory,
      p_title: title,
      p_description: description,
      p_location: location,
      p_severity: severity as ComplaintSeverity,
      p_submitter_hash: submitterHash,
      p_recovery_hash: recoveryHash,
      p_rate_key: rateLimitKey,
    } as any) as any)

    if (submitError) {
      if (submitError.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Too many submissions. Please wait before submitting another complaint.' },
          { status: 429 }
        )
      }
      console.error('[SUBMIT_COMPLAINT ERROR]', submitError.code, submitError.message)
      return NextResponse.json(
        { error: submitError.message ? `Submission error: ${submitError.message}` : 'Failed to submit complaint. Please try again.' },
        { status: 500 }
      )
    }

    const result = data?.[0]
    if (!result) {
      return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
    }

    // 9. Return recovery code EXACTLY ONCE
    // The plaintext code is NEVER stored — this is the only time it's returned.
    // Do NOT log this response or the recovery code.
    return NextResponse.json({
      complaintId: result.complaint_id,
      anonymousId: result.anonymous_id,
      recoveryCode,  // ← One-time plaintext code — treat like a password
      message: 'Complaint submitted successfully',
    }, { status: 201 })

  } catch (err) {
    // Never expose internal error details to the client
    console.error('[COMPLAINT_SUBMIT_UNHANDLED]', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

// GET /api/complaints — Public complaint feed (paginated)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const sort = searchParams.get('sort') ?? 'priority'

    let query = supabase
      .from('public_complaints_feed')
      .select('*')

    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)
    if (severity) query = query.eq('severity', severity)

    // Sort order: disputed first, then by sort param
    if (sort === 'priority') {
      query = query.order('status', { ascending: false }) // disputed sorts high
                   .order('priority_score', { ascending: false })
    } else if (sort === 'recent') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'support') {
      query = query.order('support_count', { ascending: false })
    }

    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[COMPLAINTS_GET ERROR]', error.code)
      return NextResponse.json({ error: 'Failed to load complaints' }, { status: 500 })
    }

    return NextResponse.json({
      complaints: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / pageSize),
      },
    })
  } catch (err) {
    console.error('[COMPLAINTS_GET_UNHANDLED]', err)
    return NextResponse.json({ error: 'Failed to load complaints' }, { status: 500 })
  }
}
