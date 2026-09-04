// middleware.ts
// Route protection middleware — runs before every request.
// Provides user-facing redirects and session refresh with fallback protection.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_URL = 'https://placeholder.supabase.co'
const DEFAULT_KEY = 'placeholder-key'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any) {
          try {
            cookiesToSet.forEach(({ name, value }: any) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }: any) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Protected route guards
  const isStaffRoute = pathname.startsWith('/staff')
  const isComplianceRoute = pathname.startsWith('/compliance')
  const isAdminRoute = pathname.startsWith('/admin')
  const isApiProtected = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')
  const isProtectedRoute = isStaffRoute || isComplianceRoute || isAdminRoute || isApiProtected

  // Fast path for public pages when no auth cookie is present
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('sb-') || c.name.includes('auth'))
  if (!isProtectedRoute && !hasAuthCookie) {
    return supabaseResponse
  }

  let user: any = null
  try {
    const res = await supabase.auth.getUser()
    user = res.data?.user ?? null
  } catch {
    user = null
  }

  const role = user?.app_metadata?.role ?? 'student'

  // Not authenticated → redirect to login for protected routes
  if (!user && (isStaffRoute || isComplianceRoute || isAdminRole(pathname))) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based access control
  if (user) {
    if (isAdminRoute && !['admin', 'compliance'].includes(role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (isComplianceRoute && !['compliance', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (isStaffRoute && !['staff', 'compliance', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return supabaseResponse
}

function isAdminRole(pathname: string) {
  return pathname.startsWith('/admin')
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw.js|workbox-).*)',
  ],
}
