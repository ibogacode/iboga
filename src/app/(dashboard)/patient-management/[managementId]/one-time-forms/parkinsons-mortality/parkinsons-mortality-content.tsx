'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPatientManagementWithForms } from '@/actions/patient-management.action'
import { ParkinsonsMortalityScalesFormWrapper } from '@/components/forms/patient-management/parkinsons-mortality-scales-form-wrapper'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export function ParkinsonsMortalityFormPageContent() {
  const params = useParams()
  const router = useRouter()
  const managementId = params.managementId as string

  const [management, setManagement] = useState<any>(null)
  const [formData, setFormData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [managementId])

  async function loadData() {
    setIsLoading(true)
    try {
      const result = await getPatientManagementWithForms({ management_id: managementId })

      if (result?.data?.success && result.data.data) {
        setManagement(result.data.data.management)
        setFormData(result.data.data.forms.parkinsonsMortalityScales)
      } else {
        toast.error('Failed to load patient management data')
        router.push('/patient-management')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load form')
      router.push('/patient-management')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSuccess() {
    router.push(`/patient-management/${managementId}/one-time-forms`)
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

  // Only allow neurological programs
  if (management.program_type !== 'neurological') {
    return (
      <div className="min-h-screen bg-[#EDE9E4] flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-gray-500 mb-4">
            This form is only available for neurological program patients.
          </p>
          <Button onClick={() => router.push(`/patient-management/${managementId}/one-time-forms`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to One-Time Forms
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
            onClick={() => router.push(`/patient-management/${managementId}/one-time-forms`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to One-Time Forms
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Parkinson's Mortality - Related Scales
          </h1>
          <p className="text-gray-600">
            {management.first_name} {management.last_name}
          </p>
        </div>

        <ParkinsonsMortalityScalesFormWrapper
          managementId={managementId}
          patientFirstName={management.first_name}
          patientLastName={management.last_name}
          isCompleted={management.parkinsons_mortality_scales_completed}
          initialData={formData}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  )
}
