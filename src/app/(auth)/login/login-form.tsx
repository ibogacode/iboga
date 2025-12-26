'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getRoleRoute } from '@/lib/utils/role-routes'
import { UserRole } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      // Debug: Log client config before login
      if (process.env.NODE_ENV === 'development') {
        console.log('[LoginForm] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('[LoginForm] Anon Key (first 10 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) || 'MISSING')
      }
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        console.error('[LoginForm] Sign in error:', error)
        toast.error(error.message)
        return
      }

      // Debug: Verify session was created
      if (process.env.NODE_ENV === 'development') {
        console.log('[LoginForm] Sign in successful, session:', authData.session ? 'created' : 'missing')
        console.log('[LoginForm] User:', authData.user?.email)
      }

      toast.success('Signed in successfully')
      
      // Verify session persists
      const { data: { session: verifySession }, error: sessionError } = await supabase.auth.getSession()
      if (process.env.NODE_ENV === 'development') {
        if (sessionError) {
          console.error('[LoginForm] Session verification error:', sessionError)
        } else {
          console.log('[LoginForm] Session verified:', verifySession ? 'persisted' : 'NOT PERSISTED')
        }
      }
      
      // Get user profile to check if password change is required
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
      
      if (process.env.NODE_ENV === 'development') {
        if (userError) {
          console.error('[LoginForm] Get user error:', userError)
        } else {
          console.log('[LoginForm] User retrieved:', authUser ? authUser.email : 'null')
        }
      }
      
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, must_change_password')
          .eq('id', authUser.id)
          .single()
        
        // If password change is required, redirect to change password page
        if (profile?.must_change_password) {
          toast.info('Please change your password to continue')
          router.push('/change-password?required=true')
          router.refresh()
          return
        }
        
        // Redirect to role-specific dashboard or to the redirectTo path if provided
        const role = (profile?.role as UserRole) || 'patient'
        const redirectTo = searchParams.get('redirectTo') || getRoleRoute(role)
        router.push(redirectTo)
        router.refresh()
      } else {
        router.push('/login')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label 
          htmlFor="email"
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111111',
          }}
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          disabled={isLoading}
          className="h-12 rounded-full"
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
          }}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label 
          htmlFor="password"
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111111',
          }}
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isLoading}
          className="h-12 rounded-full"
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
          }}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-medium rounded-full" 
        disabled={isLoading}
        style={{
          background: 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%, #111111 100%)',
          color: 'white',
          fontFamily: 'var(--font-sans), sans-serif',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  )
}


