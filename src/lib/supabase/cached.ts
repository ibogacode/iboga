import { cache } from 'react'
import { createClient } from './server'
import { User } from '@/types'

/**
 * Cached version of getUser - deduplicates calls within a single request
 * React's cache() ensures this only runs once per request lifecycle
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
})

/**
 * Cached version of getProfile - deduplicates profile fetches
 */
export const getCachedProfile = cache(async (userId: string): Promise<User | null> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data as User
})

/**
 * Get both user and profile in one cached call
 * This is the main function to use in layouts/pages
 */
export const getCachedUserWithProfile = cache(async () => {
  const user = await getCachedUser()
  
  if (!user) {
    return { user: null, profile: null }
  }
  
  const profile = await getCachedProfile(user.id)
  
  return { user, profile }
})
