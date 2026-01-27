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
      // Log detailed error information
      console.error('Password reset email error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        email: email,
        redirectTo: redirectTo,
      })
      
      // Handle 500 errors specifically (Supabase server-side configuration issue)
      if (error.status === 500 || error.status === 503) {
        const troubleshootingSteps = process.env.NODE_ENV === 'development' 
          ? `\n\nTroubleshooting Steps:
1. Check Supabase Dashboard → Settings → Auth → Email
   - Ensure SMTP or SendGrid is configured
   - Verify SMTP credentials are correct (host, port, username, password)
   - Check SSL/TLS settings match your SMTP provider

2. Check Supabase Dashboard → Authentication → Email Templates
   - Ensure "Reset Password" template exists and is enabled
   - Verify the template redirect URL matches: ${redirectTo}

3. Check Supabase Dashboard → Authentication → URL Configuration
   - Ensure redirect URL is whitelisted: ${redirectTo}
   - For development: http://localhost:3000/reset-password
   - For production: https://portal.theibogainstitute.org/reset-password

4. Verify NEXT_PUBLIC_APP_URL environment variable is set correctly
   - Current value: ${process.env.NEXT_PUBLIC_APP_URL || 'not set'}
   - Using fallback: ${baseUrl}

5. Check Supabase project status and email service provider status`
          : ''
        
        return {
          success: false,
          error: `Email service configuration error (${error.status}). This indicates a problem with Supabase email settings.${troubleshootingSteps}`
        }
      }
      
      // Handle specific error cases
      if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
        return {
          success: false,
          error: 'Too many password reset requests. Please wait a few minutes before trying again.'
        }
      }
      
      if (error.message?.includes('email not confirmed') || error.message?.includes('unconfirmed')) {
        return {
          success: false,
          error: 'Please confirm your email address before requesting a password reset.'
        }
      }
      
      if (error.message?.includes('invalid email') || error.message?.includes('not found')) {
        // In production, still return generic message to prevent email enumeration
        if (process.env.NODE_ENV === 'development') {
          return {
            success: false,
            error: `Email address not found: ${error.message}`
          }
        }
      }
      
      // Return detailed error in development for debugging
      if (process.env.NODE_ENV === 'development') {
        let errorDetails = `Failed to send password reset email: ${error.message}`
        if (error.status) {
          errorDetails += ` (Status: ${error.status})`
        }
        
        // Add helpful debugging info
        if (error.message?.includes('recovery email') || error.message?.includes('sending')) {
          errorDetails += `\n\nRedirect URL being used: ${redirectTo}`
          errorDetails += `\nBase URL: ${baseUrl}`
          errorDetails += '\n\nTroubleshooting: Check Supabase dashboard → Authentication → Email Templates and ensure email service is configured (SMTP or SendGrid).'
        }
        
        return { 
          success: false, 
          error: errorDetails
        }
      }
      
      // Return a generic error message in production to prevent email enumeration
      // But provide helpful guidance
      return { 
        success: false, 
        error: 'Unable to send password reset email. Please contact support for assistance or try again later.' 
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


