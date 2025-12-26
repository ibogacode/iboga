import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleRoute } from '@/lib/utils/role-routes'
import { UserRole } from '@/types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Redirect /settings to /profile
  if (request.nextUrl.pathname === '/settings') {
    const url = request.nextUrl.clone()
    url.pathname = '/profile'
    return NextResponse.redirect(url)
  }

  // Protected routes that require authentication
  const protectedPaths = [
    '/dashboard',
    '/owner',
    '/manager',
    '/doctor',
    '/psych',
    '/nurse',
    '/driver',
    '/patient',
    '/settings',
    '/profile',
    '/forms',
    '/patient-pipeline',
    '/facility-management',
    '/onboarding',
    '/patient-management',
    '/research',
    '/marketing',
  ]

  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // Auth pages
  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/change-password']
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // Only call getUser() when we need to check auth (protected or auth pages)
  // This avoids unnecessary Supabase calls on public pages
  if (isProtectedPath || isAuthPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Redirect unauthenticated users to login
    if (!user && isProtectedPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Redirect authenticated users away from auth pages
    // Exception: allow authenticated users on /reset-password and /change-password (they need to set/change password)
    if (user && isAuthPath && 
        request.nextUrl.pathname !== '/reset-password' && 
        request.nextUrl.pathname !== '/change-password') {
      // Try to get role from JWT metadata, otherwise default to /patient
      const role = (user.user_metadata?.role || user.app_metadata?.role) as UserRole | undefined
      const url = request.nextUrl.clone()
      url.pathname = role ? getRoleRoute(role) : '/patient'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}


