'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  getPatientManagementWithForms
} from '@/actions/patient-management.action'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Clock,
  Brain,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface PatientManagementData {
  id: string
  first_name: string
  last_name: string
  program_type: 'neurological' | 'mental_health' | 'addiction'
  status: 'active' | 'discharged' | 'transferred'
  intake_report_completed: boolean
  parkinsons_psychological_report_completed: boolean
  parkinsons_mortality_scales_completed: boolean
}

export default function OneTimeFormsPage() {
  const params = useParams()
  const router = useRouter()
  const managementId = params.managementId as string

  const [management, setManagement] = useState<PatientManagementData | null>(null)
  const [forms, setForms] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [managementId])

  async function loadData() {
    setIsLoading(true)
    try {
      const result = await getPatientManagementWithForms({ management_id: managementId })

      if (result?.data?.success && result.data.data) {
        setManagement(result.data.data.management as PatientManagementData)
        setForms(result.data.data.forms)
      } else {
        toast.error('Failed to load patient management data')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load one-time forms')
    } finally {
      setIsLoading(false)
    }
  }


  function getFormStatus(formType: 'intake' | 'parkinsons_psychological' | 'parkinsons_mortality') {
    if (formType === 'intake') {
      return {
        completed: management?.intake_report_completed || false,
        data: forms?.intakeReport || null,
      }
    }
    if (formType === 'parkinsons_psychological') {
      return {
        completed: management?.parkinsons_psychological_report_completed || false,
        data: forms?.parkinsonsPsychologicalReport || null,
      }
    }
    if (formType === 'parkinsons_mortality') {
      return {
        completed: management?.parkinsons_mortality_scales_completed || false,
        data: forms?.parkinsonsMortalityScales || null,
      }
    }
    return { completed: false, data: null }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!management) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-gray-500">Patient management record not found</p>
        </div>
      </div>
    )
  }

  const intakeStatus = getFormStatus('intake')
  const parkinsonsPsychologicalStatus = getFormStatus('parkinsons_psychological')
  const parkinsonsMortalityStatus = getFormStatus('parkinsons_mortality')

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/patient-management')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patient Management
        </Button>
        <h1 
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '44px',
            fontWeight: 400,
            color: 'black',
          }}
          className="text-2xl sm:text-3xl md:text-[44px]"
        >
          One-Time Forms
        </h1>
        <p className="text-gray-600 mt-2">
          {management.first_name} {management.last_name} - {management.program_type === 'neurological' ? 'Neurological' : management.program_type === 'mental_health' ? 'Mental Health' : 'Addiction'}
        </p>
      </div>

      {/* Forms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Intake Report - Non-Neurological Programs Only */}
        {management.program_type !== 'neurological' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Intake Report</h3>
              </div>
              {(intakeStatus.completed || intakeStatus.data) ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Initial assessment upon patient arrival
            </p>
          <Button
            onClick={() => router.push(`/patient-management/${managementId}/one-time-forms/intake-report`)}
            variant={(intakeStatus.completed || intakeStatus.data) ? 'outline' : 'default'}
            className="w-full"
          >
            {(intakeStatus.completed || intakeStatus.data) ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                View Form
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Fill Form
              </>
            )}
          </Button>
          </div>
        )}

        {/* Parkinson's Psychological Report - Neurological Only */}
        {management.program_type === 'neurological' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Parkinson’s Intake Psychological Report</h3>
                </div>
                {(parkinsonsPsychologicalStatus.completed || parkinsonsPsychologicalStatus.data) ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Initial psychological assessment for Parkinson's patients
              </p>
              <Button
                onClick={() => router.push(`/patient-management/${managementId}/one-time-forms/parkinsons-psychological`)}
                variant={(parkinsonsPsychologicalStatus.completed || parkinsonsPsychologicalStatus.data) ? 'outline' : 'default'}
                className="w-full"
              >
                {(parkinsonsPsychologicalStatus.completed || parkinsonsPsychologicalStatus.data) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    View Form
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Fill Form
                  </>
                )}
              </Button>
            </div>

            {/* Parkinson's Mortality Scales - Neurological Only */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Parkinson's Mortality Scales</h3>
                </div>
                {(parkinsonsMortalityStatus.completed || parkinsonsMortalityStatus.data) ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                MDS-UPDRS, Hoehn & Yahr, and other assessment scales
              </p>
              <Button
                onClick={() => router.push(`/patient-management/${managementId}/one-time-forms/parkinsons-mortality`)}
                variant={(parkinsonsMortalityStatus.completed || parkinsonsMortalityStatus.data) ? 'outline' : 'default'}
                className="w-full"
              >
                {(parkinsonsMortalityStatus.completed || parkinsonsMortalityStatus.data) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    View Form
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Fill Form
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
