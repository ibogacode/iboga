'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPatientProfile, updatePatientDetails, getIntakeFormById, getMedicalHistoryFormById, getServiceAgreementById, getIbogaineConsentFormById, activateServiceAgreement, activateIbogaineConsent, createServiceAgreementForPatient } from '@/actions/patient-profile.action'
import { createPartialIntakeForm } from '@/actions/partial-intake.action'
import { sendFormEmail } from '@/actions/send-form-email.action'
import { sendRequestLabsEmail } from '@/actions/email.action'
import { movePatientToOnboarding, getOnboardingByPatientId, getFormByOnboarding, uploadOnboardingFormDocument, moveToPatientManagement, markOnboardingConsultScheduled } from '@/actions/onboarding-forms.action'
import { getOnboardingMedicalDocumentViewUrl, adminSkipOnboardingMedicalDocument } from '@/actions/onboarding-documents.action'
import { markAsProspect, removeProspectStatus } from '@/actions/prospect-status.action'
import { Loader2, ArrowLeft, Edit2, Save, X, FileText, CheckCircle2, Clock, Send, User, Mail, Phone, Calendar, MapPin, Eye, Download, ExternalLink, UserPlus, FileSignature, Plane, Camera, BookOpen, FileX, Upload, ClipboardList, Stethoscope, LayoutGrid, ChevronDown, FlaskConical, PauseCircle, UserCheck, Heart, TestTube2, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateServiceAgreementAdminFields, updateIbogaineConsentAdminFields, getServiceAgreementForAdminEdit, getIbogaineConsentForAdminEdit, upgradeServiceAgreement } from '@/actions/admin-form-edit.action'
import { PatientIntakeFormView } from '@/components/admin/patient-intake-form-view'
import { MedicalHistoryFormView } from '@/components/admin/medical-history-form-view'
import { ServiceAgreementFormView } from '@/components/admin/service-agreement-form-view'
import { IbogaineConsentFormView } from '@/components/admin/ibogaine-consent-form-view'
import { uploadExistingPatientDocument } from '@/actions/existing-patient.action'
import { useUser } from '@/hooks/use-user.hook'
import { uploadDocumentClient } from '@/lib/supabase/client-storage'
import { PDFDownloadButton } from '@/components/ui/pdf-download-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPatientManagementByPatientId, getDailyFormsByManagementId, getPatientManagementWithForms, dischargePatient } from '@/actions/patient-management.action'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProspectBadge } from '@/components/ui/prospect-badge'
import { recordBillingPayment, getBillingPayments, turnOffBillingReminder, updateBillingPayment } from '@/actions/patient-billing.action'
import { TreatmentDateCalendar } from '@/components/treatment-scheduling/treatment-date-calendar'
import { getTaperingScheduleByOnboarding } from '@/actions/tapering-schedule.action'
import { getClinicalDirectorConsultFormByOnboarding } from '@/actions/clinical-director-consult-form.action'
import type { ClinicalDirectorConsultFormData } from '@/actions/clinical-director-consult-form.types'
import {
  getLeadTasks,
  createLeadTask,
  updateLeadTask,
  updateLeadTaskStatus,
  deleteLeadTask,
  getStaffForAssign,
  type LeadTaskRow,
} from '@/actions/lead-tasks.action'
import { getLeadNote, updateLeadNote } from '@/actions/lead-notes.action'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CLINICAL_DIRECTOR_CONSULT_QUESTION_LABELS: { key: string; label: string }[] = [
  { key: 'psychedelics_before', label: 'Have you used psychedelics before?' },
  { key: 'psychedelics_which', label: 'If yes, which psychedelics have you used?' },
  { key: 'supplements_regular', label: 'What supplements do you take regularly?' },
  { key: 'arrival_date', label: 'Arrival date' },
  { key: 'arrival_time', label: 'Arrival time' },
  { key: 'questions_concerns_prior_arrival', label: 'Questions or concerns prior to arrival?' },
  { key: 'dietary_restrictions_allergies', label: 'Dietary restrictions or allergies?' },
  { key: 'substance_use_caffeine_nicotine_alcohol', label: 'Caffeine, nicotine, alcohol, cannabis, or other substances?' },
  { key: 'substance_use_frequency_amount', label: 'If yes, frequency and amount?' },
  { key: 'diagnosed_conditions', label: 'Diagnosed conditions' },
  { key: 'substances_used_past', label: 'Substances used in the past?' },
  { key: 'substances_started_when', label: 'When did you start using substances?' },
  { key: 'substances_current', label: 'Substances currently using?' },
  { key: 'substances_current_frequency_amount', label: 'Frequency and amount' },
  { key: 'substances_current_last_use_date', label: 'Last use date' },
  { key: 'withdrawal_symptoms_before', label: 'Experienced withdrawal symptoms before?' },
  { key: 'previous_detox_rehab', label: 'Previous detox or rehab?' },
  { key: 'previous_detox_rehab_times', label: 'How many times?' },
]

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
    medicalDocuments?: {
      ekg: { id: string; document_path: string; document_name?: string | null; uploaded_at: string } | null
      bloodwork: { id: string; document_path: string; document_name?: string | null; uploaded_at: string } | null
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
  const [viewFormIframe, setViewFormIframe] = useState<{ url: string; title: string } | null>(null)
  const [loadingViewForm, setLoadingViewForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | 'onboarding_release' | 'onboarding_outing' | 'onboarding_social_media' | 'onboarding_regulations' | 'onboarding_dissent' | null>(null)
  const [activatingForm, setActivatingForm] = useState<'service' | 'ibogaine' | null>(null)
  const [creatingServiceAgreement, setCreatingServiceAgreement] = useState(false)
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [activationModalData, setActivationModalData] = useState<{
    formType: 'service' | 'ibogaine'
    formId: string
    isActivated: boolean
    formData: any
  } | null>(null)
  const [isSavingActivationFields, setIsSavingActivationFields] = useState(false)
  const [upgradeAgreementOpen, setUpgradeAgreementOpen] = useState(false)
  const [upgradeAgreementSaving, setUpgradeAgreementSaving] = useState(false)
  const [upgradeAgreementForm, setUpgradeAgreementForm] = useState<{
    formId: string
    number_of_days: string
    total_program_fee: string
    deposit_amount: string
    deposit_percentage: string
    remaining_balance: string
    payment_method: string
  } | null>(null)
  const [leadTasks, setLeadTasks] = useState<LeadTaskRow[]>([])
  const [loadingLeadTasks, setLoadingLeadTasks] = useState(false)
  const [showAddTaskInline, setShowAddTaskInline] = useState(false)
  const [viewAllTasksOpen, setViewAllTasksOpen] = useState(false)
  const [showAddTaskInDialog, setShowAddTaskInDialog] = useState(false)
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([])
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', due_date: '', assigned_to_id: '' })
  const [savingLeadTask, setSavingLeadTask] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskForm, setEditTaskForm] = useState<{ title: string; description: string; due_date: string; assigned_to_id: string } | null>(null)
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState<string | null>(null)
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
  const [isMovingToManagement, setIsMovingToManagement] = useState(false)
  const [isRequestingLabs, setIsRequestingLabs] = useState(false)
  const [showProspectConfirm, setShowProspectConfirm] = useState(false)
  const [showRemoveProspectConfirm, setShowRemoveProspectConfirm] = useState(false)
  const [isTogglingProspect, setIsTogglingProspect] = useState(false)
  const [openTreatmentDateCalendar, setOpenTreatmentDateCalendar] = useState(false)
  const [loadingOnboarding, setLoadingOnboarding] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | null>(null)
  const [uploadingOnboardingForm, setUploadingOnboardingForm] = useState<{ onboardingId: string; formType: string } | null>(null)
  const [loadingMedicalDocView, setLoadingMedicalDocView] = useState<'ekg' | 'bloodwork' | null>(null)
  const [adminSkippingMedical, setAdminSkippingMedical] = useState<'ekg' | 'bloodwork' | null>(null)
  const [confirmSkipMedical, setConfirmSkipMedical] = useState<'ekg' | 'bloodwork' | null>(null)
  const [markingConsultScheduled, setMarkingConsultScheduled] = useState(false)
  const onboardingFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const onboardingFormContentRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'billing' | 'travel'>('overview')
  const [quickNote, setQuickNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [billingPayments, setBillingPayments] = useState<Array<{
    id: string
    amount_received: number
    is_full_payment: boolean
    payment_received_at: string
    next_reminder_date: string | null
    balance_reminder_sent_at: string | null
  }>>([])
  const [loadingBillingPayments, setLoadingBillingPayments] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [billingForm, setBillingForm] = useState({
    amountReceived: '',
    isFullPayment: false,
    receivedDate: format(new Date(), 'yyyy-MM-dd'),
    receivedTime: format(new Date(), 'HH:mm'),
    nextReminderDate: '',
    sendReminderNow: true,
  })
  const [billingEditRecord, setBillingEditRecord] = useState<{
    id: string
    amount_received: number
    is_full_payment: boolean
    payment_received_at: string
    next_reminder_date: string | null
  } | null>(null)
  const [billingEditForm, setBillingEditForm] = useState({
    amountReceived: '',
    isFullPayment: false,
    receivedDate: '',
    receivedTime: '',
    turnOffReminder: false,
  })
  const [savingBillingUpdate, setSavingBillingUpdate] = useState(false)
  const [turningOffReminderId, setTurningOffReminderId] = useState<string | null>(null)
  const [managementRecord, setManagementRecord] = useState<{
    id: string
    patient_id: string | null
    first_name: string
    last_name: string
    program_type: string
    status: string
    arrival_date: string
    expected_departure_date: string | null
    intake_report_completed?: boolean
    parkinsons_psychological_report_completed?: boolean
    parkinsons_mortality_scales_completed?: boolean
  } | null>(null)
  const [dailyFormsCount, setDailyFormsCount] = useState<number>(0)
  const [dailyFormsBreakdown, setDailyFormsBreakdown] = useState<{ psychological: number; medical: number; sows: number; oows: number }>({ psychological: 0, medical: 0, sows: 0, oows: 0 })
  const [dailyFormsArrays, setDailyFormsArrays] = useState<{
    psychological: Array<{ form_date: string; submitted_at: string | null }>
    medical: Array<{ form_date: string; submitted_at: string | null }>
    sows: Array<{ form_date: string; submitted_at: string | null }>
    oows: Array<{ form_date: string; submitted_at: string | null }>
  }>({ psychological: [], medical: [], sows: [], oows: [] })
  const [oneTimeFormsData, setOneTimeFormsData] = useState<{
    intakeReport: any
    medicalIntakeReport: any
    parkinsonsPsychologicalReport: any
    parkinsonsMortalityScales: any
  } | null>(null)
  const [loadingManagement, setLoadingManagement] = useState(false)
  const [taperingSchedule, setTaperingSchedule] = useState<{
    id: string
    status: 'draft' | 'sent' | 'acknowledged'
    starting_dose: string
    total_days: number
    schedule_days: Array<{ day: number; dose: string; notes?: string; label?: string }>
    additional_notes?: string
    created_at: string
    sent_at?: string
  } | null>(null)
  const [loadingTaperingSchedule, setLoadingTaperingSchedule] = useState(false)
  const [clinicalDirectorConsultForm, setClinicalDirectorConsultForm] = useState<ClinicalDirectorConsultFormData | null>(null)
  const [loadingClinicalDirectorConsultForm, setLoadingClinicalDirectorConsultForm] = useState(false)

  const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'owner'
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'manager'
  const isStaff = isAdmin || profile?.role === 'doctor' || profile?.role === 'psych' || profile?.role === 'nurse'
  
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

  // Load billing payments when service agreement is activated (for Billing tab and right-sidebar payment status)
  useEffect(() => {
    const agreementId = profileData?.serviceAgreement?.id
    const isActivated = profileData?.serviceAgreement?.is_activated
    if (!agreementId || !isActivated) return
    setLoadingBillingPayments(true)
    getBillingPayments({ service_agreement_id: agreementId })
      .then((res) => {
        if (res?.data?.success && res.data.data) {
          setBillingPayments(res.data.data)
        }
      })
      .finally(() => setLoadingBillingPayments(false))
  }, [profileData?.serviceAgreement?.id, profileData?.serviceAgreement?.is_activated])

  // Fetch active patient management (clinical stay) when profile is loaded and user is staff
  useEffect(() => {
    const patientId = profileData?.patient?.id
    if (!patientId || !isStaff) {
      setManagementRecord(null)
      return
    }
    let cancelled = false
    setLoadingManagement(true)
    getPatientManagementByPatientId({ patient_id: patientId })
      .then((result) => {
        if (cancelled) return
        if (result?.data?.success && result.data.data) {
          setManagementRecord(result.data.data as typeof managementRecord)
        } else {
          setManagementRecord(null)
        }
      })
      .catch(() => {
        if (!cancelled) setManagementRecord(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingManagement(false)
      })
    return () => { cancelled = true }
  }, [profileData?.patient?.id, isStaff])

  // Fetch daily forms when management record exists (for Overview & Forms & Docs)
  useEffect(() => {
    if (!managementRecord?.id || !isStaff) {
      setDailyFormsCount(0)
      setDailyFormsBreakdown({ psychological: 0, medical: 0, sows: 0, oows: 0 })
      setDailyFormsArrays({ psychological: [], medical: [], sows: [], oows: [] })
      return
    }
    getDailyFormsByManagementId({ management_id: managementRecord.id })
      .then((result) => {
        if (result?.data?.success && result.data.data) {
          const d = result.data.data as {
            psychological?: Array<{ form_date?: string; submitted_at?: string | null }>
            medical?: Array<{ form_date?: string; submitted_at?: string | null }>
            sows?: Array<{ form_date?: string; submitted_at?: string | null }>
            oows?: Array<{ form_date?: string; submitted_at?: string | null }>
          }
          const toRow = (arr: Array<{ form_date?: string; submitted_at?: string | null }> | undefined) =>
            (arr ?? []).map((f) => ({ form_date: f.form_date ?? '', submitted_at: f.submitted_at ?? null }))
          const psych = d.psychological ?? []
          const med = d.medical ?? []
          const sows = d.sows ?? []
          const oows = d.oows ?? []
          setDailyFormsCount(psych.length + med.length + sows.length + oows.length)
          setDailyFormsBreakdown({ psychological: psych.length, medical: med.length, sows: sows.length, oows: oows.length })
          setDailyFormsArrays({
            psychological: toRow(psych),
            medical: toRow(med),
            sows: toRow(sows),
            oows: toRow(oows),
          })
        } else {
          setDailyFormsCount(0)
          setDailyFormsBreakdown({ psychological: 0, medical: 0, sows: 0, oows: 0 })
          setDailyFormsArrays({ psychological: [], medical: [], sows: [], oows: [] })
        }
      })
      .catch(() => {
        setDailyFormsCount(0)
        setDailyFormsBreakdown({ psychological: 0, medical: 0, sows: 0, oows: 0 })
        setDailyFormsArrays({ psychological: [], medical: [], sows: [], oows: [] })
      })
  }, [managementRecord?.id, isStaff])

  // Fetch one-time forms when management record exists (for Forms & Docs table with dates and View)
  useEffect(() => {
    if (!managementRecord?.id || !isStaff) {
      setOneTimeFormsData(null)
      return
    }
    getPatientManagementWithForms({ management_id: managementRecord.id })
      .then((result) => {
        if (result?.data?.success && result.data.data?.forms) {
          setOneTimeFormsData(result.data.data.forms)
        } else {
          setOneTimeFormsData(null)
        }
      })
      .catch(() => setOneTimeFormsData(null))
  }, [managementRecord?.id, isStaff])

  // Fetch tapering schedule when onboarding exists
  useEffect(() => {
    const onboardingId = profileData?.onboarding?.onboarding?.id
    if (!onboardingId || !isStaff) {
      setTaperingSchedule(null)
      return
    }
    setLoadingTaperingSchedule(true)
    getTaperingScheduleByOnboarding({ onboarding_id: onboardingId })
      .then((result) => {
        if (result?.data?.success && result.data.data) {
          setTaperingSchedule(result.data.data as typeof taperingSchedule)
        } else {
          setTaperingSchedule(null)
        }
      })
      .catch(() => setTaperingSchedule(null))
      .finally(() => setLoadingTaperingSchedule(false))
  }, [profileData?.onboarding?.onboarding?.id, isStaff])

  // Fetch Clinical Director consult form when onboarding exists (shown when consult is scheduled)
  useEffect(() => {
    const onboardingId = profileData?.onboarding?.onboarding?.id
    if (!onboardingId || !isStaff) {
      setClinicalDirectorConsultForm(null)
      return
    }
    setLoadingClinicalDirectorConsultForm(true)
    getClinicalDirectorConsultFormByOnboarding({ onboarding_id: onboardingId })
      .then((result) => {
        if (result?.data?.success && result.data.data) {
          setClinicalDirectorConsultForm(result.data.data)
        } else {
          setClinicalDirectorConsultForm(null)
        }
      })
      .catch(() => setClinicalDirectorConsultForm(null))
      .finally(() => setLoadingClinicalDirectorConsultForm(false))
  }, [profileData?.onboarding?.onboarding?.id, isStaff])

  function loadLeadTasks() {
    if (!id || !isStaff) return
    setLoadingLeadTasks(true)
    getLeadTasks({ leadId: id })
      .then((res) => {
        if (res?.data?.success && res.data.data) setLeadTasks(res.data.data)
        else setLeadTasks([])
      })
      .catch(() => setLeadTasks([]))
      .finally(() => setLoadingLeadTasks(false))
  }

  useEffect(() => {
    loadLeadTasks()
  }, [id, isStaff])

  useEffect(() => {
    if (!isStaff) return
    getStaffForAssign({}).then((res) => {
      if (res?.data?.success && res.data.data) setStaffList(res.data.data)
    })
  }, [isStaff])

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

        // Load quick note for this lead
        getLeadNote({ leadId: id })
          .then((res) => {
            if (res?.data?.success && res.data.data) {
              setQuickNote(res.data.data.notes ?? '')
            }
          })
          .catch(() => {})

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
        toast.success('Client details updated successfully')
        setIsEditing(false)
        await loadPatientProfile()
      } else {
        toast.error(result?.data?.error || 'Failed to update client details')
      }
    } catch (error) {
      console.error('Error updating patient:', error)
      toast.error('Failed to update client details')
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

  async function handleCreateServiceAgreement() {
    if (!profileData) return

    const email = profileData.patient?.email || profileData.partialForm?.email || profileData.intakeForm?.email
    const firstName = profileData.patient?.first_name || profileData.partialForm?.first_name || profileData.intakeForm?.first_name
    const lastName = profileData.patient?.last_name || profileData.partialForm?.last_name || profileData.intakeForm?.last_name
    const phone = profileData.patient?.phone || profileData.partialForm?.phone_number || profileData.intakeForm?.phone_number

    if (!email || !firstName || !lastName) {
      toast.error('Missing client information. Cannot create service agreement.')
      return
    }

    setCreatingServiceAgreement(true)
    try {
      const result = await createServiceAgreementForPatient({
        patientId: profileData.patient?.id,
        patientEmail: email,
        patientFirstName: firstName,
        patientLastName: lastName,
        patientPhone: phone || undefined,
        intakeFormId: profileData.intakeForm?.id,
      })

      if (result?.data?.success) {
        toast.success('Service Agreement created successfully. You can now fill in the details and activate it.')
        await loadPatientProfile()
      } else {
        toast.error(result?.data?.error || 'Failed to create service agreement')
      }
    } catch (error) {
      console.error('Error creating service agreement:', error)
      toast.error('Failed to create service agreement')
    } finally {
      setCreatingServiceAgreement(false)
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

  /** Only show a date when the form is completed (not for auto-created records). */
  function getFormSubmittedDate(formKey: 'intake' | 'medical' | 'service' | 'ibogaine'): string | null {
    if (!profileData) return null
    switch (formKey) {
      case 'intake':
        if (profileData.formStatuses.intake !== 'completed') return null
        const intakeAt = profileData.intakeForm?.created_at || profileData.partialForm?.created_at
        return intakeAt ? format(new Date(intakeAt), 'MMM d') : null
      case 'medical':
        if (profileData.formStatuses.medicalHistory !== 'completed') return null
        const medAt = profileData.medicalHistoryForm?.updated_at || profileData.medicalHistoryForm?.created_at
        return medAt ? format(new Date(medAt), 'MMM d') : null
      case 'service':
        if (profileData.formStatuses.serviceAgreement !== 'completed') return null
        const saAt = profileData.serviceAgreement?.updated_at || profileData.serviceAgreement?.patient_signature_date
        return saAt ? format(new Date(saAt + (saAt.includes('T') ? '' : 'T12:00:00')), 'MMM d') : null
      case 'ibogaine':
        if (profileData.formStatuses.ibogaineConsent !== 'completed') return null
        const ibAt = profileData.ibogaineConsentForm?.updated_at || profileData.ibogaineConsentForm?.signature_date
        return ibAt ? format(new Date(ibAt + (ibAt.includes('T') ? '' : 'T12:00:00')), 'MMM d') : null
      default:
        return null
    }
  }

  /** Only show a date when the onboarding form is completed (not for auto-created records). */
  function getOnboardingFormSubmittedDate(formKey: 'releaseForm' | 'outingForm' | 'regulationsForm'): string | null {
    if (!profileData) return null
    const ob = profileData.onboarding?.onboarding
    const forms = profileData.onboarding?.forms
    if (!ob || !forms) return null
    const completed =
      formKey === 'releaseForm' ? !!ob.release_form_completed
      : formKey === 'outingForm' ? !!ob.outing_consent_completed
      : !!ob.internal_regulations_completed
    if (!completed) return null
    const f = forms[formKey]
    const at = f?.updated_at || f?.created_at
    return at ? format(new Date(at), 'MMM d') : null
  }

  function getOneTimeFormSubmittedDate(formKey: 'intakeReport' | 'medicalIntakeReport' | 'parkinsonsPsychologicalReport' | 'parkinsonsMortalityScales'): string | null {
    const forms = oneTimeFormsData
    if (!forms) return null
    const f = forms[formKey]
    const at = (f as any)?.submitted_at ?? (f as any)?.completed_at ?? (f as any)?.updated_at ?? (f as any)?.created_at
    return at ? format(new Date(at + (typeof at === 'string' && !at.includes('T') ? 'T12:00:00' : '')), 'MMM d, yyyy • h:mm a') : null
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
  const initials = (() => {
    const first = (patient?.first_name || '').trim()[0] || ''
    const last = (patient?.last_name || '').trim()[0] || ''
    if (first || last) return `${first}${last}`.toUpperCase()
    return (patient?.email || 'U').charAt(0).toUpperCase()
  })()
  const sourceLabel =
    patient?.source === 'admin_owner_added' ? 'Admin/Owner added' : 'Public'
  const currentStageLabel = managementRecord
    ? 'Management'
    : profileData.onboarding
    ? 'Onboarding'
    : 'Pipeline'
  const patientProgramType =
    managementRecord?.program_type ??
    profileData?.serviceAgreement?.program_type ??
    profileData?.intakeForm?.program_type ??
    null
  const patientProgramLabel = patientProgramType ? formatProgramLabel(patientProgramType) : '—'
  const leadId = patient?.id ? `L-${patient.id.slice(0, 8).toUpperCase().replace(/-/g, '')}` : '—'
  const inquiryDate =
    profileData.intakeForm?.created_at || profileData.partialForm?.created_at
      ? format(
          new Date((profileData.intakeForm?.created_at || profileData.partialForm?.created_at) as string),
          'MMM dd, yyyy'
        )
      : '—'
  const onboardingTreatmentDate = profileData?.onboarding?.onboarding?.treatment_date
  const plannedArrival =
    managementRecord?.expected_departure_date
      ? format(new Date(managementRecord.expected_departure_date + 'T00:00:00'), 'MMM dd, yyyy')
      : managementRecord?.arrival_date
        ? format(new Date(managementRecord.arrival_date + 'T00:00:00'), 'MMM dd, yyyy')
        : onboardingTreatmentDate
          ? format(new Date(onboardingTreatmentDate + 'T00:00:00'), 'MMM dd, yyyy')
          : '—'
  const serviceAgreementNeedsActivation =
    profileData.serviceAgreement?.id && !profileData.serviceAgreement?.is_activated

  const allPreArrivalFormsComplete =
    profileData.formStatuses.intake === 'completed' &&
    profileData.formStatuses.medicalHistory === 'completed' &&
    profileData.formStatuses.serviceAgreement === 'completed' &&
    profileData.formStatuses.ibogaineConsent === 'completed'
  const onboardingRecord = profileData?.onboarding?.onboarding
  const allOnboardingFormsComplete =
    !!onboardingRecord?.release_form_completed &&
    !!onboardingRecord?.outing_consent_completed &&
    !!onboardingRecord?.internal_regulations_completed
  const hasArrivalDateAssigned = !!onboardingRecord?.treatment_date
  const canMoveToManagement =
    !!profileData.onboarding && allOnboardingFormsComplete && hasArrivalDateAssigned
  const isInActiveManagement = managementRecord?.status === 'active'
  const isReadyForNextStage =
    profileData.onboarding || allPreArrivalFormsComplete || isInActiveManagement
  const nextStageLabel =
    isInActiveManagement
      ? 'Discharge'
      : !profileData.onboarding && allPreArrivalFormsComplete
        ? 'Onboarding'
        : profileData.onboarding && canMoveToManagement
          ? 'Management'
          : null
  const moveStageNeedsAction = isReadyForNextStage && !!nextStageLabel

  const formsCompletedCount = [
    profileData.formStatuses.intake,
    profileData.formStatuses.medicalHistory,
    profileData.formStatuses.serviceAgreement,
    profileData.formStatuses.ibogaineConsent,
  ].filter((s) => s === 'completed').length
  const readinessScore = Math.round((formsCompletedCount / 4) * 100)
  const lastUpdatedAt =
    patient?.updated_at || profileData?.intakeForm?.updated_at || profileData?.partialForm?.updated_at
  const lastUpdatedLabel = lastUpdatedAt
    ? format(new Date(lastUpdatedAt), 'MMM dd, yyyy • h:mm a')
    : '—'

  function formatProgramLabel(programType: string) {
    const map: Record<string, string> = {
      neurological: 'Neurological',
      mental_health: 'Mental Health',
      addiction: 'Addiction',
    }
    return map[programType] || programType
  }

  return (
    <div className="p-6">
      {/* Header: avatar + name/contact (same height as avatar) | actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-h-[96px]">
          <Avatar className="h-24 w-24 shrink-0 rounded-full border-2 border-gray-200 bg-gray-100">
            <AvatarImage src={patient?.avatar_url || undefined} alt={displayName} className="object-cover" />
            <AvatarFallback className="rounded-full bg-gray-200 text-gray-600 text-2xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center min-h-[96px] py-1">
            <h1
              style={{
                fontFamily: 'var(--font-instrument-serif), serif',
                fontSize: '28px',
                fontWeight: 600,
                color: 'black',
                lineHeight: 1.2,
              }}
            >
              {displayName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {[patient?.email || 'No email', patient?.phone || 'No phone', `Source: ${sourceLabel}`].join(' · ')}
            </p>
            {patient?.is_prospect && (
              <div className="mt-2">
                <ProspectBadge />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {patient?.id && isAdminOrOwner && (
            <>
              {patient?.is_prospect ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800"
                  disabled={isTogglingProspect}
                  onClick={() => setShowRemoveProspectConfirm(true)}
                >
                  {isTogglingProspect ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Remove prospect status
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-gray-100 hover:bg-gray-200 border-gray-200"
                  disabled={isTogglingProspect}
                  onClick={() => setShowProspectConfirm(true)}
                >
                  {isTogglingProspect ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                  Mark as Prospect
                </Button>
              )}
              <AlertDialog open={showProspectConfirm} onOpenChange={setShowProspectConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark as Prospect?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will stop all reminder emails (login, form, onboarding, and billing) for this profile. You can remove prospect status later to resume reminders.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        if (!patient?.id) return
                        setIsTogglingProspect(true)
                        try {
                          await markAsProspect(patient.id)
                          toast.success('Profile marked as prospect. No reminder emails will be sent.')
                          setShowProspectConfirm(false)
                          await loadPatientProfile()
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed to mark as prospect')
                        } finally {
                          setIsTogglingProspect(false)
                        }
                      }}
                    >
                      Mark as Prospect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog open={showRemoveProspectConfirm} onOpenChange={setShowRemoveProspectConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove prospect status?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Reminder emails (login, form, onboarding, billing) will be sent again according to existing rules.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        if (!patient?.id) return
                        setIsTogglingProspect(true)
                        try {
                          await removeProspectStatus(patient.id)
                          toast.success('Prospect status removed. Reminder emails will resume.')
                          setShowRemoveProspectConfirm(false)
                          await loadPatientProfile()
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed to remove prospect status')
                        } finally {
                          setIsTogglingProspect(false)
                        }
                      }}
                    >
                      Remove prospect status
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <AlertDialog open={!!confirmSkipMedical} onOpenChange={(open) => { if (!open) setConfirmSkipMedical(null) }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark {confirmSkipMedical === 'ekg' ? 'EKG' : 'Bloodwork'} as skipped?</AlertDialogTitle>
                <AlertDialogDescription>
                  The client will see this item as skipped. Tests will be done at the institute after arrival (free of cost). If results show they are not ready for treatment, they may need to wait 2–3 extra days at the institute; extra days will be charged. Omar will be notified to create the tapering schedule if both EKG and bloodwork are now complete.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (!confirmSkipMedical || !profileData?.onboarding?.onboarding?.id) return
                    setAdminSkippingMedical(confirmSkipMedical)
                    try {
                      const res = await adminSkipOnboardingMedicalDocument({
                        onboarding_id: profileData.onboarding.onboarding.id,
                        document_type: confirmSkipMedical,
                      })
                      if (res?.data?.success) {
                        toast.success(confirmSkipMedical === 'ekg' ? 'EKG marked as skipped' : 'Bloodwork marked as skipped')
                        setConfirmSkipMedical(null)
                        loadPatientProfile()
                      } else {
                        toast.error(res?.data?.error || 'Failed to mark as skipped')
                      }
                    } finally {
                      setAdminSkippingMedical(null)
                    }
                  }}
                >
                  Yes, mark as skipped
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 relative bg-gray-100 hover:bg-gray-200 border-gray-200 disabled:opacity-50 disabled:pointer-events-none"
                disabled={!isReadyForNextStage}
                title={!isReadyForNextStage ? 'Complete all pre-arrival forms (Intake, Medical History, Service Agreement, Ibogaine Consent) to move stage' : undefined}
              >
                Move Stage
                <ChevronDown className="h-4 w-4" />
                {moveStageNeedsAction && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    !
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {nextStageLabel === 'Onboarding' && (
                <DropdownMenuItem
                  onClick={() => {
                    const intakeFormId = profileData.intakeForm?.id
                    const partialFormId = profileData.partialForm?.id
                    movePatientToOnboarding({
                      intake_form_id: intakeFormId || undefined,
                      partial_intake_form_id: partialFormId || undefined,
                    }).then((result) => {
                      if (result?.data?.success) {
                        toast.success(result.data.data?.message || 'Moved to onboarding')
                        loadPatientProfile()
                      } else {
                        toast.error(result?.data?.error || 'Failed to move to onboarding')
                      }
                    })
                  }}
                >
                  Onboarding
                </DropdownMenuItem>
              )}
              {nextStageLabel === 'Management' && (
                <DropdownMenuItem
                  disabled={isMovingToManagement}
                  onClick={async () => {
                    if (managementRecord) {
                      router.push(`/patient-management/${managementRecord.id}/daily-forms`)
                      return
                    }
                    if (canMoveToManagement && profileData?.onboarding?.onboarding?.id) {
                      setIsMovingToManagement(true)
                      try {
                        const result = await moveToPatientManagement({
                          onboarding_id: profileData.onboarding.onboarding.id,
                        })
                        if (result?.data?.success) {
                          toast.success(result.data.message ?? 'Moved to Management')
                          await loadPatientProfile()
                          const res = await getPatientManagementByPatientId({
                            patient_id: profileData.patient?.id,
                          })
                          const newRecord = res?.data?.success ? res.data.data : null
                          if (newRecord?.id) {
                            setManagementRecord(newRecord as unknown as typeof managementRecord)
                            router.push(`/patient-management/${(newRecord as { id: string }).id}/daily-forms`)
                          }
                        } else {
                          toast.error(result?.data?.error ?? 'Failed to move to Management')
                        }
                      } finally {
                        setIsMovingToManagement(false)
                      }
                      return
                    }
                    toast.info('Complete onboarding forms and assign arrival date to move to Management.')
                    router.push('/patient-management')
                  }}
                >
                  {isMovingToManagement ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Management'
                  )}
                </DropdownMenuItem>
              )}
              {nextStageLabel === 'Discharge' && managementRecord && (
                <DropdownMenuItem
                  onClick={() => {
                    dischargePatient({ management_id: managementRecord.id }).then((result) => {
                      if (result?.data?.success) {
                        toast.success(result.data.message ?? 'Patient discharged')
                        getPatientManagementByPatientId({ patient_id: profileData.patient?.id }).then((res) => {
                          if (res?.data?.success && res.data.data) setManagementRecord(res.data.data as typeof managementRecord)
                        })
                      } else {
                        toast.error(result?.data?.error ?? 'Failed to discharge')
                      }
                    })
                  }}
                >
                  Discharge
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-gray-100 hover:bg-gray-200 border-gray-200"
            disabled={
              isRequestingLabs ||
              !(
                profileData.patient?.email ||
                profileData.intakeForm?.email ||
                profileData.partialForm?.email
              )
            }
            onClick={async () => {
              const email =
                profileData.patient?.email ||
                profileData.intakeForm?.email ||
                profileData.partialForm?.email
              const firstName =
                profileData.patient?.first_name ||
                profileData.intakeForm?.first_name ||
                profileData.partialForm?.first_name ||
                ''
              const lastName =
                profileData.patient?.last_name ||
                profileData.intakeForm?.last_name ||
                profileData.partialForm?.last_name ||
                ''
              if (!email) {
                toast.error('No email on file for this patient.')
                return
              }
              setIsRequestingLabs(true)
              const result = await sendRequestLabsEmail(email, firstName, lastName)
              setIsRequestingLabs(false)
              if (result.success) {
                toast.success('Request Labs email sent to client.')
              } else {
                toast.error(result.error ?? 'Failed to send email.')
              }
            }}
          >
            {isRequestingLabs ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            Request Labs
          </Button>
          {isAdminOrOwner && profileData.serviceAgreement?.id && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 relative bg-gray-100 hover:bg-gray-200 border-gray-200"
              disabled={!profileData.serviceAgreement?.id}
              onClick={() => {
                const sa = profileData.serviceAgreement
                if (!sa) return
                if (!sa.is_activated) {
                  handleActivateForm('service', sa.id, true)
                } else {
                  setUpgradeAgreementForm({
                    formId: sa.id,
                    number_of_days: String(sa.number_of_days ?? ''),
                    total_program_fee: String(sa.total_program_fee ?? ''),
                    deposit_amount: String(sa.deposit_amount ?? ''),
                    deposit_percentage: String(sa.deposit_percentage ?? ''),
                    remaining_balance: String(sa.remaining_balance ?? ''),
                    payment_method: sa.payment_method ?? '',
                  })
                  setUpgradeAgreementOpen(true)
                }
              }}
            >
              {profileData.serviceAgreement?.is_activated ? 'Upgrade Agreement' : 'Activate Service Agreement'}
              {!profileData.serviceAgreement?.is_activated && serviceAgreementNeedsActivation && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </Button>
          )}
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2" size="sm">
              <Edit2 className="h-4 w-4" />
              Edit Details
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  loadPatientProfile()
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
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
            </>
          )}
        </div>
      </div>

      {/* Left sidebar card (Figma Frame 5871) + main content */}
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-[311px] shrink-0">
          <div className="rounded-2xl border border-[#D6D2C8] bg-white p-5 flex flex-col gap-5 shadow-sm">
            {/* Avatar + Name + Lead ID */}
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0 rounded-full border border-[#D8D9D4] bg-[#D8D9D4]">
                <AvatarImage src={patient?.avatar_url || undefined} alt={displayName} className="object-cover" />
                <AvatarFallback className="rounded-full bg-[#D8D9D4] text-[#898C81] text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col justify-center gap-0.5 min-w-0">
                <p className="text-base text-[#2B2820] font-normal truncate">{displayName}</p>
                <p className="text-xs text-[#777777]">Lead ID: {leadId}</p>
              </div>
            </div>
            {/* Current Stage + Patient Program side by side */}
            <div className="flex flex-wrap items-stretch gap-4">
              <div className="flex flex-col gap-2.5">
                <p className="text-xs text-[#777777]">Current Stage</p>
                <span className="inline-flex items-center justify-center self-start px-3 py-1.5 rounded-[10px] text-sm bg-[#FFFBD4] text-[#F59E0B]">
                  {currentStageLabel}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <p className="text-xs text-[#777777]">Patient Program</p>
<span className="inline-flex items-center justify-center self-start px-3 py-1.5 rounded-[10px] text-sm bg-[#6E7A46]/15 text-[#6E7A46]">
                {patientProgramLabel}
              </span>
              </div>
            </div>
            {/* Key Dates */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs text-[#777777]">Key Dates</p>
              <div className="rounded-[10px] border border-[#D6D2C8] bg-[#F5F4F0] p-3.5 flex flex-col gap-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-[#777777]">Inquiry</span>
                  <span className="text-xs text-[#2B2820]">{inquiryDate}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-[#777777]">Planned Arrival</span>
                  {profileData?.onboarding && isStaff && profileData?.onboarding?.onboarding?.id ? (
                    <div className="flex items-center gap-1.5">
                      {onboardingTreatmentDate ? (
                        <>
                          <span className="text-sm text-[#2B2820]">{plannedArrival}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-[#6E7A46] hover:bg-[#6E7A46]/10"
                            onClick={() => setOpenTreatmentDateCalendar(true)}
                          >
                            Change
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-[#D6D2C8] text-[#2B2820]"
                          onClick={() => setOpenTreatmentDateCalendar(true)}
                        >
                          <Calendar className="h-3 w-3" />
                          Set arrival date
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-[#2B2820]">{plannedArrival}</span>
                  )}
                </div>
              </div>
            </div>
            {/* Quick Note */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs text-[#777777]">Quick Note</p>
              <textarea
                placeholder="Add a note about this lead..."
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className="min-h-[106px] w-full rounded-[10px] border border-[#D6D2C8] bg-[#F5F4F0] px-3.5 py-3.5 text-xs text-[#2B2820] placeholder:text-[#777777] focus:outline-none focus:ring-2 focus:ring-[#6E7A46]/20 focus:border-[#6E7A46] resize-none"
                rows={4}
              />
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="flex-1 rounded-3xl bg-[#6E7A46] hover:bg-[#5c6840] text-white text-sm shadow-sm"
                  disabled={savingNote}
                  onClick={async () => {
                    setSavingNote(true)
                    const result = await updateLeadNote({ leadId: id, notes: quickNote })
                    setSavingNote(false)
                    if (result?.data?.success) {
                      toast.success('Note saved')
                    } else {
                      toast.error(result?.data?.error ?? 'Failed to save note')
                    }
                  }}
                >
                  {savingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Note'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-3xl border-[#D6D2C8] bg-white text-sm text-[#777777] hover:bg-[#F5F4F0]"
                  onClick={() => setViewAllTasksOpen(true)}
                >
                  Add task
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
      <div className="rounded-2xl border border-[#D6D2C8] bg-white p-5 shadow-sm">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-7" style={{ minWidth: 0 }}>
        <TabsList className="h-10 w-full max-w-full justify-between rounded-full bg-[#F5F4F0] p-1">
          <TabsTrigger
            value="overview"
            className="rounded-full px-4 text-sm data-[state=active]:bg-white data-[state=active]:text-[#6E7A46] data-[state=active]:shadow-md data-[state=inactive]:text-[#090909]"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="rounded-full px-4 text-sm data-[state=active]:bg-white data-[state=active]:text-[#6E7A46] data-[state=active]:shadow-md data-[state=inactive]:text-[#090909]"
          >
            Forms & Docs
          </TabsTrigger>
          {isAdminOrOwner && (
            <TabsTrigger
              value="billing"
              disabled={!profileData.serviceAgreement?.is_activated}
              title={!profileData.serviceAgreement?.is_activated ? 'Activate Service Agreement to access Billing' : undefined}
              className="rounded-full px-4 text-sm data-[state=active]:bg-white data-[state=active]:text-[#6E7A46] data-[state=active]:shadow-md data-[state=inactive]:text-[#090909] disabled:opacity-50 disabled:pointer-events-none"
            >
              Billing
            </TabsTrigger>
          )}
          <TabsTrigger
            value="travel"
            className="rounded-full px-4 text-sm data-[state=active]:bg-white data-[state=active]:text-[#6E7A46] data-[state=active]:shadow-md data-[state=inactive]:text-[#090909]"
          >
            Travel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          {/* Activity section (Figma 727-12856) */}
          <div className="flex items-center gap-2.5 mb-6">
            <h3 className="text-lg font-medium text-black">Activity</h3>
            <div className="h-[15px] w-px bg-[#6B7280]" />
            <p className="text-sm text-[#777777]">Showing All Activity</p>
          </div>
          <div className="relative flex flex-col gap-0">
            {/* Timeline items */}
            {(() => {
              const appSubmittedAt = profileData.intakeForm?.created_at || profileData.partialForm?.created_at
              const activityItems: Array<{
                id: string
                title: string
                time: string
                body: string
                bullets?: string[]
                formRows?: { label: string; completed: boolean; completedAt: string | null }[]
                consultRow?: { scheduledAt: string | null; formData?: ClinicalDirectorConsultFormData | null }
                isNext?: boolean
                isPending?: boolean
                managementSection?: boolean
                managementOneTimeRows?: { label: string; completed: boolean; submittedAt: string | null }[]
                managementDailyCounts?: { psychological: number; medical: number; sows: number; oows: number }
                managementId?: string
              }> = []
              if (appSubmittedAt) {
                activityItems.push({
                  id: 'app',
                  title: 'Application submitted',
                  time:
                    profileData.formStatuses.intake === 'completed'
                      ? format(new Date(appSubmittedAt), 'MMM dd, yyyy • h:mm a')
                      : '—',
                  body: patient?.source === 'admin_owner_added' ? 'Lead created by admin/owner.' : 'Lead created from Direct Public Application form.',
                })
              }
              if (formsCompletedCount >= 1) {
                const applicationCompletedAt = profileData.formStatuses.intake === 'completed' ? (profileData.intakeForm?.created_at || profileData.partialForm?.created_at) : null
                const formRows: { label: string; completed: boolean; completedAt: string | null }[] = [
                  {
                    label: 'Application',
                    completed: profileData.formStatuses.intake === 'completed',
                    completedAt: applicationCompletedAt ? format(new Date(applicationCompletedAt), 'MMM d, yyyy • h:mm a') : null,
                  },
                  {
                    label: 'Medical Health History',
                    completed: profileData.formStatuses.medicalHistory === 'completed',
                    completedAt:
                      profileData.formStatuses.medicalHistory === 'completed' &&
                      (profileData.medicalHistoryForm?.updated_at || profileData.medicalHistoryForm?.created_at)
                        ? format(new Date(profileData.medicalHistoryForm.updated_at || profileData.medicalHistoryForm.created_at), 'MMM d, yyyy • h:mm a')
                        : null,
                  },
                  {
                    label: 'Service Agreement',
                    completed: profileData.formStatuses.serviceAgreement === 'completed',
                    completedAt:
                      profileData.formStatuses.serviceAgreement === 'completed' &&
                      (profileData.serviceAgreement?.updated_at || profileData.serviceAgreement?.patient_signature_date)
                        ? profileData.serviceAgreement.updated_at
                          ? format(new Date(profileData.serviceAgreement.updated_at), 'MMM d, yyyy • h:mm a')
                          : profileData.serviceAgreement.patient_signature_date
                            ? format(new Date(profileData.serviceAgreement.patient_signature_date + 'T12:00:00'), 'MMM d, yyyy')
                            : null
                        : null,
                  },
                  {
                    label: 'Ibogaine Consent',
                    completed: profileData.formStatuses.ibogaineConsent === 'completed',
                    completedAt:
                      profileData.formStatuses.ibogaineConsent === 'completed' &&
                      (profileData.ibogaineConsentForm?.updated_at || profileData.ibogaineConsentForm?.signature_date)
                        ? profileData.ibogaineConsentForm.updated_at
                          ? format(new Date(profileData.ibogaineConsentForm.updated_at), 'MMM d, yyyy • h:mm a')
                          : profileData.ibogaineConsentForm.signature_date
                            ? format(new Date(profileData.ibogaineConsentForm.signature_date + 'T12:00:00'), 'MMM d, yyyy')
                            : null
                        : null,
                  },
                ]
                const completedFormRows = formRows.filter((r) => r.completed)
                const lastFormCompletedAt = formsCompletedCount === 4 ? formRows[3].completedAt : null
                activityItems.push({
                  id: 'forms',
                  title: `Forms completed (${formsCompletedCount}/4)`,
                  time: lastFormCompletedAt ?? (inquiryDate !== '—' ? `${inquiryDate} • —` : '—'),
                  body: formsCompletedCount === 4 ? 'All required forms completed.' : `${completedFormRows.length} of 4 forms completed.`,
                  formRows,
                })
              }
              if (profileData.onboarding?.onboarding) {
                const ob = profileData.onboarding.onboarding
                const forms = profileData.onboarding.forms
                const consultScheduledAt = (ob as { consult_scheduled_at?: string | null }).consult_scheduled_at
                const taperingComplete = taperingSchedule && (taperingSchedule.status === 'sent' || taperingSchedule.status === 'acknowledged')
                const onboardingFormRows: { label: string; completed: boolean; completedAt: string | null }[] = [
                  {
                    label: 'Release Form',
                    completed: !!ob.release_form_completed,
                    completedAt:
                      !!ob.release_form_completed && (forms?.releaseForm?.updated_at || forms?.releaseForm?.created_at)
                        ? format(new Date(forms.releaseForm.updated_at || forms.releaseForm.created_at), 'MMM d, yyyy • h:mm a')
                        : null,
                  },
                  {
                    label: 'Outing/Transfer Consent',
                    completed: !!ob.outing_consent_completed,
                    completedAt:
                      !!ob.outing_consent_completed && (forms?.outingForm?.updated_at || forms?.outingForm?.created_at)
                        ? format(new Date(forms.outingForm.updated_at || forms.outingForm.created_at), 'MMM d, yyyy • h:mm a')
                        : null,
                  },
                  {
                    label: 'Internal Regulations',
                    completed: !!ob.internal_regulations_completed,
                    completedAt:
                      !!ob.internal_regulations_completed && (forms?.regulationsForm?.updated_at || forms?.regulationsForm?.created_at)
                        ? format(new Date(forms.regulationsForm.updated_at || forms.regulationsForm.created_at), 'MMM d, yyyy • h:mm a')
                        : null,
                  },
                  {
                    label: 'Tapering Schedule',
                    completed: !!taperingComplete,
                    completedAt:
                      taperingComplete && taperingSchedule?.sent_at
                        ? format(new Date(taperingSchedule.sent_at), 'MMM d, yyyy • h:mm a')
                        : null,
                  },
                ]
                const onboardingCount = onboardingFormRows.filter((r) => r.completed).length
                const lastOnboardingCompletedAt = onboardingCount === 4 ? (onboardingFormRows[3].completedAt ?? onboardingFormRows[2].completedAt) : null
                activityItems.push({
                  id: 'onboarding',
                  title: `Onboarding (${onboardingCount}/4)`,
                  time: lastOnboardingCompletedAt ?? '',
                  body: onboardingCount === 4 ? 'All onboarding forms completed.' : `${onboardingCount} of 4 onboarding forms completed.`,
                  formRows: onboardingFormRows,
                  consultRow: { scheduledAt: consultScheduledAt ?? null, formData: clinicalDirectorConsultForm ?? null },
                })
              }
              if (managementRecord) {
                const arrivalDate = new Date(managementRecord.arrival_date + 'T12:00:00')
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const arrivalDay = new Date(arrivalDate)
                arrivalDay.setHours(0, 0, 0, 0)
                const hasArrived = arrivalDay <= today
                activityItems.push({
                  id: 'arrival',
                  title: 'Arrival',
                  time: format(arrivalDate, 'MMM d, yyyy'),
                  body: hasArrived
                    ? 'Client arrived at the institute.'
                    : 'Client is about to arrive at the institute.',
                })
                const mid = managementRecord.id
                const oneTimeRows = managementRecord.program_type === 'neurological'
                  ? [
                      { label: "Parkinson's Psychological Report", completed: !!managementRecord.parkinsons_psychological_report_completed || !!getOneTimeFormSubmittedDate('parkinsonsPsychologicalReport'), submittedAt: getOneTimeFormSubmittedDate('parkinsonsPsychologicalReport'), viewPath: `/patient-management/${mid}/one-time-forms/parkinsons-psychological` },
                      { label: "Parkinson's Mortality Scales", completed: !!managementRecord.parkinsons_mortality_scales_completed || !!getOneTimeFormSubmittedDate('parkinsonsMortalityScales'), submittedAt: getOneTimeFormSubmittedDate('parkinsonsMortalityScales'), viewPath: `/patient-management/${mid}/one-time-forms/parkinsons-mortality` },
                      { label: 'Medical Intake Report', completed: !!(oneTimeFormsData?.medicalIntakeReport as any)?.is_completed || !!getOneTimeFormSubmittedDate('medicalIntakeReport'), submittedAt: getOneTimeFormSubmittedDate('medicalIntakeReport'), viewPath: `/patient-management/${mid}/one-time-forms/medical-intake-report` },
                    ]
                  : [
                      { label: 'Psychological Intake Report', completed: !!managementRecord.intake_report_completed || !!getOneTimeFormSubmittedDate('intakeReport'), submittedAt: getOneTimeFormSubmittedDate('intakeReport'), viewPath: `/patient-management/${mid}/one-time-forms/intake-report` },
                      { label: 'Medical Intake Report', completed: !!(oneTimeFormsData?.medicalIntakeReport as any)?.is_completed || !!getOneTimeFormSubmittedDate('medicalIntakeReport'), submittedAt: getOneTimeFormSubmittedDate('medicalIntakeReport'), viewPath: `/patient-management/${mid}/one-time-forms/medical-intake-report` },
                    ]
                const managementDailyCounts = {
                  psychological: dailyFormsArrays.psychological.length,
                  medical: dailyFormsArrays.medical.length,
                  sows: dailyFormsArrays.sows.length,
                  oows: dailyFormsArrays.oows.length,
                }
                activityItems.push({
                  id: 'management',
                  title: 'Management',
                  time: '',
                  body: '',
                  managementSection: true,
                  managementOneTimeRows: oneTimeRows.map(({ label, completed, submittedAt }) => ({ label, completed, submittedAt })),
                  managementDailyCounts,
                  managementId: mid,
                })
              }
              return activityItems.map((item, idx) => (
                <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`mt-2 h-3 w-3 shrink-0 rounded-full border-2 ${
                        item.isNext ? 'border-[#CAE081] bg-white shadow-[0_0_0_2px_rgba(208,135,0,1)]' : item.isPending ? 'border-white bg-[#99A1AF]' : 'border-white bg-[#0A0A0A]'
                      }`}
                    />
                    {idx < activityItems.length - 1 && (
                      <div className="mt-0.5 w-0.5 flex-1 min-h-[60px] bg-[#E5E7EB]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-0">
                    <div className="rounded-[14px] bg-[#F5F4F0] p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h4 className="text-base font-semibold text-[#0A0A0A]">{item.title}</h4>
                        {item.time && <span className="text-sm text-[#777777]">{item.time}</span>}
                      </div>
                      {item.body ? <p className="text-sm text-[#777777]">{item.body}</p> : null}
                      {item.managementSection && item.managementId && (
                        <div className="mt-3 space-y-4">
                          {item.managementOneTimeRows && item.managementOneTimeRows.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-[#777777] mb-1.5">One-time forms</p>
                              <ul className="space-y-2 text-sm text-[#2B2820]">
                                {item.managementOneTimeRows.map((row: { label: string; completed: boolean; submittedAt: string | null }, i: number) => (
                                  <li key={i} className="flex flex-wrap items-center gap-2">
                                    {row.completed ? (
                                      <>
                                        <span className="text-[#10B981]">✓</span>
                                        <span>{row.label}</span>
                                        <span className="text-[#777777]">— {row.submittedAt ?? '—'}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>—</span>
                                        <span>{row.label}</span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Incomplete</span>
                                      </>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.managementDailyCounts && (
                            <div>
                              <p className="text-sm font-medium text-[#777777] mb-1.5">Daily forms</p>
                              <ul className="space-y-1 text-sm text-[#2B2820]">
                                <li>Daily Psychological: {item.managementDailyCounts.psychological} completed</li>
                                <li>Daily Medical: {item.managementDailyCounts.medical} completed</li>
                                {item.managementDailyCounts.sows > 0 || item.managementDailyCounts.oows > 0 ? (
                                  <>
                                    <li>SOWS: {item.managementDailyCounts.sows} completed</li>
                                    <li>OOWS: {item.managementDailyCounts.oows} completed</li>
                                  </>
                                ) : null}
                                <li className="font-medium text-[#777777] pt-1">
                                  Daily forms total: {item.managementDailyCounts.psychological + item.managementDailyCounts.medical + item.managementDailyCounts.sows + item.managementDailyCounts.oows}
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {item.formRows && item.formRows.length > 0 && (
                        <ul className="mt-3 space-y-2 text-sm text-[#777777]">
                          {item.formRows.map((row, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-2">
                              {row.completed ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" aria-hidden />
                              ) : (
                                <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-[#D6D2C8] bg-white" aria-hidden />
                              )}
                              <span className={row.completed ? 'text-[#2B2820]' : ''}>{row.label}</span>
                              {row.completedAt && (
                                <span className="text-[#777777]">— {row.completedAt}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.consultRow && (
                        <div className="mt-4 pt-3 border-t border-[#E5E7EB]">
                          <h5 className="text-sm font-semibold text-[#0A0A0A] mb-1">Consultation with Clinical Director</h5>
                          {item.consultRow.scheduledAt ? (
                            <>
                              <p className="text-sm text-[#777777]">{format(new Date(item.consultRow.scheduledAt), 'MMM d, yyyy • h:mm a')}</p>
                              <p className="text-sm text-[#777777] mt-0.5">Consult call with Clinical Director is scheduled.</p>
                              {isStaff && (
                                <>
                                  {item.consultRow.formData && (
                                    <ul className="mt-3 space-y-2 text-sm">
                                      {CLINICAL_DIRECTOR_CONSULT_QUESTION_LABELS.map(({ key, label }) => {
                                        const raw = (item.consultRow!.formData as any)?.[key]
                                        let value: string | null = null
                                        if (raw === true || raw === false) value = raw ? 'Yes' : 'No'
                                        else if (typeof raw === 'number') value = String(raw)
                                        else if (key === 'diagnosed_conditions' && typeof raw === 'string') {
                                          try {
                                            const arr = JSON.parse(raw) as string[]
                                            value = Array.isArray(arr) && arr.length ? arr.join(', ') : null
                                          } catch {
                                            value = raw.trim() || null
                                          }
                                        }
                                        else if (typeof raw === 'string' && raw.trim()) value = raw.trim()
                                        if (!value) return null
                                        return (
                                          <li key={key} className="flex flex-col gap-0.5">
                                            <span className="font-medium text-[#2B2820]">{label}</span>
                                            <span className="text-[#777777]">{value}</span>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 rounded-full border-[#D6D2C8] text-xs text-[#6E7A46] hover:bg-[#F5F4F0]"
                                    onClick={() => router.push(`/patient-pipeline/patient-profile/${id}/clinical-director-consult-form`)}
                                  >
                                    {item.consultRow.formData ? 'View / Edit form' : 'Fill questionnaire'}
                                  </Button>
                                </>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-[#777777]">Consult with Clinical Director has not been scheduled yet.</p>
                          )}
                        </div>
                      )}
                      {item.bullets && item.bullets.length > 0 && !item.formRows && (
                        <ul className="mt-3 space-y-1 text-sm text-[#777777]">
                          {item.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {item.isNext && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            size="sm"
                            className="rounded-3xl bg-[#6E7A46] hover:bg-[#5c6840] text-white text-sm shadow-sm"
                            onClick={() => toast.info('Schedule Consult – coming soon')}
                          >
                            Schedule Consult
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-3xl border-[#D6D2C8] bg-white text-sm text-[#777777] hover:bg-[#F5F4F0]"
                            onClick={() => toast.info('Send Message – coming soon')}
                          >
                            Send Message
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            })()}
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-4 space-y-6">
        <div className="space-y-6">
          {/* Forms & Docs – table layout per Figma (no Reviewed by) */}
          <div className="rounded-[16px] border border-[#D6D2C8] bg-white px-5 py-5">
            <div className="flex flex-col">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-[#D6D2C8] py-2 pr-0">
                <div className="text-sm text-[#777777] font-normal py-2">Form</div>
                <div className="text-sm text-[#777777] font-normal py-2 px-3 min-w-[90px]">Status</div>
                <div className="text-sm text-[#777777] font-normal py-2 px-3 min-w-[80px]">Submitted</div>
                <div className="text-sm text-[#777777] font-normal py-2 px-3 min-w-[100px]">Actions</div>
              </div>
              {/* Application Form row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0">
                <div className="text-sm text-[#2B2820] py-2">Application Form</div>
                <div className="py-2 px-3">
                  {profileData.formStatuses.intake === 'completed' ? (
                    <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                  ) : (
                    getStatusBadge(profileData.formStatuses.intake)
                  )}
                </div>
                <div className="text-sm text-[#2B2820] py-2 px-3">{getFormSubmittedDate('intake') ?? '—'}</div>
                <div className="py-2 px-3 flex gap-2 flex-wrap">
                  {profileData.formStatuses.intake === 'not_started' ? (
                    <>
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileInputChange('intake', e)} disabled={uploadingDocument !== null} />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingDocument !== null} className="gap-1.5 h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white border-0">
                            {uploadingDocument === 'intake' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleTriggerForm('intake')} disabled={triggeringForm !== null} className="gap-1.5 h-[22px] px-4 rounded-full text-xs">
                        {triggeringForm === 'intake' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm" onClick={async () => {
                      const uploadedDoc = profileData.existingPatientDocuments?.find(doc => doc.form_type === 'intake')
                      if (uploadedDoc) {
                        setViewFormData({ type: 'uploaded_document', document_url: uploadedDoc.document_url, document_name: uploadedDoc.document_name || 'Intake Form Document', form_type: 'intake' })
                        setViewingForm('intake')
                      } else {
                        const intakeFormId = profileData.intakeForm?.id
                        if (intakeFormId) {
                          setLoadingViewForm('intake')
                          try {
                            const result = await getIntakeFormById({ formId: intakeFormId })
                            if (result?.data?.success && result.data.data) { setViewFormData(result.data.data); setViewingForm('intake') }
                            else toast.error(result?.data?.error || 'Failed to load form data')
                          } catch { toast.error('Failed to load form data') }
                          finally { setLoadingViewForm(null) }
                        }
                      }
                    }} disabled={loadingViewForm === 'intake'}>
                      {loadingViewForm === 'intake' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'View'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Medical Health History row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0">
                <div className="text-sm text-[#2B2820] py-2">Medical Health History</div>
                <div className="py-2 px-3">
                  {profileData.formStatuses.medicalHistory === 'completed' ? (
                    <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                  ) : (
                    getStatusBadge(profileData.formStatuses.medicalHistory)
                  )}
                </div>
                <div className="text-sm text-[#2B2820] py-2 px-3">{getFormSubmittedDate('medical') ?? '—'}</div>
                <div className="py-2 px-3 flex gap-2 flex-wrap">
                  {profileData.formStatuses.medicalHistory === 'not_started' ? (
                    <>
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileInputChange('medical', e)} disabled={uploadingDocument !== null} />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingDocument !== null} className="gap-1.5 h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white border-0">
                            {uploadingDocument === 'medical' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5 h-[22px] px-4 rounded-full text-xs" onClick={() => router.push(profileData.intakeForm?.id ? `/medical-history?intake_form_id=${profileData.intakeForm.id}&admin=true` : '/medical-history?admin=true')}>
                        <FileText className="h-3 w-3" /> Fill
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTriggerForm('medical')} disabled={triggeringForm !== null} className="gap-1.5 h-[22px] px-4 rounded-full text-xs">
                        {triggeringForm === 'medical' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm" onClick={async () => {
                      const uploadedDoc = profileData.existingPatientDocuments?.find(doc => doc.form_type === 'medical')
                      if (uploadedDoc) {
                        setViewFormData({ type: 'uploaded_document', document_url: uploadedDoc.document_url, document_name: uploadedDoc.document_name || 'Medical History Document', form_type: 'medical' })
                        setViewingForm('medical')
                      } else {
                        const medicalFormId = profileData.medicalHistoryForm?.id
                        if (medicalFormId) {
                          setLoadingViewForm('medical')
                          try {
                            const result = await getMedicalHistoryFormById({ formId: medicalFormId })
                            if (result?.data?.success && result.data.data) { setViewFormData(result.data.data); setViewingForm('medical') }
                            else toast.error(result?.data?.error || 'Failed to load form data')
                          } catch { toast.error('Failed to load form data') }
                          finally { setLoadingViewForm(null) }
                        }
                      }
                    }} disabled={loadingViewForm === 'medical'}>
                      {loadingViewForm === 'medical' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'View'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Service Agreement row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0">
                <div className="text-sm text-[#2B2820] py-2">Service Agreement</div>
                <div className="py-2 px-3 flex items-center gap-2">
                  {profileData.formStatuses.serviceAgreement === 'completed' ? (
                    <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                  ) : (
                    getStatusBadge(profileData.formStatuses.serviceAgreement)
                  )}
                  {profileData.serviceAgreement?.id && isAdminOrOwner && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="service-activate" className="text-xs text-[#777777]">
                        {profileData.serviceAgreement?.is_activated ? 'Activated' : 'Inactive'}
                      </Label>
                      {activatingForm === 'service' ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[#777777]" />
                      ) : (
                        <Switch
                          id="service-activate"
                          checked={profileData.serviceAgreement?.is_activated || false}
                          disabled={activatingForm !== null || isFormCompleted('service')}
                          onCheckedChange={(checked) => {
                            const formId = profileData.serviceAgreement?.id
                            if (formId) handleActivateForm('service', formId, checked)
                            else toast.error('Form ID not found. Please refresh the page.')
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-[#2B2820] py-2 px-3">{getFormSubmittedDate('service') ?? '—'}</div>
                <div className="py-2 px-3 flex gap-2 flex-wrap">
                  {profileData.formStatuses.serviceAgreement === 'not_started' ? (
                    <>
                      {!profileData.serviceAgreement?.id && isAdminOrOwner && (
                        <Button size="sm" onClick={handleCreateServiceAgreement} disabled={creatingServiceAgreement} className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white">
                          {creatingServiceAgreement ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
                        </Button>
                      )}
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileInputChange('service', e)} disabled={uploadingDocument !== null} />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingDocument !== null} className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white border-0">
                            {uploadingDocument === 'service' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleTriggerForm('service')} disabled={triggeringForm !== null} className="h-[22px] px-4 rounded-full text-xs">
                        {triggeringForm === 'service' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send
                      </Button>
                    </>
                  ) : (
                    <>
                      {isAdminOrOwner ? (
                        <Button size="sm" className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm" onClick={async () => {
                          const uploadedDoc = profileData.existingPatientDocuments?.find(doc => doc.form_type === 'service')
                          if (uploadedDoc) {
                            setViewFormData({ type: 'uploaded_document', document_url: uploadedDoc.document_url, document_name: uploadedDoc.document_name || 'Service Agreement Document', form_type: 'service' })
                            setViewingForm('service')
                          } else {
                            const serviceAgreementId = profileData.serviceAgreement?.id
                            if (serviceAgreementId) {
                              setLoadingViewForm('service')
                              try {
                                const result = await getServiceAgreementById({ formId: serviceAgreementId })
                                if (result?.data?.success && result.data.data) { setViewFormData(result.data.data); setViewingForm('service') }
                                else toast.error(result?.data?.error || 'Failed to load form data')
                              } catch { toast.error('Failed to load form data') }
                              finally { setLoadingViewForm(null) }
                            }
                          }
                        }} disabled={loadingViewForm === 'service'}>
                          {loadingViewForm === 'service' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'View'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-[22px] px-4 rounded-full text-xs opacity-50 cursor-not-allowed" disabled>
                          View
                        </Button>
                      )}
                      {isAdminOrOwner && profileData.serviceAgreement?.id && profileData.serviceAgreement?.is_activated && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-[22px] px-4 rounded-full text-xs"
                          onClick={() => {
                            const sa = profileData.serviceAgreement
                            if (!sa) return
                            setUpgradeAgreementForm({
                              formId: sa.id,
                              number_of_days: String(sa.number_of_days ?? ''),
                              total_program_fee: String(sa.total_program_fee ?? ''),
                              deposit_amount: String(sa.deposit_amount ?? ''),
                              deposit_percentage: String(sa.deposit_percentage ?? ''),
                              remaining_balance: String(sa.remaining_balance ?? ''),
                              payment_method: sa.payment_method ?? '',
                            })
                            setUpgradeAgreementOpen(true)
                          }}
                        >
                          Upgrade Agreement
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Ibogaine Consent row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0 last:border-b-0">
                <div className="text-sm text-[#2B2820] py-2">Ibogaine Consent</div>
                <div className="py-2 px-3">
                  {profileData.formStatuses.ibogaineConsent === 'completed' ? (
                    <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                  ) : (
                    getStatusBadge(profileData.formStatuses.ibogaineConsent)
                  )}
                </div>
                <div className="text-sm text-[#2B2820] py-2 px-3">{getFormSubmittedDate('ibogaine') ?? '—'}</div>
                <div className="py-2 px-3 flex gap-2 flex-wrap">
                  {profileData.formStatuses.ibogaineConsent === 'not_started' ? (
                    <>
                      {isAdminOrOwner && (
                        <label className="cursor-pointer">
                          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileInputChange('ibogaine', e)} disabled={uploadingDocument !== null} />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingDocument !== null} className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white border-0">
                            {uploadingDocument === 'ibogaine' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Upload
                          </Button>
                        </label>
                      )}
                      <Button variant="outline" size="sm" className="h-[22px] px-4 rounded-full text-xs" onClick={() => router.push(profileData.intakeForm?.id ? `/ibogaine-consent?intake_form_id=${profileData.intakeForm.id}&admin=true` : '/ibogaine-consent?admin=true')}>
                        <FileText className="h-3 w-3" /> Fill
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTriggerForm('ibogaine')} disabled={triggeringForm !== null} className="h-[22px] px-4 rounded-full text-xs">
                        {triggeringForm === 'ibogaine' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm" onClick={async () => {
                      const uploadedDoc = profileData.existingPatientDocuments?.find(doc => doc.form_type === 'ibogaine')
                      if (uploadedDoc) {
                        setViewFormData({ type: 'uploaded_document', document_url: uploadedDoc.document_url, document_name: uploadedDoc.document_name || 'Ibogaine Consent Form Document', form_type: 'ibogaine' })
                        setViewingForm('ibogaine')
                      } else {
                        const ibogaineConsentFormId = profileData.ibogaineConsentForm?.id
                        if (ibogaineConsentFormId) {
                          setLoadingViewForm('ibogaine')
                          try {
                            const result = await getIbogaineConsentFormById({ formId: ibogaineConsentFormId })
                            if (result?.data?.success && result.data.data) { setViewFormData(result.data.data); setViewingForm('ibogaine') }
                            else toast.error(result?.data?.error || 'Failed to load form data')
                          } catch { toast.error('Failed to load form data') }
                          finally { setLoadingViewForm(null) }
                        }
                      }
                    }} disabled={loadingViewForm === 'ibogaine'}>
                      {loadingViewForm === 'ibogaine' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'View'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

            {/* Onboarding Forms – same table design as pre-arrival forms */}
            {profileData.onboarding && (
              <div className="mt-6">
                <div className="rounded-[16px] border border-[#D6D2C8] bg-white px-5 py-5">
                  <div className="flex flex-col">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-[#D6D2C8] py-2 pr-0">
                      <div className="text-sm text-[#777777] font-normal py-2">Form</div>
                      <div className="text-sm text-[#777777] font-normal py-2 px-3 min-w-[90px]">Status</div>
                      <div className="text-sm text-[#777777] font-normal py-2 px-3 min-w-[80px]">Submitted</div>
                      <div className="text-sm text-[#777777] font-normal py-2 px-3 min-w-[100px]">Actions</div>
                    </div>
                    {[
                      { key: 'releaseForm', label: 'Release Form', completed: profileData.onboarding.onboarding.release_form_completed, formType: 'release' as const },
                      { key: 'outingForm', label: 'Outing/Transfer Consent', completed: profileData.onboarding.onboarding.outing_consent_completed, formType: 'outing' as const },
                      { key: 'regulationsForm', label: 'Internal Regulations', completed: profileData.onboarding.onboarding.internal_regulations_completed, formType: 'regulations' as const },
                    ].map((form) => {
                      const formData = profileData.onboarding?.forms[form.key as keyof typeof profileData.onboarding.forms]
                      const status: 'completed' | 'pending' | 'not_started' = form.completed ? 'completed' : (formData ? 'pending' : 'not_started')
                      const onboardingId = profileData.onboarding?.onboarding.id
                      const inputKey = onboardingId ? `${onboardingId}-${form.formType}` : ''
                      const isUploading = uploadingOnboardingForm?.onboardingId === onboardingId && uploadingOnboardingForm?.formType === form.formType
                      const formTypeMap: Record<string, { type: 'release' | 'outing' | 'regulations', viewState: typeof viewingForm }> = {
                        releaseForm: { type: 'release', viewState: 'onboarding_release' },
                        outingForm: { type: 'outing', viewState: 'onboarding_outing' },
                        regulationsForm: { type: 'regulations', viewState: 'onboarding_regulations' },
                      }
                      const mapping = formTypeMap[form.key]
                      return (
                        <div key={form.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0 last:border-b-0">
                          <div className="text-sm text-[#2B2820] py-2">{form.label}</div>
                          <div className="py-2 px-3">
                            {form.completed ? (
                              <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                            ) : (
                              getStatusBadge(status)
                            )}
                          </div>
                          <div className="text-sm text-[#2B2820] py-2 px-3">{getOnboardingFormSubmittedDate(form.key as 'releaseForm' | 'outingForm' | 'regulationsForm') ?? '—'}</div>
                          <div className="py-2 px-3 flex gap-2 flex-wrap">
                            {isAdmin && !form.completed && onboardingId && (
                              <>
                                <input
                                  ref={(el) => { if (inputKey) onboardingFileInputRefs.current[inputKey] = el }}
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => handleOnboardingFileChange(e, onboardingId, form.formType)}
                                  disabled={isUploading}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleOnboardingUploadClick(onboardingId, form.formType)}
                                  disabled={isUploading}
                                  className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white border-0"
                                >
                                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                  Upload
                                </Button>
                              </>
                            )}
                            {form.completed && mapping && onboardingId && (
                              <Button
                                size="sm"
                                className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                                onClick={async () => {
                                  setLoadingViewForm(mapping.viewState)
                                  try {
                                    const result = await getFormByOnboarding({ onboarding_id: onboardingId, form_type: mapping.type })
                                    if (result?.data?.success && result.data.data) {
                                      const responseData = result.data.data
                                      const data = responseData.form || responseData
                                      if (data.document_url) {
                                        setViewFormData({ type: 'uploaded_document', document_url: data.document_url, document_name: `${form.label} Document`, form_type: mapping.type, uploaded_at: data.uploaded_at, uploaded_by: data.uploaded_by })
                                      } else {
                                        setViewFormData(data)
                                      }
                                      setViewingForm(mapping.viewState)
                                    } else {
                                      toast.error(result?.data?.error || 'Failed to load form data')
                                    }
                                  } catch {
                                    toast.error('Failed to load form data')
                                  } finally {
                                    setLoadingViewForm(null)
                                  }
                                }}
                                disabled={loadingViewForm !== null}
                              >
                                {loadingViewForm === mapping.viewState ? <Loader2 className="h-3 w-3 animate-spin" /> : 'View'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* EKG row */}
                    {profileData?.onboarding?.onboarding?.id && (
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0 last:border-b-0">
                        <div className="text-sm text-[#2B2820] py-2 flex items-center gap-2">
                          <Heart className="h-4 w-4 text-[#6E7A46]" />
                          EKG
                        </div>
                        <div className="py-2 px-3">
                          {profileData.onboarding.medicalDocuments?.ekg ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Uploaded</span>
                          ) : profileData.onboarding.onboarding.ekg_skipped ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-amber-100 text-amber-800">Skipped</span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-gray-100 text-gray-500">Pending</span>
                          )}
                        </div>
                        <div className="text-sm text-[#2B2820] py-2 px-3">
                          {profileData.onboarding.medicalDocuments?.ekg?.uploaded_at
                            ? format(new Date(profileData.onboarding.medicalDocuments.ekg.uploaded_at), 'MMM d, yyyy')
                            : profileData.onboarding.onboarding.ekg_skipped_at
                              ? format(new Date(profileData.onboarding.onboarding.ekg_skipped_at), 'MMM d, yyyy')
                              : '—'}
                        </div>
                        <div className="py-2 px-3 flex gap-2 flex-wrap">
                          {profileData.onboarding.medicalDocuments?.ekg && (
                            <Button
                              size="sm"
                              className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                              disabled={loadingMedicalDocView === 'ekg'}
                              onClick={async () => {
                                setLoadingMedicalDocView('ekg')
                                try {
                                  const res = await getOnboardingMedicalDocumentViewUrl({
                                    onboarding_id: profileData.onboarding!.onboarding.id,
                                    document_type: 'ekg',
                                  })
                                  if (res?.data?.success && res.data.data?.url) {
                                    window.open(res.data.data.url, '_blank')
                                  } else {
                                    toast.error(res?.data?.error || 'Failed to load document')
                                  }
                                } finally {
                                  setLoadingMedicalDocView(null)
                                }
                              }}
                            >
                              {loadingMedicalDocView === 'ekg' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'View'}
                            </Button>
                          )}
                          {isAdmin && !profileData.onboarding.medicalDocuments?.ekg && !profileData.onboarding.onboarding.ekg_skipped && (
                            <Button
                              size="sm"
                              className="h-[22px] px-4 rounded-full text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 border-0"
                              disabled={!!adminSkippingMedical}
                              onClick={() => setConfirmSkipMedical('ekg')}
                            >
                              Mark as Skipped
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bloodwork row */}
                    {profileData?.onboarding?.onboarding?.id && (
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0 last:border-b-0">
                        <div className="text-sm text-[#2B2820] py-2 flex items-center gap-2">
                          <TestTube2 className="h-4 w-4 text-[#6E7A46]" />
                          Bloodwork
                        </div>
                        <div className="py-2 px-3">
                          {profileData.onboarding.medicalDocuments?.bloodwork ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Uploaded</span>
                          ) : profileData.onboarding.onboarding.bloodwork_skipped ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-amber-100 text-amber-800">Skipped</span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-gray-100 text-gray-500">Pending</span>
                          )}
                        </div>
                        <div className="text-sm text-[#2B2820] py-2 px-3">
                          {profileData.onboarding.medicalDocuments?.bloodwork?.uploaded_at
                            ? format(new Date(profileData.onboarding.medicalDocuments.bloodwork.uploaded_at), 'MMM d, yyyy')
                            : profileData.onboarding.onboarding.bloodwork_skipped_at
                              ? format(new Date(profileData.onboarding.onboarding.bloodwork_skipped_at), 'MMM d, yyyy')
                              : '—'}
                        </div>
                        <div className="py-2 px-3 flex gap-2 flex-wrap">
                          {profileData.onboarding.medicalDocuments?.bloodwork && (
                            <Button
                              size="sm"
                              className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                              disabled={loadingMedicalDocView === 'bloodwork'}
                              onClick={async () => {
                                setLoadingMedicalDocView('bloodwork')
                                try {
                                  const res = await getOnboardingMedicalDocumentViewUrl({
                                    onboarding_id: profileData.onboarding!.onboarding.id,
                                    document_type: 'bloodwork',
                                  })
                                  if (res?.data?.success && res.data.data?.url) {
                                    window.open(res.data.data.url, '_blank')
                                  } else {
                                    toast.error(res?.data?.error || 'Failed to load document')
                                  }
                                } finally {
                                  setLoadingMedicalDocView(null)
                                }
                              }}
                            >
                              {loadingMedicalDocView === 'bloodwork' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'View'}
                            </Button>
                          )}
                          {isAdmin && !profileData.onboarding.medicalDocuments?.bloodwork && !profileData.onboarding.onboarding.bloodwork_skipped && (
                            <Button
                              size="sm"
                              className="h-[22px] px-4 rounded-full text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 border-0"
                              disabled={!!adminSkippingMedical}
                              onClick={() => setConfirmSkipMedical('bloodwork')}
                            >
                              Mark as Skipped
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Consult with Clinical Director row */}
                    {profileData?.onboarding?.onboarding?.id && (
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0 last:border-b-0">
                        <div className="text-sm text-[#2B2820] py-2 flex items-center gap-2">
                          <CalendarCheck className="h-4 w-4 text-[#6E7A46]" />
                          Consult with Clinical Director
                        </div>
                        <div className="py-2 px-3">
                          {(profileData.onboarding.onboarding as { consult_scheduled_at?: string | null })?.consult_scheduled_at ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Scheduled</span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-gray-100 text-gray-500">Pending</span>
                          )}
                        </div>
                        <div className="text-sm text-[#2B2820] py-2 px-3">
                          {(profileData.onboarding.onboarding as { consult_scheduled_at?: string | null })?.consult_scheduled_at
                            ? format(new Date((profileData.onboarding.onboarding as { consult_scheduled_at: string }).consult_scheduled_at), 'MMM d, yyyy, h:mm a')
                            : '—'}
                        </div>
                        <div className="py-2 px-3 flex gap-2 flex-wrap">
                          {isAdmin && !(profileData.onboarding.onboarding as { consult_scheduled_at?: string | null })?.consult_scheduled_at && (
                            <Button
                              size="sm"
                              className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white border-0"
                              disabled={markingConsultScheduled}
                              onClick={async () => {
                                setMarkingConsultScheduled(true)
                                try {
                                  const result = await markOnboardingConsultScheduled({ onboarding_id: profileData.onboarding!.onboarding.id })
                                  if (result?.data?.success) {
                                    toast.success('Consult marked as scheduled')
                                    const profileRes = await getPatientProfile({ patientId: id as string })
                                    if (profileRes?.data?.success && profileRes.data.data) setProfileData(profileRes.data.data)
                                  } else {
                                    toast.error(result?.data?.error ?? 'Failed to mark consult scheduled')
                                  }
                                } finally {
                                  setMarkingConsultScheduled(false)
                                }
                              }}
                            >
                              {markingConsultScheduled ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark consult scheduled'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tapering Schedule row - visible to all staff, Create/Edit for admin/manager only */}
                    {isStaff && (
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0 last:border-b-0">
                        <div className="text-sm text-[#2B2820] py-2 flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-[#6E7A46]" />
                          Tapering Schedule
                        </div>
                        <div className="py-2 px-3">
                          {loadingTaperingSchedule ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : taperingSchedule?.status === 'sent' || taperingSchedule?.status === 'acknowledged' ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                          ) : taperingSchedule?.status === 'draft' ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-yellow-100 text-yellow-700">Draft</span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-gray-100 text-gray-500">Not Created</span>
                          )}
                        </div>
                        <div className="text-sm text-[#2B2820] py-2 px-3">
                          {taperingSchedule?.sent_at 
                            ? format(new Date(taperingSchedule.sent_at), 'MMM d, yyyy')
                            : '—'}
                        </div>
                        <div className="py-2 px-3 flex gap-2 flex-wrap">
                          {profileData?.onboarding?.onboarding?.id && (
                            <>
                              {/* View button for all staff when schedule exists and is sent */}
                              {taperingSchedule && (taperingSchedule.status === 'sent' || taperingSchedule.status === 'acknowledged') && (
                                <Button
                                  size="sm"
                                  className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                                  onClick={() => router.push(`/patient-pipeline/patient-profile/${id}/tapering-schedule`)}
                                >
                                  View
                                </Button>
                              )}
                              {/* Create/Edit button for admin/manager only */}
                              {isAdmin && (!taperingSchedule || taperingSchedule.status === 'draft') && (
                                <Button
                                  size="sm"
                                  className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                                  onClick={() => router.push(`/patient-pipeline/patient-profile/${id}/tapering-schedule`)}
                                >
                                  {taperingSchedule ? 'Edit' : 'Create'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Clinical Director Consult Questionnaire – visible when consult is scheduled */}
                    {isStaff && profileData?.onboarding?.onboarding?.id && (profileData.onboarding.onboarding as { consult_scheduled_at?: string | null }).consult_scheduled_at && (
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-[#D6D2C8] py-2 pr-0 last:border-b-0">
                        <div className="text-sm text-[#2B2820] py-2 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[#6E7A46]" />
                          Clinical Director Consult Questionnaire
                        </div>
                        <div className="py-2 px-3">
                          {loadingClinicalDirectorConsultForm ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : clinicalDirectorConsultForm && (() => {
                            const f = clinicalDirectorConsultForm as any
                            return CLINICAL_DIRECTOR_CONSULT_QUESTION_LABELS.some(({ key }) => {
                              const v = f?.[key]
                              if (v === true || v === false) return true
                              if (typeof v === 'number') return true
                              if (key === 'diagnosed_conditions' && typeof v === 'string') {
                                try { const arr = JSON.parse(v); return Array.isArray(arr) && arr.length > 0 } catch { return !!v?.trim() }
                              }
                              return typeof v === 'string' && v.trim() !== ''
                            })
                          })() ? (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Completed</span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-gray-100 text-gray-500">Not started</span>
                          )}
                        </div>
                        <div className="text-sm text-[#2B2820] py-2 px-3">
                          {clinicalDirectorConsultForm?.updated_at ? format(new Date(clinicalDirectorConsultForm.updated_at), 'MMM d, yyyy, h:mm a') : '—'}
                        </div>
                        <div className="py-2 px-3 flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                            onClick={() => router.push(`/patient-pipeline/patient-profile/${id}/clinical-director-consult-form`)}
                          >
                            {clinicalDirectorConsultForm && (() => {
                            const f = clinicalDirectorConsultForm as any
                            return CLINICAL_DIRECTOR_CONSULT_QUESTION_LABELS.some(({ key }) => {
                              const v = f?.[key]
                              if (v === true || v === false) return true
                              if (typeof v === 'number') return true
                              if (key === 'diagnosed_conditions' && typeof v === 'string') {
                                try { const arr = JSON.parse(v); return Array.isArray(arr) && arr.length > 0 } catch { return !!v?.trim() }
                              }
                              return typeof v === 'string' && v.trim() !== ''
                            })
                          })() ? 'View' : 'Fill form'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* One-time forms & Daily forms (when client is in management) */}
                {managementRecord && (
                  <div className="mt-4 space-y-4">
                    {/* One-time forms – responsive: card list on mobile, table on md+ */}
                    <div className="rounded-[16px] border border-[#D6D2C8] bg-white px-4 py-5 sm:px-5">
                      <h3 className="text-sm font-medium text-[#777777] mb-4">One-time forms</h3>
                      {(() => {
                        const oneTimeRows = managementRecord.program_type === 'neurological'
                          ? [
                              { label: "Parkinson's Psychological Report", completed: !!managementRecord.parkinsons_psychological_report_completed, dateKey: 'parkinsonsPsychologicalReport' as const, path: `/patient-management/${managementRecord.id}/one-time-forms/parkinsons-psychological` },
                              { label: "Parkinson's Mortality Scales", completed: !!managementRecord.parkinsons_mortality_scales_completed, dateKey: 'parkinsonsMortalityScales' as const, path: `/patient-management/${managementRecord.id}/one-time-forms/parkinsons-mortality` },
                              { label: 'Medical Intake Report', completed: !!(oneTimeFormsData?.medicalIntakeReport as any)?.is_completed, dateKey: 'medicalIntakeReport' as const, path: `/patient-management/${managementRecord.id}/one-time-forms/medical-intake-report` },
                            ]
                          : [
                              { label: 'Psychological Intake Report', completed: !!managementRecord.intake_report_completed, dateKey: 'intakeReport' as const, path: `/patient-management/${managementRecord.id}/one-time-forms/intake-report` },
                              { label: 'Medical Intake Report', completed: !!(oneTimeFormsData?.medicalIntakeReport as any)?.is_completed, dateKey: 'medicalIntakeReport' as const, path: `/patient-management/${managementRecord.id}/one-time-forms/medical-intake-report` },
                            ]
                        return (
                          <>
                            {/* Mobile: card per form with clear labels */}
                            <div className="block md:hidden space-y-3">
                              {oneTimeRows.map((row) => {
                                const hasSubmittedDate = !!getOneTimeFormSubmittedDate(row.dateKey)
                                const showSubmitted = row.completed || hasSubmittedDate
                                return (
                                  <div key={row.label} className="rounded-xl border border-[#D6D2C8] p-4 space-y-3">
                                    <p className="text-sm font-medium text-[#2B2820]">{row.label}</p>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                      <span className="text-[#777777]">Status:</span>
                                      {showSubmitted ? (
                                        <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Incomplete</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                      <span className="text-[#777777]">Submitted:</span>
                                      <span className="text-[#2B2820]">{getOneTimeFormSubmittedDate(row.dateKey) ?? '—'}</span>
                                    </div>
                                    {showSubmitted && (
                                      <div className="pt-1">
                                        <Button
                                          size="sm"
                                          className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                                          onClick={() => setViewFormIframe({ url: row.path, title: row.label })}
                                        >
                                          View
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            {/* Desktop: table with header row */}
                            <div className="hidden md:block border border-[#D6D2C8] rounded-[16px] overflow-hidden">
                              <div className="grid grid-cols-[1fr_120px_minmax(140px,1fr)_100px] gap-4 items-center border-b border-[#D6D2C8] py-3 px-4 bg-[#F5F4F0] text-sm font-medium text-[#2B2820]">
                                <div>Form</div>
                                <div className="text-[#777777] font-normal">Status</div>
                                <div className="text-[#777777] font-normal">Submitted</div>
                                <div className="text-[#777777] font-normal">Actions</div>
                              </div>
                              {oneTimeRows.map((row) => {
                                const hasSubmittedDate = !!getOneTimeFormSubmittedDate(row.dateKey)
                                const showSubmitted = row.completed || hasSubmittedDate
                                return (
                                  <div key={row.label} className="grid grid-cols-[1fr_120px_minmax(140px,1fr)_100px] gap-4 items-center border-b border-[#D6D2C8] py-3 px-4 last:border-b-0 bg-white">
                                    <div className="text-sm text-[#2B2820] min-w-0">{row.label}</div>
                                    <div>
                                      {showSubmitted ? (
                                        <span className="inline-flex items-center justify-center px-3 h-[26px] rounded-[10px] text-xs font-normal bg-[#DEF8EE] text-[#10B981]">Submitted</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Incomplete</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-[#2B2820] min-w-0">{getOneTimeFormSubmittedDate(row.dateKey) ?? '—'}</div>
                                    <div>
                                      {showSubmitted && (
                                        <Button
                                          size="sm"
                                          className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                                          onClick={() => setViewFormIframe({ url: row.path, title: row.label })}
                                        >
                                          View
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    {/* Daily forms – 2x2: (Psychological + OOWS) | (Medical + SOWS); View opens in popup */}
                    <div className="rounded-[16px] border border-[#D6D2C8] bg-white px-4 py-5 sm:px-5">
                      <h3 className="text-sm font-medium text-[#777777] mb-4">Daily forms</h3>
                      {(() => {
                        const isAddiction = managementRecord.program_type === 'addiction'
                        const mid = managementRecord.id
                        const renderDailyColumn = (key: 'psychological' | 'medical' | 'sows' | 'oows', label: string) => {
                          const arr = dailyFormsArrays[key]
                          return (
                            <div key={key} className="rounded-xl border border-[#D6D2C8] p-4">
                              <p className="text-sm font-medium text-[#2B2820] mb-3">{label}</p>
                              {arr.length === 0 ? (
                                <p className="text-sm text-[#777777]">No forms yet</p>
                              ) : (
                                <ul className="space-y-3">
                                  {arr.map((entry, i) => {
                                    const submittedAt = entry.submitted_at
                                      ? format(new Date(entry.submitted_at + (entry.submitted_at.includes('T') ? '' : 'T12:00:00')), 'MMM d, yyyy • h:mm a')
                                      : entry.form_date
                                        ? format(new Date(entry.form_date + 'T12:00:00'), 'MMM d, yyyy')
                                        : '—'
                                    const embedType = key === 'psychological' ? 'daily_psychological' : key === 'medical' ? 'daily_medical' : key === 'sows' ? 'daily_sows' : 'daily_oows'
                                    const embedUrl = `/embed/form?type=${embedType}&managementId=${mid}&date=${entry.form_date}`
                                    return (
                                          <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                                            <span className="text-[#2B2820]">{submittedAt}</span>
                                            <Button
                                              size="sm"
                                              className="h-[22px] px-4 rounded-full text-xs bg-[#6E7A46] hover:bg-[#5c6840] text-white shadow-sm"
                                              onClick={() => setViewFormIframe({ url: embedUrl, title: `${label} – ${submittedAt}` })}
                                        >
                                          View
                                        </Button>
                                      </li>
                                    )
                                  })}
                                </ul>
                              )}
                            </div>
                          )
                        }
                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-4">
                                {renderDailyColumn('psychological', 'Daily Psychological')}
                                {isAddiction && renderDailyColumn('oows', 'OOWS')}
                              </div>
                              <div className="space-y-4">
                                {renderDailyColumn('medical', 'Daily Medical')}
                                {isAddiction && renderDailyColumn('sows', 'SOWS')}
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-[#D6D2C8] flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-[#D6D2C8] text-sm h-[22px] px-4"
                                onClick={() => setViewFormIframe({ url: `/patient-management/${mid}/one-time-forms`, title: 'One-time forms' })}
                              >
                                One-time forms
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-[#D6D2C8] text-sm h-[22px] px-4"
                                onClick={() => setViewFormIframe({ url: `/patient-management/${mid}/daily-forms`, title: 'Daily forms' })}
                              >
                                Daily forms
                              </Button>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
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
        </TabsContent>

        <TabsContent value="billing" className="mt-0">
          {!isAdminOrOwner ? (
            <div className="rounded-[14px] bg-[#F5F4F0] border border-[#D6D2C8] p-6">
              <p className="text-sm text-[#777777]">You do not have permission to view billing information.</p>
            </div>
          ) : !profileData.serviceAgreement?.is_activated ? (
            <div className="rounded-[14px] bg-[#F5F4F0] border border-[#D6D2C8] p-6">
              <p className="text-sm text-[#777777]">Activate the Service Agreement to record payments and manage billing.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Agreement summary from Service Agreement */}
              <div className="rounded-[14px] bg-[#F5F4F0] border border-[#D6D2C8] p-6">
                <h3 className="text-lg font-medium text-black mb-4">Service agreement – payment terms</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#777777]">Total program fee</span>
                    <p className="font-medium text-[#2B2820]">
                      ${Number(profileData.serviceAgreement?.total_program_fee ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#777777]">Deposit</span>
                    <p className="font-medium text-[#2B2820]">
                      ${Number(profileData.serviceAgreement?.deposit_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      ({Number(profileData.serviceAgreement?.deposit_percentage ?? 0).toFixed(1)}%)
                    </p>
                  </div>
                  <div>
                    <span className="text-[#777777]">Remaining balance</span>
                    <p className="font-medium text-[#2B2820]">
                      ${Number(profileData.serviceAgreement?.remaining_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#777777]">Payment method</span>
                    <p className="font-medium text-[#2B2820]">{profileData.serviceAgreement?.payment_method ?? '—'}</p>
                  </div>
                </div>
              </div>

              {/* Record payment */}
              {(() => {
                const totalAmount = Number(profileData.serviceAgreement?.total_program_fee ?? 0)
                const totalReceived = billingPayments.reduce((sum, p) => sum + Number(p.amount_received), 0)
                const balanceDue = Math.max(0, totalAmount - totalReceived)
                return (
              <div className="rounded-[14px] bg-[#F5F4F0] border border-[#D6D2C8] p-6">
                <h3 className="text-lg font-medium text-black mb-4">Record payment received</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#2B2820]">Amount received ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={billingForm.amountReceived}
                      onChange={(e) => {
                        const value = e.target.value
                        const num = value === '' ? NaN : Number(value)
                        const isFull = balanceDue > 0 && !Number.isNaN(num) && num >= balanceDue - 0.01
                        setBillingForm((f) => ({ ...f, amountReceived: value, isFullPayment: isFull }))
                      }}
                      className="mt-1 bg-white border-[#D6D2C8]"
                    />
                  </div>
                  <div>
                    <Label className="text-[#2B2820]">Date & time</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="date"
                        value={billingForm.receivedDate}
                        onChange={(e) => setBillingForm((f) => ({ ...f, receivedDate: e.target.value }))}
                        className="bg-white border-[#D6D2C8]"
                      />
                      <Input
                        type="time"
                        value={billingForm.receivedTime}
                        onChange={(e) => setBillingForm((f) => ({ ...f, receivedTime: e.target.value }))}
                        className="bg-white border-[#D6D2C8]"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="billing-full"
                      checked={billingForm.isFullPayment}
                      onChange={(e) => setBillingForm((f) => ({ ...f, isFullPayment: e.target.checked }))}
                      className="rounded border-[#D6D2C8]"
                    />
                    <Label htmlFor="billing-full" className="font-normal text-[#2B2820]">Full payment</Label>
                  </div>
                  {!billingForm.isFullPayment && (
                    <>
                      <div>
                        <Label className="text-[#2B2820]">Next payment reminder date</Label>
                        <Input
                          type="date"
                          value={billingForm.nextReminderDate}
                          onChange={(e) => setBillingForm((f) => ({ ...f, nextReminderDate: e.target.value }))}
                          className="mt-1 bg-white border-[#D6D2C8]"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="billing-send-reminder"
                            checked={billingForm.sendReminderNow}
                            onChange={(e) => setBillingForm((f) => ({ ...f, sendReminderNow: e.target.checked }))}
                            className="rounded border-[#D6D2C8]"
                          />
                          <Label htmlFor="billing-send-reminder" className="font-normal text-[#2B2820]">Send balance reminder email to client</Label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  className="mt-4 rounded-2xl bg-[#6E7A46] hover:bg-[#5c6840] text-white"
                  disabled={savingBilling || !billingForm.amountReceived || Number(billingForm.amountReceived) < 0}
                  onClick={async () => {
                    const amount = Number(billingForm.amountReceived)
                    if (!profileData.patient?.id || !profileData.serviceAgreement?.id || isNaN(amount) || amount < 0) {
                      toast.error('Invalid amount or missing data')
                      return
                    }
                    const receivedAt = new Date(`${billingForm.receivedDate}T${billingForm.receivedTime}`).toISOString()
                    setSavingBilling(true)
                    try {
                      const res = await recordBillingPayment({
                        patient_id: profileData.patient.id,
                        service_agreement_id: profileData.serviceAgreement.id,
                        amount_received: amount,
                        is_full_payment: billingForm.isFullPayment,
                        payment_received_at: receivedAt,
                        next_reminder_date: billingForm.nextReminderDate || undefined,
                        send_reminder_now: !billingForm.isFullPayment ? billingForm.sendReminderNow : undefined,
                      })
                      if (res?.data?.success) {
                        toast.success('Payment recorded' + (billingForm.sendReminderNow && !billingForm.isFullPayment ? ' and reminder email sent' : ''))
                        setBillingForm({
                          amountReceived: '',
                          isFullPayment: false,
                          receivedDate: format(new Date(), 'yyyy-MM-dd'),
                          receivedTime: format(new Date(), 'HH:mm'),
                          nextReminderDate: '',
                          sendReminderNow: true,
                        })
                        const listRes = await getBillingPayments({ service_agreement_id: profileData.serviceAgreement.id })
                        if (listRes?.data?.success && listRes.data.data) {
                          setBillingPayments(listRes.data.data)
                        }
                        loadPatientProfile()
                      } else {
                        toast.error(res?.data?.error || 'Failed to record payment')
                      }
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to record payment')
                    } finally {
                      setSavingBilling(false)
                    }
                  }}
                >
                  {savingBilling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record payment'}
                </Button>
              </div>
                )
              })()}

              {/* Payment history */}
              {(() => {
                const totalAmount = Number(profileData.serviceAgreement?.total_program_fee ?? 0)
                const totalReceived = billingPayments.reduce((sum, p) => sum + Number(p.amount_received), 0)
                const balanceAmount = Math.max(0, totalAmount - totalReceived)
                return (
              <div className="rounded-[14px] bg-[#F5F4F0] border border-[#D6D2C8] p-6">
                <h3 className="text-lg font-medium text-black mb-4">Payment history</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-4 rounded-lg bg-white border border-[#D6D2C8]">
                  <div>
                    <span className="text-sm text-[#777777]">Total amount recovered</span>
                    <p className="text-lg font-semibold text-[#2B2820]">
                      ${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-[#777777]">Balance amount</span>
                    <p className="text-lg font-semibold text-[#2B2820]">
                      ${balanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                {loadingBillingPayments ? (
                  <div className="flex items-center gap-2 text-[#777777]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : billingPayments.length === 0 ? (
                  <p className="text-sm text-[#777777]">No payments recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {billingPayments.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D6D2C8] bg-white px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#2B2820]">
                            ${Number(p.amount_received).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            {p.is_full_payment && ' (full)'}
                          </span>
                          <span className="text-[#777777]">
                            {format(new Date(p.payment_received_at), 'MMM d, yyyy • h:mm a')}
                          </span>
                          {p.next_reminder_date && (
                            <span className="text-xs text-[#777777]">
                              Next reminder: {format(new Date(p.next_reminder_date + 'T00:00:00'), 'MMM d, yyyy')}
                            </span>
                          )}
                          {p.balance_reminder_sent_at && (
                            <span className="text-xs text-[#10B981]">Reminder sent</span>
                          )}
                        </div>
                        {isAdminOrOwner && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-[#D6D2C8] text-xs"
                              onClick={() => {
                                setBillingEditRecord(p)
                                const d = new Date(p.payment_received_at)
                                setBillingEditForm({
                                  amountReceived: String(p.amount_received),
                                  isFullPayment: p.is_full_payment,
                                  receivedDate: format(d, 'yyyy-MM-dd'),
                                  receivedTime: format(d, 'HH:mm'),
                                  turnOffReminder: false,
                                })
                              }}
                            >
                              Update payment
                            </Button>
                            {p.next_reminder_date && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 text-xs"
                                disabled={turningOffReminderId === p.id}
                                onClick={async () => {
                                  setTurningOffReminderId(p.id)
                                  try {
                                    const res = await turnOffBillingReminder({ payment_record_id: p.id })
                                    if (res?.data?.success) {
                                      toast.success('Reminder turned off')
                                      const listRes = await getBillingPayments({ service_agreement_id: profileData.serviceAgreement!.id })
                                      if (listRes?.data?.success && listRes.data.data) setBillingPayments(listRes.data.data)
                                    } else {
                                      toast.error(res?.data?.error || 'Failed to turn off reminder')
                                    }
                                  } finally {
                                    setTurningOffReminderId(null)
                                  }
                                }}
                              >
                                {turningOffReminderId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Turn off reminder'}
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
                )
              })()}

              {/* Update payment dialog (admin/owner) */}
              <Dialog open={!!billingEditRecord} onOpenChange={(open) => !open && setBillingEditRecord(null)}>
                <DialogContent className="rounded-2xl border-[#D6D2C8] max-w-md">
                  <DialogHeader>
                    <DialogTitle>Update payment</DialogTitle>
                    <DialogDescription>Change amount, date, or turn off the reminder for this payment.</DialogDescription>
                  </DialogHeader>
                  {billingEditRecord && (() => {
                    const totalAmount = Number(profileData.serviceAgreement?.total_program_fee ?? 0)
                    const totalReceived = billingPayments.reduce((sum, p) => sum + Number(p.amount_received), 0)
                    const totalExcludingThis = totalReceived - billingEditRecord.amount_received
                    const balanceDueForThisPayment = Math.max(0, totalAmount - totalExcludingThis)
                    return (
                    <div className="grid gap-4 py-2">
                      <div>
                        <Label>Amount received ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={billingEditForm.amountReceived}
                          onChange={(e) => {
                            const value = e.target.value
                            const num = value === '' ? NaN : Number(value)
                            const isFull = balanceDueForThisPayment > 0 && !Number.isNaN(num) && num >= balanceDueForThisPayment - 0.01
                            setBillingEditForm((f) => ({ ...f, amountReceived: value, isFullPayment: isFull }))
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={billingEditForm.receivedDate}
                            onChange={(e) => setBillingEditForm((f) => ({ ...f, receivedDate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Time</Label>
                          <Input
                            type="time"
                            value={billingEditForm.receivedTime}
                            onChange={(e) => setBillingEditForm((f) => ({ ...f, receivedTime: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-full"
                          checked={billingEditForm.isFullPayment}
                          onChange={(e) => setBillingEditForm((f) => ({ ...f, isFullPayment: e.target.checked }))}
                          className="rounded border-[#D6D2C8]"
                        />
                        <Label htmlFor="edit-full" className="font-normal">Full payment</Label>
                      </div>
                      {billingEditRecord.next_reminder_date && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-turn-off"
                            checked={billingEditForm.turnOffReminder}
                            onChange={(e) => setBillingEditForm((f) => ({ ...f, turnOffReminder: e.target.checked }))}
                            className="rounded border-[#D6D2C8]"
                          />
                          <Label htmlFor="edit-turn-off" className="font-normal">Turn off reminder for this payment</Label>
                        </div>
                      )}
                    </div>
                    );
                  })()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBillingEditRecord(null)}>Cancel</Button>
                    <Button
                      className="bg-[#6E7A46] hover:bg-[#5c6840]"
                      disabled={savingBillingUpdate || !billingEditRecord || !billingEditForm.amountReceived}
                      onClick={async () => {
                        if (!billingEditRecord || !profileData.serviceAgreement?.id) return
                        const amount = Number(billingEditForm.amountReceived)
                        if (isNaN(amount) || amount < 0) {
                          toast.error('Invalid amount')
                          return
                        }
                        const receivedAt = new Date(`${billingEditForm.receivedDate}T${billingEditForm.receivedTime}`).toISOString()
                        setSavingBillingUpdate(true)
                        try {
                          const res = await updateBillingPayment({
                            payment_record_id: billingEditRecord.id,
                            amount_received: amount,
                            is_full_payment: billingEditForm.isFullPayment,
                            payment_received_at: receivedAt,
                            turn_off_reminder: billingEditForm.turnOffReminder,
                          })
                          if (res?.data?.success) {
                            toast.success('Payment updated')
                            setBillingEditRecord(null)
                            const listRes = await getBillingPayments({ service_agreement_id: profileData.serviceAgreement.id })
                            if (listRes?.data?.success && listRes.data.data) setBillingPayments(listRes.data.data)
                            loadPatientProfile()
                          } else {
                            toast.error(res?.data?.error || 'Failed to update payment')
                          }
                        } finally {
                          setSavingBillingUpdate(false)
                        }
                      }}
                    >
                      {savingBillingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </TabsContent>
        <TabsContent value="travel" className="mt-0">
          <div className="rounded-[14px] bg-[#F5F4F0] p-6">
            <h3 className="text-lg font-medium text-black mb-2">Travel</h3>
            <p className="text-sm text-[#777777]">Travel details will appear here.</p>
          </div>
        </TabsContent>
      </Tabs>
      </div>
        </div>

        {/* Right sidebar: Tasks + Readiness */}
        <aside className="w-full lg:w-[313px] shrink-0 flex flex-col gap-6">
          {/* Tasks card */}
          <div className="rounded-2xl border border-[#D6D2C8] bg-white p-5 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-medium text-black">Tasks</h3>
              <div className="h-[15px] w-px bg-[#6B7280]" />
              <p className="text-sm text-[#777777]">Next follow-ups for this lead</p>
            </div>

            {isAdminOrOwner && profileData?.serviceAgreement?.id && (
              <button
                type="button"
                className="text-left rounded-[10px] border border-[#D6D2C8] px-3.5 py-2.5 flex flex-col gap-0.5 hover:bg-[#F5F4F0] transition-colors"
                onClick={() => {
                  const sa = profileData.serviceAgreement
                  if (!sa) return
                  if (!sa.is_activated) {
                    handleActivateForm('service', sa.id, true)
                  } else {
                    setUpgradeAgreementForm({
                      formId: sa.id,
                      number_of_days: String(sa.number_of_days ?? ''),
                      total_program_fee: String(sa.total_program_fee ?? ''),
                      deposit_amount: String(sa.deposit_amount ?? ''),
                      deposit_percentage: String(sa.deposit_percentage ?? ''),
                      remaining_balance: String(sa.remaining_balance ?? ''),
                      payment_method: sa.payment_method ?? '',
                    })
                    setUpgradeAgreementOpen(true)
                  }
                }}
              >
                <span className="text-sm font-semibold text-[#2B2820]">
                  {profileData.serviceAgreement?.is_activated ? 'Upgrade Agreement' : 'Activate Service Agreement'}
                </span>
                <span className="text-sm text-[#777777]">
                  {profileData.serviceAgreement?.is_activated ? 'Update terms / fees' : (serviceAgreementNeedsActivation ? 'Due • Pending' : 'Done')}
                </span>
              </button>
            )}

            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
              {loadingLeadTasks ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#777777]" />
                </div>
              ) : (
                leadTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[10px] border border-[#D6D2C8] px-3.5 py-2.5 flex flex-col gap-1.5 hover:bg-[#F5F4F0] transition-colors"
                  >
                    {editingTaskId === task.id && editTaskForm ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Task title"
                          value={editTaskForm.title}
                          onChange={(e) => setEditTaskForm((f) => f ? { ...f, title: e.target.value } : null)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={editTaskForm.description}
                          onChange={(e) => setEditTaskForm((f) => f ? { ...f, description: e.target.value } : null)}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={editTaskForm.due_date}
                            onChange={(e) => setEditTaskForm((f) => f ? { ...f, due_date: e.target.value } : null)}
                            className="text-sm flex-1"
                          />
                          <Select
                            value={editTaskForm.assigned_to_id || 'none'}
                            onValueChange={(v: string) => setEditTaskForm((f) => f ? { ...f, assigned_to_id: v === 'none' ? '' : v } : null)}
                          >
                            <SelectTrigger className="text-sm w-[120px]">
                              <SelectValue placeholder="Assign to" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {staffList.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingTaskId(null); setEditTaskForm(null) }}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={savingLeadTask || !editTaskForm.title.trim()}
                            onClick={async () => {
                              setSavingLeadTask(true)
                              const res = await updateLeadTask({
                                taskId: task.id,
                                title: editTaskForm.title.trim(),
                                description: editTaskForm.description.trim() || null,
                                due_date: editTaskForm.due_date || null,
                                assigned_to_id: editTaskForm.assigned_to_id || null,
                              })
                              setSavingLeadTask(false)
                              if (res?.data?.success) {
                                setEditingTaskId(null)
                                setEditTaskForm(null)
                                loadLeadTasks()
                                toast.success('Task updated')
                              } else {
                                toast.error(res?.data?.error || 'Failed to update task')
                              }
                            }}
                          >
                            {savingLeadTask ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-[#2B2820] truncate">{task.title}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-[#777777]"
                              onClick={() => {
                                setEditingTaskId(task.id)
                                setEditTaskForm({
                                  title: task.title,
                                  description: task.description || '',
                                  due_date: task.due_date ? task.due_date.slice(0, 10) : '',
                                  assigned_to_id: task.assigned_to_id || '',
                                })
                              }}
                            >
                              Edit
                            </Button>
                            <Select
                              value={task.status}
                              onValueChange={async (value: 'todo' | 'in_progress' | 'done') => {
                                setUpdatingStatusTaskId(task.id)
                                const res = await updateLeadTaskStatus({ taskId: task.id, status: value })
                                setUpdatingStatusTaskId(null)
                                if (res?.data?.success) loadLeadTasks()
                                else toast.error(res?.data?.error || 'Failed to update status')
                              }}
                              disabled={updatingStatusTaskId === task.id}
                            >
                              <SelectTrigger className="h-7 w-[100px] text-xs border-0 bg-transparent shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To do</SelectItem>
                                <SelectItem value="in_progress">In progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <span className="text-xs text-[#777777]">
                          {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                          {task.created_by_name && ` • By ${task.created_by_name}`}
                          {task.assigned_to_name && ` → ${task.assigned_to_name}`}
                        </span>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {isStaff && (
              <>
                {showAddTaskInline && (
                  <div className="rounded-[10px] border border-[#D6D2C8] bg-[#F5F4F0] p-3 space-y-3">
                    <Input
                      placeholder="Task title"
                      value={newTaskForm.title}
                      onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={newTaskForm.description}
                      onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        placeholder="Due date"
                        value={newTaskForm.due_date}
                        onChange={(e) => setNewTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                        className="text-sm flex-1"
                      />
                      <Select
                        value={newTaskForm.assigned_to_id || 'none'}
                        onValueChange={(v: string) => setNewTaskForm((f) => ({ ...f, assigned_to_id: v === 'none' ? '' : v }))}
                      >
                        <SelectTrigger className="text-sm w-[140px]">
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {staffList.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setShowAddTaskInline(false); setNewTaskForm({ title: '', description: '', due_date: '', assigned_to_id: '' }) }}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={savingLeadTask || !newTaskForm.title.trim()}
                        onClick={async () => {
                          setSavingLeadTask(true)
                          const res = await createLeadTask({
                            leadId: id,
                            title: newTaskForm.title.trim(),
                            description: newTaskForm.description.trim() || undefined,
                            due_date: newTaskForm.due_date || undefined,
                            assigned_to_id: newTaskForm.assigned_to_id || undefined,
                          })
                          setSavingLeadTask(false)
                          if (res?.data?.success) {
                            setNewTaskForm({ title: '', description: '', due_date: '', assigned_to_id: '' })
                            setShowAddTaskInline(false)
                            loadLeadTasks()
                            toast.success('Task added')
                          } else {
                            toast.error(res?.data?.error || 'Failed to add task')
                          }
                        }}
                      >
                        {savingLeadTask ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-3xl border-[#D6D2C8] bg-white text-sm text-[#777777] hover:bg-[#F5F4F0] shadow-sm"
                    onClick={() => setShowAddTaskInline((v) => !v)}
                  >
                    + Add Task
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-3xl border-[#D6D2C8] bg-white text-sm text-[#777777] hover:bg-[#F5F4F0] shadow-sm"
                    onClick={() => setViewAllTasksOpen(true)}
                  >
                    View All Tasks for this lead →
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Readiness card */}
          <div className="rounded-2xl border border-[#D6D2C8] bg-white p-5 flex flex-col gap-[34px] shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-black mb-2.5">Readiness</h3>
              <div className="flex items-end justify-between gap-2 h-16">
                <div className="flex flex-col justify-center gap-0.5">
                  <p className="text-xs text-[#777777]">Score</p>
                  <p className="text-[25px] font-semibold text-black leading-none">{readinessScore}</p>
                </div>
                <div className="flex-1 h-2 rounded-full bg-[#F5F4F0] overflow-hidden ml-2">
                  <div
                    className="h-full rounded-full bg-[#6E7A46]"
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-xs text-[#777777]">Requirements</p>
              <div className="border border-[#D6D2C8] rounded-[10px] overflow-hidden">
                {(() => {
                  const totalAmount = Number(profileData?.serviceAgreement?.total_program_fee ?? 0)
                  const totalReceived = billingPayments.reduce((sum, p) => sum + Number(p.amount_received), 0)
                  const isFullyPaid = billingPayments.some((p) => p.is_full_payment) || (totalAmount > 0 && totalReceived >= totalAmount - 0.01)
                  const paymentPct = totalAmount > 0 ? Math.round((totalReceived / totalAmount) * 100) : 0
                  const paymentLabel =
                    !profileData?.serviceAgreement?.is_activated
                      ? 'Payment'
                      : isFullyPaid
                        ? 'Payment'
                        : billingPayments.length > 0
                          ? `Payment: ${paymentPct}% done`
                          : 'Payment'
                  const paymentStatus =
                    !profileData?.serviceAgreement?.is_activated
                      ? 'Not Started'
                      : isFullyPaid
                        ? 'Done'
                        : billingPayments.length > 0
                          ? `${paymentPct}% done`
                          : 'Incomplete'
                  const paymentStatusStyle =
                    paymentStatus === 'Done'
                      ? 'Done'
                      : paymentStatus === 'Incomplete'
                        ? 'Missing'
                        : paymentStatus === 'Not Started'
                          ? 'Not Started'
                          : 'Pending'
                  const consultScheduledAt = (profileData?.onboarding?.onboarding as { consult_scheduled_at?: string | null })?.consult_scheduled_at
                  const medicalClearanceStatus = !consultScheduledAt
                    ? 'Not Started'
                    : new Date(consultScheduledAt) <= new Date()
                      ? 'Completed'
                      : 'Call scheduled'
                  const medicalClearanceStyle = medicalClearanceStatus === 'Completed' ? 'Done' : medicalClearanceStatus === 'Call scheduled' ? 'Pending' : 'Not Started'
                  const requirements: Array<{ label: string; status: string; statusStyle: string }> = [
                    {
                      label: `Forms Complete (${formsCompletedCount}/4)`,
                      status: formsCompletedCount === 4 ? 'Done' : formsCompletedCount > 0 ? 'Pending' : 'Not Started',
                      statusStyle: formsCompletedCount === 4 ? 'Done' : formsCompletedCount > 0 ? 'Pending' : 'Not Started',
                    },
                    { label: paymentLabel, status: paymentStatus, statusStyle: paymentStatusStyle },
                    { label: 'Labs Uploaded', status: 'Missing', statusStyle: 'Missing' },
                    { label: 'Medical Clearance', status: medicalClearanceStatus, statusStyle: medicalClearanceStyle },
                    { label: 'Travel Details', status: 'Pending', statusStyle: 'Pending' },
                  ]
                  return requirements
                })().map((row) => {
                  const displayText =
                    row.label.startsWith('Payment') && row.status === 'Done'
                      ? 'Completed'
                      : row.label.startsWith('Payment') && row.status === 'Incomplete'
                        ? 'Incomplete'
                        : row.status
                  return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-3 py-3.5 border-b border-[#D6D2C8] last:border-b-0"
                  >
                    <span className="text-sm text-[#2B2820]">{row.label}</span>
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-[10px] ${
                        row.statusStyle === 'Done'
                          ? 'bg-[#DEF8EE] text-[#10B981]'
                          : row.statusStyle === 'Pending'
                          ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                          : row.statusStyle === 'Missing'
                          ? 'bg-[#FEE2E2] text-[#E7000B]'
                          : 'bg-[#FFFBD4] text-[#F59E0B]'
                      }`}
                    >
                      {displayText}
                    </span>
                  </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#D6D2C8]">
              <p className="text-xs text-[#777777]">Last Updated: {lastUpdatedLabel}</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Assign / change treatment (arrival) date – same as onboarding */}
      {profileData?.onboarding?.onboarding?.id && (
        <TreatmentDateCalendar
          onboardingId={profileData.onboarding.onboarding.id}
          patientName={displayName}
          currentTreatmentDate={onboardingTreatmentDate ?? undefined}
          programNumberOfDays={
            profileData?.serviceAgreement?.number_of_days != null
              ? Number(profileData.serviceAgreement.number_of_days)
              : undefined
          }
          open={openTreatmentDateCalendar}
          onOpenChange={setOpenTreatmentDateCalendar}
          onSuccess={() => {
            loadPatientProfile()
            setOpenTreatmentDateCalendar(false)
          }}
        />
      )}

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
                <div className="flex items-center gap-2">
                  <PDFDownloadButton
                    formType={
                      viewingForm === 'onboarding_release' ? 'Release-Form' :
                      viewingForm === 'onboarding_outing' ? 'Outing-Consent' :
                      viewingForm === 'onboarding_social_media' ? 'Social-Media-Release' :
                      viewingForm === 'onboarding_regulations' ? 'Internal-Regulations' :
                      'Informed-Dissent'
                    }
                    patientName={viewFormData?.full_name || `${viewFormData?.first_name || ''}-${viewFormData?.last_name || ''}`}
                    date={viewFormData?.created_at?.split('T')[0]}
                    contentRef={onboardingFormContentRef as React.RefObject<HTMLElement>}
                  >
                    Download PDF
                  </PDFDownloadButton>
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
              </div>
              <div ref={onboardingFormContentRef} className="p-6">
                <OnboardingFormViewContent formType={viewingForm} formData={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-time / Daily form view in iframe popup (from profile pipeline) */}
      {viewFormIframe && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl h-[85vh] min-h-[400px] overflow-hidden flex flex-col">
              <div className="shrink-0 flex items-center justify-between border-b border-[#D6D2C8] px-4 py-3">
                <h2 className="text-lg font-semibold text-[#2B2820] truncate pr-4">{viewFormIframe.title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewFormIframe(null)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="flex-1 min-h-[360px] overflow-auto relative bg-gray-50">
                <iframe
                  src={typeof window !== 'undefined' ? `${window.location.origin}${viewFormIframe.url}` : viewFormIframe.url}
                  title={viewFormIframe.title}
                  className="absolute top-0 left-0 w-full min-h-full border-0 rounded-b-lg"
                  style={{ height: '100%', minHeight: '360px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Agreement Modal – change days, amounts, percentage (no signatures) */}
      <Dialog open={upgradeAgreementOpen} onOpenChange={(open) => {
        setUpgradeAgreementOpen(open)
        if (!open) setUpgradeAgreementForm(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade Agreement</DialogTitle>
            <DialogDescription>
              Update number of days and payment terms. Signatures are not changed.
            </DialogDescription>
          </DialogHeader>
          {upgradeAgreementForm && (() => {
            function parseNum(s: string): number {
              const n = parseFloat(String(s).replace(/[^0-9.]/g, ''))
              return Number.isNaN(n) ? 0 : n
            }
            function applyFeeUpdates(
              f: NonNullable<typeof upgradeAgreementForm>,
              updates: { total_program_fee?: string; deposit_amount?: string; deposit_percentage?: string }
            ): NonNullable<typeof upgradeAgreementForm> {
              const total = updates.total_program_fee !== undefined ? parseNum(updates.total_program_fee) : parseNum(f.total_program_fee)
              let depositAmount: number
              let depositPercentage: number
              if (updates.deposit_amount !== undefined) {
                depositAmount = parseNum(updates.deposit_amount)
                depositPercentage = total > 0 ? Math.round((depositAmount / total) * 100 * 100) / 100 : 0
              } else if (updates.deposit_percentage !== undefined) {
                depositPercentage = parseNum(updates.deposit_percentage)
                depositAmount = total > 0 ? Math.round(total * (depositPercentage / 100) * 100) / 100 : 0
              } else {
                depositAmount = parseNum(f.deposit_amount)
                depositPercentage = total > 0 ? Math.round((depositAmount / total) * 100 * 100) / 100 : parseNum(f.deposit_percentage)
              }
              const remaining = Math.max(0, Math.round((total - depositAmount) * 100) / 100)
              return {
                ...f,
                total_program_fee: updates.total_program_fee ?? f.total_program_fee,
                deposit_amount: updates.deposit_amount !== undefined ? updates.deposit_amount : String(depositAmount),
                deposit_percentage: updates.deposit_percentage !== undefined ? updates.deposit_percentage : String(depositPercentage),
                remaining_balance: String(remaining),
              }
            }
            return (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!upgradeAgreementForm) return
                setUpgradeAgreementSaving(true)
                try {
                  const result = await upgradeServiceAgreement(upgradeAgreementForm)
                  if (result?.data?.success) {
                    toast.success('Agreement updated successfully')
                    setUpgradeAgreementOpen(false)
                    setUpgradeAgreementForm(null)
                    await loadPatientProfile()
                  } else {
                    toast.error(result?.data?.error || result?.serverError || 'Failed to update agreement')
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to update agreement')
                } finally {
                  setUpgradeAgreementSaving(false)
                }
              }}
            >
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upgrade-number_of_days">Number of days</Label>
                  <Input
                    id="upgrade-number_of_days"
                    type="number"
                    min={1}
                    value={upgradeAgreementForm.number_of_days}
                    onChange={(e) => setUpgradeAgreementForm((f) => f ? { ...f, number_of_days: e.target.value } : null)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upgrade-total_program_fee">Total program fee ($)</Label>
                  <Input
                    id="upgrade-total_program_fee"
                    type="text"
                    inputMode="decimal"
                    value={upgradeAgreementForm.total_program_fee}
                    onChange={(e) => {
                      const v = e.target.value
                      setUpgradeAgreementForm((f) => f ? applyFeeUpdates(f, { total_program_fee: v }) : null)
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upgrade-deposit_amount">Deposit amount ($)</Label>
                  <Input
                    id="upgrade-deposit_amount"
                    type="text"
                    inputMode="decimal"
                    value={upgradeAgreementForm.deposit_amount}
                    onChange={(e) => {
                      const v = e.target.value
                      setUpgradeAgreementForm((f) => f ? applyFeeUpdates(f, { deposit_amount: v }) : null)
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upgrade-deposit_percentage">Deposit percentage (%)</Label>
                  <Input
                    id="upgrade-deposit_percentage"
                    type="text"
                    inputMode="decimal"
                    value={upgradeAgreementForm.deposit_percentage}
                    onChange={(e) => {
                      const v = e.target.value
                      setUpgradeAgreementForm((f) => f ? applyFeeUpdates(f, { deposit_percentage: v }) : null)
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upgrade-remaining_balance">Remaining balance ($)</Label>
                  <Input
                    id="upgrade-remaining_balance"
                    type="text"
                    inputMode="decimal"
                    value={upgradeAgreementForm.remaining_balance}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upgrade-payment_method">Payment method</Label>
                  <Input
                    id="upgrade-payment_method"
                    value={upgradeAgreementForm.payment_method}
                    onChange={(e) => setUpgradeAgreementForm((f) => f ? { ...f, payment_method: e.target.value } : null)}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => { setUpgradeAgreementOpen(false); setUpgradeAgreementForm(null) }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={upgradeAgreementSaving}>
                  {upgradeAgreementSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </DialogFooter>
            </form>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* View All Tasks dialog */}
      <Dialog open={viewAllTasksOpen} onOpenChange={(open) => { setViewAllTasksOpen(open); if (!open) { setShowAddTaskInDialog(false); setEditingTaskId(null); setEditTaskForm(null) } }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tasks for this lead</DialogTitle>
            <DialogDescription>View and update task status.</DialogDescription>
          </DialogHeader>
          {isStaff && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setShowAddTaskInDialog((v) => !v)}
              >
                + Add Task
              </Button>
            </div>
          )}
          {isStaff && showAddTaskInDialog && (
            <div className="rounded-[10px] border border-[#D6D2C8] bg-[#F5F4F0] p-3 space-y-3">
              <Input
                placeholder="Task title"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                className="text-sm"
              />
              <Input
                placeholder="Description (optional)"
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newTaskForm.due_date}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="text-sm flex-1"
                />
                <Select
                  value={newTaskForm.assigned_to_id || 'none'}
                  onValueChange={(v: string) => setNewTaskForm((f) => ({ ...f, assigned_to_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className="text-sm w-[140px]">
                    <SelectValue placeholder="Assign to" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddTaskInDialog(false)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={savingLeadTask || !newTaskForm.title.trim()}
                  onClick={async () => {
                    setSavingLeadTask(true)
                    const res = await createLeadTask({
                      leadId: id,
                      title: newTaskForm.title.trim(),
                      description: newTaskForm.description.trim() || undefined,
                      due_date: newTaskForm.due_date || undefined,
                      assigned_to_id: newTaskForm.assigned_to_id || undefined,
                    })
                    setSavingLeadTask(false)
                    if (res?.data?.success) {
                      setNewTaskForm({ title: '', description: '', due_date: '', assigned_to_id: '' })
                      setShowAddTaskInDialog(false)
                      loadLeadTasks()
                      toast.success('Task added')
                    } else {
                      toast.error(res?.data?.error || 'Failed to add task')
                    }
                  }}
                >
                  {savingLeadTask ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 overflow-y-auto min-h-0 flex-1 pr-2">
            {loadingLeadTasks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#777777]" />
              </div>
            ) : leadTasks.length === 0 ? (
              <p className="text-sm text-[#777777] py-4">No tasks yet. Add one from the card.</p>
            ) : (
              leadTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-[10px] border border-[#D6D2C8] px-3.5 py-2.5 flex flex-col gap-1.5 hover:bg-[#F5F4F0] transition-colors"
                >
                  {editingTaskId === task.id && editTaskForm ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Task title"
                        value={editTaskForm.title}
                        onChange={(e) => setEditTaskForm((f) => f ? { ...f, title: e.target.value } : null)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={editTaskForm.description}
                        onChange={(e) => setEditTaskForm((f) => f ? { ...f, description: e.target.value } : null)}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={editTaskForm.due_date}
                          onChange={(e) => setEditTaskForm((f) => f ? { ...f, due_date: e.target.value } : null)}
                          className="text-sm flex-1"
                        />
                        <Select
                          value={editTaskForm.assigned_to_id || 'none'}
                          onValueChange={(v: string) => setEditTaskForm((f) => f ? { ...f, assigned_to_id: v === 'none' ? '' : v } : null)}
                        >
                          <SelectTrigger className="text-sm w-[140px]">
                            <SelectValue placeholder="Assign to" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {staffList.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingTaskId(null); setEditTaskForm(null) }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={savingLeadTask || !editTaskForm.title.trim()}
                          onClick={async () => {
                            setSavingLeadTask(true)
                            const res = await updateLeadTask({
                              taskId: task.id,
                              title: editTaskForm.title.trim(),
                              description: editTaskForm.description.trim() || null,
                              due_date: editTaskForm.due_date || null,
                              assigned_to_id: editTaskForm.assigned_to_id || null,
                            })
                            setSavingLeadTask(false)
                            if (res?.data?.success) {
                              setEditingTaskId(null)
                              setEditTaskForm(null)
                              loadLeadTasks()
                              toast.success('Task updated')
                            } else {
                              toast.error(res?.data?.error || 'Failed to update task')
                            }
                          }}
                        >
                          {savingLeadTask ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-[#2B2820]">{task.title}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-[#777777]"
                            onClick={() => {
                              setEditingTaskId(task.id)
                              setEditTaskForm({
                                title: task.title,
                                description: task.description || '',
                                due_date: task.due_date ? task.due_date.slice(0, 10) : '',
                                assigned_to_id: task.assigned_to_id || '',
                              })
                            }}
                          >
                            Edit
                          </Button>
                          <Select
                            value={task.status}
                            onValueChange={async (value: 'todo' | 'in_progress' | 'done') => {
                              setUpdatingStatusTaskId(task.id)
                              const res = await updateLeadTaskStatus({ taskId: task.id, status: value })
                              setUpdatingStatusTaskId(null)
                              if (res?.data?.success) loadLeadTasks()
                              else toast.error(res?.data?.error || 'Failed to update status')
                            }}
                            disabled={updatingStatusTaskId === task.id}
                          >
                            <SelectTrigger className="h-7 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To do</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {task.description && <p className="text-xs text-[#777777]">{task.description}</p>}
                      <span className="text-xs text-[#777777]">
                        {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                        {task.created_by_name && ` • By ${task.created_by_name}`}
                        {task.assigned_to_name && ` → ${task.assigned_to_name}`}
                      </span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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

  if (formType === 'onboarding_regulations') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Internal Regulations
        </h1>
        <p className="text-center text-gray-600 mb-8">Iboga Wellness Institute</p>

        {/* Participant Information */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Patient Information</h2>
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
              <label className="text-base font-medium text-gray-700 block mb-1">Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.email || 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-700 block mb-1">Phone Number</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                {formData.phone_number || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Chapter I: General Provisions */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">CHAPTER I: GENERAL PROVISIONS</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
            <p><strong>Article 1.</strong> These regulations establish the rules of coexistence, rights, and obligations of patients, staff, and visitors within the Iboga Wellness Institute clinic.</p>
            <p><strong>Article 2.</strong> The clinic&apos;s objective is to provide comprehensive treatment for the rehabilitation of individuals with addiction problems, promoting their social reintegration and improving their quality of life.</p>
            <p><strong>Article 3.</strong> These regulations are mandatory for all persons within the clinic&apos;s facilities.</p>
          </div>
        </div>

        {/* Chapter II: Rights and Obligations */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">CHAPTER II: RIGHTS AND OBLIGATIONS OF PATIENTS</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-3">
            <div>
              <p className="font-medium">Article 4. Patients&apos; rights:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>To receive dignified, respectful, and non-discriminatory treatment.</li>
                <li>To have access to adequate medical and psychological care.</li>
                <li>To participate in scheduled therapeutic and recreational activities.</li>
                <li>To maintain communication with their families during established hours.</li>
                <li>To receive information about their treatment and progress.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Article 5. Patients&apos; obligations:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>To comply with the established rules and schedules.</li>
                <li>To respect other patients, staff, and clinic facilities.</li>
                <li>To refrain from consuming any prohibited substances.</li>
                <li>To actively participate in their rehabilitation process.</li>
                <li>To maintain personal hygiene and cleanliness in their assigned space.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Chapter III: Rules of Coexistence */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">CHAPTER III: RULES OF COEXISTENCE</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-3">
            <div>
              <p className="font-medium">Article 6. The following are strictly prohibited:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>The consumption, possession, or distribution of drugs, coffee, and alcohol.</li>
                <li>Physical or verbal violence against anyone within the clinic.</li>
                <li>The destruction or misuse of facilities.</li>
                <li>Romantic or sexual relationships between patients during their stay.</li>
                <li>Possession of dangerous objects.</li>
              </ul>
            </div>
            <p><strong>Article 7.</strong> Patients must follow the assigned therapeutic program without interruptions or unjustified excuses.</p>
            <p><strong>Article 8.</strong> Clothing must be appropriate and respectful, avoiding provocative attire or messages deemed inappropriate.</p>
            <p><strong>Article 9.</strong> Family visits must take place only during established hours and under staff supervision.</p>
          </div>
        </div>

        {/* Chapter IV: Staff Responsibilities */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">CHAPTER IV: STAFF RESPONSIBILITIES</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
            <p className="font-medium">Article 10. Clinic staff is responsible for:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Providing professional and ethical care at all times.</li>
              <li>Respecting patient confidentiality.</li>
              <li>Promoting a safe and violence-free environment.</li>
              <li>Enforcing the regulations fairly and justly.</li>
              <li>Reporting any rule violations to the clinic&apos;s management.</li>
            </ul>
          </div>
        </div>

        {/* Chapter V: Sanctions */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">CHAPTER V: SANCTIONS AND DISCIPLINARY MEASURES</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
            <div>
              <p className="font-medium">Article 11. In case of non-compliance with the regulations, proportional sanctions will be applied, which may include:</p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Verbal or written warnings.</li>
                <li>Temporary restriction of privileges.</li>
                <li>Suspension of visits.</li>
                <li>Expulsion from the program in severe cases.</li>
              </ul>
            </div>
            <p><strong>Article 12.</strong> Repeated serious offenses will be grounds for treatment review and possible termination.</p>
          </div>
        </div>

        {/* Chapter VI: Final Provisions */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">CHAPTER VI: FINAL PROVISIONS</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
            <p><strong>Article 13.</strong> Any situation not covered in these regulations will be evaluated by the clinic&apos;s management.</p>
            <p><strong>Article 14.</strong> These regulations take effect upon approval and dissemination among patients and staff.</p>
            <p><strong>Article 15.</strong> Acceptance of these regulations is a mandatory condition for admission and continued stay at Iboga Wellness Institute.</p>
          </div>
        </div>

        {/* Acknowledgment of Acceptance */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 border-b pb-2">Acknowledgment of Acceptance</h2>
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.regulations_read_understood ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-base text-gray-900">I have read and understood all the regulations above</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.rights_acknowledged ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-base text-gray-900">I acknowledge my rights as a patient</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.obligations_acknowledged ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-base text-gray-900">I acknowledge my obligations as a patient</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.coexistence_rules_acknowledged ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-base text-gray-900">I acknowledge and agree to follow the rules of coexistence</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.sanctions_acknowledged ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-base text-gray-900">I understand and accept the sanctions for non-compliance</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.acceptance_confirmed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">I confirm my acceptance of these regulations as a condition for admission and continued stay</p>
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
