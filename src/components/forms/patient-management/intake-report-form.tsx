'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  submitIntakeReport,
  updateIntakeReport
} from '@/actions/patient-management.action'
import { 
  intakeReportSchema, 
  type IntakeReportInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface IntakeReportFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  initialData?: Partial<IntakeReportInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

export function IntakeReportForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  initialData, 
  isCompleted,
  onSuccess 
}: IntakeReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get current date and time
  const getCurrentDate = () => {
    return format(new Date(), 'yyyy-MM-dd')
  }

  const getCurrentTime = () => {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const form = useForm<IntakeReportInput>({
    resolver: zodResolver(intakeReportSchema) as any,
    defaultValues: {
      management_id: managementId,
      guest_first_name: patientFirstName,
      guest_last_name: patientLastName,
      date: initialData?.date || getCurrentDate(),
      time_of_intake: initialData?.time_of_intake || getCurrentTime(),
      staff_member_completing_form: initialData?.staff_member_completing_form || '',
      emotional_state_today: initialData?.emotional_state_today || '',
      emotional_shifts_48h: initialData?.emotional_shifts_48h || '',
      emotional_themes_memories: initialData?.emotional_themes_memories || '',
      emotionally_connected: initialData?.emotionally_connected || '',
      strong_emotions: initialData?.strong_emotions || '',
      mental_clarity: initialData?.mental_clarity || '',
      focus_memory_concentration: initialData?.focus_memory_concentration || '',
      recurring_thoughts_dreams: initialData?.recurring_thoughts_dreams || '',
      present_aware: initialData?.present_aware || '',
      intrusive_thoughts_dissociation: initialData?.intrusive_thoughts_dissociation || '',
      energy_level: initialData?.energy_level || null,
      physical_discomfort: initialData?.physical_discomfort || '',
      sleep_appetite_digestion: initialData?.sleep_appetite_digestion || '',
      physical_sensations_emotions: initialData?.physical_sensations_emotions || '',
      intentions_goals: initialData?.intentions_goals || '',
      emotionally_physically_safe: initialData?.emotionally_physically_safe || '',
      resolve_release_explore: initialData?.resolve_release_explore || '',
      team_awareness: initialData?.team_awareness || '',
    },
  })

  async function onSubmit(data: IntakeReportInput) {
    setIsSubmitting(true)
    try {
      // Check if form already exists (completed)
      if (isCompleted) {
        // Update existing form
        const result = await updateIntakeReport({
          ...data,
          is_completed: true,
        } as any)
        
        if (result?.data?.success) {
          toast.success('Intake report updated successfully')
          onSuccess?.()
        } else {
          toast.error(result?.data?.error || 'Failed to update form')
        }
      } else {
        // Submit new form
        const result = await submitIntakeReport(data as any)
        if (result?.data?.success) {
          toast.success('Intake report submitted successfully')
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
    // Form is completed but we don't have data to show - just show success message
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-emerald-900 mb-2">Form Completed</h3>
        <p className="text-emerald-700">This intake report has been completed.</p>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">

      {/* Patient Info */}
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Guest Name</Label>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {patientFirstName} {patientLastName}
          </p>
        </div>
        <div>
          <Label htmlFor="date" className="text-base">Date <span className="text-red-500">*</span></Label>
          <Input
            id="date"
            type="date"
            {...form.register('date')}
            className="mt-2 h-12"
            aria-invalid={!!form.formState.errors.date}
          />
          {form.formState.errors.date && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.date.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="time_of_intake" className="text-base">Time of Intake <span className="text-red-500">*</span></Label>
          <Input
            id="time_of_intake"
            type="time"
            {...form.register('time_of_intake')}
            className="mt-2 h-12"
            aria-invalid={!!form.formState.errors.time_of_intake}
          />
          {form.formState.errors.time_of_intake && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.time_of_intake.message}</p>
          )}
        </div>
        </div>

        <div>
          <Label htmlFor="staff_member_completing_form" className="text-base">Staff Member Completing Form</Label>
          <Input
            id="staff_member_completing_form"
            {...form.register('staff_member_completing_form')}
            placeholder="Enter staff member name"
            className="mt-2 h-12"
          />
        </div>
      </div>

      {/* Emotional and Psychological State */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Emotional and Psychological State</h2>
        
        <div>
          <Label htmlFor="emotional_state_today" className="text-base">How are you feeling emotionally today? <span className="text-red-500">*</span></Label>
          <Textarea
            id="emotional_state_today"
            {...form.register('emotional_state_today')}
            rows={3}
            className="mt-2 h-12 min-h-[80px]"
            aria-invalid={!!form.formState.errors.emotional_state_today}
          />
          {form.formState.errors.emotional_state_today && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.emotional_state_today.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="emotional_shifts_48h" className="text-base">Have you experienced any emotional shifts in the past 48 hours?</Label>
          <Textarea
            id="emotional_shifts_48h"
            {...form.register('emotional_shifts_48h')}
            rows={2}
            className="mt-2 h-12 min-h-[80px]"
          />
        </div>

        <div>
          <Label htmlFor="emotional_themes_memories" className="text-base">Are there any emotional themes or memories currently present for you?</Label>
          <Textarea
            id="emotional_themes_memories"
            {...form.register('emotional_themes_memories')}
            rows={2}
            className="mt-2 h-12 min-h-[80px]"
          />
        </div>

        <div>
          <Label htmlFor="emotionally_connected" className="text-base">Do you feel emotionally connected or disconnected from yourself? <span className="text-red-500">*</span></Label>
          <Textarea
            id="emotionally_connected"
            {...form.register('emotionally_connected')}
            rows={2}
            className="mt-2 h-12 min-h-[80px]"
            aria-invalid={!!form.formState.errors.emotionally_connected}
          />
          {form.formState.errors.emotionally_connected && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.emotionally_connected.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="strong_emotions" className="text-base">Are you currently experiencing any strong emotions (e.g. fear, sadness, anger, anxiety, joy)?</Label>
          <Textarea
            id="strong_emotions"
            {...form.register('strong_emotions')}
            rows={2}
            className="mt-2 h-12 min-h-[80px]"
          />
        </div>
      </div>

      {/* Cognitive and Mental Functioning */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Cognitive and Mental Functioning</h2>
        
        <div>
          <Label htmlFor="mental_clarity" className="text-base">How would you describe your current mental clarity? <span className="text-red-500">*</span></Label>
          <Textarea
            id="mental_clarity"
            {...form.register('mental_clarity')}
            rows={3}
            className="mt-2 h-12 min-h-[80px]"
            aria-invalid={!!form.formState.errors.mental_clarity}
          />
          {form.formState.errors.mental_clarity && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.mental_clarity.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="focus_memory_concentration">Are you experiencing difficulties with focus, memory, or concentration?</Label>
          <Textarea
            id="focus_memory_concentration"
            {...form.register('focus_memory_concentration')}
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="recurring_thoughts_dreams">Have you noticed any recurring thoughts, dreams, or resurfacing memories?</Label>
          <Textarea
            id="recurring_thoughts_dreams"
            {...form.register('recurring_thoughts_dreams')}
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="present_aware">Do you feel more present and aware than usual? *</Label>
          <Textarea
            id="present_aware"
            {...form.register('present_aware')}
            rows={2}
            className="mt-1"
            aria-invalid={!!form.formState.errors.present_aware}
          />
          {form.formState.errors.present_aware && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.present_aware.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="intrusive_thoughts_dissociation">Are you experiencing any intrusive thoughts or dissociation?</Label>
          <Textarea
            id="intrusive_thoughts_dissociation"
            {...form.register('intrusive_thoughts_dissociation')}
            rows={2}
            className="mt-1"
          />
        </div>
      </div>

      {/* Physical and Somatic Awareness */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Physical and Somatic Awareness</h2>
        
        <div>
          <Label htmlFor="energy_level">What is your current energy level from 1 to 10?</Label>
          <Input
            id="energy_level"
            type="number"
            min={1}
            max={10}
            {...form.register('energy_level', { valueAsNumber: true })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="physical_discomfort">Are you experiencing any physical discomfort, tension, or fatigue?</Label>
          <Textarea
            id="physical_discomfort"
            {...form.register('physical_discomfort')}
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="sleep_appetite_digestion">Have you noticed any changes in sleep, appetite, digestion, or hydration?</Label>
          <Textarea
            id="sleep_appetite_digestion"
            {...form.register('sleep_appetite_digestion')}
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="physical_sensations_emotions">Are there any physical sensations connected to your emotions today?</Label>
          <Textarea
            id="physical_sensations_emotions"
            {...form.register('physical_sensations_emotions')}
            rows={2}
            className="mt-1"
          />
        </div>
      </div>

      {/* Psychological Readiness */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Psychological Readiness</h2>
        
        <div>
          <Label htmlFor="intentions_goals">What are your intentions or goals for this therapeutic process?</Label>
          <Textarea
            id="intentions_goals"
            {...form.register('intentions_goals')}
            rows={3}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="emotionally_physically_safe">Do you feel emotionally and physically safe to begin this process? *</Label>
          <Textarea
            id="emotionally_physically_safe"
            {...form.register('emotionally_physically_safe')}
            rows={2}
            className="mt-1"
            aria-invalid={!!form.formState.errors.emotionally_physically_safe}
          />
          {form.formState.errors.emotionally_physically_safe && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.emotionally_physically_safe.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="resolve_release_explore">Is there anything specific you would like to resolve, release, or explore during your stay?</Label>
          <Textarea
            id="resolve_release_explore"
            {...form.register('resolve_release_explore')}
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="team_awareness">Is there anything you would like the team to be aware of before beginning treatment?</Label>
          <Textarea
            id="team_awareness"
            {...form.register('team_awareness')}
            rows={3}
            className="mt-1"
          />
        </div>
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
