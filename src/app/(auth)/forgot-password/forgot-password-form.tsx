'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordAction } from '@/actions/auth.action'
import { toast } from 'sonner'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsLoading(true)
    
    try {
      const result = await forgotPasswordAction({ email: data.email })

      if (!result.success) {
        toast.error(result.error || 'Failed to send password reset email')
        return
      }

      setEmailSent(true)
      toast.success('Password reset email sent! Please check your inbox.')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
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
            Check Your Email
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '16px',
              color: '#666',
            }}
          >
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '14px',
              color: '#888',
            }}
            className="mt-4"
          >
            Didn't receive the email? Check your spam folder or try again.
          </p>
        </div>
      </div>
    )
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
            Sending...
          </>
        ) : (
          'Send Reset Link'
        )}
      </Button>
    </form>
  )
}
