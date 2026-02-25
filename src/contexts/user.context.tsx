'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { User, UserRole } from '@/types'

interface UserContextValue {
  user: SupabaseUser | null
  profile: User | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

interface UserProviderProps {
  children: ReactNode
  initialUser?: SupabaseUser | null
  initialProfile?: User | null
}

export function UserProvider({ children, initialUser = null, initialProfile = null }: UserProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(initialUser)
  const [profile, setProfile] = useState<User | null>(initialProfile)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const [error, setError] = useState<Error | null>(null)
  const initializedRef = useRef(!!initialUser)

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient()

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

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
  }, [])

  const refetch = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    await fetchProfile(user.id)
    setIsLoading(false)
  }, [user?.id, fetchProfile])

  useEffect(() => {
    if (initializedRef.current) return

    let isMounted = true
    const supabase = createClient()

    async function initializeAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!isMounted) return
      
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
      
      initializedRef.current = true
      setIsLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        // Skip if not initialized yet - initializeAuth handles the first load
        if (!initializedRef.current) return

        // Handle subsequent auth state changes
        if (session?.user) {
          setUser(session.user)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await fetchProfile(session.user.id)
          }
        } else {
          setUser(null)
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

  return (
    <UserContext.Provider value={{ user, profile, isLoading, error, refetch }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
