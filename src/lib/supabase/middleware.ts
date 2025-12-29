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
          // Set cookies on current response
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })

          // IMPORTANT: recreate response so Next sees updated cookies
          // Copy all cookies from the current response to the new one
          const newResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            newResponse.cookies.set(name, value, options)
          })
          supabaseResponse = newResponse
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
    '/messages',
  ]

  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // Only call getUser() for protected paths
  // This avoids unnecessary Supabase calls on public pages
  if (isProtectedPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Redirect unauthenticated users to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}


