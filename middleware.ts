// middleware.ts
// Route protection middleware — runs before every request.
// This is NOT the primary security mechanism (RLS and server-side checks are).
// But it provides user-facing redirects and session refresh.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value }: any) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          )
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

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role ?? 'student'

  // Not authenticated → redirect to login for protected routes
  if (!user && (isStaffRoute || isComplianceRoute || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Role-based access control (defense-in-depth — RLS is the real gate)
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw.js|workbox-).*)',
  ],
}
