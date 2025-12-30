'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPatientProfile, updatePatientDetails, getIntakeFormById, getMedicalHistoryFormById, getServiceAgreementById, getIbogaineConsentFormById } from '@/actions/patient-profile.action'
import { createPartialIntakeForm } from '@/actions/partial-intake.action'
import { sendFormEmail } from '@/actions/send-form-email.action'
import { Loader2, ArrowLeft, Edit2, Save, X, FileText, CheckCircle2, Clock, Send, User, Mail, Phone, Calendar, MapPin, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { format } from 'date-fns'
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
            toast.success(`Intake form link sent to ${result.data.data.recipientEmail}`)
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
          toast.success(`${formName} form link sent to ${result.data.data.recipientEmail}`)
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
                <ServiceAgreementFormView form={viewFormData} />
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
                <IbogaineConsentFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
