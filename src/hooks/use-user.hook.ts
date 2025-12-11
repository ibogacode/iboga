'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { User } from '@/types'

interface UseUserReturn {
  user: SupabaseUser | null
  profile: User | null
  isLoading: boolean
  error: Error | null
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function getUser() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) throw authError
        
        setUser(user)

        if (user) {
          // Fetch user profile with role
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError) throw profileError
          
          setProfile(profileData)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          setIsLoading(true)
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (profileError) {
              console.error('Error fetching profile:', profileError)
              setError(profileError)
              setProfile(null)
            } else {
              setProfile(profileData)
              setError(null)
            }
          } catch (err) {
            console.error('Error in auth state change:', err)
            setError(err instanceof Error ? err : new Error('Failed to fetch profile'))
            setProfile(null)
          } finally {
            setIsLoading(false)
          }
        } else {
          setProfile(null)
          setError(null)
          setIsLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, profile, isLoading, error }
}


