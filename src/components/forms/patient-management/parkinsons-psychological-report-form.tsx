'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/forms/signature-pad'
import { RatingSlider } from './rating-slider'
import { 
  submitParkinsonsPsychologicalReport,
  updateParkinsonsPsychologicalReport
} from '@/actions/patient-management.action'
import { 
  parkinsonsPsychologicalReportSchema, 
  type ParkinsonsPsychologicalReportInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Pencil, History, Save, X, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useUser } from '@/hooks/use-user.hook'
import { FormEditHistoryDialog } from '@/components/forms/form-edit-history-dialog'

interface ParkinsonsPsychologicalReportFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  initialData?: Partial<ParkinsonsPsychologicalReportInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

// Default value for untouched scales (middle of 1-10 scale)
const DEFAULT_RATING = 5

export function ParkinsonsPsychologicalReportForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  initialData, 
  isCompleted,
  onSuccess 
}: ParkinsonsPsychologicalReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const { profile } = useUser()

  // Check if user can edit (Owner, Admin, Manager)
  const canEdit = profile?.role && ['owner', 'admin', 'manager'].includes(profile.role)
  
  // Check both prop and initialData for completion status
  const formIsCompleted = isCompleted || (initialData as any)?.is_completed === true

  // Helper to convert string from DB to number for form
  // Returns DEFAULT_RATING if value is invalid/empty
  const convertRating = (value: any): number => {
    if (value === null || value === undefined || value === '') return DEFAULT_RATING
    const num = typeof value === 'string' ? Number(value) : value
    return isNaN(num) ? DEFAULT_RATING : num
  }

  const form = useForm<ParkinsonsPsychologicalReportInput>({
    resolver: zodResolver(parkinsonsPsychologicalReportSchema) as any,
    defaultValues: {
      management_id: managementId,
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      reason_for_coming: initialData?.reason_for_coming || '',
      overall_mental_health_rating: convertRating(initialData?.overall_mental_health_rating),
      daily_stress_management: convertRating(initialData?.daily_stress_management),
      depression_sadness_severity: convertRating(initialData?.depression_sadness_severity),
      expressing_emotions_safety: convertRating(initialData?.expressing_emotions_safety),
      ibogaine_therapy_preparation: convertRating(initialData?.ibogaine_therapy_preparation),
      support_system_strength: convertRating(initialData?.support_system_strength),
      treatment_outcome_hope: convertRating(initialData?.treatment_outcome_hope),
      anxiety_nervousness_severity: convertRating(initialData?.anxiety_nervousness_severity),
      emotional_numbness_frequency: convertRating(initialData?.emotional_numbness_frequency),
      sleep_quality: convertRating(initialData?.sleep_quality),
      parkinsons_motor_symptoms_severity: convertRating(initialData?.parkinsons_motor_symptoms_severity),
      stiffness_difficulty_moving_frequency: convertRating(initialData?.stiffness_difficulty_moving_frequency),
      medication_effectiveness: convertRating(initialData?.medication_effectiveness),
      muscle_spasms_cramps_frequency: convertRating(initialData?.muscle_spasms_cramps_frequency),
      non_motor_symptoms_severity: convertRating(initialData?.non_motor_symptoms_severity),
      iboga_wellness_team_support: convertRating(initialData?.iboga_wellness_team_support),
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || '',
    },
  })

  // Initialize all rating fields to default value (5) if they're undefined
  useEffect(() => {
    const ratingFields: (keyof ParkinsonsPsychologicalReportInput)[] = [
      'overall_mental_health_rating',
      'daily_stress_management',
      'depression_sadness_severity',
      'expressing_emotions_safety',
      'ibogaine_therapy_preparation',
      'support_system_strength',
      'treatment_outcome_hope',
      'anxiety_nervousness_severity',
      'emotional_numbness_frequency',
      'sleep_quality',
      'parkinsons_motor_symptoms_severity',
      'stiffness_difficulty_moving_frequency',
      'medication_effectiveness',
      'muscle_spasms_cramps_frequency',
      'non_motor_symptoms_severity',
      'iboga_wellness_team_support',
    ]

    ratingFields.forEach((field) => {
      const currentValue = form.getValues(field)
      if (currentValue === null || currentValue === undefined) {
        form.setValue(field, DEFAULT_RATING, { shouldValidate: false, shouldDirty: false })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  async function onSubmit(data: ParkinsonsPsychologicalReportInput) {
    setIsSubmitting(true)
    try {
      // Fill in default value (5) for any untouched rating scales
      const submitData: ParkinsonsPsychologicalReportInput = {
        ...data,
        overall_mental_health_rating: data.overall_mental_health_rating ?? DEFAULT_RATING,
        daily_stress_management: data.daily_stress_management ?? DEFAULT_RATING,
        depression_sadness_severity: data.depression_sadness_severity ?? DEFAULT_RATING,
        expressing_emotions_safety: data.expressing_emotions_safety ?? DEFAULT_RATING,
        ibogaine_therapy_preparation: data.ibogaine_therapy_preparation ?? DEFAULT_RATING,
        support_system_strength: data.support_system_strength ?? DEFAULT_RATING,
        treatment_outcome_hope: data.treatment_outcome_hope ?? DEFAULT_RATING,
        anxiety_nervousness_severity: data.anxiety_nervousness_severity ?? DEFAULT_RATING,
        emotional_numbness_frequency: data.emotional_numbness_frequency ?? DEFAULT_RATING,
        sleep_quality: data.sleep_quality ?? DEFAULT_RATING,
        parkinsons_motor_symptoms_severity: data.parkinsons_motor_symptoms_severity ?? DEFAULT_RATING,
        stiffness_difficulty_moving_frequency: data.stiffness_difficulty_moving_frequency ?? DEFAULT_RATING,
        medication_effectiveness: data.medication_effectiveness ?? DEFAULT_RATING,
        muscle_spasms_cramps_frequency: data.muscle_spasms_cramps_frequency ?? DEFAULT_RATING,
        non_motor_symptoms_severity: data.non_motor_symptoms_severity ?? DEFAULT_RATING,
        iboga_wellness_team_support: data.iboga_wellness_team_support ?? DEFAULT_RATING,
      }

      let result
      if (isEditMode && formIsCompleted) {
        // Use update action for editing completed forms
        result = await updateParkinsonsPsychologicalReport({
          ...submitData,
          management_id: managementId,
          is_completed: true, // Keep form as completed
        } as any)
      } else if (formIsCompleted) {
        // Legacy update path (shouldn't happen with new edit mode)
        result = await updateParkinsonsPsychologicalReport({
          ...submitData,
          is_completed: true,
        } as any)
      } else {
        // Submit new form
        result = await submitParkinsonsPsychologicalReport(submitData as any)
      }
      
      if (result?.data?.success) {
        toast.success(isEditMode ? 'Form updated successfully' : (formIsCompleted ? 'Parkinson\'s psychological report updated successfully' : 'Parkinson\'s psychological report submitted successfully'))
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

  // Show completion message if form is completed and no initial data
  if (formIsCompleted && !initialData) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-emerald-900 mb-2">Form Completed</h3>
        <p className="text-emerald-700">This Parkinson's psychological report has been completed.</p>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
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

      {/* Header with Edit Buttons */}
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">Parkinson's Intake Psychological Report</h2>
        {formIsCompleted && canEdit && !isEditMode && (
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
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-base">Patient Name</Label>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {patientFirstName} {patientLastName}
            </p>
          </div>
          <div>
            <Label htmlFor="reason_for_coming" className="text-base">Reason for coming (Please refer to Prescreen) <span className="text-red-500">*</span></Label>
            <Textarea
              id="reason_for_coming"
              {...form.register('reason_for_coming')}
              rows={3}
              className="mt-2 h-12 min-h-[80px]"
              disabled={formIsCompleted && !isEditMode}
              aria-invalid={!!form.formState.errors.reason_for_coming}
            />
            {form.formState.errors.reason_for_coming && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.reason_for_coming.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Mental Health Ratings */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Mental Health Assessment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <RatingSlider
            id="overall_mental_health_rating"
            label="How would you rate your overall mental health right now?"
            value={form.watch('overall_mental_health_rating')}
            onChange={(value) => form.setValue('overall_mental_health_rating', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.overall_mental_health_rating as any)?.message}
          />
          <RatingSlider
            id="daily_stress_management"
            label="How well do you manage daily stress?"
            value={form.watch('daily_stress_management')}
            onChange={(value) => form.setValue('daily_stress_management', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.daily_stress_management as any)?.message}
          />
          <RatingSlider
            id="depression_sadness_severity"
            label="How severe are your symptoms of depression or sadness?"
            value={form.watch('depression_sadness_severity')}
            onChange={(value) => form.setValue('depression_sadness_severity', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.depression_sadness_severity as any)?.message}
          />
          <RatingSlider
            id="expressing_emotions_safety"
            label="How safe do you feel expressing your emotions?"
            value={form.watch('expressing_emotions_safety')}
            onChange={(value) => form.setValue('expressing_emotions_safety', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.expressing_emotions_safety as any)?.message}
          />
          <RatingSlider
            id="ibogaine_therapy_preparation"
            label="How emotionally prepared do you feel for Ibogaine therapy?"
            value={form.watch('ibogaine_therapy_preparation')}
            onChange={(value) => form.setValue('ibogaine_therapy_preparation', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.ibogaine_therapy_preparation as any)?.message}
          />
          <RatingSlider
            id="support_system_strength"
            label="How strong is your support system outside of the retreat?"
            value={form.watch('support_system_strength')}
            onChange={(value) => form.setValue('support_system_strength', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.support_system_strength as any)?.message}
          />
          <RatingSlider
            id="treatment_outcome_hope"
            label="How hopeful do you feel about the potential outcome of the treatment?"
            value={form.watch('treatment_outcome_hope')}
            onChange={(value) => form.setValue('treatment_outcome_hope', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.treatment_outcome_hope as any)?.message}
          />
          <RatingSlider
            id="anxiety_nervousness_severity"
            label="How severe is your anxiety or nervousness?"
            value={form.watch('anxiety_nervousness_severity')}
            onChange={(value) => form.setValue('anxiety_nervousness_severity', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.anxiety_nervousness_severity as any)?.message}
          />
          <RatingSlider
            id="emotional_numbness_frequency"
            label="How often do you feel emotionally numb or disconnected?"
            value={form.watch('emotional_numbness_frequency')}
            onChange={(value) => form.setValue('emotional_numbness_frequency', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.emotional_numbness_frequency as any)?.message}
          />
          <RatingSlider
            id="sleep_quality"
            label="How well do you sleep on average?"
            value={form.watch('sleep_quality')}
            onChange={(value) => form.setValue('sleep_quality', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.sleep_quality as any)?.message}
          />
        </div>
      </div>

      {/* Parkinson's Specific Ratings */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Parkinson's Specific Assessment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <RatingSlider
            id="parkinsons_motor_symptoms_severity"
            label="How severe are your Parkinson's motor symptoms (tremors, rigidity, slowness)?"
            value={form.watch('parkinsons_motor_symptoms_severity')}
            onChange={(value) => form.setValue('parkinsons_motor_symptoms_severity', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.parkinsons_motor_symptoms_severity as any)?.message}
          />
          <RatingSlider
            id="stiffness_difficulty_moving_frequency"
            label="How often do you experience stiffness or difficulty moving?"
            value={form.watch('stiffness_difficulty_moving_frequency')}
            onChange={(value) => form.setValue('stiffness_difficulty_moving_frequency', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.stiffness_difficulty_moving_frequency as any)?.message}
          />
          <RatingSlider
            id="medication_effectiveness"
            label="How well do Parkinson's medications currently manage your symptoms?"
            value={form.watch('medication_effectiveness')}
            onChange={(value) => form.setValue('medication_effectiveness', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.medication_effectiveness as any)?.message}
          />
          <RatingSlider
            id="muscle_spasms_cramps_frequency"
            label="How often do you experience muscle spasms, cramps, or discomfort?"
            value={form.watch('muscle_spasms_cramps_frequency')}
            onChange={(value) => form.setValue('muscle_spasms_cramps_frequency', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.muscle_spasms_cramps_frequency as any)?.message}
          />
          <RatingSlider
            id="non_motor_symptoms_severity"
            label="How severe are your non-motor symptoms (fatigue, sleep problems, anxiety, depression)?"
            value={form.watch('non_motor_symptoms_severity')}
            onChange={(value) => form.setValue('non_motor_symptoms_severity', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.non_motor_symptoms_severity as any)?.message}
          />
          <RatingSlider
            id="iboga_wellness_team_support"
            label="How supported do you feel by the Iboga Wellness Institute team so far?"
            value={form.watch('iboga_wellness_team_support')}
            onChange={(value) => form.setValue('iboga_wellness_team_support', value)}
            required
            disabled={formIsCompleted && !isEditMode}
            error={(form.formState.errors.iboga_wellness_team_support as any)?.message}
          />
        </div>
      </div>

      {/* Signature */}
      <div className="space-y-4 md:space-y-6">
        <Label className="text-base">Signature <span className="text-red-500">*</span></Label>
        <div className="mt-2">
          <SignaturePad
            value={form.watch('signature_data') || ''}
            onChange={(signature) => {
              form.setValue('signature_data', signature)
              form.setValue('signature_date', format(new Date(), 'yyyy-MM-dd'))
            }}
            onClear={() => {
              form.setValue('signature_data', '')
              form.setValue('signature_date', '')
            }}
            disabled={formIsCompleted && !isEditMode}
          />
        </div>
        {form.formState.errors.signature_data && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.signature_data.message}</p>
        )}
        {form.watch('signature_data') && (
          <div className="mt-2">
            <Label htmlFor="signature_date" className="text-base">Date <span className="text-red-500">*</span></Label>
            <Input
              id="signature_date"
              type="date"
              value={form.watch('signature_date') || format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => form.setValue('signature_date', e.target.value)}
              className="mt-2 h-12"
              disabled={formIsCompleted && !isEditMode}
            />
          </div>
        )}
      </div>

      {/* Submit Button - Only show if form is not completed */}
      {!formIsCompleted && !isEditMode && (
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8"
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
      )}

      {/* Completion Message - Show if form is completed */}
      {formIsCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">Form Completed</h3>
              <p className="text-sm text-emerald-700 mt-1">
                This Parkinson's psychological report has been submitted and completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit History Dialog */}
      {initialData?.id && (
        <FormEditHistoryDialog
          open={showEditHistory}
          onOpenChange={setShowEditHistory}
          formTable="patient_management_parkinsons_psychological_reports"
          formId={initialData.id}
          formTitle="Parkinson's Psychological Report"
        />
      )}
    </form>
  )
}
