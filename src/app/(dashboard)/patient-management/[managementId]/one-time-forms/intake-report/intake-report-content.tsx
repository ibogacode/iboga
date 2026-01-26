'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPatientManagementWithForms } from '@/actions/patient-management.action'
import { IntakeReportForm } from '@/components/forms/patient-management/intake-report-form'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PDFDownloadButton } from '@/components/ui/pdf-download-button'

export function IntakeReportFormPageContent() {
  const params = useParams()
  const router = useRouter()
  const managementId = params.managementId as string
  const contentRef = useRef<HTMLDivElement>(null)

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
        setFormData(result.data.data.forms.intakeReport)
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

  // Prevent neurological programs from accessing this form
  if (management.program_type === 'neurological') {
    return (
      <div className="min-h-screen bg-[#EDE9E4] flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-gray-500 mb-4">
            Psychological Intake Report is not available for neurological programs. Please use the Parkinson's forms instead.
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
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/patient-management/${managementId}/one-time-forms`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to One-Time Forms
            </Button>
            {management.intake_report_completed && (
              <PDFDownloadButton
                formType="Psychological-Intake-Report"
                patientName={`${management.first_name}-${management.last_name}`}
                date={formData?.created_at?.split('T')[0] ?? new Date().toISOString().split('T')[0]}
                contentRef={contentRef as React.RefObject<HTMLElement>}
              >
                Download PDF
              </PDFDownloadButton>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Psychological Intake Report
          </h1>
          <p className="text-gray-600">
            {management.first_name} {management.last_name}
          </p>
        </div>

        <div ref={contentRef}>
          <IntakeReportForm
            managementId={managementId}
            patientFirstName={management.first_name}
            patientLastName={management.last_name}
            initialData={formData}
            isCompleted={management.intake_report_completed}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  )
}
