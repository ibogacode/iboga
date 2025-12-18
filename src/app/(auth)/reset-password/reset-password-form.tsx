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

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    // Check if we have the required token/hash in URL
    // Supabase password reset links include token and type=recovery
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    
    // Also check for hash (alternative format)
    const hash = searchParams.get('hash')
    
    if ((!token && !hash) || (type && type !== 'recovery')) {
      // Still allow form to show - Supabase might handle token exchange server-side
      setIsValidToken(true)
    } else {
      setIsValidToken(true)
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

  if (isValidToken === null) {
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
