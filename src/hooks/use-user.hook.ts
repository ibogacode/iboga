'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { User, UserRole } from '@/types'

interface UseUserReturn {
  user: SupabaseUser | null
  profile: User | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('fetchProfile called for userId:', userId)
    console.log('fetchProfile: creating supabase client...')
    const supabase = createClient()
    console.log('fetchProfile: supabase client created, making query...')

    try {
      console.log('fetchProfile: starting query...')
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('fetchProfile: query completed')
      console.log('Supabase response - data:', profileData, 'error:', profileError)

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        setError(profileError)
        setProfile(null)
      } else {
        setProfile({
          ...profileData,
          role: profileData.role as UserRole,
          name: profileData.name ?? undefined,
          is_active: profileData.is_active ?? false,
          created_at: profileData.created_at ?? new Date().toISOString(),
          updated_at: profileData.updated_at ?? new Date().toISOString(),
          gender: profileData.gender as any,
        })
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching profile (catch):', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'))
      setProfile(null)
    }
    console.log('fetchProfile: function completed')
  }, [])

  const refetch = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    await fetchProfile(user.id)
    setIsLoading(false)
  }, [user?.id, fetchProfile])

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    async function initialize() {
      console.log('useUser: initializing...')
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        console.log('useUser: auth user:', authUser?.id, 'error:', authError)

        if (authError) {
          console.error('Auth error:', authError)
          if (isMounted) {
            setError(authError)
            setIsLoading(false)
          }
          return
        }

        if (isMounted) {
          setUser(authUser)
        }

        if (authUser && isMounted) {
          await fetchProfile(authUser.id)
        }
      } catch (err) {
        console.error('useUser initialization error:', err)
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch user'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)

        if (!isMounted) return

        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setError(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  return { user, profile, isLoading, error, refetch }
}


