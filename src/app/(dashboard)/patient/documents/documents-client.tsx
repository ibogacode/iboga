'use client'

import { useState } from 'react'
import { FileText, ClipboardList, Shield, Eye, Loader2, X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PatientTask } from '@/actions/patient-tasks.action'
import { getIntakeFormById } from '@/actions/patient-profile.action'
import { getMedicalHistoryFormForPatient } from '@/actions/medical-history.action'
import { getServiceAgreementForPatient } from '@/actions/service-agreement.action'
import { PatientIntakeFormView } from '@/components/admin/patient-intake-form-view'
import { MedicalHistoryFormView } from '@/components/admin/medical-history-form-view'
import { ServiceAgreementFormView } from '@/components/admin/service-agreement-form-view'
import { toast } from 'sonner'

interface DocumentsClientProps {
  documents: PatientTask[]
}

function getDocumentIcon(type: PatientTask['type']) {
  switch (type) {
    case 'intake':
      return <FileText className="w-5 h-5" />
    case 'medical_history':
      return <ClipboardList className="w-5" />
    case 'service_agreement':
      return <Shield className="w-5 h-5" />
    default:
      return <FileText className="w-5 h-5" />
  }
}

function getDocumentTitle(type: PatientTask['type']): string {
  switch (type) {
    case 'intake':
      return 'Client Application Form'
    case 'medical_history':
      return 'Medical Health History'
    case 'service_agreement':
      return 'Service Agreement'
    default:
      return 'Document'
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'N/A'
  }
}

export function DocumentsClient({ documents }: DocumentsClientProps) {
  const [viewingForm, setViewingForm] = useState<'intake' | 'medical' | 'service' | null>(null)
  const [viewFormData, setViewFormData] = useState<any>(null)
  const [loadingViewForm, setLoadingViewForm] = useState<string | null>(null)

  const handleViewDocument = async (document: PatientTask) => {
    // Check if this is an uploaded document (has uploadedDocument property)
    if (document.uploadedDocument) {
      // Open the uploaded document in a new window/tab
      window.open(document.uploadedDocument.url, '_blank')
      return
    }

    if (!document.formId) {
      toast.error('Document ID not found')
      return
    }

    setLoadingViewForm(document.id)
    try {
      let result: any = null

      if (document.type === 'intake') {
        result = await getIntakeFormById({ formId: document.formId })
      } else if (document.type === 'medical_history') {
        result = await getMedicalHistoryFormForPatient({ formId: document.formId })
      } else if (document.type === 'service_agreement') {
        result = await getServiceAgreementForPatient({ formId: document.formId })
      }

      if (result?.data?.success && result.data.data) {
        setViewFormData(result.data.data)
        const formTypeMap: Record<string, 'intake' | 'medical' | 'service'> = {
          'intake': 'intake',
          'medical_history': 'medical',
          'service_agreement': 'service',
        }
        setViewingForm(formTypeMap[document.type] || null)
      } else {
        toast.error(result?.data?.error || 'Failed to load document')
      }
    } catch (error) {
      console.error('Error loading document:', error)
      toast.error('Failed to load document')
    } finally {
      setLoadingViewForm(null)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 
          className="text-2xl sm:text-3xl md:text-[44px] font-normal leading-[1.3em] text-black"
          style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
        >
          Documents
        </h1>
        <p className="text-sm sm:text-base text-[#777777] leading-[1.48em] tracking-[-0.04em]">
          View and access all your completed forms and agreements.
        </p>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
          <p className="text-gray-500">
            Your completed forms will appear here once you finish them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {documents.map((document) => (
            <div
              key={document.id}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#F5F4F0] shrink-0">
                  {getDocumentIcon(document.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">
                    {getDocumentTitle(document.type)}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#777777] mb-3 line-clamp-2">
                    {document.description}
                  </p>
                  {document.completedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-[#777777] mb-4">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Completed {formatDate(document.completedAt)}</span>
                    </div>
                  )}
                  <Button
                    onClick={() => handleViewDocument(document)}
                    disabled={loadingViewForm === document.id}
                    className="w-full bg-[#6E7A46] text-white hover:bg-[#6E7A46]/90 rounded-3xl h-10 text-sm"
                  >
                    {loadingViewForm === document.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        View Document
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form View Modals */}
      {viewingForm === 'intake' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">Client Application Form</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewingForm(null)
                    setViewFormData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="p-6">
                <PatientIntakeFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingForm === 'medical' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">Medical Health History Form</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewingForm(null)
                    setViewFormData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="p-6">
                <MedicalHistoryFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingForm === 'service' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">Service Agreement</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewingForm(null)
                    setViewFormData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="p-6">
                <ServiceAgreementFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

