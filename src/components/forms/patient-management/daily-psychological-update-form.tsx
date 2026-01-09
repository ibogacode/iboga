'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  startDailyPsychologicalUpdate, 
  submitDailyPsychologicalUpdate 
} from '@/actions/patient-management.action'
import { 
  dailyPsychologicalUpdateSchema, 
  startDailyPsychologicalUpdateSchema,
  type DailyPsychologicalUpdateInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface DailyPsychologicalUpdateFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  formDate: string // YYYY-MM-DD
  programType: 'neurological' | 'mental_health' | 'addiction'
  initialData?: Partial<DailyPsychologicalUpdateInput>
  isCompleted?: boolean
  isStarted?: boolean
  onSuccess?: () => void
}

export function DailyPsychologicalUpdateForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  formDate,
  programType,
  initialData, 
  isCompleted,
  isStarted,
  onSuccess 
}: DailyPsychologicalUpdateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const form = useForm<DailyPsychologicalUpdateInput>({
    resolver: zodResolver(dailyPsychologicalUpdateSchema) as any,
    defaultValues: {
      management_id: managementId,
      guest_first_name: patientFirstName,
      guest_last_name: patientLastName,
      form_date: formDate,
      time: initialData?.time || getCurrentTime(),
      emotional_state_today: initialData?.emotional_state_today || '',
      emotional_shifts_since_last_report: initialData?.emotional_shifts_since_last_report || '',
      vivid_dreams_resurfacing_memories: initialData?.vivid_dreams_resurfacing_memories || '',
      feeling_connected_to_emotions: initialData?.feeling_connected_to_emotions || '',
      changes_memory_focus_concentration: initialData?.changes_memory_focus_concentration || '',
      feeling_present_aware: initialData?.feeling_present_aware || '',
      discomfort_side_effects: initialData?.discomfort_side_effects || '',
      energy_level: initialData?.energy_level || 5,
      experiencing_tremors_muscle_stiffness: initialData?.experiencing_tremors_muscle_stiffness || '',
      motor_function_details: initialData?.motor_function_details || '',
      how_guest_looks_physically: initialData?.how_guest_looks_physically || '',
      how_guest_describes_feeling: initialData?.how_guest_describes_feeling || '',
      additional_notes_observations: initialData?.additional_notes_observations || '',
    },
  })

  // Reset form values when initialData changes (for viewing existing forms)
  useEffect(() => {
    if (initialData && isStarted) {
      const currentTime = getCurrentTime()
      form.reset({
        management_id: managementId,
        guest_first_name: patientFirstName,
        guest_last_name: patientLastName,
        form_date: formDate,
        time: initialData.time || currentTime,
        emotional_state_today: initialData.emotional_state_today || '',
        emotional_shifts_since_last_report: initialData.emotional_shifts_since_last_report || '',
        vivid_dreams_resurfacing_memories: initialData.vivid_dreams_resurfacing_memories || '',
        feeling_connected_to_emotions: initialData.feeling_connected_to_emotions || '',
        changes_memory_focus_concentration: initialData.changes_memory_focus_concentration || '',
        feeling_present_aware: initialData.feeling_present_aware || '',
        discomfort_side_effects: initialData.discomfort_side_effects || '',
        energy_level: initialData.energy_level || 5,
        experiencing_tremors_muscle_stiffness: initialData.experiencing_tremors_muscle_stiffness || '',
        motor_function_details: initialData.motor_function_details || '',
        how_guest_looks_physically: initialData.how_guest_looks_physically || '',
        how_guest_describes_feeling: initialData.how_guest_describes_feeling || '',
        additional_notes_observations: initialData.additional_notes_observations || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, isStarted])

  async function handleStartReport() {
    setIsStarting(true)
    try {
      const result = await startDailyPsychologicalUpdate({ 
        management_id: managementId, 
        form_date: formDate 
      })
      if (result?.data?.success) {
        toast.success('Daily report started')
        onSuccess?.()
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

  async function onSubmit(data: DailyPsychologicalUpdateInput) {
    setIsSubmitting(true)
    try {
      const result = await submitDailyPsychologicalUpdate(data as any)
      if (result?.data?.success) {
        toast.success('Daily psychological update submitted successfully')
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

  if (!isStarted) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Daily Psychological Update</h3>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(formDate), 'MMMM dd, yyyy')}
            </p>
          </div>
          <Button
            onClick={handleStartReport}
            disabled={isStarting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Start Report
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Psychological Update</h2>
            <p className="text-gray-600 mt-1 text-sm">
              {format(new Date(formDate), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <Label htmlFor="time">Time *</Label>
          <Input
            id="time"
            type="time"
            {...form.register('time')}
            disabled={isCompleted}
            className={isCompleted ? 'bg-gray-50' : ''}
            aria-invalid={!!form.formState.errors.time}
          />
          {form.formState.errors.time && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.time.message}</p>
          )}
        </div>
      </div>

      {/* 1. Emotional & Cognitive Check-In */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">1. Emotional & Cognitive Check-In</h3>
        
        <div>
          <Label htmlFor="emotional_state_today">How are they emotionally today? *</Label>
          <Textarea
            id="emotional_state_today"
            {...form.register('emotional_state_today')}
            rows={3}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            aria-invalid={!!form.formState.errors.emotional_state_today}
          />
          {form.formState.errors.emotional_state_today && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.emotional_state_today.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="emotional_shifts_since_last_report">Any emotional shifts since last report?</Label>
          <Textarea
            id="emotional_shifts_since_last_report"
            {...form.register('emotional_shifts_since_last_report')}
            rows={2}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="vivid_dreams_resurfacing_memories">Have they experienced vivid dreams or resurfacing memories?</Label>
          <Textarea
            id="vivid_dreams_resurfacing_memories"
            {...form.register('vivid_dreams_resurfacing_memories')}
            rows={2}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="feeling_connected_to_emotions">Are they feeling more connected to their emotions?</Label>
          <Textarea
            id="feeling_connected_to_emotions"
            {...form.register('feeling_connected_to_emotions')}
            rows={2}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="changes_memory_focus_concentration">Any changes in memory, focus, or concentration?</Label>
          <Textarea
            id="changes_memory_focus_concentration"
            {...form.register('changes_memory_focus_concentration')}
            rows={2}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="feeling_present_aware">Do they feel more present and aware than before treatment?</Label>
          <Textarea
            id="feeling_present_aware"
            {...form.register('feeling_present_aware')}
            rows={2}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="discomfort_side_effects">Any discomfort or side effects reported?</Label>
          <Textarea
            id="discomfort_side_effects"
            {...form.register('discomfort_side_effects')}
            rows={2}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="energy_level">Energy level (1–10) *</Label>
          <Input
            id="energy_level"
            type="number"
            min={1}
            max={10}
            {...form.register('energy_level', { valueAsNumber: true })}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            aria-invalid={!!form.formState.errors.energy_level}
          />
          {form.formState.errors.energy_level && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.energy_level.message}</p>
          )}
        </div>
      </div>

      {/* 2. Parkinson's Patients Only (Motor Function) */}
      {programType === 'neurological' && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-900">2. Parkinson's Patients Only (Motor Function)</h3>
          
          <div>
            <Label htmlFor="experiencing_tremors_muscle_stiffness">Are they experiencing tremors, muscle stiffness, or changes in motor function?</Label>
            <Textarea
              id="experiencing_tremors_muscle_stiffness"
              {...form.register('experiencing_tremors_muscle_stiffness')}
              rows={2}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="motor_function_details">Details</Label>
            <Textarea
              id="motor_function_details"
              {...form.register('motor_function_details')}
              rows={3}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>
      )}

      {/* 3. Staff Observations */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">3. Staff Observations</h3>
        
        <div>
          <Label htmlFor="how_guest_looks_physically">How does the guest look physically? *</Label>
          <Textarea
            id="how_guest_looks_physically"
            {...form.register('how_guest_looks_physically')}
            rows={3}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            aria-invalid={!!form.formState.errors.how_guest_looks_physically}
          />
          {form.formState.errors.how_guest_looks_physically && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.how_guest_looks_physically.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="how_guest_describes_feeling">How does the guest describe how they feel? *</Label>
          <Textarea
            id="how_guest_describes_feeling"
            {...form.register('how_guest_describes_feeling')}
            rows={3}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            aria-invalid={!!form.formState.errors.how_guest_describes_feeling}
          />
          {form.formState.errors.how_guest_describes_feeling && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.how_guest_describes_feeling.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="additional_notes_observations">Additional Notes / Observations / Relevant Context *</Label>
          <Textarea
            id="additional_notes_observations"
            {...form.register('additional_notes_observations')}
            rows={4}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            aria-invalid={!!form.formState.errors.additional_notes_observations}
          />
          {form.formState.errors.additional_notes_observations && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.additional_notes_observations.message}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      {!isCompleted && (
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
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
    </form>
  )
}
