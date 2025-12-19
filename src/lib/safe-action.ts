import { createSafeActionClient } from 'next-safe-action'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'

// Base action client
export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error('Action error:', error)
    return error.message || 'An unexpected error occurred'
  },
})

// Action client with auth - requires user to be logged in
// Provides user context with role
export const authActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized - Please log in')
  }
  
  // Get user profile to get role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    throw new Error('User profile not found')
  }
  
  return next({ 
    ctx: { 
      user: {
        id: user.id,
        email: user.email || '',
        role: (profile.role as UserRole) || 'patient',
      }
    } 
  })
})


