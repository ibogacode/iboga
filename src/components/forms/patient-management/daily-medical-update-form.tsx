'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SignaturePad } from '@/components/forms/signature-pad'
import { 
  startDailyMedicalUpdate, 
  submitDailyMedicalUpdate,
  updateDailyMedicalUpdate,
  getCurrentStaffMemberName
} from '@/actions/patient-management.action'
import { 
  dailyMedicalUpdateSchema, 
  startDailyMedicalUpdateSchema,
  type DailyMedicalUpdateInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Calendar, Plus, X, Sunrise, Sun, Moon, Activity, Heart, Droplets, FileText, TrendingUp, Pencil, History, Save, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { MultiFileUpload } from '@/components/forms/multi-file-upload'
import { uploadDocumentClient } from '@/lib/supabase/client-storage'
import { useUser } from '@/hooks/use-user.hook'
import { FormEditHistoryDialog } from '@/components/forms/form-edit-history-dialog'

interface DailyMedicalUpdateFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  formDate: string // YYYY-MM-DD
  programType: 'neurological' | 'mental_health' | 'addiction'
  initialData?: Partial<DailyMedicalUpdateInput> & { 
    id?: string
    edit_count?: number
    edited_at?: string
    edited_by?: string
  }
  isCompleted?: boolean
  isStarted?: boolean
  onSuccess?: () => void
  /** When true (e.g. discharged patient review), form is read-only and Edit is hidden */
  reviewOnly?: boolean
}

export function DailyMedicalUpdateForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  formDate,
  programType,
  initialData, 
  isCompleted,
  isStarted,
  onSuccess,
  reviewOnly = false,
}: DailyMedicalUpdateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const { profile } = useUser()

  // Check if user can edit (Owner, Admin, Manager). Disabled when reviewOnly (e.g. discharged).
  const canEdit = !reviewOnly && !!profile?.role && ['owner', 'admin', 'manager'].includes(profile.role)

  const form = useForm<DailyMedicalUpdateInput>({
    resolver: zodResolver(dailyMedicalUpdateSchema) as any,
    defaultValues: {
      management_id: managementId,
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      form_date: formDate,
      checked_vitals: initialData?.checked_vitals || false,
      checked_blood_pressure: initialData?.checked_blood_pressure || false,
      checked_heart_rate: initialData?.checked_heart_rate || false,
      checked_oxygen_saturation: initialData?.checked_oxygen_saturation || false,
      did_they_feel_hungry: initialData?.did_they_feel_hungry || '',
      using_bathroom_normally: initialData?.using_bathroom_normally || '',
      hydrating: initialData?.hydrating || '',
      experiencing_tremors_motor_function: initialData?.experiencing_tremors_motor_function || '',
      withdrawal_symptoms: initialData?.withdrawal_symptoms || '',
      how_guest_looks: initialData?.how_guest_looks || null,
      energy_level: initialData?.energy_level || null,
      how_guest_says_they_feel: initialData?.how_guest_says_they_feel || '',
      morning_client_present: initialData?.morning_client_present ?? true,
      morning_blood_pressure: initialData?.morning_blood_pressure || '',
      morning_heart_rate: initialData?.morning_heart_rate || null,
      morning_oxygen_saturation: initialData?.morning_oxygen_saturation || null,
      morning_vital_signs: initialData?.morning_vital_signs || '',
      morning_symptoms: initialData?.morning_symptoms || '',
      morning_evolution: initialData?.morning_evolution || '',
      afternoon_client_present: initialData?.afternoon_client_present ?? true,
      afternoon_blood_pressure: initialData?.afternoon_blood_pressure || '',
      afternoon_heart_rate: initialData?.afternoon_heart_rate || null,
      afternoon_oxygen_saturation: initialData?.afternoon_oxygen_saturation || null,
      afternoon_vital_signs: initialData?.afternoon_vital_signs || '',
      afternoon_symptoms: initialData?.afternoon_symptoms || '',
      afternoon_evolution: initialData?.afternoon_evolution || '',
      night_client_present: initialData?.night_client_present ?? true,
      night_blood_pressure: initialData?.night_blood_pressure || '',
      night_heart_rate: initialData?.night_heart_rate || null,
      night_oxygen_saturation: initialData?.night_oxygen_saturation || null,
      night_vital_signs: initialData?.night_vital_signs || '',
      night_symptoms: initialData?.night_symptoms || '',
      night_evolution: initialData?.night_evolution || '',
      ibogaine_given: initialData?.ibogaine_given || 
        (initialData?.ibogaine_doses && initialData.ibogaine_doses.length > 0 && initialData.ibogaine_doses.some((d: any) => d.dose > 0)) ? 'yes' :
        (initialData?.ibogaine_dose && initialData.ibogaine_dose > 0) ? 'yes' : 'no',
      ibogaine_doses: initialData?.ibogaine_doses 
        ? (Array.isArray(initialData.ibogaine_doses) ? initialData.ibogaine_doses : [])
        : (initialData?.ibogaine_dose && initialData?.ibogaine_time 
          ? [{ dose: initialData.ibogaine_dose, time: initialData.ibogaine_time }] 
          : [{ dose: 0, time: '' }]),
      ibogaine_frequency: initialData?.ibogaine_frequency || null,
      ibogaine_dose: initialData?.ibogaine_dose || null,
      ibogaine_time: initialData?.ibogaine_time || '',
      ibogaine_dose_time: initialData?.ibogaine_dose_time || '',
      medication_schedule: initialData?.medication_schedule || '',
      solutions_iv_saline_nadh: initialData?.solutions_iv_saline_nadh || '',
      medical_indications: initialData?.medical_indications || '',
      additional_observations_notes: initialData?.additional_observations_notes || '',
      vitals_photos: (() => {
        if (initialData?.vitals_photos) {
          if (typeof initialData.vitals_photos === 'string') {
            try {
              return JSON.parse(initialData.vitals_photos)
            } catch {
              return []
            }
          }
          return Array.isArray(initialData.vitals_photos) ? initialData.vitals_photos : []
        }
        // Migrate from old single URL field if exists
        if (initialData?.photo_of_vitals_medical_notes_url) {
          return [{
            url: initialData.photo_of_vitals_medical_notes_url,
            fileName: 'Vitals Photo',
            fileType: 'image/jpeg'
          }]
        }
        return []
      })(),
      photo_of_vitals_medical_notes_url: initialData?.photo_of_vitals_medical_notes_url || '',
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || '',
      submitted_by_name: initialData?.submitted_by_name || '',
      morning_inspected_by: initialData?.morning_inspected_by || '',
      afternoon_inspected_by: initialData?.afternoon_inspected_by || '',
      night_inspected_by: initialData?.night_inspected_by || '',
    },
  })

  // Inject slider styles for energy level
  useEffect(() => {
    const styleId = 'daily-medical-energy-slider-styles'
    if (document.getElementById(styleId)) return // Styles already injected

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* Energy Level Slider */
      .energy-level-slider-red::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(239, 68, 68);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        transition: all 0.2s ease;
      }
      .energy-level-slider-red::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
      }
      .energy-level-slider-red::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(239, 68, 68);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        transition: all 0.2s ease;
      }
      .energy-level-slider-red::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
      }
      .energy-level-slider-orange::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(249, 115, 22);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
        transition: all 0.2s ease;
      }
      .energy-level-slider-orange::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(249, 115, 22, 0.4);
      }
      .energy-level-slider-orange::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(249, 115, 22);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
        transition: all 0.2s ease;
      }
      .energy-level-slider-orange::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(249, 115, 22, 0.4);
      }
      .energy-level-slider-green::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(16, 185, 129);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        transition: all 0.2s ease;
      }
      .energy-level-slider-green::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .energy-level-slider-green::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(16, 185, 129);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        transition: all 0.2s ease;
      }
      .energy-level-slider-green::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .energy-level-slider-gray::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(156, 163, 175);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }
      .energy-level-slider-gray::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgb(156, 163, 175);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  // Reset form values when initialData changes (for viewing existing forms)
  useEffect(() => {
    if (initialData && isStarted) {
      form.reset({
        management_id: managementId,
        patient_first_name: patientFirstName,
        patient_last_name: patientLastName,
        form_date: formDate,
        checked_vitals: initialData.checked_vitals || false,
        checked_blood_pressure: initialData.checked_blood_pressure || false,
        checked_heart_rate: initialData.checked_heart_rate || false,
        checked_oxygen_saturation: initialData.checked_oxygen_saturation || false,
        did_they_feel_hungry: initialData.did_they_feel_hungry || '',
        using_bathroom_normally: initialData.using_bathroom_normally || '',
        hydrating: initialData.hydrating || '',
        experiencing_tremors_motor_function: initialData.experiencing_tremors_motor_function || '',
        withdrawal_symptoms: initialData.withdrawal_symptoms || '',
        how_guest_looks: initialData.how_guest_looks || null,
        energy_level: initialData.energy_level || null,
        how_guest_says_they_feel: initialData.how_guest_says_they_feel || '',
        morning_client_present: initialData.morning_client_present ?? true,
        morning_blood_pressure: initialData.morning_blood_pressure || '',
        morning_heart_rate: initialData.morning_heart_rate || null,
        morning_oxygen_saturation: initialData.morning_oxygen_saturation || null,
        morning_vital_signs: initialData.morning_vital_signs || '',
        morning_symptoms: initialData.morning_symptoms || '',
        morning_evolution: initialData.morning_evolution || '',
        afternoon_client_present: initialData.afternoon_client_present ?? true,
        afternoon_blood_pressure: initialData.afternoon_blood_pressure || '',
        afternoon_heart_rate: initialData.afternoon_heart_rate || null,
        afternoon_oxygen_saturation: initialData.afternoon_oxygen_saturation || null,
        afternoon_vital_signs: initialData.afternoon_vital_signs || '',
        afternoon_symptoms: initialData.afternoon_symptoms || '',
        afternoon_evolution: initialData.afternoon_evolution || '',
        night_client_present: initialData.night_client_present ?? true,
        night_blood_pressure: initialData.night_blood_pressure || '',
        night_heart_rate: initialData.night_heart_rate || null,
        night_oxygen_saturation: initialData.night_oxygen_saturation || null,
        night_vital_signs: initialData.night_vital_signs || '',
        night_symptoms: initialData.night_symptoms || '',
        night_evolution: initialData.night_evolution || '',
        ibogaine_given: initialData.ibogaine_given ?? (initialData.ibogaine_doses && Array.isArray(initialData.ibogaine_doses) && initialData.ibogaine_doses.length > 0 && initialData.ibogaine_doses.some((d: { dose?: number }) => (d.dose ?? 0) > 0) ? 'yes' : (initialData.ibogaine_dose && initialData.ibogaine_dose > 0 ? 'yes' : 'no')),
        ibogaine_doses: initialData.ibogaine_doses 
          ? (Array.isArray(initialData.ibogaine_doses) ? initialData.ibogaine_doses : [])
          : (initialData.ibogaine_dose && initialData.ibogaine_time 
            ? [{ dose: initialData.ibogaine_dose, time: initialData.ibogaine_time }] 
            : [{ dose: 0, time: '' }]),
        ibogaine_frequency: initialData.ibogaine_frequency || null,
        ibogaine_dose: initialData.ibogaine_dose || null,
        ibogaine_time: initialData.ibogaine_time || '',
        ibogaine_dose_time: initialData.ibogaine_dose_time || '',
        medication_schedule: initialData.medication_schedule || '',
        solutions_iv_saline_nadh: initialData.solutions_iv_saline_nadh || '',
        medical_indications: initialData.medical_indications || '',
        additional_observations_notes: initialData.additional_observations_notes || '',
        vitals_photos: (() => {
          if (initialData.vitals_photos) {
            if (typeof initialData.vitals_photos === 'string') {
              try {
                return JSON.parse(initialData.vitals_photos)
              } catch {
                return []
              }
            }
            return Array.isArray(initialData.vitals_photos) ? initialData.vitals_photos : []
          }
          // Migrate from old single URL field if exists
          if (initialData.photo_of_vitals_medical_notes_url) {
            return [{
              url: initialData.photo_of_vitals_medical_notes_url,
              fileName: 'Vitals Photo',
              fileType: 'image/jpeg'
            }]
          }
          return []
        })(),
        photo_of_vitals_medical_notes_url: initialData.photo_of_vitals_medical_notes_url || '',
        signature_data: initialData.signature_data || '',
        signature_date: initialData.signature_date || '',
        submitted_by_name: initialData.submitted_by_name || '',
        morning_inspected_by: initialData.morning_inspected_by || '',
        afternoon_inspected_by: initialData.afternoon_inspected_by || '',
        night_inspected_by: initialData.night_inspected_by || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, isStarted])

  // Initialize ibogaine_doses if empty
  useEffect(() => {
    const currentDoses = form.watch('ibogaine_doses')
    if (!currentDoses || currentDoses.length === 0) {
      // If we have old single dose/time data, convert it
      const oldDose = form.getValues('ibogaine_dose')
      const oldTime = form.getValues('ibogaine_time')
      if (oldDose && oldTime) {
        form.setValue('ibogaine_doses', [{ dose: oldDose, time: oldTime }], { shouldValidate: false, shouldDirty: false })
      } else {
        // Otherwise, add one empty dose entry
        form.setValue('ibogaine_doses', [{ dose: 0, time: '' }], { shouldValidate: false, shouldDirty: false })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autofill staff member name for inspector fields and submitted_by_name if empty
  useEffect(() => {
    async function loadStaffMemberName() {
      try {
        const result = await getCurrentStaffMemberName({})
        if (result?.data?.success && result.data.data?.fullName) {
          const staffName = result.data.data.fullName
          
          // Autofill inspector fields if they're empty
          if (!form.getValues('morning_inspected_by')?.trim()) {
            form.setValue('morning_inspected_by', staffName, { shouldValidate: false, shouldDirty: false })
          }
          if (!form.getValues('afternoon_inspected_by')?.trim()) {
            form.setValue('afternoon_inspected_by', staffName, { shouldValidate: false, shouldDirty: false })
          }
          if (!form.getValues('night_inspected_by')?.trim()) {
            form.setValue('night_inspected_by', staffName, { shouldValidate: false, shouldDirty: false })
          }
          // Autofill submitted_by_name if empty
          if (!form.getValues('submitted_by_name')?.trim()) {
            form.setValue('submitted_by_name', staffName, { shouldValidate: false, shouldDirty: false })
          }
        }
      } catch (error) {
        console.error('Error loading staff member name:', error)
      }
    }

    if (isStarted && !isCompleted) {
      loadStaffMemberName()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted, isCompleted])

  async function handleStartReport() {
    setIsStarting(true)
    try {
      const result = await startDailyMedicalUpdate({ 
        management_id: managementId, 
        form_date: formDate 
      })
      if (result?.data?.success) {
        // Refresh the page to load the started form
        window.location.reload()
      } else {
        toast.error(result?.data?.error || 'Failed to start report')
      }
    } catch (error) {
      console.error('Error starting report:', error)
      toast.error('An error occurred while starting the report')
    } finally {
      setIsStarting(false)
    }
  }

  // Auto-start the form if not already started
  useEffect(() => {
    if (!isStarted && !isStarting) {
      handleStartReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted])

  // Check if vitals are complete for submission
  // For each time period: either client is not present OR vitals are recorded
  const watchValues = form.watch()
  
  const isMorningComplete = () => {
    const isClientPresent = watchValues.morning_client_present
    if (!isClientPresent) return true // Client not present - valid
    // Client present - check if any vitals are recorded
    const hasVitals = (
      (watchValues.morning_blood_pressure && watchValues.morning_blood_pressure.trim() !== '') ||
      (watchValues.morning_heart_rate !== null && watchValues.morning_heart_rate !== undefined) ||
      (watchValues.morning_oxygen_saturation !== null && watchValues.morning_oxygen_saturation !== undefined)
    )
    return hasVitals
  }

  const isAfternoonComplete = () => {
    const isClientPresent = watchValues.afternoon_client_present
    if (!isClientPresent) return true // Client not present - valid
    // Client present - check if any vitals are recorded
    const hasVitals = (
      (watchValues.afternoon_blood_pressure && watchValues.afternoon_blood_pressure.trim() !== '') ||
      (watchValues.afternoon_heart_rate !== null && watchValues.afternoon_heart_rate !== undefined) ||
      (watchValues.afternoon_oxygen_saturation !== null && watchValues.afternoon_oxygen_saturation !== undefined)
    )
    return hasVitals
  }

  const isNightComplete = () => {
    const isClientPresent = watchValues.night_client_present
    if (!isClientPresent) return true // Client not present - valid
    // Client present - check if any vitals are recorded
    const hasVitals = (
      (watchValues.night_blood_pressure && watchValues.night_blood_pressure.trim() !== '') ||
      (watchValues.night_heart_rate !== null && watchValues.night_heart_rate !== undefined) ||
      (watchValues.night_oxygen_saturation !== null && watchValues.night_oxygen_saturation !== undefined)
    )
    return hasVitals
  }

  const canSubmit = isMorningComplete() && isAfternoonComplete() && isNightComplete()

  async function onSaveDraft(data: DailyMedicalUpdateInput) {
    setIsSavingDraft(true)
    try {
      // Use updateDailyMedicalUpdate which handles both create and update
      // First ensure the form is started if it doesn't exist
      if (!isStarted) {
        const startResult = await startDailyMedicalUpdate({ 
          management_id: managementId, 
          form_date: formDate 
        })
        if (!startResult?.data?.success) {
          toast.error('Failed to start form. Please try again.')
          setIsSavingDraft(false)
          return
        }
      }

      // Clean up ibogaine_doses: remove entries with empty time or dose 0 and empty time
      // This allows saving draft even if dosage isn't filled in yet
      // If ibogaine_given is "no", clear the doses
      const cleanedData = {
        ...data,
        ibogaine_doses: data.ibogaine_given === 'no' 
          ? null 
          : (data.ibogaine_doses?.filter((dose) => {
              // Keep entries that have either a valid dose (> 0) or a time
              return (dose.dose && dose.dose > 0) || (dose.time && dose.time.trim() !== '')
            }) || null),
      }

      // If all doses were filtered out, set to null/empty array
      if (cleanedData.ibogaine_doses && cleanedData.ibogaine_doses.length === 0) {
        cleanedData.ibogaine_doses = null
      }

      const result = await updateDailyMedicalUpdate({
        ...cleanedData,
        management_id: managementId,
        form_date: formDate,
        is_completed: false, // Keep as draft - don't mark as completed
      } as any)
      
      if (result?.data?.success) {
        toast.success('Draft saved successfully.')
        // Redirect to daily forms page
        router.push(`/patient-management/${managementId}/daily-forms`)
      } else {
        const errorMessage = result?.data?.error || 'Failed to save draft'
        // Show detailed error message to help user understand what went wrong
        toast.error(`Unable to save draft: ${errorMessage}`, {
          duration: 5000,
        })
        console.error('Save draft error:', errorMessage, result?.data)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving draft'
      // Show detailed error message
      toast.error(`Unable to save draft: ${errorMessage}`, {
        duration: 5000,
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  async function onSubmit(data: DailyMedicalUpdateInput) {
    setIsSubmitting(true)
    try {
      // Get current staff member name for submitted_by_name
      const staffResult = await getCurrentStaffMemberName({})
      const submittedByName = staffResult?.data?.success && staffResult.data.data?.fullName 
        ? staffResult.data.data.fullName 
        : data.submitted_by_name || ''

      // Clean up ibogaine_doses: if ibogaine_given is "no", clear the doses
      const cleanedData = {
        ...data,
        ibogaine_doses: data.ibogaine_given === 'no' 
          ? null 
          : (data.ibogaine_doses?.filter((dose) => {
              // Keep entries that have both a valid dose (> 0) and a time
              return (dose.dose && dose.dose > 0) && (dose.time && dose.time.trim() !== '')
            }) || null),
      }

      // If all doses were filtered out and ibogaine_given is "yes", set to empty array
      if (cleanedData.ibogaine_given === 'yes' && cleanedData.ibogaine_doses && cleanedData.ibogaine_doses.length === 0) {
        cleanedData.ibogaine_doses = null
      }

      let result
      if (isEditMode && isCompleted) {
        // Use update action for editing completed forms
        result = await updateDailyMedicalUpdate({
          ...cleanedData,
          management_id: managementId,
          form_date: formDate,
          is_completed: true, // Keep form as completed
          submitted_by_name: submittedByName,
        } as any)
      } else {
        // Use submit action for new submissions
        result = await submitDailyMedicalUpdate({
          ...cleanedData,
          submitted_by_name: submittedByName,
        } as any)
      }
      if (result?.data?.success) {
        toast.success(isEditMode ? 'Form updated successfully' : 'Daily medical update submitted successfully')
        setIsEditMode(false)
        onSuccess?.()
      } else {
        toast.error(result?.data?.error || 'Failed to submit form')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('An error occurred while submitting the form')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while auto-starting
  if (!isStarted) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-3" />
          <span className="text-gray-600">Preparing form...</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
      {/* Edit Notification Banner */}
      {initialData?.edit_count && initialData.edit_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              This form has been edited {initialData.edit_count} time(s)
            </span>
            {initialData.edited_at && (
              <span className="text-xs text-amber-600 ml-auto">
                Last edited: {new Date(initialData.edited_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status Badge and Edit Buttons */}
      <div className="flex items-center justify-between">
        {isCompleted && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        )}
        {isCompleted && canEdit && !isEditMode && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Form
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowEditHistory(true)}>
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
          </div>
        )}
        {isEditMode && (
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => { 
                setIsEditMode(false)
                form.reset()
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Patient Name</Label>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {patientFirstName} {patientLastName}
          </p>
        </div>
        <div>
          <Label htmlFor="form_date">Date *</Label>
          <Input
            id="form_date"
            type="date"
            value={formDate}
            disabled
            className="bg-gray-50"
          />
        </div>
      </div>

      {/* General Observations */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="did_they_feel_hungry">Did they feel hungry?</Label>
            <Textarea
              id="did_they_feel_hungry"
              {...form.register('did_they_feel_hungry')}
              rows={2}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="using_bathroom_normally">Using bathroom normally?</Label>
            <Textarea
              id="using_bathroom_normally"
              {...form.register('using_bathroom_normally')}
              rows={2}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="hydrating">Hydrating?</Label>
            <Textarea
              id="hydrating"
              {...form.register('hydrating')}
              rows={2}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>

          {programType === 'neurological' && (
            <div>
              <Label htmlFor="experiencing_tremors_motor_function">
                Experiencing any tremors, muscle stiffness, or relief in motor function?
              </Label>
              <Textarea
                id="experiencing_tremors_motor_function"
                {...form.register('experiencing_tremors_motor_function')}
                rows={2}
                disabled={isCompleted && !isEditMode}
                className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
              />
            </div>
          )}

          <div>
            <Label htmlFor="withdrawal_symptoms">Withdrawal Symptoms (If Applicable)</Label>
            <Textarea
              id="withdrawal_symptoms"
              {...form.register('withdrawal_symptoms')}
              rows={2}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="how_guest_looks">How Guest Looks (1–10)</Label>
            {(() => {
              const looksValue = form.watch('how_guest_looks') ?? null
              const getColorForValue = (value: number | null): { color: string; rgb: string } => {
                if (!value) return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
                if (value >= 1 && value <= 3) return { color: 'red', rgb: 'rgb(239, 68, 68)' }
                if (value >= 4 && value <= 6) return { color: 'orange', rgb: 'rgb(249, 115, 22)' }
                if (value >= 7 && value <= 10) return { color: 'green', rgb: 'rgb(16, 185, 129)' }
                return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
              }
              const colorInfo = getColorForValue(looksValue)
              const progressPercent = looksValue ? ((looksValue - 1) * (100 / 9)) : 0
              const displayColor = looksValue ? colorInfo.color : 'gray'
              const displayColorClass = displayColor === 'red' ? 'text-red-600' : 
                                       displayColor === 'orange' ? 'text-orange-600' : 
                                       displayColor === 'green' ? 'text-emerald-600' : 'text-gray-600'
              
              return (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-gray-500 font-medium">1</span>
                    <div className="flex items-baseline gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className={`text-2xl font-bold ${displayColorClass} min-w-[2.5rem] text-center`}>
                        {looksValue || '--'}
                      </span>
                      <span className="text-sm text-gray-500">/ 10</span>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">10</span>
                  </div>
                  <div className="relative px-1">
                    <input
                      id="how_guest_looks"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      {...form.register('how_guest_looks', { 
                        valueAsNumber: true
                      })}
                      disabled={isCompleted && !isEditMode}
                      className={`energy-level-slider energy-level-slider-${colorInfo.color} w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer ${isCompleted && !isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        background: `linear-gradient(to right, ${colorInfo.rgb} 0%, ${colorInfo.rgb} ${progressPercent}%, rgb(229, 231, 235) ${progressPercent}%, rgb(229, 231, 235) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-1">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              )
            })()}
          </div>

          <div>
            <Label htmlFor="energy_level">Energy Level (1–10)</Label>
            {(() => {
              const energyValue = form.watch('energy_level') ?? null
              const getColorForValue = (value: number | null): { color: string; rgb: string } => {
                if (!value) return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
                if (value >= 1 && value <= 3) return { color: 'red', rgb: 'rgb(239, 68, 68)' }
                if (value >= 4 && value <= 6) return { color: 'orange', rgb: 'rgb(249, 115, 22)' }
                if (value >= 7 && value <= 10) return { color: 'green', rgb: 'rgb(16, 185, 129)' }
                return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
              }
              const colorInfo = getColorForValue(energyValue)
              const progressPercent = energyValue ? ((energyValue - 1) * (100 / 9)) : 0
              const displayColor = energyValue ? colorInfo.color : 'gray'
              const displayColorClass = displayColor === 'red' ? 'text-red-600' : 
                                       displayColor === 'orange' ? 'text-orange-600' : 
                                       displayColor === 'green' ? 'text-emerald-600' : 'text-gray-600'
              
              return (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-gray-500 font-medium">1</span>
                    <div className="flex items-baseline gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className={`text-2xl font-bold ${displayColorClass} min-w-[2.5rem] text-center`}>
                        {energyValue || '--'}
                      </span>
                      <span className="text-sm text-gray-500">/ 10</span>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">10</span>
                  </div>
                  <div className="relative px-1">
                    <input
                      id="energy_level"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      {...form.register('energy_level', { 
                        valueAsNumber: true
                      })}
                      disabled={isCompleted && !isEditMode}
                      className={`energy-level-slider energy-level-slider-${colorInfo.color} w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer ${isCompleted && !isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        background: `linear-gradient(to right, ${colorInfo.rgb} 0%, ${colorInfo.rgb} ${progressPercent}%, rgb(229, 231, 235) ${progressPercent}%, rgb(229, 231, 235) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-1">
                    <span>Low Energy</span>
                    <span>High Energy</span>
                  </div>
                </div>
              )
            })()}
          </div>

          <div>
            <Label htmlFor="how_guest_says_they_feel">How guest says they feel</Label>
            <Textarea
              id="how_guest_says_they_feel"
              {...form.register('how_guest_says_they_feel')}
              rows={2}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Patient Observations - Vitals & Symptoms (3 times per day) */}
      <div className="border-t pt-6 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            Patient Observations
          </h3>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-emerald-700">Enter vitals and observations 3 times per day:</span> Morning, Afternoon, and Night
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Morning Card */}
          {(() => {
            const isClientPresent = form.watch('morning_client_present')
            const isClientNotPresent = !isClientPresent
            return (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Sunrise className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Morning</h4>
                      <p className="text-xs text-gray-600">Early day observations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="morning_client_not_present"
                        checked={isClientNotPresent}
                        onCheckedChange={(checked) => {
                          form.setValue('morning_client_present', !(checked as boolean))
                          if (checked) {
                            form.setValue('morning_blood_pressure', '')
                            form.setValue('morning_heart_rate', null)
                            form.setValue('morning_oxygen_saturation', null)
                          }
                        }}
                        disabled={isCompleted && !isEditMode}
                      />
                      <Label htmlFor="morning_client_not_present" className="text-sm font-medium cursor-pointer text-amber-700">
                        Client not present
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Vital Signs Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-emerald-600" />
                      <h5 className="font-semibold text-gray-900">Vital Signs</h5>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="morning_blood_pressure" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Blood Pressure
                        </Label>
                        <Input
                          id="morning_blood_pressure"
                          {...form.register('morning_blood_pressure')}
                          placeholder="-/-"
                          disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                          className={`h-10 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="morning_heart_rate" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          Heart Rate
                        </Label>
                        <Input
                          id="morning_heart_rate"
                          type="number"
                          min={30}
                          max={200}
                          {...form.register('morning_heart_rate', { valueAsNumber: true })}
                          placeholder="-"
                          disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                          className={`h-10 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                        />
                        <p className="text-xs text-gray-500">bpm</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="morning_oxygen_saturation" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          O2 Saturation
                        </Label>
                        <div className="relative">
                          <Input
                            id="morning_oxygen_saturation"
                            type="number"
                            min={0}
                            max={100}
                            {...form.register('morning_oxygen_saturation', { valueAsNumber: true })}
                            placeholder="-"
                            disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                            className={`h-10 pr-8 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-200">
                      <Label htmlFor="morning_inspected_by" className="text-xs font-medium text-gray-700">
                        Inspected by:
                      </Label>
                      <Input
                        id="morning_inspected_by"
                        {...form.register('morning_inspected_by')}
                        placeholder="Staff member name"
                        disabled={isCompleted && !isEditMode}
                        className={`h-9 mt-1 ${isCompleted && !isEditMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                    </div>
                  </div>

                  {/* Symptoms & Evolution Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <h5 className="font-semibold text-gray-900">Observations</h5>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="morning_symptoms" className="text-xs font-medium text-gray-700">
                          Symptoms
                        </Label>
                        <Textarea
                          id="morning_symptoms"
                          {...form.register('morning_symptoms')}
                          rows={4}
                          disabled={isCompleted && !isEditMode}
                          placeholder="e.g., Apathetic, tired, good mood..."
                          className={`text-sm resize-y ${isCompleted ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="morning_evolution" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Evolution
                        </Label>
                        <Textarea
                          id="morning_evolution"
                          {...form.register('morning_evolution')}
                          rows={4}
                          disabled={isCompleted && !isEditMode}
                          placeholder="Progress notes, changes, improvements..."
                          className={`text-sm resize-y ${isCompleted ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Afternoon Card */}
          {(() => {
            const isClientPresent = form.watch('afternoon_client_present') ?? true
            const isClientNotPresent = !isClientPresent
            return (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Sun className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Afternoon</h4>
                      <p className="text-xs text-gray-600">Mid-day observations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="afternoon_client_not_present"
                        checked={isClientNotPresent}
                        onCheckedChange={(checked) => {
                          form.setValue('afternoon_client_present', !(checked as boolean))
                          if (checked) {
                            form.setValue('afternoon_blood_pressure', '')
                            form.setValue('afternoon_heart_rate', null)
                            form.setValue('afternoon_oxygen_saturation', null)
                          }
                        }}
                        disabled={isCompleted && !isEditMode}
                      />
                      <Label htmlFor="afternoon_client_not_present" className="text-sm font-medium cursor-pointer text-blue-700">
                        Client not present
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Vital Signs Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-emerald-600" />
                      <h5 className="font-semibold text-gray-900">Vital Signs</h5>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="afternoon_blood_pressure" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Blood Pressure
                        </Label>
                        <Input
                          id="afternoon_blood_pressure"
                          {...form.register('afternoon_blood_pressure')}
                          placeholder="-/-"
                          disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                          className={`h-10 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="afternoon_heart_rate" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          Heart Rate
                        </Label>
                        <Input
                          id="afternoon_heart_rate"
                          type="number"
                          min={30}
                          max={200}
                          {...form.register('afternoon_heart_rate', { valueAsNumber: true })}
                          placeholder="-"
                          disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                          className={`h-10 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                        />
                        <p className="text-xs text-gray-500">bpm</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="afternoon_oxygen_saturation" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          O2 Saturation
                        </Label>
                        <div className="relative">
                          <Input
                            id="afternoon_oxygen_saturation"
                            type="number"
                            min={0}
                            max={100}
                            {...form.register('afternoon_oxygen_saturation', { valueAsNumber: true })}
                            placeholder="-"
                            disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                            className={`h-10 pr-8 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-blue-200">
                      <Label htmlFor="afternoon_inspected_by" className="text-xs font-medium text-gray-700">
                        Inspected by:
                      </Label>
                      <Input
                        id="afternoon_inspected_by"
                        {...form.register('afternoon_inspected_by')}
                        placeholder="Staff member name"
                        disabled={isCompleted && !isEditMode}
                        className={`h-9 mt-1 ${isCompleted && !isEditMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                    </div>
                  </div>

                  {/* Symptoms & Evolution Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <h5 className="font-semibold text-gray-900">Observations</h5>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="afternoon_symptoms" className="text-xs font-medium text-gray-700">
                          Symptoms
                        </Label>
                        <Textarea
                          id="afternoon_symptoms"
                          {...form.register('afternoon_symptoms')}
                          rows={4}
                          disabled={isCompleted && !isEditMode}
                          placeholder="e.g., Good attitude, alert, responsive..."
                          className={`text-sm resize-y ${isCompleted ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="afternoon_evolution" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Evolution
                        </Label>
                        <Textarea
                          id="afternoon_evolution"
                          {...form.register('afternoon_evolution')}
                          rows={4}
                          disabled={isCompleted && !isEditMode}
                          placeholder="Progress notes, changes, improvements..."
                          className={`text-sm resize-y ${isCompleted ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Night Card */}
          {(() => {
            const isClientPresent = form.watch('night_client_present')
            const isClientNotPresent = !isClientPresent
            return (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Moon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Night</h4>
                      <p className="text-xs text-gray-600">Evening observations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="night_client_not_present"
                        checked={isClientNotPresent}
                        onCheckedChange={(checked) => {
                          form.setValue('night_client_present', !(checked as boolean))
                          if (checked) {
                            form.setValue('night_blood_pressure', '')
                            form.setValue('night_heart_rate', null)
                            form.setValue('night_oxygen_saturation', null)
                          }
                        }}
                        disabled={isCompleted && !isEditMode}
                      />
                      <Label htmlFor="night_client_not_present" className="text-sm font-medium cursor-pointer text-indigo-700">
                        Client not present
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Vital Signs Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-emerald-600" />
                      <h5 className="font-semibold text-gray-900">Vital Signs</h5>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="night_blood_pressure" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Blood Pressure
                        </Label>
                        <Input
                          id="night_blood_pressure"
                          {...form.register('night_blood_pressure')}
                          placeholder="117/76"
                          disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                          className={`h-10 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="night_heart_rate" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          Heart Rate
                        </Label>
                        <Input
                          id="night_heart_rate"
                          type="number"
                          min={30}
                          max={200}
                          {...form.register('night_heart_rate', { valueAsNumber: true })}
                          placeholder="63"
                          disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                          className={`h-10 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                        />
                        <p className="text-xs text-gray-500">bpm</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="night_oxygen_saturation" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          O2 Saturation
                        </Label>
                        <div className="relative">
                          <Input
                            id="night_oxygen_saturation"
                            type="number"
                            min={0}
                            max={100}
                            {...form.register('night_oxygen_saturation', { valueAsNumber: true })}
                            placeholder="97"
                            disabled={(isCompleted && !isEditMode) || isClientNotPresent}
                            className={`h-10 pr-8 ${(isCompleted && !isEditMode) || isClientNotPresent ? 'bg-gray-100' : 'bg-white'}`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-200">
                      <Label htmlFor="night_inspected_by" className="text-xs font-medium text-gray-700">
                        Inspected by:
                      </Label>
                      <Input
                        id="night_inspected_by"
                        {...form.register('night_inspected_by')}
                        placeholder="Staff member name"
                        disabled={isCompleted && !isEditMode}
                        className={`h-9 mt-1 ${isCompleted && !isEditMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                    </div>
                  </div>

                  {/* Symptoms & Evolution Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <h5 className="font-semibold text-gray-900">Observations</h5>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="night_symptoms" className="text-xs font-medium text-gray-700">
                          Symptoms
                        </Label>
                        <Textarea
                          id="night_symptoms"
                          {...form.register('night_symptoms')}
                          rows={4}
                          disabled={isCompleted && !isEditMode}
                          placeholder="e.g., Resting well, calm, peaceful..."
                          className={`text-sm resize-y ${isCompleted ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="night_evolution" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Evolution
                        </Label>
                        <Textarea
                          id="night_evolution"
                          {...form.register('night_evolution')}
                          rows={4}
                          disabled={isCompleted && !isEditMode}
                          placeholder="Progress notes, changes, improvements..."
                          className={`text-sm resize-y ${isCompleted ? 'bg-gray-100' : 'bg-white'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Medication & Treatment */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Medication & Treatment</h3>
        
        {/* Ibogaine Given Yes/No */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <Label className="block mb-3 text-base font-semibold text-gray-900">Was ibogaine given to the patient? *</Label>
          <RadioGroup
            value={form.watch('ibogaine_given') || 'no'}
            onValueChange={(value) => {
              form.setValue('ibogaine_given', value as 'yes' | 'no')
              // If "no" is selected, clear the doses
              if (value === 'no') {
                form.setValue('ibogaine_doses', [])
              } else if (value === 'yes') {
                // If "yes" is selected and no doses exist, add one empty dose
                const currentDoses = form.watch('ibogaine_doses') || []
                if (currentDoses.length === 0) {
                  form.setValue('ibogaine_doses', [{ dose: 0, time: '' }])
                }
              }
            }}
            disabled={isCompleted && !isEditMode}
            className="flex items-center gap-6 mb-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="ibogaine_given_yes" disabled={isCompleted && !isEditMode} />
              <Label htmlFor="ibogaine_given_yes" className="text-sm font-normal cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="ibogaine_given_no" disabled={isCompleted && !isEditMode} />
              <Label htmlFor="ibogaine_given_no" className="text-sm font-normal cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>

          {/* Ibogaine Doses - Only show if "yes" is selected */}
          {form.watch('ibogaine_given') === 'yes' && (
            <div className="mt-4 pt-4 border-t border-blue-300">
              <div className="flex items-center justify-between mb-3">
                <Label className="block">Ibogaine Doses *</Label>
                {!isCompleted && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentDoses = form.watch('ibogaine_doses') || []
                      form.setValue('ibogaine_doses', [...currentDoses, { dose: 0, time: '' }])
                    }}
                    className="text-xs"
                  >
                    + Add Dose
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Record each ibogaine administration with its dose and time. You can add multiple doses if administered more than once.
              </p>
              
              <div className="space-y-3">
                {(form.watch('ibogaine_doses') || []).map((dose: { dose: number; time: string }, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`ibogaine_dose_${index}`} className="text-sm">
                          Dose {index + 1} (mg) *
                        </Label>
                        <div className="relative mt-1">
                          <Input
                            id={`ibogaine_dose_${index}`}
                            type="number"
                            min={0}
                            value={dose.dose || ''}
                            onChange={(e) => {
                              const currentDoses = form.watch('ibogaine_doses') || []
                              const updatedDoses = [...currentDoses]
                              updatedDoses[index] = { ...updatedDoses[index], dose: parseFloat(e.target.value) || 0 }
                              form.setValue('ibogaine_doses', updatedDoses)
                            }}
                            placeholder="500"
                            disabled={isCompleted && !isEditMode}
                            className={`pr-10 ${isCompleted ? 'bg-gray-50' : ''}`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">mg</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`ibogaine_time_${index}`} className="text-sm">
                          Time {index + 1} *
                        </Label>
                        <Input
                          id={`ibogaine_time_${index}`}
                          type="time"
                          value={dose.time || ''}
                          onChange={(e) => {
                            const currentDoses = form.watch('ibogaine_doses') || []
                            const updatedDoses = [...currentDoses]
                            updatedDoses[index] = { ...updatedDoses[index], time: e.target.value }
                            form.setValue('ibogaine_doses', updatedDoses)
                          }}
                          disabled={isCompleted && !isEditMode}
                          className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
                        />
                      </div>
                    </div>
                    {!isCompleted && (form.watch('ibogaine_doses') || []).length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentDoses = form.watch('ibogaine_doses') || []
                          const updatedDoses = currentDoses.filter((_: any, i: number) => i !== index)
                          form.setValue('ibogaine_doses', updatedDoses)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                {(!form.watch('ibogaine_doses') || form.watch('ibogaine_doses')?.length === 0) && (
                  <div className="text-center py-4 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg bg-white">
                    No doses added yet. Click "Add Dose" to add the first dose.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="medication_schedule">Medication (with schedule)</Label>
          <Textarea
            id="medication_schedule"
            {...form.register('medication_schedule')}
            rows={3}
            disabled={isCompleted && !isEditMode}
            className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            placeholder="List all medications with times"
          />
        </div>

        <div>
          <Label htmlFor="solutions_iv_saline_nadh">Solutions (IV/Saline/NADH, etc.)</Label>
          <Textarea
            id="solutions_iv_saline_nadh"
            {...form.register('solutions_iv_saline_nadh')}
            rows={2}
            disabled={isCompleted && !isEditMode}
            className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="medical_indications">Medical Indications</Label>
          <Textarea
            id="medical_indications"
            {...form.register('medical_indications')}
            rows={3}
            disabled={isCompleted && !isEditMode}
            className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="additional_observations_notes">Additional observations and notes</Label>
          <Textarea
            id="additional_observations_notes"
            {...form.register('additional_observations_notes')}
            rows={4}
            disabled={isCompleted && !isEditMode}
            className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
          />
        </div>
      </div>

      {/* File Upload - Multiple Files */}
      <div className="border-t pt-4">
        <MultiFileUpload
          label="Photos of vitals (optional)"
          value={form.watch('vitals_photos') || []}
          onChange={(files) => form.setValue('vitals_photos', files)}
          onUpload={async (file) => {
            const result = await uploadDocumentClient('medical-history-documents', file, 'daily-medical-vitals')
            return { url: result.url, fileName: file.name }
          }}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
          maxSizeMB={10}
          maxFiles={20}
          disabled={isCompleted && !isEditMode}
        />
      </div>

      {/* Submitted By */}
      <div className="border-t pt-4">
        <Label htmlFor="submitted_by_name">Submitted By</Label>
        <Input
          id="submitted_by_name"
          value={form.watch('submitted_by_name') || ''}
          placeholder="Auto-filled with your name"
          disabled
          className="mt-1 bg-gray-50"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your name will be automatically recorded when you submit
        </p>
      </div>

      {/* Signature */}
      <div className="border-t pt-4">
        <Label>Signature</Label>
        <div className="mt-2">
          {isCompleted && form.watch('signature_data') ? (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <img 
                src={form.watch('signature_data') || ''} 
                alt="Signature" 
                className="max-w-full h-auto"
              />
              {form.watch('signature_date') && (
                <p className="text-xs text-gray-500 mt-2">
                  Signed on: {form.watch('signature_date')}
                </p>
              )}
            </div>
          ) : !isCompleted ? (
            <SignaturePad
              value={form.watch('signature_data') || ''}
              onChange={(signature) => {
                form.setValue('signature_data', signature)
                form.setValue('signature_date', new Date().toISOString().split('T')[0])
              }}
              onClear={() => {
                form.setValue('signature_data', '')
                form.setValue('signature_date', '')
              }}
            />
          ) : null}
        </div>
        {form.watch('signature_data') && (
          <p className="text-xs text-gray-500 mt-2">
            Signed on: {form.watch('signature_date') || format(new Date(), 'MMM dd, yyyy')}
          </p>
        )}
      </div>

      {/* Save Draft and Submit Buttons */}
      {!isCompleted && !isEditMode && (
        <div className="flex flex-col gap-4 border-t pt-4">
          {!canSubmit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">⚠️ Cannot submit yet:</p>
              <p>For each time period (Morning, Afternoon, Night), either record vitals or check "Client not present" if the patient was not available.</p>
            </div>
          )}
          <div className="flex justify-between items-center gap-3">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">💡 Tip:</p>
              <p>You can save your progress and return later to update afternoon and night data.</p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={async () => {
                  // For save draft, we want to skip validation and allow saving even with incomplete data
                  const formData = form.getValues()
                  try {
                    await onSaveDraft(formData)
                  } catch (error) {
                    // Error handling is done in onSaveDraft
                    console.error('Save draft failed:', error)
                  }
                }}
                disabled={isSavingDraft || isSubmitting}
                variant="outline"
                className="border-gray-300"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Draft'
                )}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isSavingDraft || !canSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                title={!canSubmit ? 'Record vitals for all time periods or check "Client not present"' : ''}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit History Dialog */}
      {initialData?.id && (
        <FormEditHistoryDialog
          open={showEditHistory}
          onOpenChange={setShowEditHistory}
          formTable="patient_management_daily_medical_updates"
          formId={initialData.id}
          formTitle="Daily Medical Update"
        />
      )}
    </form>
  )
}
