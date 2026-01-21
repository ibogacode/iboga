'use client'

import { useState, useRef } from 'react'
import { ParkinsonsMortalityScalesForm } from './parkinsons-mortality-scales-form'
import { CheckCircle } from 'lucide-react'
import { PDFDownloadButton } from '@/components/ui/pdf-download-button'

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
  const contentRef = useRef<HTMLDivElement>(null)

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
    <div className="relative">
      {/* PDF Download Button - only show for completed forms */}
      {isCompleted && (
        <div className="absolute top-0 right-0 z-10 print:hidden">
          <PDFDownloadButton
            formType="Parkinsons-Mortality-Scales"
            patientName={`${patientFirstName}-${patientLastName}`}
            date={initialData?.created_at?.split('T')[0]}
            contentRef={contentRef as React.RefObject<HTMLElement>}
          >
            Download PDF
          </PDFDownloadButton>
        </div>
      )}

      <div ref={contentRef}>
        <ParkinsonsMortalityScalesForm
          managementId={managementId}
          patientFirstName={patientFirstName}
          patientLastName={patientLastName}
          initialData={initialData}
          isCompleted={isCompleted}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  )
}
