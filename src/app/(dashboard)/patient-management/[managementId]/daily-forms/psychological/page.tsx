'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getPatientManagement, getDailyFormsByManagementId } from '@/actions/patient-management.action'
import { DailyPsychologicalUpdateFormWrapper } from '@/components/forms/patient-management/daily-psychological-update-form-wrapper'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { getTodayEST, formatDateFullEST } from '@/lib/utils'

export default function DailyPsychologicalFormPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const managementId = params.managementId as string
  const dateParam = searchParams.get('date') || getTodayEST()

  const [management, setManagement] = useState<any>(null)
  const [formData, setFormData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [managementId, dateParam])

  async function loadData() {
    setIsLoading(true)
    try {
      const [managementResult, formsResult] = await Promise.all([
        getPatientManagement({ management_id: managementId }),
        getDailyFormsByManagementId({ management_id: managementId }),
      ])

      if (managementResult?.data?.success && managementResult.data.data) {
        setManagement(managementResult.data.data)
      }

      if (formsResult?.data?.success && formsResult.data.data) {
        const psychologicalForms = formsResult.data.data.psychological || []
        const formForDate = psychologicalForms.find((f: any) => f.form_date === dateParam)
        // Convert null values to undefined for form handling
        if (formForDate) {
          const cleanedData: any = {}
          for (const key in formForDate) {
            const value = (formForDate as any)[key]
            cleanedData[key] = value === null ? undefined : value
          }
          setFormData(cleanedData)
        } else {
          setFormData(null)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load form data')
      router.push(`/patient-management/${managementId}/daily-forms`)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSuccess() {
    router.push(`/patient-management/${managementId}/daily-forms`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EDE9E4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  if (!management) {
    return (
      <div className="min-h-screen bg-[#EDE9E4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Patient management record not found</p>
          <Button onClick={() => router.push('/patient-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client Management
          </Button>
        </div>
      </div>
    )
  }

  const isReviewOnly = management.status !== 'active'
  if (isReviewOnly && !formData) {
    return (
      <div className="min-h-screen bg-[#EDE9E4] flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-gray-500 mb-4">
            No submitted daily psychological form for this date. Use the Daily Forms list to open a date with a completed form.
          </p>
          <Button onClick={() => router.push(`/patient-management/${managementId}/daily-forms`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Daily Forms
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EDE9E4]">
      <div className="max-w-4xl mx-auto bg-white p-4 md:p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/patient-management/${managementId}/daily-forms`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Daily Forms
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Daily Psychological Update
          </h1>
          <p className="text-gray-600">
            {management.first_name} {management.last_name} - {formatDateFullEST(dateParam)}
          </p>
        </div>

        <DailyPsychologicalUpdateFormWrapper
          managementId={managementId}
          patientFirstName={management.first_name}
          patientLastName={management.last_name}
          formDate={dateParam}
          programType={management.program_type}
          isCompleted={formData?.is_completed ?? isReviewOnly}
          isStarted={!!formData}
          initialData={formData}
          onSuccess={handleSuccess}
          reviewOnly={isReviewOnly}
        />
      </div>
    </div>
  )
}
