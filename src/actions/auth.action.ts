'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/auth'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})

export const signInAction = actionClient
  .schema(signInSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  })

export const signUpAction = actionClient
  .schema(signUpSchema)
  .action(async ({ parsedInput: { email, password, firstName, lastName } }) => {
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  })

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export const forgotPasswordAction = actionClient
  .schema(forgotPasswordSchema)
  .action(async ({ parsedInput: { email } }) => {
    const supabase = await createClient()

    // Get base URL for redirect - use auth callback for PKCE flow
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
    const redirectTo = `${baseUrl}/auth/callback?type=recovery`

    if (process.env.NODE_ENV === 'development') {
      console.log('Sending password reset email to:', email)
      console.log('Redirect URL:', redirectTo)
    }

    const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Password reset email error:', error)
        console.error('Error code:', error.status)
        console.error('Error message:', error.message)
      }
      
      // Return the actual error in development for debugging
      if (process.env.NODE_ENV === 'development') {
        return { 
          success: false, 
          error: `Failed to send password reset email: ${error.message}` 
        }
      }
      
      // Return a generic error message in production to prevent email enumeration
      return { 
        success: false, 
        error: 'Failed to send password reset email. Please check your email address and try again, or contact support if the problem persists.' 
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset email sent successfully')
    }
    // Always return success to prevent email enumeration
    return { success: true }
  })

export const resetPasswordAction = actionClient
  .schema(resetPasswordSchema)
  .action(async ({ parsedInput: { password } }) => {
    const supabase = await createClient()

    // Check if user is authenticated (Supabase handles token exchange automatically)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { 
        success: false, 
        error: 'Invalid or expired reset token. Please request a new password reset link.' 
      }
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  })


