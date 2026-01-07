'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPatientProfile, updatePatientDetails, getIntakeFormById, getMedicalHistoryFormById, getServiceAgreementById, getIbogaineConsentFormById, activateServiceAgreement, activateIbogaineConsent } from '@/actions/patient-profile.action'
import { createPartialIntakeForm } from '@/actions/partial-intake.action'
import { sendFormEmail } from '@/actions/send-form-email.action'
import { movePatientToOnboarding } from '@/actions/onboarding-forms.action'
import { Loader2, ArrowLeft, Edit2, Save, X, FileText, CheckCircle2, Clock, Send, User, Mail, Phone, Calendar, MapPin, Eye, Download, ExternalLink, UserPlus } from 'lucide-react'
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
    medicalHistory: 'completed' | 'not_started'
    serviceAgreement: 'completed' | 'not_started'
    ibogaineConsent: 'completed' | 'not_started'
  }
}

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [triggeringForm, setTriggeringForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | null>(null)
  const [profileData, setProfileData] = useState<PatientProfileData | null>(null)
  const [viewingForm, setViewingForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | null>(null)
  const [viewFormData, setViewFormData] = useState<any>(null)
  const [loadingViewForm, setLoadingViewForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | null>(null)
  const [activatingForm, setActivatingForm] = useState<'service' | 'ibogaine' | null>(null)
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [activationModalData, setActivationModalData] = useState<{
    formType: 'service' | 'ibogaine'
    formId: string
    isActivated: boolean
    formData: any
  } | null>(null)
  const [isSavingActivationFields, setIsSavingActivationFields] = useState(false)
  const [isMovingToOnboarding, setIsMovingToOnboarding] = useState(false)
  
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
      // Determine if ID is a partial form ID or intake form ID
      // Try both - the action will figure out which one exists
      const result = await getPatientProfile({ 
        partialFormId: id,
        intakeFormId: id,
      })
      
      console.log('[PatientProfile] Load result:', result)
      
      if (result?.data?.success && result.data.data) {
        const data = result.data.data
        console.log('[PatientProfile] Profile data:', data)
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
        if (!data.provider_signature_name || data.provider_signature_name.trim() === '') missingFields.push('Provider Signature Name')
        if (!data.provider_signature_first_name || data.provider_signature_first_name.trim() === '') missingFields.push('Provider First Name')
        if (!data.provider_signature_last_name || data.provider_signature_last_name.trim() === '') missingFields.push('Provider Last Name')
        if (!data.provider_signature_date) missingFields.push('Provider Signature Date')
        
        return { missing: missingFields.length > 0, formData: data }
      } else {
        const result = await getIbogaineConsentForAdminEdit({ formId })
        if (!result?.data?.data) {
          return { missing: false, formData: null }
        }
        const data = result.data.data
        const missingFields: string[] = []
        
        if (!data.treatment_date) missingFields.push('Treatment Date')
        if (!data.facilitator_doctor_name || data.facilitator_doctor_name.trim() === '') missingFields.push('Facilitator/Doctor Name')
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
    
    // No missing fields, proceed with activation
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
                  {profileData.ibogaineConsentForm?.id && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                        <Label htmlFor="ibogaine-activate" className="text-sm font-medium text-gray-700">
                          {profileData.ibogaineConsentForm?.is_activated ? 'Activated' : 'Inactive'}
                        </Label>
                        {activatingForm === 'ibogaine' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <Switch
                            id="ibogaine-activate"
                            checked={profileData.ibogaineConsentForm?.is_activated || false}
                            disabled={activatingForm !== null || isFormCompleted('ibogaine')}
                            onCheckedChange={(checked) => {
                              const formId = profileData.ibogaineConsentForm?.id
                              console.log('[Switch] Ibogaine Consent toggle:', { formId, checked, ibogaineConsentForm: profileData.ibogaineConsentForm })
                              if (formId) {
                                handleActivateForm('ibogaine', formId, checked)
                              } else {
                                console.error('[Switch] No form ID found:', profileData.ibogaineConsentForm)
                                toast.error('Form ID not found. Please refresh the page.')
                              }
                            }}
                          />
                        )}
                      </div>
                  )}
                  {profileData.formStatuses.ibogaineConsent === 'not_started' ? (
                    <div className="flex gap-2">
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

            {/* Move to Onboarding Button - Only show when all 4 forms are completed */}
            {profileData.formStatuses.intake === 'completed' &&
             profileData.formStatuses.medicalHistory === 'completed' &&
             profileData.formStatuses.serviceAgreement === 'completed' &&
             profileData.formStatuses.ibogaineConsent === 'completed' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-emerald-800">All Forms Completed!</h3>
                      <p className="text-sm text-emerald-600 mt-1">
                        This patient has completed all 4 required forms and is ready to move to the onboarding stage.
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
                      className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                      {isMovingToOnboarding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Moving...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Move to Onboarding
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
                    setActivationModalData(null)
                    // Now activate the form
                    await performActivation(activationModalData.formType, activationModalData.formId, true)
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
    provider_signature_first_name?: string
    provider_signature_last_name?: string
    provider_signature_date?: string
    treatment_date?: string
    facilitator_doctor_name?: string
    date_of_birth?: string
    address?: string
  }>(() => {
    if (formType === 'service') {
      return {
        total_program_fee: initialData?.total_program_fee ? `$${Number(initialData.total_program_fee).toLocaleString()}` : '',
        deposit_amount: initialData?.deposit_amount ? `$${Number(initialData.deposit_amount).toLocaleString()}` : '',
        deposit_percentage: initialData?.deposit_percentage ? String(initialData.deposit_percentage) : '',
        remaining_balance: initialData?.remaining_balance ? `$${Number(initialData.remaining_balance).toLocaleString()}` : '',
        provider_signature_name: initialData?.provider_signature_name || '',
        provider_signature_first_name: initialData?.provider_signature_first_name || '',
        provider_signature_last_name: initialData?.provider_signature_last_name || '',
        provider_signature_date: initialData?.provider_signature_date ? new Date(initialData.provider_signature_date).toISOString().split('T')[0] : '',
      }
    } else {
      return {
        treatment_date: initialData?.treatment_date ? new Date(initialData.treatment_date).toISOString().split('T')[0] : '',
        facilitator_doctor_name: initialData?.facilitator_doctor_name || '',
        date_of_birth: initialData?.date_of_birth ? new Date(initialData.date_of_birth).toISOString().split('T')[0] : '',
        address: initialData?.address || '',
      }
    }
  })

  // Handle total program fee change - auto-calculate deposit (40% default) and remaining balance
  const handleTotalChange = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && num > 0) {
      // Default to 40% deposit
      const depositPct = 40
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
            <p className="text-xs text-gray-500 mt-1">Entering total will auto-calculate 40% deposit</p>
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
            <Label htmlFor="deposit_percentage">Deposit Percentage *</Label>
            <Input
              id="deposit_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.deposit_percentage || ''}
              onChange={(e) => handleDepositPercentageChange(e.target.value)}
              placeholder="0"
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
            <Label htmlFor="provider_signature_name">Provider Signature Name *</Label>
            <Input
              id="provider_signature_name"
              value={formData.provider_signature_name || ''}
              onChange={(e) => setFormData({ ...formData, provider_signature_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="provider_signature_first_name">Provider First Name *</Label>
            <Input
              id="provider_signature_first_name"
              value={formData.provider_signature_first_name || ''}
              onChange={(e) => setFormData({ ...formData, provider_signature_first_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="provider_signature_last_name">Provider Last Name *</Label>
            <Input
              id="provider_signature_last_name"
              value={formData.provider_signature_last_name || ''}
              onChange={(e) => setFormData({ ...formData, provider_signature_last_name: e.target.value })}
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
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="treatment_date">Treatment Date *</Label>
            <Input
              id="treatment_date"
              type="date"
              value={formData.treatment_date || ''}
              onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="facilitator_doctor_name">Facilitator/Doctor Name *</Label>
            <Input
              id="facilitator_doctor_name"
              value={formData.facilitator_doctor_name || ''}
              onChange={(e) => setFormData({ ...formData, facilitator_doctor_name: e.target.value })}
              required
            />
          </div>
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
