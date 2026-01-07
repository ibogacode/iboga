'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getFormByOnboarding } from '@/actions/onboarding-forms.action'
import { ReleaseForm } from '@/components/forms/onboarding'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ReleaseFormPage() {
  const params = useParams()
  const router = useRouter()
  const onboardingId = params.onboardingId as string
  
  const [formData, setFormData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFormData()
  }, [onboardingId])

  async function loadFormData() {
    setIsLoading(true)
    try {
      const result = await getFormByOnboarding({ 
        onboarding_id: onboardingId, 
        form_type: 'release' 
      })
      if (result?.data?.success && result.data.data) {
        setFormData(result.data.data)
      } else {
        setError(result?.data?.error || 'Failed to load form')
      }
    } catch (err) {
      console.error('Error loading form:', err)
      setError('An error occurred while loading the form')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSuccess() {
    router.push(`/onboarding-forms/${onboardingId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-#EDE9E4">
        <div className="max-w-4xl mx-auto bg-white p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading form...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !formData) {
    return (
      <div className="min-h-screen bg-#EDE9E4">
        <div className="max-w-4xl mx-auto bg-white p-8">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-red-800">Error</h2>
              <p className="text-red-600 mt-2">{error || 'Unable to load form'}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push(`/onboarding-forms/${onboardingId}`)}
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-#EDE9E4">
      <div className="max-w-4xl mx-auto bg-white p-8">
        <ReleaseForm
          onboardingId={onboardingId}
          initialData={formData.form}
          isCompleted={formData.form?.is_completed}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  )
}

