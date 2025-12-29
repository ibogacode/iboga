'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRoleRoute } from '@/lib/utils/role-routes'
import { UserRole } from '@/types'

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  const user = data.user
  
  if (!user) {
    return { ok: false, message: 'User not found' }
  }

  // Get role from profiles table (source of truth)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, must_change_password')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError)
    return { ok: false, message: 'Failed to load user profile' }
  }
  
  // Check if password change is required
  if (profile.must_change_password) {
    redirect('/change-password?required=true')
  }

  // Use role from profile table (not metadata)
  const role = profile.role as UserRole
  const redirectTo = formData.get('redirectTo') as string | null
  
  // Use redirectTo if provided, otherwise use role route
  if (redirectTo) {
    redirect(redirectTo)
  }

  redirect(getRoleRoute(role))
}

