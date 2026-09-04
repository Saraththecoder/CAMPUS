// app/api/complaints/check-duplicates/route.ts
// GET /api/complaints/check-duplicates
// Fuzzy duplicate detection using PostgreSQL trigram similarity.
// Advisory only — students can still submit a new complaint.

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ComplaintCategory } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const title = searchParams.get('title')
    const category = searchParams.get('category') as ComplaintCategory | null

    if (!title || !category) {
      return NextResponse.json({ duplicates: [] })
    }

    const { data, error } = await (supabase.rpc('find_duplicate_complaints', {
      p_title: title,
      p_category: category,
      p_threshold: 0.4,
    } as any) as any)

    if (error) {
      // Non-fatal — just return empty, student can still proceed
      console.error('[DUPLICATE_CHECK ERROR]', error.code)
      return NextResponse.json({ duplicates: [] })
    }

    return NextResponse.json({ duplicates: data ?? [] })
  } catch {
    return NextResponse.json({ duplicates: [] })
  }
}
