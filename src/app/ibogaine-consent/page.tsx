import { Suspense } from 'react'
import { IbogaineConsentForm } from '@/components/forms/ibogaine-consent-form'
import { Loader2 } from 'lucide-react'

function IbogaineConsentFormFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

export default function IbogaineConsentPage() {
  return (
    <Suspense fallback={<IbogaineConsentFormFallback />}>
      <IbogaineConsentForm />
    </Suspense>
  )
}

