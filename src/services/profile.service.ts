import { createClient } from '@/lib/supabase/server'
import { User } from '@/types'

export type ProfileWithRelations = User

/**
 * Get user profile by ID
 */
export async function getProfile(userId: string): Promise<ProfileWithRelations | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data as ProfileWithRelations
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<ProfileWithRelations | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  return getProfile(user.id)
}

/**
 * Get profiles by role
 */
export async function getProfilesByRole(role: User['role']): Promise<User[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`)
  }
  
  return data as User[]
}

