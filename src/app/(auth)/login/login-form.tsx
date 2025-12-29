'use client'

import { useTransition } from 'react'
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

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

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
        disabled={isPending}
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


