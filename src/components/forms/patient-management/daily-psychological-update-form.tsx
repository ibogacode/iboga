'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useUser } from '@/hooks/use-user.hook'

interface DailyPsychologicalUpdateFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  formDate: string // YYYY-MM-DD
  programType: 'neurological' | 'mental_health' | 'addiction'
  initialData?: Partial<DailyPsychologicalUpdateInput> & { 
    id?: string
    filled_by_profile?: { first_name?: string; last_name?: string } | null
  }
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
  const { profile } = useUser()

  // Get logged-in user's full name for display
  const currentUserName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}` 
    : profile?.first_name || profile?.last_name || ''

  // Get filler's name from joined profile (for completed forms)
  const fillerName = initialData?.filled_by_profile?.first_name && initialData?.filled_by_profile?.last_name
    ? `${initialData.filled_by_profile.first_name} ${initialData.filled_by_profile.last_name}`
    : initialData?.filled_by_profile?.first_name || initialData?.filled_by_profile?.last_name || ''

  // Get current time in HH:MM format (EST timezone)
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
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
      how_guest_looks_physically: typeof initialData?.how_guest_looks_physically === 'number' ? initialData.how_guest_looks_physically : (initialData?.how_guest_looks_physically ? parseInt(String(initialData.how_guest_looks_physically), 10) || 5 : 5),
      how_guest_describes_feeling: typeof initialData?.how_guest_describes_feeling === 'number' ? initialData.how_guest_describes_feeling : (initialData?.how_guest_describes_feeling ? parseInt(String(initialData.how_guest_describes_feeling), 10) || 5 : 5),
      additional_notes_observations: initialData?.additional_notes_observations || '',
      inspected_by: initialData?.inspected_by || '',
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
        how_guest_looks_physically: typeof initialData.how_guest_looks_physically === 'number' ? initialData.how_guest_looks_physically : (initialData.how_guest_looks_physically ? parseInt(String(initialData.how_guest_looks_physically), 10) || 5 : 5),
        how_guest_describes_feeling: typeof initialData.how_guest_describes_feeling === 'number' ? initialData.how_guest_describes_feeling : (initialData.how_guest_describes_feeling ? parseInt(String(initialData.how_guest_describes_feeling), 10) || 5 : 5),
        additional_notes_observations: initialData.additional_notes_observations || '',
        inspected_by: initialData.inspected_by || '',
      })
    }
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [initialData?.id, isStarted])

  // Inject slider styles for all three sliders
  useEffect(() => {
    const styleId = 'daily-psychological-slider-styles'
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
      
      /* Guest Looks Slider */
      .guest-looks-slider-red::-webkit-slider-thumb,
      .guest-looks-slider-orange::-webkit-slider-thumb,
      .guest-looks-slider-green::-webkit-slider-thumb,
      .guest-looks-slider-gray::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      .guest-looks-slider-red::-webkit-slider-thumb {
        background: rgb(239, 68, 68);
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
      }
      .guest-looks-slider-red::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
      }
      .guest-looks-slider-orange::-webkit-slider-thumb {
        background: rgb(249, 115, 22);
        box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
      }
      .guest-looks-slider-orange::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(249, 115, 22, 0.4);
      }
      .guest-looks-slider-green::-webkit-slider-thumb {
        background: rgb(16, 185, 129);
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      }
      .guest-looks-slider-green::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .guest-looks-slider-gray::-webkit-slider-thumb {
        background: rgb(156, 163, 175);
      }
      .guest-looks-slider-red::-moz-range-thumb,
      .guest-looks-slider-orange::-moz-range-thumb,
      .guest-looks-slider-green::-moz-range-thumb,
      .guest-looks-slider-gray::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      .guest-looks-slider-red::-moz-range-thumb {
        background: rgb(239, 68, 68);
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
      }
      .guest-looks-slider-red::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
      }
      .guest-looks-slider-orange::-moz-range-thumb {
        background: rgb(249, 115, 22);
        box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
      }
      .guest-looks-slider-orange::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(249, 115, 22, 0.4);
      }
      .guest-looks-slider-green::-moz-range-thumb {
        background: rgb(16, 185, 129);
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      }
      .guest-looks-slider-green::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .guest-looks-slider-gray::-moz-range-thumb {
        background: rgb(156, 163, 175);
      }
      
      /* Guest Feeling Slider */
      .guest-feeling-slider-red::-webkit-slider-thumb,
      .guest-feeling-slider-orange::-webkit-slider-thumb,
      .guest-feeling-slider-green::-webkit-slider-thumb,
      .guest-feeling-slider-gray::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      .guest-feeling-slider-red::-webkit-slider-thumb {
        background: rgb(239, 68, 68);
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
      }
      .guest-feeling-slider-red::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
      }
      .guest-feeling-slider-orange::-webkit-slider-thumb {
        background: rgb(249, 115, 22);
        box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
      }
      .guest-feeling-slider-orange::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(249, 115, 22, 0.4);
      }
      .guest-feeling-slider-green::-webkit-slider-thumb {
        background: rgb(16, 185, 129);
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      }
      .guest-feeling-slider-green::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .guest-feeling-slider-gray::-webkit-slider-thumb {
        background: rgb(156, 163, 175);
      }
      .guest-feeling-slider-red::-moz-range-thumb,
      .guest-feeling-slider-orange::-moz-range-thumb,
      .guest-feeling-slider-green::-moz-range-thumb,
      .guest-feeling-slider-gray::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      .guest-feeling-slider-red::-moz-range-thumb {
        background: rgb(239, 68, 68);
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
      }
      .guest-feeling-slider-red::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
      }
      .guest-feeling-slider-orange::-moz-range-thumb {
        background: rgb(249, 115, 22);
        box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
      }
      .guest-feeling-slider-orange::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(249, 115, 22, 0.4);
      }
      .guest-feeling-slider-green::-moz-range-thumb {
        background: rgb(16, 185, 129);
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      }
      .guest-feeling-slider-green::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.4);
      }
      .guest-feeling-slider-gray::-moz-range-thumb {
        background: rgb(156, 163, 175);
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

  async function handleStartReport() {
    setIsStarting(true)
    try {
      const result = await startDailyPsychologicalUpdate({ 
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
                    disabled={isCompleted}
                    className={`energy-level-slider energy-level-slider-${colorInfo.color} w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            <Label className="mb-3 block">Are they experiencing tremors, muscle stiffness, or changes in motor function? *</Label>
            {(() => {
              const currentValue = form.watch('experiencing_tremors_muscle_stiffness') || ''
              const selectedOptions = currentValue ? currentValue.split(',').map((s: string) => s.trim()) : []
              
              const toggleOption = (option: string) => {
                if (isCompleted) return
                
                let newSelected: string[]
                
                if (option === 'No change') {
                  // If selecting "No change", clear all others
                  newSelected = selectedOptions.includes('No change') ? [] : ['No change']
                } else {
                  // If selecting any other option, remove "No change" if present
                  const withoutNoChange = selectedOptions.filter((s: string) => s !== 'No change')
                  if (withoutNoChange.includes(option)) {
                    newSelected = withoutNoChange.filter((s: string) => s !== option)
                  } else {
                    newSelected = [...withoutNoChange, option]
                  }
                }
                
                form.setValue('experiencing_tremors_muscle_stiffness', newSelected.join(', '))
              }
              
              return (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tremors"
                      checked={selectedOptions.includes('Tremors')}
                      onCheckedChange={() => toggleOption('Tremors')}
                      disabled={isCompleted}
                    />
                    <Label htmlFor="tremors" className="text-sm font-normal cursor-pointer">
                      Tremors
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="muscle_stiffness"
                      checked={selectedOptions.includes('Muscle stiffness')}
                      onCheckedChange={() => toggleOption('Muscle stiffness')}
                      disabled={isCompleted}
                    />
                    <Label htmlFor="muscle_stiffness" className="text-sm font-normal cursor-pointer">
                      Muscle stiffness
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="improved_motor_function"
                      checked={selectedOptions.includes('Improved motor function')}
                      onCheckedChange={() => toggleOption('Improved motor function')}
                      disabled={isCompleted}
                    />
                    <Label htmlFor="improved_motor_function" className="text-sm font-normal cursor-pointer">
                      Improved motor function
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="no_change"
                      checked={selectedOptions.includes('No change')}
                      onCheckedChange={() => toggleOption('No change')}
                      disabled={isCompleted}
                    />
                    <Label htmlFor="no_change" className="text-sm font-normal cursor-pointer">
                      No change
                    </Label>
                  </div>
                </div>
              )
            })()}
          </div>

          <div>
            <Label htmlFor="motor_function_details">Details (optional)</Label>
            <Textarea
              id="motor_function_details"
              {...form.register('motor_function_details')}
              rows={3}
              disabled={isCompleted}
              placeholder="Provide additional details about motor function observations..."
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>
      )}

      {/* 3. Staff Observations */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">3. Staff Observations</h3>
        
        <div>
          <Label htmlFor="how_guest_looks_physically">How does the guest look physically? (1–10) *</Label>
          {(() => {
            const looksValue = form.watch('how_guest_looks_physically') ?? null
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
                    id="how_guest_looks_physically"
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    {...form.register('how_guest_looks_physically', { 
                      valueAsNumber: true
                    })}
                    disabled={isCompleted}
                    className={`guest-looks-slider guest-looks-slider-${colorInfo.color} w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          {form.formState.errors.how_guest_looks_physically && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.how_guest_looks_physically.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="how_guest_describes_feeling">How does the guest describe how they feel? (1–10) *</Label>
          {(() => {
            const feelingValue = form.watch('how_guest_describes_feeling') ?? null
            const getColorForValue = (value: number | null): { color: string; rgb: string } => {
              if (!value) return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
              if (value >= 1 && value <= 3) return { color: 'red', rgb: 'rgb(239, 68, 68)' }
              if (value >= 4 && value <= 6) return { color: 'orange', rgb: 'rgb(249, 115, 22)' }
              if (value >= 7 && value <= 10) return { color: 'green', rgb: 'rgb(16, 185, 129)' }
              return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
            }
            const colorInfo = getColorForValue(feelingValue)
            const progressPercent = feelingValue ? ((feelingValue - 1) * (100 / 9)) : 0
            const displayColor = feelingValue ? colorInfo.color : 'gray'
            const displayColorClass = displayColor === 'red' ? 'text-red-600' : 
                                     displayColor === 'orange' ? 'text-orange-600' : 
                                     displayColor === 'green' ? 'text-emerald-600' : 'text-gray-600'
            
            return (
              <div className="mt-2 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-gray-500 font-medium">1</span>
                  <div className="flex items-baseline gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <span className={`text-2xl font-bold ${displayColorClass} min-w-[2.5rem] text-center`}>
                      {feelingValue || '--'}
                    </span>
                    <span className="text-sm text-gray-500">/ 10</span>
                  </div>
                  <span className="text-sm text-gray-500 font-medium">10</span>
                </div>
                <div className="relative px-1">
                  <input
                    id="how_guest_describes_feeling"
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    {...form.register('how_guest_describes_feeling', { 
                      valueAsNumber: true
                    })}
                    disabled={isCompleted}
                    className={`guest-feeling-slider guest-feeling-slider-${colorInfo.color} w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          {form.formState.errors.how_guest_describes_feeling && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.how_guest_describes_feeling.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="additional_notes_observations">Additional Notes / Observations / Relevant Context</Label>
          <Textarea
            id="additional_notes_observations"
            {...form.register('additional_notes_observations')}
            rows={4}
            disabled={isCompleted}
            placeholder="Any additional observations or context..."
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        {/* Inspected By */}
        <div>
          <Label htmlFor="inspected_by">Inspected By</Label>
          <Input
            id="inspected_by"
            {...form.register('inspected_by')}
            placeholder="Staff member name"
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        {/* Filled By Name (Display Only) */}
        <div>
          <Label htmlFor="filled_by_display">Filled By</Label>
          <Input
            id="filled_by_display"
            value={isCompleted && fillerName ? fillerName : currentUserName}
            disabled
            className="mt-1 bg-gray-50"
            readOnly
          />
          <p className="text-xs text-gray-500 mt-1">
            {isCompleted ? 'Staff member who submitted this form' : 'Your name will be recorded when you submit'}
          </p>
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
