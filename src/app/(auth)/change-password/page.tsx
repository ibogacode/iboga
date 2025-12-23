'use client'

import { Suspense } from 'react'
import { ChangePasswordForm } from '@/components/forms/change-password-form'
import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

function ChangePasswordContent() {
  const searchParams = useSearchParams()
  const isRequired = searchParams.get('required') === 'true'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F4F0] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 
            className="text-3xl font-normal text-black"
            style={{ 
              fontFamily: 'var(--font-instrument-serif), serif',
            }}
          >
            {isRequired ? 'Change Your Password' : 'Change Password'}
          </h1>
          <p 
            className="text-base text-gray-600"
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
            }}
          >
            {isRequired 
              ? 'For your security, please change your password to continue.'
              : 'Update your password to keep your account secure.'
            }
          </p>
        </div>

        {isRequired && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Password change required:</strong> You must change your password before accessing the portal. This is a security requirement for all new accounts.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <ChangePasswordForm isRequired={isRequired} />
        </div>
      </div>
    </div>
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F4F0] px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <p className="text-center text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ChangePasswordContent />
    </Suspense>
  )
}

