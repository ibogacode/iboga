import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from './server'
import { User } from '@/types'

/**
 * Get user ID from middleware header if available
 * This allows skipping the redundant getUser() call when middleware already verified auth
 */
async function getVerifiedUserIdFromMiddleware(): Promise<string | null> {
  try {
    const headersList = await headers()
    return headersList.get('x-user-id')
  } catch {
    return null
  }
}

/**
 * Cached version of getUser - deduplicates calls within a single request
 * React's cache() ensures this only runs once per request lifecycle
 * 
 * Optimization: If middleware already verified the user and passed x-user-id header,
 * we can skip the getUser() call and construct a minimal user object.
 * However, for full user data we still need the actual user object.
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
 * 
 * Optimization: Uses verified user ID from middleware when available
 * to skip redundant getUser() call. Falls back to full auth check if needed.
 */
export const getCachedUserWithProfile = cache(async () => {
  // Try to get user ID from middleware (already verified)
  const verifiedUserId = await getVerifiedUserIdFromMiddleware()
  
  if (verifiedUserId) {
    // Middleware already verified auth - we can skip getUser() and just fetch profile
    // We still need to get the full user for some components, so we fetch it
    // but this is cached so it's only one call per request regardless
    const [user, profile] = await Promise.all([
      getCachedUser(),
      getCachedProfile(verifiedUserId)
    ])
    
    return { user, profile }
  }
  
  // No verified user ID from middleware - do full auth check
  const user = await getCachedUser()
  
  if (!user) {
    return { user: null, profile: null }
  }
  
  const profile = await getCachedProfile(user.id)
  
  return { user, profile }
})
