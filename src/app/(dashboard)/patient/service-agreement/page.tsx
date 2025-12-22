import { Suspense } from 'react'
import { ServiceAgreementForm } from '@/components/forms/service-agreement-form'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Service Agreement | Patient',
}

export default function PatientServiceAgreementPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }>
        <ServiceAgreementForm prefillPatientData={true} />
      </Suspense>
    </div>
  )
}
