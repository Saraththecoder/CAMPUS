// app/api/admin/users/[id]/route.ts
// PATCH — Update user role or reset password
// DELETE — Remove user account from system

import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'compliance'].includes(session.role)) {
      return NextResponse.json({ error: 'Admin clearance required' }, { status: 403 })
    }

    const { id } = await params
    let body: any
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { role, password } = body

    const updateData: any = {}
    if (role) {
      const validRoles = ['student', 'staff', 'compliance', 'admin']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
      }
      updateData.app_metadata = { role }
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }
      updateData.password = password
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 })
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(id, updateData)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: data.user })
  } catch {
    return NextResponse.json({ error: 'Failed to update user account' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'compliance'].includes(session.role)) {
      return NextResponse.json({ error: 'Admin clearance required' }, { status: 403 })
    }

    const { id } = await params

    if (id === session.userId) {
      return NextResponse.json({ error: 'Cannot delete your own active admin account' }, { status: 400 })
    }

    const { error } = await adminClient.auth.admin.deleteUser(id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
  }
}
