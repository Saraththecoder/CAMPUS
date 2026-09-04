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

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role ?? 'student'
  const pathname = request.nextUrl.pathname

  // Protected route guards
  const isStaffRoute = pathname.startsWith('/staff')
  const isComplianceRoute = pathname.startsWith('/compliance')
  const isAdminRoute = pathname.startsWith('/admin')
  const isApiProtected = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')

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
