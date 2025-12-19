import { Suspense } from 'react'
import { PatientIntakeForm } from '@/components/forms/patient-intake-form'
import { Loader2 } from 'lucide-react'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

export default function IntakePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PatientIntakeForm />
    </Suspense>
  )
}

