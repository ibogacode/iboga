'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ClipboardList, Shield, Eye, Loader2, X, Calendar, FlaskConical, CheckCircle2, Heart, TestTube2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PatientTask } from '@/actions/patient-tasks.action'
import { getIntakeFormById } from '@/actions/patient-profile.action'
import { getMedicalHistoryFormForPatient } from '@/actions/medical-history.action'
import { getServiceAgreementForPatient } from '@/actions/service-agreement.action'
import { acknowledgeTaperingSchedule } from '@/actions/tapering-schedule.action'
import { recordOnboardingMedicalDocument, skipOnboardingMedicalDocument } from '@/actions/onboarding-documents.action'
import { uploadDocumentClient } from '@/lib/supabase/client-storage'
import { PatientIntakeFormView } from '@/components/admin/patient-intake-form-view'
import { MedicalHistoryFormView } from '@/components/admin/medical-history-form-view'
import { ServiceAgreementFormView } from '@/components/admin/service-agreement-form-view'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface TaperingScheduleData {
  id: string
  status: 'draft' | 'sent' | 'acknowledged'
  starting_dose: string
  total_days: number
  schedule_days: Array<{ day: number; dose: string; notes?: string; label?: string }>
  additional_notes?: string
  sent_at?: string
}

interface OnboardingUploadContext {
  onboardingId: string
  hasEkg: boolean
  hasBloodwork: boolean
  ekgSkipped: boolean
  bloodworkSkipped: boolean
}

interface DocumentsClientProps {
  documents: PatientTask[]
  taperingSchedule?: TaperingScheduleData | null
  onboardingUpload?: OnboardingUploadContext | null
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

const ALLOWED_UPLOAD_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp'

export function DocumentsClient({ documents, taperingSchedule, onboardingUpload }: DocumentsClientProps) {
  const router = useRouter()
  const [viewingForm, setViewingForm] = useState<'intake' | 'medical' | 'service' | 'tapering' | null>(null)
  const [viewFormData, setViewFormData] = useState<any>(null)
  const [loadingViewForm, setLoadingViewForm] = useState<string | null>(null)
  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const [uploadingType, setUploadingType] = useState<'ekg' | 'bloodwork' | null>(null)
  const [skipDialog, setSkipDialog] = useState<'ekg' | 'bloodwork' | null>(null)
  const [skipTermsAccepted, setSkipTermsAccepted] = useState(false)
  const [skippingType, setSkippingType] = useState<'ekg' | 'bloodwork' | null>(null)

  const handleOnboardingUpload = async (type: 'ekg' | 'bloodwork', file: File) => {
    if (!onboardingUpload) return
    setUploadingType(type)
    try {
      const folder = `${onboardingUpload.onboardingId}/${type}`
      const { path } = await uploadDocumentClient('onboarding-medical-documents', file, folder)
      const result = await recordOnboardingMedicalDocument({
        onboarding_id: onboardingUpload.onboardingId,
        document_type: type,
        document_path: path,
        document_name: file.name,
      })
      if (result?.data?.success) {
        toast.success(`${type === 'ekg' ? 'EKG' : 'Bloodwork'} results uploaded successfully`)
        router.refresh()
      } else {
        toast.error(result?.data?.error || 'Failed to record document')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingType(null)
    }
  }

  const handleSkipConfirm = async () => {
    if (!onboardingUpload || !skipDialog || !skipTermsAccepted) return
    setSkippingType(skipDialog)
    try {
      const result = await skipOnboardingMedicalDocument({
        onboarding_id: onboardingUpload.onboardingId,
        document_type: skipDialog,
      })
      if (result?.data?.success) {
        toast.success(skipDialog === 'ekg' ? 'EKG skipped' : 'Bloodwork skipped. Tests can be done at the institute.')
        setSkipDialog(null)
        setSkipTermsAccepted(false)
        router.refresh()
      } else {
        toast.error(result?.data?.error || 'Failed to skip')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to skip')
    } finally {
      setSkippingType(null)
    }
  }

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

      {/* Onboarding: EKG and Bloodwork uploads (when in onboarding) */}
      {onboardingUpload && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Onboarding documents</h2>
          <p className="text-sm text-[#777777]">
            Please upload your EKG and Bloodwork results. Both are required before we can prepare your tapering schedule.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* EKG */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#F5F4F0] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#6E7A46]" />
                </div>
                <h3 className="font-medium text-gray-900">EKG results</h3>
              </div>
              <p className="text-sm text-[#777777] mb-4">Upload your EKG results (PDF or image).</p>
              {onboardingUpload.hasEkg ? (
                <div className="flex items-center gap-2 text-[#10B981] mt-auto">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">Uploaded</span>
                </div>
              ) : onboardingUpload.ekgSkipped ? (
                <div className="flex items-center gap-2 text-amber-600 mt-auto">
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Skipped</span>
                  <span className="text-sm text-[#777777]">Will be done at institute</span>
                </div>
              ) : (
                <div className="mt-auto space-y-2">
                  <input
                    type="file"
                    accept={ALLOWED_UPLOAD_TYPES}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#6E7A46] file:text-white file:text-sm"
                    disabled={!!uploadingType}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleOnboardingUpload('ekg', f)
                      e.target.value = ''
                    }}
                  />
                  {uploadingType === 'ekg' && (
                    <div className="flex items-center gap-2 text-sm text-[#777777]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-sm border-amber-200 text-amber-700 hover:bg-amber-50"
                    onClick={() => { setSkipDialog('ekg'); setSkipTermsAccepted(false) }}
                  >
                    Skip for now — get it done at institute
                  </Button>
                </div>
              )}
            </div>
            {/* Bloodwork */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#F5F4F0] flex items-center justify-center">
                  <TestTube2 className="w-5 h-5 text-[#6E7A46]" />
                </div>
                <h3 className="font-medium text-gray-900">Bloodwork results</h3>
              </div>
              <p className="text-sm text-[#777777] mb-4">Upload your bloodwork results (PDF or image).</p>
              {onboardingUpload.hasBloodwork ? (
                <div className="flex items-center gap-2 text-[#10B981] mt-auto">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">Uploaded</span>
                </div>
              ) : onboardingUpload.bloodworkSkipped ? (
                <div className="flex items-center gap-2 text-amber-600 mt-auto">
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Skipped</span>
                  <span className="text-sm text-[#777777]">Will be done at institute</span>
                </div>
              ) : (
                <div className="mt-auto space-y-2">
                  <input
                    type="file"
                    accept={ALLOWED_UPLOAD_TYPES}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#6E7A46] file:text-white file:text-sm"
                    disabled={!!uploadingType}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleOnboardingUpload('bloodwork', f)
                      e.target.value = ''
                    }}
                  />
                  {uploadingType === 'bloodwork' && (
                    <div className="flex items-center gap-2 text-sm text-[#777777]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-sm border-amber-200 text-amber-700 hover:bg-amber-50"
                    onClick={() => { setSkipDialog('bloodwork'); setSkipTermsAccepted(false) }}
                  >
                    Skip for now — get it done at institute
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skip EKG/Bloodwork confirmation dialog */}
      <Dialog open={!!skipDialog} onOpenChange={(open) => { if (!open) { setSkipDialog(null); setSkipTermsAccepted(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skip {skipDialog === 'ekg' ? 'EKG' : 'Bloodwork'} for now?</DialogTitle>
            <DialogDescription>
              You can have {skipDialog === 'ekg' ? 'your EKG' : 'bloodwork'} done at the institute after arrival at no extra cost. Please read the following:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 my-4">
            <li>Tests are free of cost at the institute after arrival.</li>
            <li>If results show you are not ready for treatment, you may need to wait an extra 2–3 days at the institute.</li>
            <li>Extra days will be charged accordingly.</li>
          </ul>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip-terms"
              checked={skipTermsAccepted}
              onCheckedChange={(checked) => setSkipTermsAccepted(checked === true)}
            />
            <Label htmlFor="skip-terms" className="text-sm font-medium cursor-pointer">
              I understand and accept these terms
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSkipDialog(null); setSkipTermsAccepted(false) }} disabled={!!skippingType}>
              Cancel
            </Button>
            <Button
              onClick={handleSkipConfirm}
              disabled={!skipTermsAccepted || !!skippingType}
              className="bg-[#6E7A46] hover:bg-[#5c6840]"
            >
              {skippingType ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, skip for now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tapering Schedule Card - shown prominently if available */}
      {taperingSchedule && (
        <div className="bg-gradient-to-r from-[#6E7A46]/10 to-[#6E7A46]/5 rounded-2xl p-6 border border-[#6E7A46]/20">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#6E7A46] text-white shrink-0">
              <FlaskConical className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Tapering Schedule
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#DEF8EE] text-[#10B981]">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              </div>
              <p className="text-sm text-[#777777] mb-1">
                {taperingSchedule.total_days} day tapering schedule
              </p>
              {taperingSchedule.starting_dose && (
                <p className="text-xs text-[#777777] mb-4">
                  Starting dose: {taperingSchedule.starting_dose}
                </p>
              )}
              {!taperingSchedule.starting_dose && <div className="mb-4" />}
              <Button
                onClick={() => {
                  setViewFormData(taperingSchedule)
                  setViewingForm('tapering')
                }}
                className="bg-[#6E7A46] text-white hover:bg-[#5c6840] rounded-3xl h-10 text-sm px-6"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {documents.length === 0 && !taperingSchedule ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
          <p className="text-gray-500">
            Your completed forms will appear here once you finish them.
          </p>
        </div>
      ) : documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" data-tour="tour-documents-list">
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
      ) : null}

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

      {/* Tapering Schedule View Modal */}
      {viewingForm === 'tapering' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6E7A46] text-white">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Tapering Schedule</h2>
                    <p className="text-sm text-gray-500">{viewFormData.total_days} day schedule</p>
                  </div>
                </div>
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
              <div className="p-6 space-y-6">
                {/* Schedule header - show starting dose and duration */}
                <div className="bg-[#6E7A46] text-white p-4 rounded-xl">
                  <div className="text-lg font-semibold">Tapering Schedule</div>
                  <div className="text-sm opacity-90">
                    {viewFormData.starting_dose && `Starting Dose: ${viewFormData.starting_dose} | `}
                    Duration: {viewFormData.total_days} days
                  </div>
                </div>

                {/* Schedule days */}
                <div className="space-y-3">
                  {(viewFormData.schedule_days as Array<{ day: number; dose: string; notes?: string; label?: string }>)
                    .sort((a, b) => a.day - b.day) // Sort ascending (Day 1 first)
                    .map((day) => (
                      <div
                        key={day.day}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div className="space-y-2">
                          {/* Day header with optional label */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center px-3 h-8 bg-[#6E7A46] text-white rounded-lg font-semibold text-sm shrink-0">
                              Day {day.day}
                            </div>
                            {day.label && (
                              <span className="text-sm font-medium text-gray-700">({day.label})</span>
                            )}
                          </div>
                          {/* Dose - optional */}
                          {day.dose && (
                            <div className="font-medium text-gray-900 ml-1">
                              <span className="text-gray-500">Dose:</span> {day.dose}
                            </div>
                          )}
                          {/* Notes - can be multi-line, shown as bullet points */}
                          {day.notes && (
                            <div className="text-sm text-gray-700 ml-1">
                              <span className="font-medium text-gray-500">Notes:</span>
                              <ul className="mt-1 ml-4 space-y-1">
                                {day.notes.split('\n').filter(line => line.trim()).map((line, i) => (
                                  <li key={i} className="list-disc">{line.trim().replace(/^[•\-]\s*/, '')}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Additional notes */}
                {viewFormData.additional_notes && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="font-medium text-yellow-900 mb-1">Additional Notes</div>
                    <div className="text-sm text-yellow-800">{viewFormData.additional_notes}</div>
                  </div>
                )}

                {/* Acknowledge button */}
                {viewFormData.status === 'sent' && (
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      onClick={async () => {
                        setIsAcknowledging(true)
                        try {
                          const result = await acknowledgeTaperingSchedule({ id: viewFormData.id })
                          if (result?.data?.success) {
                            toast.success('Schedule acknowledged')
                            setViewFormData({ ...viewFormData, status: 'acknowledged' })
                          } else {
                            toast.error(result?.data?.error || 'Failed to acknowledge')
                          }
                        } catch {
                          toast.error('Failed to acknowledge')
                        } finally {
                          setIsAcknowledging(false)
                        }
                      }}
                      disabled={isAcknowledging}
                      className="w-full bg-[#6E7A46] text-white hover:bg-[#5c6840] rounded-xl h-12"
                    >
                      {isAcknowledging ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Acknowledging...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          I Have Read and Understand This Schedule
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {viewFormData.status === 'acknowledged' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-[#10B981]">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">You have acknowledged this schedule</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

