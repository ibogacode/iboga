'use client'

import { useState } from 'react'
import { ParkinsonsMortalityScalesForm } from './parkinsons-mortality-scales-form'
import { CheckCircle } from 'lucide-react'

interface ParkinsonsMortalityScalesFormWrapperProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  initialData?: any
  isCompleted?: boolean
  onSuccess?: () => void
}

export function ParkinsonsMortalityScalesFormWrapper({
  managementId,
  patientFirstName,
  patientLastName,
  initialData,
  isCompleted,
  onSuccess,
}: ParkinsonsMortalityScalesFormWrapperProps) {
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
          Your Parkinson's mortality scales form has been submitted successfully.
        </p>
      </div>
    )
  }

  return (
    <ParkinsonsMortalityScalesForm
      managementId={managementId}
      patientFirstName={patientFirstName}
      patientLastName={patientLastName}
      initialData={initialData}
      isCompleted={isCompleted}
      onSuccess={handleSuccess}
    />
  )
}
