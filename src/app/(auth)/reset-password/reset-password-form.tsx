'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordAction } from '@/actions/auth.action'
import { toast } from 'sonner'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const [isExchangingToken, setIsExchangingToken] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    const supabase = createClient()
    let isSubscribed = true
    
    // ========== DETAILED LOGGING ==========
    console.log('====== RESET PASSWORD DEBUG ======')
    console.log('1. Full URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')
    console.log('2. Pathname:', typeof window !== 'undefined' ? window.location.pathname : 'SSR')
    console.log('3. Search params:', typeof window !== 'undefined' ? window.location.search : 'SSR')
    console.log('4. Hash fragment:', typeof window !== 'undefined' ? window.location.hash : 'SSR')
    console.log('5. SearchParams object:', Object.fromEntries(searchParams.entries()))
    
    // Listen for auth state changes - Supabase automatically processes URL hash tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return
      
      console.log('====== AUTH STATE CHANGE ======')
      console.log('Event:', event)
      console.log('Session exists:', !!session)
      console.log('User email:', session?.user?.email)
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ PASSWORD_RECOVERY event received!')
        setIsValidToken(true)
        setIsExchangingToken(false)
      } else if (event === 'SIGNED_IN' && session) {
        console.log('✅ SIGNED_IN event with session!')
        setIsValidToken(true)
        setIsExchangingToken(false)
      } else if (event === 'INITIAL_SESSION') {
        console.log('📋 INITIAL_SESSION event, session:', !!session)
        if (session) {
          setIsValidToken(true)
          setIsExchangingToken(false)
        }
      }
    })
    
    // Check initial state
    async function checkSession() {
      console.log('====== CHECKING SESSION ======')
      
      // First check if there's already a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('6. Existing session:', !!session)
      console.log('7. Session error:', sessionError)
      if (session) {
        console.log('8. Session user:', session.user?.email)
      }
      
      if (session) {
        console.log('✅ Found existing session!')
        if (isSubscribed) {
          setIsValidToken(true)
          setIsExchangingToken(false)
        }
        return
      }
      
      // Check for PKCE code in URL query params (Supabase PKCE flow)
      const code = searchParams.get('code')
      if (code) {
        console.log('====== PKCE CODE FOUND ======')
        console.log('9. Code:', code)
        console.log('Attempting to exchange code for session...')
        
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          console.log('10. Exchange result:')
          console.log('    - Session:', !!data?.session)
          console.log('    - User:', data?.session?.user?.email)
          console.log('    - Error:', exchangeError)
          
          if (exchangeError) {
            console.log('❌ Code exchange failed:', exchangeError.message)
            // The code might have already been used - check if we have a session anyway
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            if (retrySession) {
              console.log('✅ Found session on retry!')
              if (isSubscribed) {
                setIsValidToken(true)
                setIsExchangingToken(false)
              }
              return
            }
            if (isSubscribed) {
              setIsValidToken(false)
              setIsExchangingToken(false)
            }
            return
          }
          
          if (data?.session) {
            console.log('✅ Code exchanged successfully!')
            if (isSubscribed) {
              setIsValidToken(true)
              setIsExchangingToken(false)
            }
            return
          }
        } catch (err) {
          console.log('❌ Code exchange exception:', err)
          if (isSubscribed) {
            setIsValidToken(false)
            setIsExchangingToken(false)
          }
          return
        }
      }
      
      // Check for hash fragment containing recovery tokens (implicit flow)
      if (typeof window !== 'undefined' && window.location.hash) {
        console.log('====== PARSING HASH FRAGMENT ======')
        const hash = window.location.hash.substring(1)
        console.log('9. Raw hash (without #):', hash)
        
        const hashParams = new URLSearchParams(hash)
        const type = hashParams.get('type')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const error = hashParams.get('error')
        const errorCode = hashParams.get('error_code')
        const errorDescription = hashParams.get('error_description')
        
        console.log('10. Parsed hash params:')
        console.log('    - type:', type)
        console.log('    - access_token:', accessToken ? `${accessToken.substring(0, 20)}...` : null)
        console.log('    - refresh_token:', refreshToken ? 'present' : null)
        console.log('    - error:', error)
        console.log('    - error_code:', errorCode)
        console.log('    - error_description:', errorDescription)
        
        if (error) {
          console.log('❌ Error found in hash!')
          if (isSubscribed) {
            setIsValidToken(false)
            setIsExchangingToken(false)
          }
          return
        }
        
        if (type === 'recovery' && accessToken) {
          console.log('✅ Recovery token found! Waiting for Supabase to process...')
          setTimeout(async () => {
            console.log('====== AFTER TIMEOUT: CHECKING SESSION AGAIN ======')
            const { data: { session: newSession }, error: newError } = await supabase.auth.getSession()
            console.log('11. Session after wait:', !!newSession)
            console.log('12. Error after wait:', newError)
            
            if (isSubscribed) {
              if (newSession) {
                console.log('✅ Session established!')
                setIsValidToken(true)
              } else {
                console.log('❌ No session after waiting')
                setIsValidToken(false)
              }
              setIsExchangingToken(false)
            }
          }, 2000)
          return
        } else {
          console.log('❌ Hash present but no valid recovery token')
          console.log('    Expected type=recovery, got:', type)
          console.log('    Expected access_token, got:', accessToken ? 'present' : 'missing')
        }
      } else {
        console.log('9. No hash fragment in URL')
      }
      
      // Check for error in query params (from failed callback)
      const error = searchParams.get('error')
      if (error) {
        console.log('❌ Error in query params:', error)
        if (isSubscribed) {
          setIsValidToken(false)
          setIsExchangingToken(false)
        }
        return
      }
      
      // No session and no recovery tokens - invalid access
      console.log('❌ No valid session or tokens found - showing error')
      if (isSubscribed) {
        setIsValidToken(false)
        setIsExchangingToken(false)
      }
    }
    
    checkSession()
    
    return () => {
      isSubscribed = false
      subscription.unsubscribe()
    }
  }, [searchParams])

  async function onSubmit(data: ResetPasswordFormData) {
    if (!isValidToken) {
      return
    }

    setIsLoading(true)
    
    try {
      const result = await resetPasswordAction({ 
        password: data.password,
        confirmPassword: data.confirmPassword,
      })

      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }

      if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
        const firstError = errors.length > 0 ? String(errors[0]) : null
        toast.error(firstError || 'Validation failed')
        return
      }

      if (result?.data) {
        if (result.data.success) {
          toast.success('Password reset successfully! Redirecting to login...')
          
          // Redirect to login after a short delay
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else if (result.data.error) {
          toast.error(result.data.error)
        } else {
          toast.error('Failed to reset password')
        }
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isExchangingToken || isValidToken === null) {
    return (
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Validating reset token...</p>
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-instrument-serif), serif',
              fontSize: '24px',
              fontWeight: 400,
              color: '#000000',
            }}
          >
            Invalid Reset Link
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '16px',
              color: '#666',
            }}
          >
            This password reset link is invalid or has expired. Please request a new password reset link.
          </p>
        </div>
        <Button 
          onClick={() => router.push('/forgot-password')}
          className="w-full h-12 text-base font-medium rounded-full" 
          style={{
            background: 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%, #111111 100%)',
            color: 'white',
            fontFamily: 'var(--font-sans), sans-serif',
          }}
        >
          Request New Reset Link
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          New Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your new password"
          autoComplete="new-password"
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
        <p className="text-xs text-gray-500 mt-1">
          Must be at least 8 characters with uppercase, lowercase, and a number
        </p>
      </div>
      
      <div className="space-y-2">
        <Label 
          htmlFor="confirmPassword"
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111111',
          }}
        >
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          autoComplete="new-password"
          disabled={isLoading}
          className="h-12 rounded-full"
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
          }}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
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
            Resetting...
          </>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  )
}
