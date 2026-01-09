'use client'

import { useTransition, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { loginAction } from './actions'
import { signInWithGoogle } from './google-signin-action'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isGooglePending, startGoogleTransition] = useTransition()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Check for error in URL params (from OAuth callback)
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error(decodeURIComponent(error))
      setError('root', { message: decodeURIComponent(error) })
    }
  }, [searchParams, setError])

  async function onSubmit(data: LoginFormData) {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', data.email)
      formData.append('password', data.password)
      
      const redirectTo = searchParams.get('redirectTo')
      if (redirectTo) {
        formData.append('redirectTo', redirectTo)
      }

      const result = await loginAction(formData)
      
      if (result?.ok === false) {
        toast.error(result.message)
        setError('root', { message: result.message })
      }
    })
  }

  async function handleGoogleSignIn() {
    startGoogleTransition(async () => {
      const result = await signInWithGoogle()
      if (result?.ok === false) {
        toast.error(result.message)
        setError('root', { message: result.message })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Google Sign In Button */}
      <Button
        type="button"
        className="w-full h-12 text-base font-medium rounded-full"
        disabled={isPending || isGooglePending}
        onClick={handleGoogleSignIn}
        style={{
          background: 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%, #111111 100%)',
          color: 'white',
          fontFamily: 'var(--font-sans), sans-serif',
        }}
      >
        {isGooglePending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span 
            className="px-2 bg-white"
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              color: '#666',
            }}
          >
            Or continue with
          </span>
        </div>
      </div>

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
          disabled={isPending}
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
          disabled={isPending}
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

      {errors.root && (
        <p className="text-sm text-red-500 mt-1">{errors.root.message}</p>
      )}

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-medium rounded-full" 
        disabled={isPending || isGooglePending}
        style={{
          background: 'linear-gradient(180deg, #565656 0%, #1C1C1C 61%, #111111 100%)',
          color: 'white',
          fontFamily: 'var(--font-sans), sans-serif',
        }}
      >
        {isPending ? (
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


