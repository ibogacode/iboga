'use client'

import { useState } from 'react'
import { DailyPsychologicalUpdateForm } from './daily-psychological-update-form'
import { CheckCircle } from 'lucide-react'

interface DailyPsychologicalUpdateFormWrapperProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  formDate: string
  programType: 'neurological' | 'mental_health' | 'addiction'
  initialData?: any
  isCompleted?: boolean
  isStarted?: boolean
  onSuccess?: () => void
}

export function DailyPsychologicalUpdateFormWrapper({
  managementId,
  patientFirstName,
  patientLastName,
  formDate,
  programType,
  initialData,
  isCompleted,
  isStarted,
  onSuccess,
}: DailyPsychologicalUpdateFormWrapperProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)

  function handleSuccess() {
    setIsSubmitted(true)
    onSuccess?.()
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Thank You!
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Your daily psychological update has been submitted successfully.
        </p>
      </div>
    )
  }

  return (
    <DailyPsychologicalUpdateForm
      managementId={managementId}
      patientFirstName={patientFirstName}
      patientLastName={patientLastName}
      formDate={formDate}
      programType={programType}
      initialData={initialData}
      isCompleted={isCompleted}
      isStarted={isStarted}
      onSuccess={handleSuccess}
    />
  )
}
