'use client'

import { useState } from 'react'
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
import { Loader2, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

interface ParkinsonsPsychologicalReportFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  initialData?: Partial<ParkinsonsPsychologicalReportInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

export function ParkinsonsPsychologicalReportForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  initialData, 
  isCompleted,
  onSuccess 
}: ParkinsonsPsychologicalReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Helper to convert string from DB to number for form
  const convertRating = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null
    const num = typeof value === 'string' ? Number(value) : value
    return isNaN(num) ? null : num
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

  async function onSubmit(data: ParkinsonsPsychologicalReportInput) {
    setIsSubmitting(true)
    try {
      if (isCompleted) {
        const result = await updateParkinsonsPsychologicalReport({
          management_id: managementId,
          ...data,
          is_completed: true,
        } as any)
        
        if (result?.data?.success) {
          toast.success('Parkinson\'s psychological report updated successfully')
          onSuccess?.()
        } else {
          toast.error(result?.data?.error || 'Failed to update form')
        }
      } else {
        const result = await submitParkinsonsPsychologicalReport(data as any)
        if (result?.data?.success) {
          toast.success('Parkinson\'s psychological report submitted successfully')
          onSuccess?.()
        } else {
          toast.error(result?.data?.error || 'Failed to submit form')
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('An error occurred while submitting the form')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCompleted && !initialData) {
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
            error={(form.formState.errors.overall_mental_health_rating as any)?.message}
          />
          <RatingSlider
            id="daily_stress_management"
            label="How well do you manage daily stress?"
            value={form.watch('daily_stress_management')}
            onChange={(value) => form.setValue('daily_stress_management', value)}
            required
            error={(form.formState.errors.daily_stress_management as any)?.message}
          />
          <RatingSlider
            id="depression_sadness_severity"
            label="How severe are your symptoms of depression or sadness?"
            value={form.watch('depression_sadness_severity')}
            onChange={(value) => form.setValue('depression_sadness_severity', value)}
            required
            error={(form.formState.errors.depression_sadness_severity as any)?.message}
          />
          <RatingSlider
            id="expressing_emotions_safety"
            label="How safe do you feel expressing your emotions?"
            value={form.watch('expressing_emotions_safety')}
            onChange={(value) => form.setValue('expressing_emotions_safety', value)}
            required
            error={(form.formState.errors.expressing_emotions_safety as any)?.message}
          />
          <RatingSlider
            id="ibogaine_therapy_preparation"
            label="How emotionally prepared do you feel for Ibogaine therapy?"
            value={form.watch('ibogaine_therapy_preparation')}
            onChange={(value) => form.setValue('ibogaine_therapy_preparation', value)}
            required
            error={(form.formState.errors.ibogaine_therapy_preparation as any)?.message}
          />
          <RatingSlider
            id="support_system_strength"
            label="How strong is your support system outside of the retreat?"
            value={form.watch('support_system_strength')}
            onChange={(value) => form.setValue('support_system_strength', value)}
            required
            error={(form.formState.errors.support_system_strength as any)?.message}
          />
          <RatingSlider
            id="treatment_outcome_hope"
            label="How hopeful do you feel about the potential outcome of the treatment?"
            value={form.watch('treatment_outcome_hope')}
            onChange={(value) => form.setValue('treatment_outcome_hope', value)}
            required
            error={(form.formState.errors.treatment_outcome_hope as any)?.message}
          />
          <RatingSlider
            id="anxiety_nervousness_severity"
            label="How severe is your anxiety or nervousness?"
            value={form.watch('anxiety_nervousness_severity')}
            onChange={(value) => form.setValue('anxiety_nervousness_severity', value)}
            required
            error={(form.formState.errors.anxiety_nervousness_severity as any)?.message}
          />
          <RatingSlider
            id="emotional_numbness_frequency"
            label="How often do you feel emotionally numb or disconnected?"
            value={form.watch('emotional_numbness_frequency')}
            onChange={(value) => form.setValue('emotional_numbness_frequency', value)}
            required
            error={(form.formState.errors.emotional_numbness_frequency as any)?.message}
          />
          <RatingSlider
            id="sleep_quality"
            label="How well do you sleep on average?"
            value={form.watch('sleep_quality')}
            onChange={(value) => form.setValue('sleep_quality', value)}
            required
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
            error={(form.formState.errors.parkinsons_motor_symptoms_severity as any)?.message}
          />
          <RatingSlider
            id="stiffness_difficulty_moving_frequency"
            label="How often do you experience stiffness or difficulty moving?"
            value={form.watch('stiffness_difficulty_moving_frequency')}
            onChange={(value) => form.setValue('stiffness_difficulty_moving_frequency', value)}
            required
            error={(form.formState.errors.stiffness_difficulty_moving_frequency as any)?.message}
          />
          <RatingSlider
            id="medication_effectiveness"
            label="How well do Parkinson's medications currently manage your symptoms?"
            value={form.watch('medication_effectiveness')}
            onChange={(value) => form.setValue('medication_effectiveness', value)}
            required
            error={(form.formState.errors.medication_effectiveness as any)?.message}
          />
          <RatingSlider
            id="muscle_spasms_cramps_frequency"
            label="How often do you experience muscle spasms, cramps, or discomfort?"
            value={form.watch('muscle_spasms_cramps_frequency')}
            onChange={(value) => form.setValue('muscle_spasms_cramps_frequency', value)}
            required
            error={(form.formState.errors.muscle_spasms_cramps_frequency as any)?.message}
          />
          <RatingSlider
            id="non_motor_symptoms_severity"
            label="How severe are your non-motor symptoms (fatigue, sleep problems, anxiety, depression)?"
            value={form.watch('non_motor_symptoms_severity')}
            onChange={(value) => form.setValue('non_motor_symptoms_severity', value)}
            required
            error={(form.formState.errors.non_motor_symptoms_severity as any)?.message}
          />
          <RatingSlider
            id="iboga_wellness_team_support"
            label="How supported do you feel by the Iboga Wellness team so far?"
            value={form.watch('iboga_wellness_team_support')}
            onChange={(value) => form.setValue('iboga_wellness_team_support', value)}
            required
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
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || isCompleted}
          className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isCompleted ? 'Updating...' : 'Submitting...'}
            </>
          ) : isCompleted ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Update Report
            </>
          ) : (
            'Submit Report'
          )}
        </Button>
      </div>
    </form>
  )
}
