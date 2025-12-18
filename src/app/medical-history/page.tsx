import { Suspense } from 'react'
import { MedicalHistoryForm } from '@/components/forms/medical-history-form'
import { Loader2 } from 'lucide-react'

function MedicalHistoryFormLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function MedicalHistoryPage() {
  return (
    <Suspense fallback={<MedicalHistoryFormLoading />}>
      <MedicalHistoryForm />
    </Suspense>
  )
}
