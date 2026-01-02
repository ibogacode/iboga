import { Suspense } from 'react'
import { IbogaineConsentForm } from '@/components/forms/ibogaine-consent-form'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Ibogaine Consent | Patient',
}

export default function PatientIbogaineConsentPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }>
        <IbogaineConsentForm prefillPatientData={true} />
      </Suspense>
    </div>
  )
}

