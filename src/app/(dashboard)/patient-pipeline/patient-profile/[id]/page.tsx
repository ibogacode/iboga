'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPatientProfile, updatePatientDetails, getIntakeFormById, getMedicalHistoryFormById, getServiceAgreementById, getIbogaineConsentFormById, activateServiceAgreement, activateIbogaineConsent } from '@/actions/patient-profile.action'
import { createPartialIntakeForm } from '@/actions/partial-intake.action'
import { sendFormEmail } from '@/actions/send-form-email.action'
import { movePatientToOnboarding, getOnboardingByPatientId, getFormByOnboarding, uploadOnboardingFormDocument } from '@/actions/onboarding-forms.action'
import { Loader2, ArrowLeft, Edit2, Save, X, FileText, CheckCircle2, Clock, Send, User, Mail, Phone, Calendar, MapPin, Eye, Download, ExternalLink, UserPlus, FileSignature, Plane, Camera, BookOpen, FileX, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateServiceAgreementAdminFields, updateIbogaineConsentAdminFields, getServiceAgreementForAdminEdit, getIbogaineConsentForAdminEdit } from '@/actions/admin-form-edit.action'
import { PatientIntakeFormView } from '@/components/admin/patient-intake-form-view'
import { MedicalHistoryFormView } from '@/components/admin/medical-history-form-view'
import { ServiceAgreementFormView } from '@/components/admin/service-agreement-form-view'
import { IbogaineConsentFormView } from '@/components/admin/ibogaine-consent-form-view'
import { uploadExistingPatientDocument } from '@/actions/existing-patient.action'
import { useUser } from '@/hooks/use-user.hook'
import { uploadDocumentClient } from '@/lib/supabase/client-storage'

interface PatientProfileData {
  patient: any
  intakeForm: any
  partialForm: any
  medicalHistoryForm: any
  serviceAgreement: any
  ibogaineConsentForm: any
  existingPatientDocuments?: Array<{
    id: string
    form_type: 'intake' | 'medical' | 'service' | 'ibogaine'
    document_url: string
    document_name?: string | null
  }>
  formStatuses: {
    intake: 'completed' | 'pending' | 'not_started'
    medicalHistory: 'completed' | 'pending' | 'not_started'
    serviceAgreement: 'completed' | 'pending' | 'not_started'
    ibogaineConsent: 'completed' | 'pending' | 'not_started'
  }
  onboarding?: {
    onboarding: any
    forms: {
      releaseForm: any
      outingForm: any
      regulationsForm: any
    }
  } | null
}

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { profile } = useUser()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [triggeringForm, setTriggeringForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | null>(null)
  const [profileData, setProfileData] = useState<PatientProfileData | null>(null)
  const [viewingForm, setViewingForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | 'onboarding_release' | 'onboarding_outing' | 'onboarding_social_media' | 'onboarding_regulations' | 'onboarding_dissent' | null>(null)
  const [viewFormData, setViewFormData] = useState<any>(null)
  const [loadingViewForm, setLoadingViewForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | 'onboarding_release' | 'onboarding_outing' | 'onboarding_social_media' | 'onboarding_regulations' | 'onboarding_dissent' | null>(null)
  const [activatingForm, setActivatingForm] = useState<'service' | 'ibogaine' | null>(null)
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [activationModalData, setActivationModalData] = useState<{
    formType: 'service' | 'ibogaine'
    formId: string
    isActivated: boolean
    formData: any
  } | null>(null)
  const [isSavingActivationFields, setIsSavingActivationFields] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [confirmationModalData, setConfirmationModalData] = useState<{
    formType: 'ibogaine'
    formId: string
    doctorName: string | null
    dateOfBirth: string | null
    address: string | null
  } | null>(null)
  const [isEditingConfirmationFields, setIsEditingConfirmationFields] = useState(false)
  const [editingConfirmationData, setEditingConfirmationData] = useState<{
    doctorName: string
    dateOfBirth: string
    address: string
  } | null>(null)
  const [isSavingConfirmationFields, setIsSavingConfirmationFields] = useState(false)
  const [isMovingToOnboarding, setIsMovingToOnboarding] = useState(false)
  const [loadingOnboarding, setLoadingOnboarding] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | null>(null)
  const [uploadingOnboardingForm, setUploadingOnboardingForm] = useState<{ onboardingId: string; formType: string } | null>(null)
  const onboardingFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  
  const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'owner'
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'manager'
  
  // Form state for editing
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
  })

  useEffect(() => {
    loadPatientProfile()
  }, [id])

  async function loadPatientProfile() {
    setIsLoading(true)
    try {
      // Determine if ID is a patient_id, partial form ID, or intake form ID
      // Try patientId first (for onboarding redirects), then try both form IDs
      const result = await getPatientProfile({
        patientId: id, // Try as patient_id first
        partialFormId: id, // Fallback to partial form ID
        intakeFormId: id, // Fallback to intake form ID
      })

      console.log('[PatientProfile] Load result:', result)

      if (result?.data?.success && result.data.data) {
        const data = result.data.data
        console.log('[PatientProfile] Profile data:', data)

        // Onboarding data is now included in the initial load
        setProfileData(data as PatientProfileData)
        
        // Set form data for editing
        setFormData({
          first_name: data.patient?.first_name || data.intakeForm?.first_name || data.partialForm?.first_name || '',
          last_name: data.patient?.last_name || data.intakeForm?.last_name || data.partialForm?.last_name || '',
          email: data.patient?.email || data.intakeForm?.email || data.partialForm?.email || '',
          phone: data.patient?.phone || data.intakeForm?.phone_number || data.partialForm?.phone_number || '',
          date_of_birth: data.patient?.date_of_birth || data.intakeForm?.date_of_birth || '',
          gender: data.patient?.gender || data.intakeForm?.gender || '',
          address: data.patient?.address || data.intakeForm?.address || '',
          city: data.patient?.city || data.intakeForm?.city || '',
          state: data.patient?.state || data.intakeForm?.state || '',
          zip_code: data.patient?.zip_code || data.intakeForm?.zip_code || '',
          country: data.patient?.country || '',
        })
      } else {
        const errorMsg = result?.data?.error || result?.serverError || 'Failed to load patient profile'
        console.error('[PatientProfile] Error:', errorMsg, result)
        toast.error(errorMsg)
        // Don't redirect immediately - let user see the error
      }
    } catch (error) {
      console.error('[PatientProfile] Exception loading patient profile:', error)
      toast.error('Failed to load patient profile')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!profileData?.patient?.id) {
      toast.error('Cannot update: Patient profile not found')
      return
    }

    setIsSaving(true)
    try {
      // Ensure gender is one of the valid values
      const validGender = formData.gender === 'male' || formData.gender === 'female' || formData.gender === 'other' 
        ? formData.gender 
        : undefined

      const result = await updatePatientDetails({
        patientId: profileData.patient.id,
        ...formData,
        gender: validGender,
      })

      if (result?.data?.success) {
        toast.success('Patient details updated successfully')
        setIsEditing(false)
        await loadPatientProfile()
      } else {
        toast.error(result?.data?.error || 'Failed to update patient details')
      }
    } catch (error) {
      console.error('Error updating patient:', error)
      toast.error('Failed to update patient details')
    } finally {
      setIsSaving(false)
    }
  }

  function handleOnboardingUploadClick(onboardingId: string, formType: string) {
    const key = `${onboardingId}-${formType}`
    onboardingFileInputRefs.current[key]?.click()
  }

  async function handleOnboardingFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    onboardingId: string,
    formType: 'release' | 'outing' | 'regulations'
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingOnboardingForm({ onboardingId, formType })
    
    try {
      const result = await uploadOnboardingFormDocument({
        onboarding_id: onboardingId,
        form_type: formType,
        file: file,
      })

      if (result?.data?.success) {
        const formName = formType === 'release' ? 'Release Form' : formType === 'outing' ? 'Outing Consent' : 'Internal Regulations'
        toast.success(`${formName} uploaded successfully`)
        
        // Reload patient profile which will also reload onboarding data
        await loadPatientProfile()
      } else {
        toast.error(result?.data?.error || 'Failed to upload form')
      }
    } catch (error) {
      console.error('Error uploading onboarding form:', error)
      toast.error('An error occurred while uploading the form')
    } finally {
      setUploadingOnboardingForm(null)
      // Reset file input
      const key = `${onboardingId}-${formType}`
      if (onboardingFileInputRefs.current[key]) {
        onboardingFileInputRefs.current[key]!.value = ''
      }
    }
  }

  async function handleUploadDocument(formType: 'intake' | 'medical' | 'service' | 'ibogaine', file: File) {
    if (!profileData?.patient?.id) {
      toast.error('Patient ID not found')
      return
    }

    setUploadingDocument(formType)
    try {
      // Upload file to Supabase Storage first (from client)
      const bucketMap: Record<string, 'intake-form-documents' | 'medical-history-documents' | 'service-agreement-documents' | 'ibogaine-consent-documents'> = {
        intake: 'intake-form-documents',
        medical: 'medical-history-documents',
        service: 'service-agreement-documents',
        ibogaine: 'ibogaine-consent-documents',
      }

      const bucketId = bucketMap[formType]
      const uploadResult = await uploadDocumentClient(bucketId, file)

      // Call server action to store document record and mark form as completed
      const result = await uploadExistingPatientDocument({
        documentUrl: uploadResult.url,
        documentPath: uploadResult.path,
        fileName: file.name,
        fileType: formType,
        patientId: profileData.patient.id,
        partialFormId: profileData.partialForm?.id,
        intakeFormId: profileData.intakeForm?.id,
      })

      if (result?.data?.success) {
        const formName = formType === 'intake' ? 'Application Form' 
          : formType === 'medical' ? 'Medical History Form'
          : formType === 'service' ? 'Service Agreement'
          : 'Ibogaine Consent Form'
        toast.success(`${formName} document uploaded and marked as completed`)
        await loadPatientProfile() // Reload to show updated status
      } else {
        toast.error(result?.data?.error || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setUploadingDocument(null)
    }
  }

  function handleFileInputChange(formType: 'intake' | 'medical' | 'service' | 'ibogaine', event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      handleUploadDocument(formType, file)
    }
    // Reset input so same file can be selected again
    event.target.value = ''
  }

  async function handleTriggerForm(formType: 'intake' | 'medical' | 'service' | 'ibogaine') {
    if (!profileData) return

    setTriggeringForm(formType)
    try {
      if (formType === 'intake') {
        // Check if partial form already exists
        const partialFormId = profileData.partialForm?.id
        
        if (partialFormId) {
          // Send email for existing partial form
          const result = await sendFormEmail({
            formType: 'intake',
            partialFormId: partialFormId,
          })
          
          if (result?.data?.success) {
            const recipientEmail = result.data.data?.recipientEmail || 'recipient'
            toast.success(`Intake form link sent to ${recipientEmail}`)
            await loadPatientProfile()
          } else {
            toast.error(result?.data?.error || 'Failed to send intake form email')
          }
        } else {
          // Create a new minimal partial intake form
          const result = await createPartialIntakeForm({
            mode: 'minimal',
            first_name: profileData.patient?.first_name || profileData.intakeForm?.first_name || profileData.partialForm?.first_name || '',
            last_name: profileData.patient?.last_name || profileData.intakeForm?.last_name || profileData.partialForm?.last_name || '',
            email: profileData.patient?.email || profileData.intakeForm?.email || profileData.partialForm?.email || '',
            filled_by: profileData.partialForm?.filled_by || profileData.intakeForm?.filled_by || 'self',
            filler_email: profileData.partialForm?.filler_email || profileData.intakeForm?.filler_email || null,
            filler_first_name: profileData.partialForm?.filler_first_name || profileData.intakeForm?.filler_first_name || null,
            filler_last_name: profileData.partialForm?.filler_last_name || profileData.intakeForm?.filler_last_name || null,
          })

          if (result?.data?.success) {
            toast.success('Intake form link sent successfully')
            await loadPatientProfile()
          } else {
            toast.error(result?.data?.error || 'Failed to send intake form')
          }
        }
      } else {
        // For medical, service, and ibogaine forms, send email directly
        const intakeFormId = profileData.intakeForm?.id
        const partialFormId = profileData.partialForm?.id
        const patientId = profileData.patient?.id
        
        const result = await sendFormEmail({
          formType: formType,
          intakeFormId: intakeFormId,
          partialFormId: partialFormId,
          patientId: patientId,
        })
        
        if (result?.data?.success) {
          const formName = formType === 'medical' ? 'Medical History' 
            : formType === 'service' ? 'Service Agreement'
            : 'Ibogaine Therapy Consent Form'
          const recipientEmail = result.data.data?.recipientEmail || 'recipient'
          toast.success(`${formName} form link sent to ${recipientEmail}`)
          await loadPatientProfile()
        } else {
          toast.error(result?.data?.error || `Failed to send ${formType} form email`)
        }
      }
    } catch (error) {
      console.error('Error triggering form:', error)
      toast.error('Failed to trigger form')
    } finally {
      setTriggeringForm(null)
    }
  }

  // Check if required fields are missing before activation
  async function checkMissingFields(formType: 'service' | 'ibogaine', formId: string): Promise<{ missing: boolean; formData: any }> {
    try {
      if (formType === 'service') {
        const result = await getServiceAgreementForAdminEdit({ formId })
        if (!result?.data?.data) {
          return { missing: false, formData: null }
        }
        const data = result.data.data
        const missingFields: string[] = []
        
        if (!data.total_program_fee || data.total_program_fee === 0) missingFields.push('Total Program Fee')
        if (!data.deposit_amount || data.deposit_amount === 0) missingFields.push('Deposit Amount')
        if (data.deposit_percentage === null || data.deposit_percentage === undefined) missingFields.push('Deposit Percentage')
        if (data.remaining_balance === null || data.remaining_balance === undefined) missingFields.push('Remaining Balance')
        if (!data.number_of_days || data.number_of_days <= 0) missingFields.push('Number of Days of Program')
        if (!data.provider_signature_name || data.provider_signature_name.trim() === '') missingFields.push('Provider Signature Name')
        if (!data.provider_signature_date) missingFields.push('Provider Signature Date')
        
        return { missing: missingFields.length > 0, formData: data }
      } else {
        const result = await getIbogaineConsentForAdminEdit({ formId })
        if (!result?.data?.data) {
          return { missing: false, formData: null }
        }
        const data = result.data.data
        const missingFields: string[] = []
        
        // treatment_date has been completely removed from the form
        // facilitator_doctor_name comes from defaults table, not required from form
        if (!data.date_of_birth) missingFields.push('Date of Birth')
        if (!data.address || data.address.trim() === '') missingFields.push('Address')
        
        return { missing: missingFields.length > 0, formData: data }
      }
    } catch (error) {
      console.error('[checkMissingFields] Error:', error)
      return { missing: false, formData: null }
    }
  }

  // Internal function to actually perform activation (without field check)
  async function performActivation(formType: 'service' | 'ibogaine', formId: string, isActivated: boolean) {
    setActivatingForm(formType)
    try {
      const action = formType === 'service' ? activateServiceAgreement : activateIbogaineConsent
      console.log(`[ActivateForm] Calling action for ${formType}...`)
      const result = await action({ formId, isActivated })
      
      console.log(`[ActivateForm] ${formType} result:`, JSON.stringify(result, null, 2))
      
      if (result?.data?.success) {
        toast.success(`${formType === 'service' ? 'Service Agreement' : 'Ibogaine Consent'} ${isActivated ? 'activated' : 'deactivated'} successfully`)
        await loadPatientProfile()
      } else {
        const errorMsg = result?.data?.error || result?.serverError || (typeof result?.validationErrors === 'string' ? result.validationErrors : `Failed to ${isActivated ? 'activate' : 'deactivate'} form`)
        console.error(`[ActivateForm] ${formType} error:`, errorMsg, result)
        toast.error(String(errorMsg))
      }
    } catch (error) {
      console.error(`[ActivateForm] ${formType} exception:`, error)
      toast.error(`Failed to update form activation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActivatingForm(null)
    }
  }

  // Check if form is completed by patient
  function isFormCompleted(formType: 'service' | 'ibogaine'): boolean {
    if (formType === 'service') {
      const form = profileData?.serviceAgreement
      if (!form) return false
      
      return !!(
        form.patient_signature_name &&
        form.patient_signature_name.trim() !== '' &&
        form.patient_signature_first_name &&
        form.patient_signature_first_name.trim() !== '' &&
        form.patient_signature_last_name &&
        form.patient_signature_last_name.trim() !== '' &&
        form.patient_signature_date &&
        form.patient_signature_data &&
        form.patient_signature_data.trim() !== ''
      )
    } else {
      const form = profileData?.ibogaineConsentForm
      if (!form) return false
      
      return !!(
        form.signature_data &&
        form.signature_data.trim() !== '' &&
        form.signature_date &&
        form.signature_name &&
        form.signature_name.trim() !== ''
      )
    }
  }

  async function handleActivateForm(formType: 'service' | 'ibogaine', formId: string, isActivated: boolean) {
    if (!formId) {
      toast.error('Form ID is missing. Please create the form first.')
      return
    }
    
    // If deactivating, check if form is completed
    if (!isActivated) {
      if (isFormCompleted(formType)) {
        toast.error(`Cannot deactivate ${formType === 'service' ? 'Service Agreement' : 'Ibogaine Consent'} form. The form has been completed by the patient and cannot be deactivated.`)
        return
      }
      await performActivation(formType, formId, isActivated)
      return
    }
    
    // If activating, check for missing fields first
    console.log(`[ActivateForm] Checking for missing fields for ${formType}:`, { formId })
    const { missing, formData } = await checkMissingFields(formType, formId)
    
    if (missing) {
      // Show modal to fill required fields
      setActivationModalData({
        formType,
        formId,
        isActivated,
        formData,
      })
      setShowActivationModal(true)
      return
    }
    
    // For ibogaine consent, always show confirmation modal before activating
    if (formType === 'ibogaine') {
      const doctorName = formData?.facilitator_doctor_name_from_defaults || formData?.facilitator_doctor_name || null
      const dateOfBirth = formData?.date_of_birth || null
      const address = formData?.address || null
      
      setConfirmationModalData({
        formType: 'ibogaine',
        formId,
        doctorName,
        dateOfBirth,
        address,
      })
      setShowConfirmationModal(true)
      return
    }
    
    // For service agreement, proceed directly if no missing fields
    await performActivation(formType, formId, isActivated)
  }

  function getStatusBadge(status: 'completed' | 'pending' | 'not_started') {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            Incomplete
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">Patient not found</p>
          <Button onClick={() => router.push('/patient-pipeline')} className="mt-4">
            Back to Pipeline
          </Button>
        </div>
      </div>
    )
  }

  const patient = profileData.patient
  const displayName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Unknown Patient'

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 
            style={{ 
              fontFamily: 'var(--font-instrument-serif), serif',
              fontSize: '44px',
              fontWeight: 400,
              color: 'black',
            }}
          >
            {displayName}
          </h1>
          <p className="text-gray-600 mt-1">{patient?.email || 'No email'}</p>
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Details
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                // Reset form data
                loadPatientProfile()
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Patient Details */}
        <div className="space-y-6">
          {/* Patient Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Information</h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Input
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="mt-1"
                      placeholder="male, female, other"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip_code">Zip Code</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-base font-medium text-gray-900">{displayName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-base font-medium text-gray-900">{patient?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-base font-medium text-gray-900">{patient?.phone || 'N/A'}</p>
                    </div>
                  </div>
                  {patient?.date_of_birth && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="text-base font-medium text-gray-900">
                          {format(new Date(patient.date_of_birth), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  {patient?.address && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="text-base font-medium text-gray-900">
                          {[patient.address, patient.city, patient.state, patient.zip_code].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Forms Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Forms Status</h2>
            
            <div className="space-y-4">
              {/* Intake Form */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Application Form</p>
                    <p className="text-sm text-gray-500">Patient intake application</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(profileData.formStatuses.intake)}
                  {profileData.formStatuses.intake === 'not_started' ? (
                    <div className="flex gap-2">
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleFileInputChange('intake', e)}
                            disabled={uploadingDocument !== null}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingDocument !== null}
                            className="gap-2"
                          >
                            {uploadingDocument === 'intake' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerForm('intake')}
                        disabled={triggeringForm !== null}
                        className="gap-2"
                      >
                        {triggeringForm === 'intake' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send Form
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Check if there's an uploaded document for this form
                        const uploadedDoc = profileData.existingPatientDocuments?.find(
                          doc => doc.form_type === 'intake'
                        )
                        
                        if (uploadedDoc) {
                          // Show uploaded document
                          setViewFormData({ 
                            type: 'uploaded_document',
                            document_url: uploadedDoc.document_url,
                            document_name: uploadedDoc.document_name || 'Intake Form Document',
                            form_type: 'intake'
                          })
                          setViewingForm('intake')
                        } else {
                          // Load and view intake form
                          const intakeFormId = profileData.intakeForm?.id
                          if (intakeFormId) {
                            setLoadingViewForm('intake')
                            try {
                              const result = await getIntakeFormById({ formId: intakeFormId })
                              
                              if (result?.data?.success && result.data.data) {
                                setViewFormData(result.data.data)
                                setViewingForm('intake')
                              } else {
                                toast.error(result?.data?.error || 'Failed to load form data')
                              }
                            } catch (error) {
                              console.error('Error loading form:', error)
                              toast.error('Failed to load form data')
                            } finally {
                              setLoadingViewForm(null)
                            }
                          }
                        }
                      }}
                      className="gap-2"
                      disabled={loadingViewForm === 'intake'}
                    >
                      {loadingViewForm === 'intake' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      View
                    </Button>
                  )}
                </div>
              </div>

              {/* Medical History Form */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Medical Health History</p>
                    <p className="text-sm text-gray-500">Medical history and health information</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(profileData.formStatuses.medicalHistory)}
                  {profileData.formStatuses.medicalHistory === 'not_started' ? (
                    <div className="flex gap-2">
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleFileInputChange('medical', e)}
                            disabled={uploadingDocument !== null}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingDocument !== null}
                            className="gap-2"
                          >
                            {uploadingDocument === 'medical' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to medical history form with intake form ID if available
                          const intakeFormId = profileData.intakeForm?.id
                          const url = intakeFormId 
                            ? `/medical-history?intake_form_id=${intakeFormId}&admin=true`
                            : '/medical-history?admin=true'
                          router.push(url)
                        }}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Fill
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerForm('medical')}
                        disabled={triggeringForm !== null}
                        className="gap-2"
                      >
                        {triggeringForm === 'medical' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send Form
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Check if there's an uploaded document for this form
                        const uploadedDoc = profileData.existingPatientDocuments?.find(
                          doc => doc.form_type === 'medical'
                        )
                        
                        if (uploadedDoc) {
                          // Show uploaded document
                          setViewFormData({ 
                            type: 'uploaded_document',
                            document_url: uploadedDoc.document_url,
                            document_name: uploadedDoc.document_name || 'Medical History Document',
                            form_type: 'medical'
                          })
                          setViewingForm('medical')
                        } else {
                          // Load and view medical history form
                          const medicalFormId = profileData.medicalHistoryForm?.id
                          if (medicalFormId) {
                            setLoadingViewForm('medical')
                            try {
                              const result = await getMedicalHistoryFormById({ formId: medicalFormId })
                              
                              if (result?.data?.success && result.data.data) {
                                setViewFormData(result.data.data)
                                setViewingForm('medical')
                              } else {
                                toast.error(result?.data?.error || 'Failed to load form data')
                              }
                            } catch (error) {
                              console.error('Error loading form:', error)
                              toast.error('Failed to load form data')
                            } finally {
                              setLoadingViewForm(null)
                            }
                          }
                        }
                      }}
                      className="gap-2"
                      disabled={loadingViewForm === 'medical'}
                    >
                      {loadingViewForm === 'medical' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      View
                    </Button>
                  )}
                </div>
              </div>

              {/* Service Agreement */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Service Agreement</p>
                    <p className="text-sm text-gray-500">Service agreement and payment terms</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(profileData.formStatuses.serviceAgreement)}
                  {profileData.serviceAgreement?.id && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                        <Label htmlFor="service-activate" className="text-sm font-medium text-gray-700">
                          {profileData.serviceAgreement?.is_activated ? 'Activated' : 'Inactive'}
                        </Label>
                        {activatingForm === 'service' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <Switch
                            id="service-activate"
                            checked={profileData.serviceAgreement?.is_activated || false}
                            disabled={activatingForm !== null || isFormCompleted('service')}
                            onCheckedChange={(checked) => {
                              const formId = profileData.serviceAgreement?.id
                              console.log('[Switch] Service Agreement toggle:', { formId, checked, serviceAgreement: profileData.serviceAgreement })
                              if (formId) {
                                handleActivateForm('service', formId, checked)
                              } else {
                                console.error('[Switch] No form ID found:', profileData.serviceAgreement)
                                toast.error('Form ID not found. Please refresh the page.')
                              }
                            }}
                          />
                        )}
                      </div>
                  )}
                  {profileData.formStatuses.serviceAgreement === 'not_started' ? (
                    <div className="flex gap-2">
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleFileInputChange('service', e)}
                            disabled={uploadingDocument !== null}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingDocument !== null}
                            className="gap-2"
                          >
                            {uploadingDocument === 'service' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerForm('service')}
                        disabled={triggeringForm !== null}
                        className="gap-2"
                      >
                        {triggeringForm === 'service' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send Form
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Check if there's an uploaded document for this form
                        const uploadedDoc = profileData.existingPatientDocuments?.find(
                          doc => doc.form_type === 'service'
                        )
                        
                        if (uploadedDoc) {
                          // Show uploaded document
                          setViewFormData({ 
                            type: 'uploaded_document',
                            document_url: uploadedDoc.document_url,
                            document_name: uploadedDoc.document_name || 'Service Agreement Document',
                            form_type: 'service'
                          })
                          setViewingForm('service')
                        } else {
                          // Load and view service agreement
                          const serviceAgreementId = profileData.serviceAgreement?.id
                          if (serviceAgreementId) {
                            setLoadingViewForm('service')
                            try {
                              const result = await getServiceAgreementById({ formId: serviceAgreementId })
                              
                              if (result?.data?.success && result.data.data) {
                                setViewFormData(result.data.data)
                                setViewingForm('service')
                              } else {
                                toast.error(result?.data?.error || 'Failed to load form data')
                              }
                            } catch (error) {
                              console.error('Error loading form:', error)
                              toast.error('Failed to load form data')
                            } finally {
                              setLoadingViewForm(null)
                            }
                          }
                        }
                      }}
                      className="gap-2"
                      disabled={loadingViewForm === 'service'}
                    >
                      {loadingViewForm === 'service' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      View
                    </Button>
                  )}
                </div>
              </div>

              {/* Ibogaine Therapy Consent Form */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Ibogaine Therapy Consent Form</p>
                    <p className="text-sm text-gray-500">Consent form for Ibogaine therapy treatment</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(profileData.formStatuses.ibogaineConsent)}
                  {/* Activation toggle removed - form is now auto-activated after Service Agreement completion */}
                  {profileData.formStatuses.ibogaineConsent === 'not_started' ? (
                    <div className="flex gap-2">
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleFileInputChange('ibogaine', e)}
                            disabled={uploadingDocument !== null}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingDocument !== null}
                            className="gap-2"
                          >
                            {uploadingDocument === 'ibogaine' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to ibogaine consent form with intake form ID if available
                          const intakeFormId = profileData.intakeForm?.id
                          const url = intakeFormId 
                            ? `/ibogaine-consent?intake_form_id=${intakeFormId}&admin=true`
                            : '/ibogaine-consent?admin=true'
                          router.push(url)
                        }}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Fill
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerForm('ibogaine')}
                        disabled={triggeringForm !== null}
                        className="gap-2"
                      >
                        {triggeringForm === 'ibogaine' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send Form
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Check if there's an uploaded document for this form
                        const uploadedDoc = profileData.existingPatientDocuments?.find(
                          doc => doc.form_type === 'ibogaine'
                        )
                        
                        if (uploadedDoc) {
                          // Show uploaded document
                          setViewFormData({ 
                            type: 'uploaded_document',
                            document_url: uploadedDoc.document_url,
                            document_name: uploadedDoc.document_name || 'Ibogaine Consent Form Document',
                            form_type: 'ibogaine'
                          })
                          setViewingForm('ibogaine')
                        } else {
                          // Load and view ibogaine consent form
                          const ibogaineConsentFormId = profileData.ibogaineConsentForm?.id
                          if (ibogaineConsentFormId) {
                            setLoadingViewForm('ibogaine')
                            try {
                              const result = await getIbogaineConsentFormById({ formId: ibogaineConsentFormId })
                              
                              if (result?.data?.success && result.data.data) {
                                setViewFormData(result.data.data)
                                setViewingForm('ibogaine')
                              } else {
                                toast.error(result?.data?.error || 'Failed to load form data')
                              }
                            } catch (error) {
                              console.error('Error loading form:', error)
                              toast.error('Failed to load form data')
                            } finally {
                              setLoadingViewForm(null)
                            }
                          }
                        }
                      }}
                      className="gap-2"
                      disabled={loadingViewForm === 'ibogaine'}
                    >
                      {loadingViewForm === 'ibogaine' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      View
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Onboarding Forms Section - Show if patient is in onboarding */}
            {profileData.onboarding && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboarding Forms</h2>
                <div className="space-y-4">
                  {[
                    { key: 'releaseForm', label: 'Release Form', icon: FileSignature, completed: profileData.onboarding.onboarding.release_form_completed, formType: 'release' as const },
                    { key: 'outingForm', label: 'Outing/Transfer Consent', icon: Plane, completed: profileData.onboarding.onboarding.outing_consent_completed, formType: 'outing' as const },
                    { key: 'regulationsForm', label: 'Internal Regulations', icon: BookOpen, completed: profileData.onboarding.onboarding.internal_regulations_completed, formType: 'regulations' as const },
                  ].map((form) => {
                    const FormIcon = form.icon
                    const formData = profileData.onboarding?.forms[form.key as keyof typeof profileData.onboarding.forms]
                    const status: 'completed' | 'pending' | 'not_started' = form.completed ? 'completed' : (formData ? 'pending' : 'not_started')
                    const onboardingId = profileData.onboarding?.onboarding.id
                    const inputKey = onboardingId ? `${onboardingId}-${form.formType}` : ''
                    const isUploading = uploadingOnboardingForm?.onboardingId === onboardingId && uploadingOnboardingForm?.formType === form.formType
                    
                    return (
                      <div key={form.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FormIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{form.label}</p>
                            <p className="text-sm text-gray-500">Onboarding form</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(status)}
                          {isAdmin && !form.completed && onboardingId && (
                            <>
                              <input
                                ref={(el) => {
                                  if (inputKey) onboardingFileInputRefs.current[inputKey] = el
                                }}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                                className="hidden"
                                onChange={(e) => handleOnboardingFileChange(e, onboardingId, form.formType)}
                                disabled={isUploading}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOnboardingUploadClick(onboardingId, form.formType)}
                                disabled={isUploading}
                                className="gap-2"
                                title={`Upload ${form.label}`}
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4" />
                                    Upload
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {status === 'completed' && (() => {
                            // Map form keys to form types and viewing form states
                            const formTypeMap: Record<string, { type: 'release' | 'outing' | 'regulations', viewState: typeof viewingForm }> = {
                              'releaseForm': { type: 'release', viewState: 'onboarding_release' },
                              'outingForm': { type: 'outing', viewState: 'onboarding_outing' },
                              'regulationsForm': { type: 'regulations', viewState: 'onboarding_regulations' },
                            }
                            
                            const mapping = formTypeMap[form.key]
                            const currentViewState = mapping?.viewState || null
                            
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!mapping || !onboardingId) return
                                  
                                  setLoadingViewForm(currentViewState)
                                  try {
                                    const result = await getFormByOnboarding({
                                      onboarding_id: onboardingId,
                                      form_type: mapping.type,
                                    })
                                    
                                    if (result?.data?.success && result.data.data) {
                                      // Check if form has uploaded document
                                      const responseData = result.data.data
                                      const formData = responseData.form || responseData
                                      
                                      // If form has document_url, show it; otherwise show form fields
                                      if (formData.document_url) {
                                        setViewFormData({ 
                                          type: 'uploaded_document',
                                          document_url: formData.document_url,
                                          document_name: `${form.label} Document`,
                                          form_type: mapping.type,
                                          uploaded_at: formData.uploaded_at,
                                          uploaded_by: formData.uploaded_by,
                                        })
                                      } else {
                                        setViewFormData(formData)
                                      }
                                      setViewingForm(mapping.viewState)
                                    } else {
                                      toast.error(result?.data?.error || 'Failed to load form data')
                                    }
                                  } catch (error) {
                                    console.error('Error loading onboarding form:', error)
                                    toast.error('Failed to load form data')
                                  } finally {
                                    setLoadingViewForm(null)
                                  }
                                }}
                                className="gap-2"
                                disabled={loadingViewForm !== null}
                              >
                                {loadingViewForm === currentViewState ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    View
                                  </>
                                )}
                              </Button>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Onboarding Status Info */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Status:</strong> {profileData.onboarding.onboarding.status === 'in_progress' ? 'In Progress' : profileData.onboarding.onboarding.status === 'completed' ? 'Completed' : 'Moved to Management'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Forms completed: {[
                      profileData.onboarding.onboarding.release_form_completed,
                      profileData.onboarding.onboarding.outing_consent_completed,
                      profileData.onboarding.onboarding.internal_regulations_completed,
                    ].filter(Boolean).length} / 3
                  </p>
                </div>
              </div>
            )}

            {/* Note: Onboarding is now auto-created when patient completes Ibogaine Consent Form */}
            {/* Manual button kept as backup - automation should handle this automatically */}
            {!profileData.onboarding &&
             profileData.formStatuses.intake === 'completed' &&
             profileData.formStatuses.medicalHistory === 'completed' &&
             profileData.formStatuses.serviceAgreement === 'completed' &&
             profileData.formStatuses.ibogaineConsent === 'completed' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-800">All Forms Completed!</h3>
                      <p className="text-sm text-blue-600 mt-1">
                        Onboarding should be automatically created. If not visible after refreshing, use the button to manually create it.
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        setIsMovingToOnboarding(true)
                        try {
                          const intakeFormId = profileData.intakeForm?.id
                          const partialFormId = profileData.partialForm?.id

                          const result = await movePatientToOnboarding({
                            intake_form_id: intakeFormId || undefined,
                            partial_intake_form_id: partialFormId || undefined,
                          })

                          if (result?.data?.success) {
                            toast.success(result.data.data?.message || 'Patient moved to onboarding successfully')
                            router.push('/onboarding')
                          } else {
                            toast.error(result?.data?.error || 'Failed to move patient to onboarding')
                          }
                        } catch (error) {
                          console.error('Error moving to onboarding:', error)
                          toast.error('An error occurred')
                        } finally {
                          setIsMovingToOnboarding(false)
                        }
                      }}
                      disabled={isMovingToOnboarding}
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100 gap-2"
                    >
                      {isMovingToOnboarding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Moving...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Move to Onboarding (Manual)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form View Modal */}
      {viewingForm === 'intake' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">View Application Form</h2>
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
                {viewFormData?.type === 'uploaded_document' ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {viewFormData.document_name || 'Uploaded Document'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This is an uploaded document for an existing patient.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => window.open(viewFormData.document_url, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Document
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = viewFormData.document_url
                            link.download = viewFormData.document_name || 'document'
                            link.click()
                          }}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {viewFormData.document_url && (
                      <div className="mt-4">
                        <iframe
                          src={viewFormData.document_url}
                          className="w-full h-[600px] border border-gray-200 rounded-lg"
                          title={viewFormData.document_name || 'Document'}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <PatientIntakeFormView form={viewFormData} />
                )}
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
                <h2 className="text-xl font-semibold text-gray-900">View Medical Health History Form</h2>
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
                {viewFormData?.type === 'uploaded_document' ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {viewFormData.document_name || 'Uploaded Document'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This is an uploaded document for an existing patient.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => window.open(viewFormData.document_url, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Document
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = viewFormData.document_url
                            link.download = viewFormData.document_name || 'document'
                            link.click()
                          }}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {viewFormData.document_url && (
                      <div className="mt-4">
                        <iframe
                          src={viewFormData.document_url}
                          className="w-full h-[600px] border border-gray-200 rounded-lg"
                          title={viewFormData.document_name || 'Document'}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <MedicalHistoryFormView form={viewFormData} />
                )}
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
                <h2 className="text-xl font-semibold text-gray-900">View Service Agreement</h2>
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
                {viewFormData?.type === 'uploaded_document' ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {viewFormData.document_name || 'Uploaded Document'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This is an uploaded document for an existing patient.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => window.open(viewFormData.document_url, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Document
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = viewFormData.document_url
                            link.download = viewFormData.document_name || 'document'
                            link.click()
                          }}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {viewFormData.document_url && (
                      <div className="mt-4">
                        <iframe
                          src={viewFormData.document_url}
                          className="w-full h-[600px] border border-gray-200 rounded-lg"
                          title={viewFormData.document_name || 'Document'}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <ServiceAgreementFormView form={viewFormData} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingForm === 'ibogaine' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">View Ibogaine Therapy Consent Form</h2>
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
                {viewFormData?.type === 'uploaded_document' ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {viewFormData.document_name || 'Uploaded Document'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This is an uploaded document for an existing patient.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => window.open(viewFormData.document_url, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Document
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = viewFormData.document_url
                            link.download = viewFormData.document_name || 'document'
                            link.click()
                          }}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {viewFormData.document_url && (
                      <div className="mt-4">
                        <iframe
                          src={viewFormData.document_url}
                          className="w-full h-[600px] border border-gray-200 rounded-lg"
                          title={viewFormData.document_name || 'Document'}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <IbogaineConsentFormView form={viewFormData} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Forms View Modals */}
      {(viewingForm === 'onboarding_release' || viewingForm === 'onboarding_outing' || 
        viewingForm === 'onboarding_social_media' || viewingForm === 'onboarding_regulations' || 
        viewingForm === 'onboarding_dissent') && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewingForm === 'onboarding_release' && 'View Release Form'}
                  {viewingForm === 'onboarding_outing' && 'View Outing/Transfer Consent Form'}
                  {viewingForm === 'onboarding_social_media' && 'View Social Media Release Form'}
                  {viewingForm === 'onboarding_regulations' && 'View Internal Regulations Form'}
                  {viewingForm === 'onboarding_dissent' && 'View Letter of Informed Dissent Form'}
                </h2>
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
                <OnboardingFormViewContent formType={viewingForm} formData={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activation Modal for Required Fields */}
      <Dialog open={showActivationModal} onOpenChange={setShowActivationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Fill Required Fields to Activate {activationModalData?.formType === 'service' ? 'Service Agreement' : 'Ibogaine Consent'} Form
            </DialogTitle>
            <DialogDescription>
              Please fill in all required admin fields before activating the form.
            </DialogDescription>
          </DialogHeader>
          
          {activationModalData && (
            <ActivationFormFields
              formType={activationModalData.formType}
              formId={activationModalData.formId}
              initialData={activationModalData.formData}
              onSave={async (data) => {
                setIsSavingActivationFields(true)
                try {
                  let result
                  if (activationModalData.formType === 'service') {
                    result = await updateServiceAgreementAdminFields({
                      formId: activationModalData.formId,
                      ...data,
                    })
                  } else {
                    result = await updateIbogaineConsentAdminFields({
                      formId: activationModalData.formId,
                      ...data,
                    })
                  }
                  
                  if (result?.data?.success) {
                    toast.success('Fields saved successfully')
                    setShowActivationModal(false)
                    const formType = activationModalData.formType
                    const formId = activationModalData.formId
                    setActivationModalData(null)
                    
                    // For ibogaine consent, show confirmation modal after saving fields
                    if (formType === 'ibogaine') {
                      // Re-fetch form data to get updated values
                      const { formData: updatedFormData } = await checkMissingFields('ibogaine', formId)
                      const doctorName = updatedFormData?.facilitator_doctor_name_from_defaults || updatedFormData?.facilitator_doctor_name || null
                      const dateOfBirth = updatedFormData?.date_of_birth || null
                      const address = updatedFormData?.address || null
                      
                      setConfirmationModalData({
                        formType: 'ibogaine',
                        formId,
                        doctorName,
                        dateOfBirth,
                        address,
                      })
                      setShowConfirmationModal(true)
                    } else {
                      // For service agreement, proceed directly
                      await performActivation(formType, formId, true)
                    }
                  } else {
                    const errorMsg = result?.data?.error || result?.serverError || 'Failed to save fields'
                    toast.error(String(errorMsg))
                  }
                } catch (error) {
                  toast.error(`Failed to save fields: ${error instanceof Error ? error.message : 'Unknown error'}`)
                } finally {
                  setIsSavingActivationFields(false)
                }
              }}
              onCancel={() => {
                setShowActivationModal(false)
                setActivationModalData(null)
              }}
              isSaving={isSavingActivationFields}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Ibogaine Consent Activation */}
      <Dialog open={showConfirmationModal} onOpenChange={(open) => {
        setShowConfirmationModal(open)
        if (!open) {
          setConfirmationModalData(null)
          setIsEditingConfirmationFields(false)
          setEditingConfirmationData(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Confirm Activation - Ibogaine Consent Form
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Please review and confirm the following information before activating the form. You can edit if needed.
            </DialogDescription>
          </DialogHeader>
          
          {confirmationModalData && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Form Information</h3>
                  {!isEditingConfirmationFields && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingConfirmationFields(true)
                        setEditingConfirmationData({
                          doctorName: confirmationModalData.doctorName || '',
                          dateOfBirth: confirmationModalData.dateOfBirth ? format(new Date(confirmationModalData.dateOfBirth), 'yyyy-MM-dd') : '',
                          address: confirmationModalData.address || '',
                        })
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Facilitator/Doctor Name
                      {!isEditingConfirmationFields && (
                        <span className="text-xs font-normal text-gray-500 ml-2">(from defaults, can be overridden)</span>
                      )}
                    </Label>
                    {isEditingConfirmationFields ? (
                      <Input
                        value={editingConfirmationData?.doctorName || ''}
                        onChange={(e) => setEditingConfirmationData(prev => prev ? { ...prev, doctorName: e.target.value } : null)}
                        placeholder="Enter doctor name"
                        className="bg-white"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium">
                        {confirmationModalData.doctorName || (
                          <span className="text-red-600 italic">Not set</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Date of Birth
                    </Label>
                    {isEditingConfirmationFields ? (
                      <Input
                        type="date"
                        value={editingConfirmationData?.dateOfBirth || ''}
                        onChange={(e) => setEditingConfirmationData(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
                        className="bg-white"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium">
                        {confirmationModalData.dateOfBirth ? (
                          format(new Date(confirmationModalData.dateOfBirth), 'MM-dd-yyyy')
                        ) : (
                          <span className="text-red-600 italic">Not set</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Address
                    </Label>
                    {isEditingConfirmationFields ? (
                      <textarea
                        value={editingConfirmationData?.address || ''}
                        onChange={(e) => setEditingConfirmationData(prev => prev ? { ...prev, address: e.target.value } : null)}
                        placeholder="Enter address"
                        rows={3}
                        className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium resize-y"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium min-h-[60px] whitespace-pre-wrap">
                        {confirmationModalData.address || (
                          <span className="text-red-600 italic">Not set</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Once activated, the patient will receive an email notification to complete their signature fields.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmationModal(false)
                setConfirmationModalData(null)
                setIsEditingConfirmationFields(false)
                setEditingConfirmationData(null)
              }}
            >
              Cancel
            </Button>
            {isEditingConfirmationFields ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingConfirmationFields(false)
                    setEditingConfirmationData(null)
                  }}
                  disabled={isSavingConfirmationFields}
                >
                  Cancel Edit
                </Button>
                <Button
                  onClick={async () => {
                    if (confirmationModalData && editingConfirmationData) {
                      // Validate required fields
                      if (!editingConfirmationData.dateOfBirth) {
                        toast.error('Date of birth is required')
                        return
                      }
                      if (!editingConfirmationData.address || editingConfirmationData.address.trim() === '') {
                        toast.error('Address is required')
                        return
                      }
                      
                      setIsSavingConfirmationFields(true)
                      try {
                        const result = await updateIbogaineConsentAdminFields({
                          formId: confirmationModalData.formId,
                          date_of_birth: editingConfirmationData.dateOfBirth,
                          address: editingConfirmationData.address,
                          facilitator_doctor_name: editingConfirmationData.doctorName || undefined,
                        })
                        
                        if (result?.data?.success) {
                          toast.success('Fields updated successfully')
                          // Update confirmation modal data with new values
                          setConfirmationModalData({
                            ...confirmationModalData,
                            doctorName: editingConfirmationData.doctorName || confirmationModalData.doctorName,
                            dateOfBirth: editingConfirmationData.dateOfBirth,
                            address: editingConfirmationData.address,
                          })
                          setIsEditingConfirmationFields(false)
                          setEditingConfirmationData(null)
                        } else {
                          const errorMsg = result?.data?.error || result?.serverError || 'Failed to update fields'
                          toast.error(String(errorMsg))
                        }
                      } catch (error) {
                        toast.error(`Failed to update fields: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      } finally {
                        setIsSavingConfirmationFields(false)
                      }
                    }
                  }}
                  disabled={isSavingConfirmationFields || !editingConfirmationData?.dateOfBirth || !editingConfirmationData?.address?.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSavingConfirmationFields ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={async () => {
                  if (confirmationModalData) {
                    setShowConfirmationModal(false)
                    await performActivation(confirmationModalData.formType, confirmationModalData.formId, true)
                    setConfirmationModalData(null)
                    setIsEditingConfirmationFields(false)
                    setEditingConfirmationData(null)
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Confirm & Activate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Onboarding Form View Content Component
function OnboardingFormViewContent({ 
  formType, 
  formData 
}: { 
  formType: 'onboarding_release' | 'onboarding_outing' | 'onboarding_social_media' | 'onboarding_regulations' | 'onboarding_dissent' | null
  formData: any 
}) {
  if (!formData) return null

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MM-dd-yyyy')
    } catch {
      return dateString
    }
  }

  if (formType === 'onboarding_release') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Iboga Wellness Institute Release Form
        </h1>

        {/* Participant Information */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Participant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Full Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.full_name || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Date of Birth</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formatDate(formData.date_of_birth)}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Phone Number</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.phone_number || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.email || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact Information */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Emergency Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Emergency Contact Full Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.emergency_contact_name || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Emergency Contact Phone</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.emergency_contact_phone || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Emergency Contact Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.emergency_contact_email || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Relationship</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.emergency_contact_relationship || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Acknowledgment and Consent */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Acknowledgment and Consent</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.voluntary_participation ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Voluntary Participation</label>
                <p className="text-sm text-gray-600">I understand that my participation in Iboga Wellness Centers is entirely voluntary and that I can withdraw at any time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.medical_conditions_disclosed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Medical Conditions Disclosed</label>
                <p className="text-sm text-gray-600">I have disclosed all known medical conditions, including physical and mental health issues, to the Iboga Wellness Centers staff.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.risks_acknowledged ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Risks Acknowledged</label>
                <p className="text-sm text-gray-600">I am aware of the potential risks associated with ibogaine and psilocybin therapy.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.medical_supervision_agreed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Medical Supervision</label>
                <p className="text-sm text-gray-600">I agree to follow all guidelines and instructions provided by the medical and support staff.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.confidentiality_understood ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Confidentiality</label>
                <p className="text-sm text-gray-600">I understand that my personal information and any data collected during the retreat will be kept confidential.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.liability_waiver_accepted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Waiver of Liability</label>
                <p className="text-sm text-gray-600">I release Iboga Wellness Centers, its owners, staff, and affiliates from any liability, claims, or demands.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.compliance_agreed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Compliance</label>
                <p className="text-sm text-gray-600">I agree to adhere to the rules and guidelines set forth by Iboga Wellness Centers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Consent to Treatment */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Consent to Treatment</h2>
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {formData.consent_to_treatment ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Clock className="h-5 w-5 text-gray-300" />
              )}
            </div>
            <div>
              <p className="text-base text-gray-900">
                I have read and understood the above information. I acknowledge that I have had the opportunity to ask questions and that my questions have been answered to my satisfaction. I voluntarily agree to participate in Iboga Wellness Centers and consent to the administration of ibogaine and/or psilocybin therapies as outlined.
              </p>
            </div>
          </div>
        </div>

        {/* Signature */}
        {formData.signature_data && (
          <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Signature Date</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formatDate(formData.signature_date)}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-4">Signature</label>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                <img 
                  src={formData.signature_data} 
                  alt="Signature" 
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (formType === 'onboarding_outing') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Iboga Wellness Institute Outing/Transfer Consent
        </h1>

        {/* Participant Information */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Participant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">First Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.first_name || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Last Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.last_name || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Date of Birth</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formatDate(formData.date_of_birth)}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Date of Outing/Transfer</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formatDate(formData.date_of_outing)}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.email || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Consent Declaration */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Consent Declaration</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.protocol_compliance ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Protocol Compliance</label>
                <p className="text-sm text-gray-600">I agree to follow all guidelines and protocols established by the clinic during the outing/transfer period.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.proper_conduct ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Proper Conduct</label>
                <p className="text-sm text-gray-600">I will refrain from any inappropriate behavior that may compromise my well-being or that of others.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.no_harassment ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Prohibition of Inquiries or Harassment</label>
                <p className="text-sm text-gray-600">It is strictly prohibited to harass, intimidate, or ask other patients, staff, or companions about the use, access, or availability of prohibited substances.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.substance_prohibition ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Substance Prohibition</label>
                <p className="text-sm text-gray-600">I will not consume, carry, or request prohibited substances at any time during my outing/transfer.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.financial_penalties_accepted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Financial Penalties</label>
                <p className="text-sm text-gray-600">In case of non-compliance with any of the aforementioned points, I accept that a financial penalty of $150.00 will be applied.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.additional_consequences_understood ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Additional Consequences</label>
                <p className="text-sm text-gray-600">I understand that any violation of these rules may result in the cancellation of future outings/transfers and possible disciplinary measures.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.declaration_read_understood ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Declaration</label>
                <p className="text-sm text-gray-600">I declare that I have read and understood all the conditions mentioned in this form and agree to comply with them without exception.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature */}
        {formData.signature_data && (
          <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Signature Date</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formatDate(formData.signature_date)}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-4">Signature</label>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                <img 
                  src={formData.signature_data} 
                  alt="Signature" 
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // For other forms, use a generic display
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        {formType === 'onboarding_social_media' && 'Patient Social Media Release'}
        {formType === 'onboarding_regulations' && 'Internal Regulations'}
        {formType === 'onboarding_dissent' && 'Letter of Informed Dissent'}
      </h1>

      <div className="space-y-6">
        {Object.entries(formData).map(([key, value]) => {
          // Skip internal fields
          if (['id', 'onboarding_id', 'patient_id', 'is_completed', 'is_activated', 'completed_at', 'created_at', 'updated_at', 'signature_data'].includes(key)) {
            return null
          }
          
          // Format key names
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
          
          // Format values
          let displayValue: React.ReactNode
          if (value === null || value === undefined) {
            displayValue = <span className="text-gray-400">N/A</span>
          } else if (typeof value === 'boolean') {
            displayValue = value ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>Yes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-300" />
                <span>No</span>
              </div>
            )
          } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            displayValue = formatDate(value)
          }
          
          return (
            <div key={key} className="border-b border-gray-100 pb-4">
              <label className="text-base font-medium text-gray-700 block mb-2">
                {formattedKey}
              </label>
              <div className="text-base text-gray-900">
                {displayValue}
              </div>
            </div>
          )
        })}
        
        {/* Show signature if available */}
        {formData.signature_data && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <label className="text-base font-medium text-gray-700 block mb-4">
              Signature
            </label>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
              <img 
                src={formData.signature_data} 
                alt="Signature" 
                className="max-w-full h-auto"
              />
            </div>
            {formData.signature_date && (
              <div className="mt-2">
                <label className="text-sm text-gray-600">Date: {formatDate(formData.signature_date)}</label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Activation Form Fields Component
function ActivationFormFields({
  formType,
  formId,
  initialData,
  onSave,
  onCancel,
  isSaving,
}: {
  formType: 'service' | 'ibogaine'
  formId: string
  initialData: any
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}) {
  const [formData, setFormData] = useState<{
    total_program_fee?: string
    deposit_amount?: string
    deposit_percentage?: string
    remaining_balance?: string
    provider_signature_name?: string
    provider_signature_date?: string
    number_of_days?: string
    date_of_birth?: string
    address?: string
  }>(() => {
    if (formType === 'service') {
      return {
        total_program_fee: initialData?.total_program_fee ? `$${Number(initialData.total_program_fee).toLocaleString()}` : '',
        deposit_amount: initialData?.deposit_amount ? `$${Number(initialData.deposit_amount).toLocaleString()}` : '',
        deposit_percentage: initialData?.deposit_percentage ? String(initialData.deposit_percentage) : '50',
        remaining_balance: initialData?.remaining_balance ? `$${Number(initialData.remaining_balance).toLocaleString()}` : '',
        provider_signature_name: initialData?.provider_signature_name || '',
        provider_signature_date: initialData?.provider_signature_date ? new Date(initialData.provider_signature_date).toISOString().split('T')[0] : '',
        number_of_days: initialData?.number_of_days ? String(initialData.number_of_days) : '',
      }
    } else {
      return {
        // facilitator_doctor_name comes from defaults table, not editable here
        date_of_birth: initialData?.date_of_birth ? new Date(initialData.date_of_birth).toISOString().split('T')[0] : '',
        address: initialData?.address || '',
      }
    }
  })

  // Handle total program fee change - auto-calculate deposit (50% default) and remaining balance
  const handleTotalChange = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && num > 0) {
      // Use existing percentage or default to 50%
      const depositPct = parseFloat(formData.deposit_percentage || '50')
      const depositAmt = (num * depositPct) / 100
      const remaining = num - depositAmt
      
      setFormData({
        ...formData,
        total_program_fee: value,
        deposit_percentage: String(depositPct),
        deposit_amount: `$${depositAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        remaining_balance: `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      })
    } else {
      setFormData({ ...formData, total_program_fee: value })
    }
  }
  

  // Handle deposit amount change - recalculate percentage and remaining balance
  const handleDepositChange = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    const total = parseFloat((formData.total_program_fee || '').replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && !isNaN(total) && total > 0) {
      const pct = (num / total) * 100
      const remaining = total - num
      
      setFormData({
        ...formData,
        deposit_amount: value,
        deposit_percentage: pct.toFixed(2),
        remaining_balance: `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      })
    } else {
      setFormData({ ...formData, deposit_amount: value })
    }
  }

  // Handle deposit percentage change - recalculate deposit amount and remaining balance
  const handleDepositPercentageChange = (value: string) => {
    const pct = parseFloat(value)
    const total = parseFloat((formData.total_program_fee || '').replace(/[^0-9.]/g, ''))
    if (!isNaN(pct) && !isNaN(total) && total > 0 && pct >= 0 && pct <= 100) {
      const depositAmt = (total * pct) / 100
      const remaining = total - depositAmt
      
      setFormData({
        ...formData,
        deposit_percentage: value,
        deposit_amount: `$${depositAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        remaining_balance: `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      })
    } else {
      setFormData({ ...formData, deposit_percentage: value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  if (formType === 'service') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="total_program_fee">Total Program Fee *</Label>
            <Input
              id="total_program_fee"
              value={formData.total_program_fee || ''}
              onChange={(e) => handleTotalChange(e.target.value)}
              placeholder="$0.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Auto-calculates deposit based on percentage</p>
          </div>
          <div>
            <Label htmlFor="deposit_percentage">Deposit Percentage *</Label>
            <Input
              id="deposit_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.deposit_percentage || '50'}
              onChange={(e) => handleDepositPercentageChange(e.target.value)}
              placeholder="50"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Default is 50%</p>
          </div>
          <div>
            <Label htmlFor="deposit_amount">Deposit Amount *</Label>
            <Input
              id="deposit_amount"
              value={formData.deposit_amount || ''}
              onChange={(e) => handleDepositChange(e.target.value)}
              placeholder="$0.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="remaining_balance">Remaining Balance *</Label>
            <Input
              id="remaining_balance"
              value={formData.remaining_balance || ''}
              placeholder="$0.00"
              required
              readOnly
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
          </div>
          <div>
            <Label htmlFor="number_of_days">Number of Days of Program *</Label>
            <Input
              id="number_of_days"
              type="number"
              min="1"
              step="1"
              value={formData.number_of_days || ''}
              onChange={(e) => setFormData({ ...formData, number_of_days: e.target.value })}
              placeholder="14"
              required
            />
          </div>
          <div>
            <Label htmlFor="provider_signature_name">Provider Signature Name *</Label>
            <Input
              id="provider_signature_name"
              value={formData.provider_signature_name || ''}
              onChange={(e) => setFormData({ ...formData, provider_signature_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="provider_signature_date">Provider Signature Date *</Label>
            <Input
              id="provider_signature_date"
              type="date"
              value={formData.provider_signature_date || ''}
              onChange={(e) => setFormData({ ...formData, provider_signature_date: e.target.value })}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save & Activate'
            )}
          </Button>
        </DialogFooter>
      </form>
    )
  } else {
    // Get facilitator name from defaults (included in initialData)
    const facilitatorDoctorName = initialData?.facilitator_doctor_name_from_defaults || 'Iboga Wellness Institute'
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Facilitator/Doctor Name from defaults (read-only) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <Label className="text-base font-medium text-gray-900 mb-2 block">
            Facilitator/Doctor Name (from defaults)
          </Label>
          <div className="h-12 px-4 py-2 border border-blue-300 rounded-md bg-white flex items-center text-gray-900">
            {facilitatorDoctorName}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            This value comes from the form defaults table and cannot be edited here.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date_of_birth">Date of Birth *</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save & Activate'
            )}
          </Button>
        </DialogFooter>
      </form>
    )
  }
}
