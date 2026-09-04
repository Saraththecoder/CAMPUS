import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'compliance'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await adminClient.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = (data?.users ?? []).map(u => ({
      id: u.id,
      email: u.email,
      role: u.app_metadata?.role ?? 'student',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }))

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[GET_USERS_ERROR]', err)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}
