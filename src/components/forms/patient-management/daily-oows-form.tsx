'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  startDailyOOWS, 
  submitDailyOOWS,
  updateDailyOOWS,
  getCurrentStaffMemberName
} from '@/actions/patient-management.action'
import { 
  dailyOOWSSchema, 
  startDailyOOWSSchema,
  type DailyOOWSInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Pencil, History, Save, X, AlertCircle } from 'lucide-react'
import { getTodayEST, formatDateEST } from '@/lib/utils'
import { useUser } from '@/hooks/use-user.hook'
import { FormEditHistoryDialog } from '@/components/forms/form-edit-history-dialog'

interface DailyOOWSFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  patientDateOfBirth?: string | null
  formDate: string // YYYY-MM-DD
  initialData?: Partial<DailyOOWSInput> & { 
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

// OOWS Symptoms list with descriptions
const OOWS_SYMPTOMS = [
  { 
    id: 1, 
    label: 'Yawning', 
    field: 'symptom_1_yawning' as keyof DailyOOWSInput,
    description: '0 = no yawns, 1 = ≥ 1 yawn'
  },
  { 
    id: 2, 
    label: 'Rhinorrhoea', 
    field: 'symptom_2_rhinorrhoea' as keyof DailyOOWSInput,
    description: '0 = < 3 sniffs, 1 = ≥ 3 sniffs'
  },
  { 
    id: 3, 
    label: 'Piloerection (observe arm)', 
    field: 'symptom_3_piloerection' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = present'
  },
  { 
    id: 4, 
    label: 'Perspiration', 
    field: 'symptom_4_perspiration' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = present'
  },
  { 
    id: 5, 
    label: 'Lacrimation', 
    field: 'symptom_5_lacrimation' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = present'
  },
  { 
    id: 6, 
    label: 'Tremor (hands)', 
    field: 'symptom_6_tremor' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = present'
  },
  { 
    id: 7, 
    label: 'Mydriasis', 
    field: 'symptom_7_mydriasis' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = ≥ 3 mm'
  },
  { 
    id: 8, 
    label: 'Hot and cold flushes', 
    field: 'symptom_8_hot_cold_flushes' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = shivering / huddling for warmth'
  },
  { 
    id: 9, 
    label: 'Restlessness', 
    field: 'symptom_9_restlessness' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = frequent shifts of position'
  },
  { 
    id: 10, 
    label: 'Vomiting', 
    field: 'symptom_10_vomiting' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = present'
  },
  { 
    id: 11, 
    label: 'Muscle twitches', 
    field: 'symptom_11_muscle_twitches' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = present'
  },
  { 
    id: 12, 
    label: 'Abdominal cramps', 
    field: 'symptom_12_abdominal_cramps' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = Holding stomach'
  },
  { 
    id: 13, 
    label: 'Anxiety', 
    field: 'symptom_13_anxiety' as keyof DailyOOWSInput,
    description: '0 = absent, 1 = mild - severe'
  },
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

export function DailyOOWSForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  patientDateOfBirth,
  formDate,
  initialData, 
  isCompleted,
  isStarted,
  onSuccess 
}: DailyOOWSFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const { profile } = useUser()

  // Check if user can edit (Owner, Admin, Manager)
  const canEdit = profile?.role && ['owner', 'admin', 'manager'].includes(profile.role)

  const form = useForm<DailyOOWSInput>({
    resolver: zodResolver(dailyOOWSSchema) as any,
    defaultValues: {
      management_id: managementId,
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      patient_date_of_birth: patientDateOfBirth || undefined,
      form_date: formDate,
      time: initialData?.time || getCurrentTimeEST(),
      symptom_1_yawning: initialData?.symptom_1_yawning ?? null,
      symptom_2_rhinorrhoea: initialData?.symptom_2_rhinorrhoea ?? null,
      symptom_3_piloerection: initialData?.symptom_3_piloerection ?? null,
      symptom_4_perspiration: initialData?.symptom_4_perspiration ?? null,
      symptom_5_lacrimation: initialData?.symptom_5_lacrimation ?? null,
      symptom_6_tremor: initialData?.symptom_6_tremor ?? null,
      symptom_7_mydriasis: initialData?.symptom_7_mydriasis ?? null,
      symptom_8_hot_cold_flushes: initialData?.symptom_8_hot_cold_flushes ?? null,
      symptom_9_restlessness: initialData?.symptom_9_restlessness ?? null,
      symptom_10_vomiting: initialData?.symptom_10_vomiting ?? null,
      symptom_11_muscle_twitches: initialData?.symptom_11_muscle_twitches ?? null,
      symptom_12_abdominal_cramps: initialData?.symptom_12_abdominal_cramps ?? null,
      symptom_13_anxiety: initialData?.symptom_13_anxiety ?? null,
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
      form.watch('symptom_1_yawning'),
      form.watch('symptom_2_rhinorrhoea'),
      form.watch('symptom_3_piloerection'),
      form.watch('symptom_4_perspiration'),
      form.watch('symptom_5_lacrimation'),
      form.watch('symptom_6_tremor'),
      form.watch('symptom_7_mydriasis'),
      form.watch('symptom_8_hot_cold_flushes'),
      form.watch('symptom_9_restlessness'),
      form.watch('symptom_10_vomiting'),
      form.watch('symptom_11_muscle_twitches'),
      form.watch('symptom_12_abdominal_cramps'),
      form.watch('symptom_13_anxiety'),
    ]
    return symptoms.reduce((sum: number, score: number | null | undefined) => sum + (score ?? 0), 0)
  }

  const totalScore = calculateTotalScore()

  // Start form if not started
  useEffect(() => {
    if (!isStarted && !isCompleted) {
      setIsStarting(true)
      startDailyOOWS({ management_id: managementId, form_date: formDate })
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

  async function onSubmit(data: DailyOOWSInput) {
    setIsSubmitting(true)
    try {
      let result
      if (isEditMode && isCompleted) {
        // Use update action for editing completed forms
        result = await updateDailyOOWS({
          ...data,
          management_id: managementId,
          form_date: formDate,
          is_completed: true, // Keep form as completed
        } as any)
      } else if (isCompleted) {
        // Legacy update path (shouldn't happen with new edit mode)
        result = await updateDailyOOWS({
          ...data,
          is_completed: true,
        } as any)
      } else {
        // Use submit action for new submissions
        result = await submitDailyOOWS(data as any)
      }
      
      if (result?.data?.success) {
        toast.success(isEditMode ? 'Form updated successfully' : (isCompleted ? 'OOWS form updated successfully' : 'OOWS form submitted successfully'))
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

  // Render radio group for 0-1 scale
  const renderSymptomField = (symptom: typeof OOWS_SYMPTOMS[0]) => {
    const fieldValue = form.watch(symptom.field)?.toString() || ''
    const isFilled = form.watch(symptom.field) !== null && form.watch(symptom.field) !== undefined

    return (
      <div className={`space-y-2 p-4 rounded-lg border ${isFilled ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
        <Label className="text-sm font-medium text-gray-900">
          {symptom.id}. {symptom.label}
        </Label>
        <p className="text-xs text-gray-600 mb-2">{symptom.description}</p>
        <RadioGroup
          value={fieldValue}
          onValueChange={(value) => form.setValue(symptom.field, parseInt(value) as any)}
          disabled={isCompleted && !isEditMode}
          className="flex flex-row gap-4"
        >
          {[0, 1].map((score) => (
            <div key={score} className="flex items-center space-x-2">
              <RadioGroupItem value={score.toString()} id={`${symptom.field}_${score}`} />
              <Label htmlFor={`${symptom.field}_${score}`} className="text-sm font-normal cursor-pointer">
                {score}
              </Label>
            </div>
          ))}
        </RadioGroup>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900">
                <strong>About OOWS:</strong> The Objective Opiate Withdrawal Scale (OOWS) provides an objective measure of the severity of opiate withdrawal symptoms. This tool may be used as part of initial assessment, for ongoing monitoring to assess their response to medication. The OOWS is frequently used when monitoring withdrawal using Buprenorphine.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Scoring:</strong> Encourage the patient to score down the columns placing a score from 0 – 1 (symptom present or absent) for each item. Add the total score for possible range from 0 – 13.
              </p>
            </div>
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
          {OOWS_SYMPTOMS.map((symptom) => (
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
            <p className="text-3xl font-bold text-gray-900">{totalScore} / 13</p>
            <p className="text-sm text-gray-600 mt-1">
              Possible range: 0 – 13
            </p>
          </div>
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
                This OOWS form has been submitted and completed.
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
          formTable="patient_management_daily_oows"
          formId={initialData.id}
          formTitle="Daily OOWS"
        />
      )}
    </form>
  )
}
