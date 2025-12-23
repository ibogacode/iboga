'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChangePasswordForm } from '@/components/forms/change-password-form'
import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { designTokens } from '@/config/design-system'

function ChangePasswordContent() {
  const searchParams = useSearchParams()
  const isRequired = searchParams.get('required') === 'true'

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
              {isRequired ? 'Secure Your Account' : 'Update Your Password'}
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
              {isRequired 
                ? 'For your security, please change your password to continue accessing your portal.'
                : 'Create a strong password to keep your account secure and protected.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Right Half - Form */}
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
              {isRequired ? 'Change Password' : 'Update Password'}
            </h2>
            <p
              style={{
                fontFamily: designTokens.typography.navItem.fontFamily,
                fontSize: '16px',
                fontWeight: 400,
                color: '#666',
              }}
            >
              {isRequired 
                ? 'Please set a new password to continue'
                : 'Enter your current password and choose a new one'
              }
            </p>
          </div>

          {/* Required Password Change Alert */}
          {isRequired && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Password change required:</strong> You must change your password before accessing the portal. This is a security requirement for all new accounts.
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <div className="space-y-6">
            <Suspense fallback={
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
              </div>
            }>
              <ChangePasswordForm isRequired={isRequired} />
            </Suspense>

            {/* Back to Login Link */}
            {!isRequired && (
              <div className="text-center">
                <Link 
                  href="/login" 
                  style={{
                    fontFamily: designTokens.typography.navItem.fontFamily,
                    fontSize: '14px',
                    color: '#2B2820',
                    textDecoration: 'none',
                  }}
                  className="hover:opacity-80"
                >
                  Back to sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    }>
      <ChangePasswordContent />
    </Suspense>
  )
}

