import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRoleRoute } from '@/lib/utils/role-routes'
import { UserRole } from '@/types'
import { LoginForm } from './login-form'
import { designTokens } from '@/config/design-system'

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
}

export default async function LoginPage() {
  const supabase = await createClient()
  
  // Try to get user, but handle invalid refresh tokens gracefully
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    
    // If there's an error with refresh token, clear the session
    if (error && (error.message?.includes('refresh_token') || error.message?.includes('Invalid Refresh Token'))) {
      console.log('Invalid refresh token detected, clearing session')
      await supabase.auth.signOut()
    } else {
      user = data.user
    }
  } catch (error) {
    // If there's any error getting the user, clear the session and continue
    console.log('Error getting user, clearing session:', error)
    await supabase.auth.signOut()
  }

  // If user is already logged in, redirect to their role route
  if (user) {
    // Get role from profiles table (source of truth)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const role = profile?.role as UserRole | undefined
    redirect(role ? getRoleRoute(role) : '/patient')
  }
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Half - Design/Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12"
        style={{
          background: 'linear-gradient(135deg, #F5F4F0 0%, #E8E6E0 100%)',
        }}
      >
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <Image
              src="/signin_logo.png"
              alt="Iboga Logo"
              width={150}
              height={44}
              className="h-auto w-auto"
              priority
            />
          </div>

          {/* Tagline and Description */}
          <div className="space-y-4 text-center">
            <h1 
              style={{
                fontFamily: 'var(--font-instrument-serif), serif',
                fontSize: '48px',
                fontWeight: 400,
                color: '#000000',
                lineHeight: '1.2',
              }}
            >
              Return to Your Space
            </h1>
            <p
              style={{
                fontFamily: designTokens.typography.navItem.fontFamily,
                fontSize: '18px',
                fontWeight: 400,
                color: '#000000CC',
                lineHeight: '1.6',
              }}
            >
              Access your workspace, manage your profile, and pick up where you left off.
            </p>
          </div>
        </div>
      </div>

      {/* Right Half - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo - Only visible on small screens */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Iboga Logo"
              width={120}
              height={35}
              className="h-auto w-auto"
              priority
            />
          </div>

          {/* Form Header */}
          <div className="text-center space-y-2">
            <h2 
              style={{
                fontFamily: 'var(--font-instrument-serif), serif',
                fontSize: '36px',
                fontWeight: 400,
                color: '#000000',
              }}
            >
              Welcome
            </h2>
            <p
              style={{
                fontFamily: designTokens.typography.navItem.fontFamily,
                fontSize: '16px',
                fontWeight: 400,
                color: '#666',
              }}
            >
              Sign in with Google or Enter your credentials to access your account
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <Suspense fallback={
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
              </div>
            }>
              <LoginForm />
            </Suspense>

            {/* Forgot Password Link */}
            <div className="text-center">
              <Link 
                href="/forgot-password" 
                style={{
                  fontFamily: designTokens.typography.navItem.fontFamily,
                  fontSize: '14px',
                  color: '#2B2820',
                  textDecoration: 'none',
                }}
                className="hover:opacity-80"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


