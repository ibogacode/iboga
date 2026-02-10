'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getPatientManagement, getDailyFormsByManagementId } from '@/actions/patient-management.action'
import { DailyMedicalUpdateFormWrapper } from '@/components/forms/patient-management/daily-medical-update-form-wrapper'
import { DailyPsychologicalUpdateFormWrapper } from '@/components/forms/patient-management/daily-psychological-update-form-wrapper'
import { DailySOWSForm } from '@/components/forms/patient-management/daily-sows-form'
import { DailyOOWSForm } from '@/components/forms/patient-management/daily-oows-form'
import { Loader2 } from 'lucide-react'
import { formatDateFullEST } from '@/lib/utils'

const DAILY_TYPES = ['daily_psychological', 'daily_medical', 'daily_sows', 'daily_oows'] as const
type DailyType = (typeof DAILY_TYPES)[number]

function cleanFormData(raw: any): any {
  if (!raw) return null
  const out: any = {}
  for (const key in raw) {
    const value = raw[key]
    if (value === null) {
      out[key] = undefined
    } else if (key === 'ibogaine_doses' && typeof value === 'string') {
      try {
        out[key] = JSON.parse(value)
      } catch {
        out[key] = value
      }
    } else if (key === 'vitals_photos' && typeof value === 'string') {
      try {
        out[key] = JSON.parse(value)
      } catch {
        out[key] = value
      }
    } else {
      out[key] = value
    }
  }
  return out
}

function EmbedFormContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') as DailyType | null
  const managementId = searchParams.get('managementId')
  const dateParam = searchParams.get('date') || ''

  const [management, setManagement] = useState<any>(null)
  const [formData, setFormData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!type || !managementId || !dateParam || !DAILY_TYPES.includes(type as DailyType)) {
      setError('Missing or invalid type, managementId, or date')
      setIsLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [managementResult, formsResult] = await Promise.all([
          getPatientManagement({ management_id: managementId }),
          getDailyFormsByManagementId({ management_id: managementId }),
        ])
        if (cancelled) return
        if (managementResult?.data?.success && managementResult.data.data) {
          setManagement(managementResult.data.data)
        }
        if (formsResult?.data?.success && formsResult.data.data) {
          const data = formsResult.data.data as Record<string, any[]>
          const key = type === 'daily_psychological' ? 'psychological' : type === 'daily_medical' ? 'medical' : type === 'daily_sows' ? 'sows' : 'oows'
          const arr = data[key] || []
          const forDate = arr.find((f: any) => f.form_date === dateParam)
          setFormData(forDate ? cleanFormData(forDate) : null)
        }
      } catch {
        if (!cancelled) setError('Failed to load form')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [type, managementId, dateParam])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !management) {
    return (
      <div className="p-6 text-center text-gray-500">
        {error || 'Management record not found'}
      </div>
    )
  }

  const isReviewOnly = true
  const programType = management.program_type || 'mental_health'

  if (type === 'daily_sows' || type === 'daily_oows') {
    if (programType !== 'addiction') {
      return (
        <div className="p-6 text-center text-gray-500">
          This form is only available for addiction program.
        </div>
      )
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-white">
      <p className="text-sm text-gray-600 mb-4">
        {management.first_name} {management.last_name} – {formatDateFullEST(dateParam)}
      </p>
      {type === 'daily_psychological' && (
        <DailyPsychologicalUpdateFormWrapper
          managementId={managementId}
          patientFirstName={management.first_name}
          patientLastName={management.last_name}
          formDate={dateParam}
          programType={programType}
          isCompleted={formData?.is_completed ?? true}
          isStarted={!!formData}
          initialData={formData}
          onSuccess={() => {}}
          reviewOnly={isReviewOnly}
        />
      )}
      {type === 'daily_medical' && (
        <DailyMedicalUpdateFormWrapper
          managementId={managementId}
          patientFirstName={management.first_name}
          patientLastName={management.last_name}
          formDate={dateParam}
          programType={programType}
          isCompleted={formData?.is_completed ?? true}
          isStarted={!!formData}
          initialData={formData}
          onSuccess={() => {}}
          reviewOnly={isReviewOnly}
        />
      )}
      {type === 'daily_sows' && (
        <DailySOWSForm
          managementId={managementId}
          patientFirstName={management.first_name}
          patientLastName={management.last_name}
          patientDateOfBirth={management.date_of_birth}
          formDate={dateParam}
          isCompleted={formData?.is_completed ?? true}
          isStarted={!!formData}
          initialData={formData}
          onSuccess={() => {}}
          reviewOnly={isReviewOnly}
        />
      )}
      {type === 'daily_oows' && (
        <DailyOOWSForm
          managementId={managementId}
          patientFirstName={management.first_name}
          patientLastName={management.last_name}
          patientDateOfBirth={management.date_of_birth}
          formDate={dateParam}
          isCompleted={formData?.is_completed ?? true}
          isStarted={!!formData}
          initialData={formData}
          onSuccess={() => {}}
          reviewOnly={isReviewOnly}
        />
      )}
    </div>
  )
}

export default function EmbedFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <EmbedFormContent />
    </Suspense>
  )
}
