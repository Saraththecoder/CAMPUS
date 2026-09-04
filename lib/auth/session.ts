// lib/auth/session.ts
// Server-side session utilities. Returns typed session with role information.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'student' | 'staff' | 'compliance' | 'admin'

export interface AppSession {
  userId: string
  email: string
  role: UserRole
  collegeId: string | null
  departmentId: string | null
  isVerified: boolean
}

/**
 * Get the current server-side session.
 * Returns null if no session exists.
 */
export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const appMeta = user.app_metadata ?? {}
  const userMeta = user.user_metadata ?? {}

  return {
    userId: user.id,
    email: user.email ?? '',
    role: (appMeta.role as UserRole) ?? 'student',
    collegeId: appMeta.college_id ?? null,
    departmentId: appMeta.department_id ?? null,
    isVerified: userMeta.email_verified === true || appMeta.verified === true,
  }
}

/**
 * Require authentication. Redirects to /login if not authenticated.
 */
export async function requireAuth(): Promise<AppSession> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}

/**
 * Require a specific role. Returns 403-equivalent data if unauthorized.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo = '/login'
): Promise<AppSession> {
  const session = await requireAuth()
  if (!allowedRoles.includes(session.role)) {
    redirect(redirectTo)
  }
  return session
}

/**
 * Require email verification (for students submitting complaints).
 */
export async function requireVerified(): Promise<AppSession> {
  const session = await requireAuth()
  if (!session.isVerified) {
    redirect('/verify')
  }
  return session
}
