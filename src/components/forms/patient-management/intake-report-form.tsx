'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  submitIntakeReport,
  updateIntakeReport,
  getCurrentStaffMemberName
} from '@/actions/patient-management.action'
import { 
  intakeReportSchema, 
  type IntakeReportInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Clock, Pencil, History, Save, X, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useUser } from '@/hooks/use-user.hook'
import { FormEditHistoryDialog } from '@/components/forms/form-edit-history-dialog'

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
  const [isEditMode, setIsEditMode] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const { profile } = useUser()

  // Check if user can edit (Owner, Admin, Manager)
  const canEdit = profile?.role && ['owner', 'admin', 'manager'].includes(profile.role)
  
  // Check both prop and initialData for completion status
  const formIsCompleted = isCompleted || (initialData as any)?.is_completed === true

  // Get current date and time
  // Get current date in YYYY-MM-DD format (EST timezone)
  const getCurrentDate = () => {
    const estDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    // Convert from MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = estDate.split('/')
    return `${year}-${month}-${day}`
  }

  // Get current time in HH:MM format (EST timezone)
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
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

  // Autofill staff member name on mount if not already set
  useEffect(() => {
    async function loadStaffMemberName() {
      // Only autofill if the field is empty (not from initialData and not already set)
      // Check if initialData has a non-empty value
      const hasInitialValue = initialData?.staff_member_completing_form && 
        initialData.staff_member_completing_form.trim() !== ''
      
      // Also check current form value in case it was set elsewhere
      const currentValue = form.getValues('staff_member_completing_form')
      const hasCurrentValue = currentValue && currentValue.trim() !== ''
      
      // Only autofill if neither initialData nor current form has a value
      if (!hasInitialValue && !hasCurrentValue) {
        try {
          const result = await getCurrentStaffMemberName({})
          if (result?.data?.success && result.data.data?.fullName) {
            form.setValue('staff_member_completing_form', result.data.data.fullName, {
              shouldValidate: false,
              shouldDirty: false
            })
          }
        } catch (error) {
          console.error('Error loading staff member name:', error)
          // Silently fail - don't show error to user, just leave field empty
        }
      }
    }

    loadStaffMemberName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - form and initialData are stable references

  // Inject slider styles with different colors for different ranges
  useEffect(() => {
    const styleId = 'energy-level-slider-styles'
    if (document.getElementById(styleId)) return // Styles already injected

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* Red slider (1-3) */
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
      
      /* Orange slider (4-6) */
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
      
      /* Green slider (7-10) */
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
      
      /* Gray slider (no value) */
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
      .energy-level-slider-gray::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
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
      .energy-level-slider-gray::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      }
    `
    document.head.appendChild(style)

    return () => {
      // Cleanup on unmount
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  async function onSubmit(data: IntakeReportInput) {
    setIsSubmitting(true)
    try {
      let result
      if (isEditMode && formIsCompleted) {
        // Use update action for editing completed forms
        result = await updateIntakeReport({
          ...data,
          management_id: managementId,
          is_completed: true, // Keep form as completed
        } as any)
      } else if (formIsCompleted) {
        // Legacy update path (shouldn't happen with new edit mode)
        result = await updateIntakeReport({
          ...data,
          is_completed: true,
        } as any)
      } else {
        // Submit new form
        result = await submitIntakeReport(data as any)
      }
      
      if (result?.data?.success) {
        toast.success(isEditMode ? 'Form updated successfully' : (formIsCompleted ? 'Intake report updated successfully' : 'Intake report submitted successfully'))
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
        <p className="text-emerald-700">This intake report has been completed.</p>
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
        <h2 className="text-xl font-bold text-gray-900">Intake Report</h2>
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
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="emotional_themes_memories" className="text-base">Are there any emotional themes or memories currently present for you?</Label>
          <Textarea
            id="emotional_themes_memories"
            {...form.register('emotional_themes_memories')}
            rows={2}
            className="mt-2 h-12 min-h-[80px]"
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="emotionally_connected" className="text-base">Do you feel emotionally connected or disconnected from yourself? <span className="text-red-500">*</span></Label>
          <Textarea
            id="emotionally_connected"
            {...form.register('emotionally_connected')}
            rows={2}
            className="mt-2 h-12 min-h-[80px]"
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="recurring_thoughts_dreams">Have you noticed any recurring thoughts, dreams, or resurfacing memories?</Label>
          <Textarea
            id="recurring_thoughts_dreams"
            {...form.register('recurring_thoughts_dreams')}
            rows={2}
            className="mt-1"
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="present_aware">Do you feel more present and aware than usual? *</Label>
          <Textarea
            id="present_aware"
            {...form.register('present_aware')}
            rows={2}
            className="mt-1"
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
          />
        </div>
      </div>

      {/* Physical and Somatic Awareness */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Physical and Somatic Awareness</h2>
        
        <div>
          <Label htmlFor="energy_level">What is your current energy level from 1 to 10?</Label>
          {(() => {
            const energyValue = form.watch('energy_level') ?? null
            // Determine color based on value range (1-3: red, 4-6: orange, 7-10: green)
            const getColorForValue = (value: number | null): { color: string; rgb: string } => {
              if (value === null || value === undefined) return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
              if (value >= 1 && value <= 3) return { color: 'red', rgb: 'rgb(239, 68, 68)' }
              if (value >= 4 && value <= 6) return { color: 'orange', rgb: 'rgb(249, 115, 22)' }
              if (value >= 7 && value <= 10) return { color: 'green', rgb: 'rgb(16, 185, 129)' }
              return { color: 'gray', rgb: 'rgb(156, 163, 175)' }
            }
            const colorInfo = getColorForValue(energyValue)
            // Calculate progress percentage (0% at value 1, 100% at value 10)
            const progressPercent = energyValue ? ((energyValue - 1) * (100 / 9)) : 0
            const displayColor = energyValue ? colorInfo.color : 'gray'
            const displayColorClass = displayColor === 'red' ? 'text-red-600' : 
                                     displayColor === 'orange' ? 'text-orange-600' : 
                                     displayColor === 'green' ? 'text-emerald-600' : 'text-gray-600'
            
            return (
              <div className="mt-2 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-gray-500 font-medium">1</span>
                  <div className={`flex items-baseline gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200`}>
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
                    disabled={formIsCompleted && !isEditMode}
                    className={`energy-level-slider energy-level-slider-${colorInfo.color} w-full h-3 bg-gray-200 rounded-lg appearance-none ${formIsCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
          <Label htmlFor="physical_discomfort">Are you experiencing any physical discomfort, tension, or fatigue?</Label>
          <Textarea
            id="physical_discomfort"
            {...form.register('physical_discomfort')}
            rows={2}
            className="mt-1"
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="sleep_appetite_digestion">Have you noticed any changes in sleep, appetite, digestion, or hydration?</Label>
          <Textarea
            id="sleep_appetite_digestion"
            {...form.register('sleep_appetite_digestion')}
            rows={2}
            className="mt-1"
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="physical_sensations_emotions">Are there any physical sensations connected to your emotions today?</Label>
          <Textarea
            id="physical_sensations_emotions"
            {...form.register('physical_sensations_emotions')}
            rows={2}
            className="mt-1"
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="emotionally_physically_safe">Do you feel emotionally and physically safe to begin this process? *</Label>
          <Textarea
            id="emotionally_physically_safe"
            {...form.register('emotionally_physically_safe')}
            rows={2}
            className="mt-1"
            disabled={formIsCompleted && !isEditMode}
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
            disabled={formIsCompleted && !isEditMode}
          />
        </div>

        <div>
          <Label htmlFor="team_awareness">Is there anything you would like the team to be aware of before beginning treatment?</Label>
          <Textarea
            id="team_awareness"
            {...form.register('team_awareness')}
            rows={3}
            className="mt-1"
            disabled={formIsCompleted && !isEditMode}
          />
        </div>
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
                This psychological intake report has been submitted and completed.
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
          formTable="patient_management_intake_reports"
          formId={initialData.id}
          formTitle="Intake Report"
        />
      )}
    </form>
  )
}
