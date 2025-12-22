'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MedicalHistoryForm } from '@/components/forms/medical-history-form'
import { MedicalHistoryFormView } from '@/components/admin/medical-history-form-view'
import { getMedicalHistoryFormForPatient } from '@/actions/medical-history.action'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function MedicalHistoryFormLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function MedicalHistoryPageContent() {
  const searchParams = useSearchParams()
  const viewId = searchParams.get('view')
  const [formData, setFormData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(!!viewId)

  useEffect(() => {
    if (viewId) {
      loadFormData()
    }
  }, [viewId])

  async function loadFormData() {
    if (!viewId) return
    
    setIsLoading(true)
    try {
      const result = await getMedicalHistoryFormForPatient({ formId: viewId })
      
      if (result?.data?.success && result.data.data) {
        setFormData(result.data.data)
      } else {
        toast.error(result?.data?.error || 'Failed to load form')
      }
    } catch (error) {
      console.error('Error loading form:', error)
      toast.error('Failed to load form')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <MedicalHistoryFormLoading />
  }

  if (viewId && formData) {
    return <MedicalHistoryFormView form={formData} />
  }

  return <MedicalHistoryForm />
}

export default function MedicalHistoryPage() {
  return (
    <Suspense fallback={<MedicalHistoryFormLoading />}>
      <MedicalHistoryPageContent />
    </Suspense>
  )
}
