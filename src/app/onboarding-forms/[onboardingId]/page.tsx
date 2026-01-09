'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOnboardingById } from '@/actions/onboarding-forms.action'
import { Loader2, CheckCircle, Clock, FileText, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface OnboardingData {
  onboarding: any
  forms: {
    releaseForm: any
    outingForm: any
    socialMediaForm: any
    regulationsForm: any
    dissentForm: any
  }
}

const FORMS = [
  { 
    id: 'release', 
    name: 'Release Form', 
    description: 'Liability waiver and consent',
    path: 'release-form',
    key: 'releaseForm',
  },
  { 
    id: 'outing', 
    name: 'Outing/Transfer Consent', 
    description: 'Consent for temporary outings',
    path: 'outing-consent',
    key: 'outingForm',
  },
  { 
    id: 'regulations', 
    name: 'Internal Regulations', 
    description: 'Acknowledgment of clinic rules',
    path: 'internal-regulations',
    key: 'regulationsForm',
  },
]

export default function OnboardingFormsPage() {
  const params = useParams()
  const router = useRouter()
  const onboardingId = params.onboardingId as string
  
  const [data, setData] = useState<OnboardingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOnboardingData()
  }, [onboardingId])

  async function loadOnboardingData() {
    setIsLoading(true)
    try {
      const result = await getOnboardingById({ onboarding_id: onboardingId })
      if (result?.data?.success && result.data.data) {
        setData(result.data.data)
      } else {
        setError(result?.data?.error || 'Failed to load onboarding data')
      }
    } catch (err) {
      console.error('Error loading onboarding:', err)
      setError('An error occurred while loading the data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading your forms...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800">Error</h2>
            <p className="text-red-600 mt-2">{error || 'Unable to load onboarding data'}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/')}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const completedCount = FORMS.filter(form => {
    const formData = data.forms[form.key as keyof typeof data.forms]
    return formData?.is_completed
  }).length

  const allCompleted = completedCount === 3

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Onboarding Forms</h1>
          <p className="text-gray-600 mt-2">
            Welcome, {data.onboarding.first_name}! Please complete all 3 forms below.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Your Progress</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              allCompleted 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {completedCount}/3 Completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / 3) * 100}%` }}
            />
          </div>
          {allCompleted && (
            <p className="text-emerald-600 text-sm mt-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              All forms completed! Our team will be in touch soon.
            </p>
          )}
        </div>

        {/* Forms List */}
        <div className="space-y-4">
          {FORMS.map((form, index) => {
            const formData = data.forms[form.key as keyof typeof data.forms]
            const isCompleted = formData?.is_completed

            return (
              <div 
                key={form.id}
                className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
                  isCompleted ? 'border-emerald-200' : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <span className="text-gray-500 font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{form.name}</h3>
                    <p className="text-sm text-gray-500">{form.description}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </span>
                    ) : (
                      <Link href={`/onboarding-forms/${onboardingId}/${form.path}`}>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                          Fill Form
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-medium">Need Help?</p>
              <p className="text-blue-700 text-sm mt-1">
                If you have any questions about these forms, please contact our team at{' '}
                <a href="mailto:support@ibogawellness.com" className="underline">
                  support@ibogawellness.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

