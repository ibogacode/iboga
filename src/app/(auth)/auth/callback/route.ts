import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { getRoleRoute } from '@/lib/utils/role-routes'
import { UserRole } from '@/types'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return redirect(`/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = await createClient()
    
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !data.user) {
      console.error('Error exchanging code for session:', exchangeError)
      return redirect(`/login?error=${encodeURIComponent('Failed to authenticate. Please try again.')}`)
    }

    const user = data.user

    // Check if user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, must_change_password')
      .eq('id', user.id)
      .single()

    // If user doesn't exist in profiles table, sign them out and redirect with error
    if (profileError || !profile) {
      console.error('User not found in profiles table:', profileError)
      
      // Sign out the user since they don't have an account
      await supabase.auth.signOut()
      
      return redirect(`/login?error=${encodeURIComponent('Access denied. You do not have an account in this portal. Please contact your administrator.')}`)
    }

    // Check if password change is required
    if (profile.must_change_password) {
      return redirect('/change-password?required=true')
    }

    // User exists, redirect to their role route
    const role = profile.role as UserRole
    return redirect(getRoleRoute(role))
  }

  // No code provided, redirect to login
  return redirect('/login?error=' + encodeURIComponent('Authentication failed. Please try again.'))
}

