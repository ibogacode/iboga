'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '@/lib/validations/auth'

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

    // Get base URL for redirect - redirect directly to reset-password page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
    const redirectTo = `${baseUrl}/reset-password`

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

    // Clear must_change_password flag after successful password reset
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error clearing must_change_password flag:', profileError)
      // Don't fail the password reset if flag update fails, but log it
    }

    revalidatePath('/', 'layout')
    return { success: true }
  })

export const changePasswordAction = actionClient
  .schema(changePasswordSchema)
  .action(async ({ parsedInput: { currentPassword, newPassword } }) => {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user || !user.email) {
      return { 
        success: false, 
        error: 'You must be logged in to change your password.' 
      }
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return { 
        success: false, 
        error: 'Current password is incorrect.' 
      }
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return { 
        success: false, 
        error: updateError.message || 'Failed to update password. Please try again.' 
      }
    }

    // Clear must_change_password flag after successful password change
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error clearing must_change_password flag:', profileError)
      // Don't fail the password change if flag update fails, but log it
    }

    revalidatePath('/', 'layout')
    return { success: true }
  })


