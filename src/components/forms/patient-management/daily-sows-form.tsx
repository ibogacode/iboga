'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  startDailySOWS, 
  submitDailySOWS,
  updateDailySOWS,
  getCurrentStaffMemberName
} from '@/actions/patient-management.action'
import { 
  dailySOWSSchema, 
  startDailySOWSSchema,
  type DailySOWSInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Pencil, History, Save, X, AlertCircle } from 'lucide-react'
import { getTodayEST, formatDateEST } from '@/lib/utils'
import { useUser } from '@/hooks/use-user.hook'
import { FormEditHistoryDialog } from '@/components/forms/form-edit-history-dialog'

interface DailySOWSFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  patientDateOfBirth?: string | null
  formDate: string // YYYY-MM-DD
  initialData?: Partial<DailySOWSInput> & { 
    id?: string
    filled_by_profile?: { first_name?: string; last_name?: string } | null
    edit_count?: number
    edited_at?: string
    edited_by?: string
  }
  isCompleted?: boolean
  isStarted?: boolean
  onSuccess?: () => void
}

// SOWS Symptoms list
const SOWS_SYMPTOMS = [
  { id: 1, label: 'I feel anxious', field: 'symptom_1_anxious' as keyof DailySOWSInput },
  { id: 2, label: 'I feel like yawning', field: 'symptom_2_yawning' as keyof DailySOWSInput },
  { id: 3, label: 'I am perspiring', field: 'symptom_3_perspiring' as keyof DailySOWSInput },
  { id: 4, label: 'My eyes are tearing', field: 'symptom_4_eyes_tearing' as keyof DailySOWSInput },
  { id: 5, label: 'My nose is running', field: 'symptom_5_nose_running' as keyof DailySOWSInput },
  { id: 6, label: 'I have goosebumps', field: 'symptom_6_goosebumps' as keyof DailySOWSInput },
  { id: 7, label: 'I am shaking', field: 'symptom_7_shaking' as keyof DailySOWSInput },
  { id: 8, label: 'I have hot flushes', field: 'symptom_8_hot_flushes' as keyof DailySOWSInput },
  { id: 9, label: 'I have cold flushes', field: 'symptom_9_cold_flushes' as keyof DailySOWSInput },
  { id: 10, label: 'My bones and muscles ache', field: 'symptom_10_bones_muscles_ache' as keyof DailySOWSInput },
  { id: 11, label: 'I feel restless', field: 'symptom_11_restless' as keyof DailySOWSInput },
  { id: 12, label: 'I feel nauseous', field: 'symptom_12_nauseous' as keyof DailySOWSInput },
  { id: 13, label: 'I feel like vomiting', field: 'symptom_13_vomiting' as keyof DailySOWSInput },
  { id: 14, label: 'My muscles twitch', field: 'symptom_14_muscles_twitch' as keyof DailySOWSInput },
  { id: 15, label: 'I have stomach cramps', field: 'symptom_15_stomach_cramps' as keyof DailySOWSInput },
  { id: 16, label: 'I feel like using now', field: 'symptom_16_feel_like_using_now' as keyof DailySOWSInput },
]

// Get current time in HH:MM format (EST timezone)
const getCurrentTimeEST = () => {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function DailySOWSForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  patientDateOfBirth,
  formDate,
  initialData, 
  isCompleted,
  isStarted,
  onSuccess 
}: DailySOWSFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const { profile } = useUser()

  // Check if user can edit (Owner, Admin, Manager)
  const canEdit = profile?.role && ['owner', 'admin', 'manager'].includes(profile.role)

  const form = useForm<DailySOWSInput>({
    resolver: zodResolver(dailySOWSSchema) as any,
    defaultValues: {
      management_id: managementId,
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      patient_date_of_birth: patientDateOfBirth || undefined,
      form_date: formDate,
      time: initialData?.time || getCurrentTimeEST(),
      symptom_1_anxious: initialData?.symptom_1_anxious ?? null,
      symptom_2_yawning: initialData?.symptom_2_yawning ?? null,
      symptom_3_perspiring: initialData?.symptom_3_perspiring ?? null,
      symptom_4_eyes_tearing: initialData?.symptom_4_eyes_tearing ?? null,
      symptom_5_nose_running: initialData?.symptom_5_nose_running ?? null,
      symptom_6_goosebumps: initialData?.symptom_6_goosebumps ?? null,
      symptom_7_shaking: initialData?.symptom_7_shaking ?? null,
      symptom_8_hot_flushes: initialData?.symptom_8_hot_flushes ?? null,
      symptom_9_cold_flushes: initialData?.symptom_9_cold_flushes ?? null,
      symptom_10_bones_muscles_ache: initialData?.symptom_10_bones_muscles_ache ?? null,
      symptom_11_restless: initialData?.symptom_11_restless ?? null,
      symptom_12_nauseous: initialData?.symptom_12_nauseous ?? null,
      symptom_13_vomiting: initialData?.symptom_13_vomiting ?? null,
      symptom_14_muscles_twitch: initialData?.symptom_14_muscles_twitch ?? null,
      symptom_15_stomach_cramps: initialData?.symptom_15_stomach_cramps ?? null,
      symptom_16_feel_like_using_now: initialData?.symptom_16_feel_like_using_now ?? null,
      reviewed_by: initialData?.reviewed_by || '',
      submitted_by_name: initialData?.submitted_by_name || '',
    },
  })

  // Autofill reviewed_by and submitted_by_name fields
  useEffect(() => {
    async function loadStaffMemberName() {
      if (!isCompleted) {
        try {
          const result = await getCurrentStaffMemberName({})
          if (result?.data?.success && result.data.data?.fullName) {
            if (!form.getValues('reviewed_by')) {
              form.setValue('reviewed_by', result.data.data.fullName)
            }
            if (!form.getValues('submitted_by_name')) {
              form.setValue('submitted_by_name', result.data.data.fullName)
            }
          }
        } catch (error) {
          console.error('Error loading staff member name:', error)
        }
      }
    }
    loadStaffMemberName()
  }, [isCompleted, form])

  // Calculate total score
  const calculateTotalScore = () => {
    const symptoms = [
      form.watch('symptom_1_anxious'),
      form.watch('symptom_2_yawning'),
      form.watch('symptom_3_perspiring'),
      form.watch('symptom_4_eyes_tearing'),
      form.watch('symptom_5_nose_running'),
      form.watch('symptom_6_goosebumps'),
      form.watch('symptom_7_shaking'),
      form.watch('symptom_8_hot_flushes'),
      form.watch('symptom_9_cold_flushes'),
      form.watch('symptom_10_bones_muscles_ache'),
      form.watch('symptom_11_restless'),
      form.watch('symptom_12_nauseous'),
      form.watch('symptom_13_vomiting'),
      form.watch('symptom_14_muscles_twitch'),
      form.watch('symptom_15_stomach_cramps'),
      form.watch('symptom_16_feel_like_using_now'),
    ]
    return symptoms.reduce((sum: number, score: number | null | undefined) => sum + (score ?? 0), 0)
  }

  const totalScore = calculateTotalScore()

  // Get withdrawal severity
  const getWithdrawalSeverity = (score: number) => {
    if (score >= 1 && score <= 10) return { label: 'Mild Withdrawal', color: 'text-blue-600' }
    if (score >= 11 && score <= 20) return { label: 'Moderate Withdrawal', color: 'text-orange-600' }
    if (score >= 21 && score <= 30) return { label: 'Severe Withdrawal', color: 'text-red-600' }
    return { label: 'No Withdrawal', color: 'text-gray-600' }
  }

  const severity = getWithdrawalSeverity(totalScore)

  // Start form if not started
  useEffect(() => {
    if (!isStarted && !isCompleted) {
      setIsStarting(true)
      startDailySOWS({ management_id: managementId, form_date: formDate })
        .then((result) => {
          if (!result?.data?.success) {
            console.error('Failed to start form:', result?.data?.error)
          }
        })
        .catch((error) => {
          console.error('Error starting form:', error)
        })
        .finally(() => {
          setIsStarting(false)
        })
    }
  }, [isStarted, isCompleted, managementId, formDate])

  async function onSubmit(data: DailySOWSInput) {
    setIsSubmitting(true)
    try {
      let result
      if (isEditMode && isCompleted) {
        // Use update action for editing completed forms
        result = await updateDailySOWS({
          ...data,
          management_id: managementId,
          form_date: formDate,
          is_completed: true, // Keep form as completed
        } as any)
      } else if (isCompleted) {
        // Legacy update path (shouldn't happen with new edit mode)
        result = await updateDailySOWS({
          ...data,
          is_completed: true,
        } as any)
      } else {
        // Use submit action for new submissions
        result = await submitDailySOWS(data as any)
      }
      
      if (result?.data?.success) {
        toast.success(isEditMode ? 'Form updated successfully' : (isCompleted ? 'SOWS form updated successfully' : 'SOWS form submitted successfully'))
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

  // Render radio group for 0-4 scale
  const renderSymptomField = (symptom: typeof SOWS_SYMPTOMS[0]) => {
    const fieldValue = form.watch(symptom.field)?.toString() || ''
    const isFilled = form.watch(symptom.field) !== null && form.watch(symptom.field) !== undefined

    return (
      <div className={`space-y-2 p-4 rounded-lg border ${isFilled ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
        <Label className="text-sm font-medium text-gray-900">
          {symptom.id}. {symptom.label}
        </Label>
        <RadioGroup
          value={fieldValue}
          onValueChange={(value) => form.setValue(symptom.field, parseInt(value) as any)}
          disabled={isCompleted && !isEditMode}
          className="flex flex-row gap-4"
        >
          {[0, 1, 2, 3, 4].map((score) => (
            <div key={score} className="flex items-center space-x-2">
              <RadioGroupItem value={score.toString()} id={`${symptom.field}_${score}`} />
              <Label htmlFor={`${symptom.field}_${score}`} className="text-sm font-normal cursor-pointer">
                {score}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="text-xs text-gray-500 mt-1">
          Scale: 0 = not at all, 1 = a little, 2 = moderately, 3 = quite a bit, 4 = extremely
        </div>
      </div>
    )
  }

  if (isStarting) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
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

      {/* Header */}
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-gray-600">
              Instructions: We want to know how you're feeling. In the column below today's date and time, use the scale to write in a number from 0-4 about how you feel about each symptom right now.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Scale: 0 = not at all, 1 = a little, 2 = moderately, 3 = quite a bit, 4 = extremely
            </p>
          </div>
          {isCompleted && canEdit && !isEditMode && (
            <div className="flex gap-2 ml-4">
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
            <div className="flex gap-2 ml-4">
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
      </div>

      {/* Patient Info */}
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-base">Name</Label>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {patientFirstName} {patientLastName}
            </p>
          </div>
          <div>
            <Label className="text-base">Date of Birth</Label>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {patientDateOfBirth ? formatDateEST(patientDateOfBirth) : 'N/A'}
            </p>
          </div>
          <div>
            <Label htmlFor="form_date" className="text-base">Date <span className="text-red-500">*</span></Label>
            <Input
              id="form_date"
              type="date"
              value={formDate}
              disabled
              className="mt-2 h-12 bg-gray-50"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="time" className="text-base">Time <span className="text-red-500">*</span></Label>
          <Input
            id="time"
            type="time"
            {...form.register('time')}
            disabled={isCompleted && !isEditMode}
            className="mt-2 h-12 max-w-xs"
          />
        </div>
      </div>

      {/* Symptoms */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Symptoms</h2>
        <div className="space-y-3">
          {SOWS_SYMPTOMS.map((symptom) => (
            <div key={symptom.id}>
              {renderSymptomField(symptom)}
            </div>
          ))}
        </div>
      </div>

      {/* Total Score */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold text-gray-900">Total Score</Label>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{totalScore}</p>
            <p className={`text-sm font-medium mt-1 ${severity.color}`}>
              {severity.label}
            </p>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Mild Withdrawal = score of 1 – 10</p>
          <p>Moderate withdrawal = 11 – 20</p>
          <p>Severe withdrawal = 21 – 30</p>
        </div>
      </div>

      {/* Staff Tracking */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Staff Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reviewed_by" className="text-base">Reviewed By <span className="text-red-500">*</span></Label>
            <Input
              id="reviewed_by"
              {...form.register('reviewed_by')}
              disabled={isCompleted && !isEditMode}
              className="mt-2 h-12"
            />
          </div>
          <div>
            <Label htmlFor="submitted_by_name" className="text-base">Submitted By</Label>
            <Input
              id="submitted_by_name"
              {...form.register('submitted_by_name')}
              disabled={isCompleted && !isEditMode}
              className="mt-2 h-12"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      {!isCompleted && !isEditMode && (
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

      {/* Completion Message */}
      {isCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">Form Completed</h3>
              <p className="text-sm text-emerald-700 mt-1">
                This SOWS form has been submitted and completed.
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
          formTable="patient_management_daily_sows"
          formId={initialData.id}
          formTitle="Daily SOWS"
        />
      )}
    </form>
  )
}
