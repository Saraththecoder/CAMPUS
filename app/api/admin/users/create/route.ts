import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'compliance'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized — Admin role required' }, { status: 403 })
    }

    const { email, password, role, departmentId } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const validRoles = ['student', 'staff', 'compliance', 'admin']
    const assignedRole = validRoles.includes(role) ? role : 'student'

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      app_metadata: {
        role: assignedRole,
        department_id: departmentId || undefined,
        verified: true,
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: `User ${email} created successfully with role ${assignedRole}`,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        role: assignedRole,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[CREATE_USER_ERROR]', err)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
