'use client'

import { Suspense } from 'react'
import { MedicalIntakeReportFormPageContent } from './medical-intake-report-content'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EDE9E4]">
      <div className="text-center">
        <p className="text-gray-600">Loading form...</p>
      </div>
    </div>
  )
}

export default function MedicalIntakeReportPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MedicalIntakeReportFormPageContent />
    </Suspense>
  )
}
