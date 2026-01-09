'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad } from '@/components/forms/signature-pad'
import { 
  startDailyMedicalUpdate, 
  submitDailyMedicalUpdate 
} from '@/actions/patient-management.action'
import { 
  dailyMedicalUpdateSchema, 
  startDailyMedicalUpdateSchema,
  type DailyMedicalUpdateInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface DailyMedicalUpdateFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  formDate: string // YYYY-MM-DD
  programType: 'neurological' | 'mental_health' | 'addiction'
  initialData?: Partial<DailyMedicalUpdateInput>
  isCompleted?: boolean
  isStarted?: boolean
  onSuccess?: () => void
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
  onSuccess 
}: DailyMedicalUpdateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const form = useForm<DailyMedicalUpdateInput>({
    resolver: zodResolver(dailyMedicalUpdateSchema) as any,
    defaultValues: {
      management_id: managementId,
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      form_date: formDate,
      checked_vitals: initialData?.checked_vitals || false,
      did_they_feel_hungry: initialData?.did_they_feel_hungry || '',
      using_bathroom_normally: initialData?.using_bathroom_normally || '',
      hydrating: initialData?.hydrating || '',
      experiencing_tremors_motor_function: initialData?.experiencing_tremors_motor_function || '',
      withdrawal_symptoms: initialData?.withdrawal_symptoms || '',
      how_guest_looks: initialData?.how_guest_looks || '',
      energy_level: initialData?.energy_level || null,
      how_guest_says_they_feel: initialData?.how_guest_says_they_feel || '',
      morning_vital_signs: initialData?.morning_vital_signs || '',
      morning_symptoms: initialData?.morning_symptoms || '',
      morning_evolution: initialData?.morning_evolution || '',
      afternoon_vital_signs: initialData?.afternoon_vital_signs || '',
      afternoon_symptoms: initialData?.afternoon_symptoms || '',
      afternoon_evolution: initialData?.afternoon_evolution || '',
      night_vital_signs: initialData?.night_vital_signs || '',
      night_symptoms: initialData?.night_symptoms || '',
      night_evolution: initialData?.night_evolution || '',
      ibogaine_dose_time: initialData?.ibogaine_dose_time || '',
      medication_schedule: initialData?.medication_schedule || '',
      solutions_iv_saline_nadh: initialData?.solutions_iv_saline_nadh || '',
      medical_indications: initialData?.medical_indications || '',
      additional_observations_notes: initialData?.additional_observations_notes || '',
      photo_of_vitals_medical_notes_url: initialData?.photo_of_vitals_medical_notes_url || '',
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || '',
    },
  })

  // Reset form values when initialData changes (for viewing existing forms)
  useEffect(() => {
    if (initialData && isStarted) {
      form.reset({
        management_id: managementId,
        patient_first_name: patientFirstName,
        patient_last_name: patientLastName,
        form_date: formDate,
        checked_vitals: initialData.checked_vitals || false,
        did_they_feel_hungry: initialData.did_they_feel_hungry || '',
        using_bathroom_normally: initialData.using_bathroom_normally || '',
        hydrating: initialData.hydrating || '',
        experiencing_tremors_motor_function: initialData.experiencing_tremors_motor_function || '',
        withdrawal_symptoms: initialData.withdrawal_symptoms || '',
        how_guest_looks: initialData.how_guest_looks || '',
        energy_level: initialData.energy_level || null,
        how_guest_says_they_feel: initialData.how_guest_says_they_feel || '',
        morning_vital_signs: initialData.morning_vital_signs || '',
        morning_symptoms: initialData.morning_symptoms || '',
        morning_evolution: initialData.morning_evolution || '',
        afternoon_vital_signs: initialData.afternoon_vital_signs || '',
        afternoon_symptoms: initialData.afternoon_symptoms || '',
        afternoon_evolution: initialData.afternoon_evolution || '',
        night_vital_signs: initialData.night_vital_signs || '',
        night_symptoms: initialData.night_symptoms || '',
        night_evolution: initialData.night_evolution || '',
        ibogaine_dose_time: initialData.ibogaine_dose_time || '',
        medication_schedule: initialData.medication_schedule || '',
        solutions_iv_saline_nadh: initialData.solutions_iv_saline_nadh || '',
        medical_indications: initialData.medical_indications || '',
        additional_observations_notes: initialData.additional_observations_notes || '',
        photo_of_vitals_medical_notes_url: initialData.photo_of_vitals_medical_notes_url || '',
        signature_data: initialData.signature_data || '',
        signature_date: initialData.signature_date || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, isStarted])

  async function handleStartReport() {
    setIsStarting(true)
    try {
      const result = await startDailyMedicalUpdate({ 
        management_id: managementId, 
        form_date: formDate 
      })
      if (result?.data?.success) {
        toast.success('Daily medical report started')
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

  async function onSubmit(data: DailyMedicalUpdateInput) {
    setIsSubmitting(true)
    try {
      const result = await submitDailyMedicalUpdate(data as any)
      if (result?.data?.success) {
        toast.success('Daily medical update submitted successfully')
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
            <h3 className="text-lg font-semibold text-gray-900">Daily Medical Update</h3>
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
            <h2 className="text-xl font-bold text-gray-900">Daily Medical Update</h2>
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

      {/* Checked Vitals */}
      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="checked_vitals"
            checked={form.watch('checked_vitals')}
            onCheckedChange={(checked) => form.setValue('checked_vitals', checked as boolean)}
            disabled={isCompleted}
          />
          <Label htmlFor="checked_vitals" className="font-semibold text-lg">
            Checked Vitals *
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="did_they_feel_hungry">Did they feel hungry?</Label>
            <Textarea
              id="did_they_feel_hungry"
              {...form.register('did_they_feel_hungry')}
              rows={2}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="using_bathroom_normally">Using bathroom normally?</Label>
            <Textarea
              id="using_bathroom_normally"
              {...form.register('using_bathroom_normally')}
              rows={2}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="hydrating">Hydrating?</Label>
            <Textarea
              id="hydrating"
              {...form.register('hydrating')}
              rows={2}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
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
                disabled={isCompleted}
                className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
              />
            </div>
          )}

          <div>
            <Label htmlFor="withdrawal_symptoms">Withdrawal Symptoms (If Applicable)</Label>
            <Textarea
              id="withdrawal_symptoms"
              {...form.register('withdrawal_symptoms')}
              rows={2}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="how_guest_looks">How guest looks</Label>
            <Textarea
              id="how_guest_looks"
              {...form.register('how_guest_looks')}
              rows={2}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="energy_level">Energy Level (1–10)</Label>
            <Input
              id="energy_level"
              type="number"
              min={1}
              max={10}
              {...form.register('energy_level', { valueAsNumber: true })}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <Label htmlFor="how_guest_says_they_feel">How guest says they feel</Label>
            <Textarea
              id="how_guest_says_they_feel"
              {...form.register('how_guest_says_they_feel')}
              rows={2}
              disabled={isCompleted}
              className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Patient Observations */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Patient Observations</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vital Signs</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symptoms</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Evolution</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">MORNING</td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('morning_vital_signs')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('morning_symptoms')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('morning_evolution')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">AFTERNOON</td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('afternoon_vital_signs')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('afternoon_symptoms')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('afternoon_evolution')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">NIGHT</td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('night_vital_signs')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('night_symptoms')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <Textarea
                    {...form.register('night_evolution')}
                    rows={2}
                    disabled={isCompleted}
                    className={`text-sm ${isCompleted ? 'bg-gray-50' : ''}`}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Medication & Treatment */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Medication & Treatment</h3>
        
        <div>
          <Label htmlFor="ibogaine_dose_time">Ibogaine (dose & time)</Label>
          <Input
            id="ibogaine_dose_time"
            {...form.register('ibogaine_dose_time')}
            placeholder="e.g., 500mg at 10:00 AM"
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="medication_schedule">Medication (with schedule)</Label>
          <Textarea
            id="medication_schedule"
            {...form.register('medication_schedule')}
            rows={3}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
            placeholder="List all medications with times"
          />
        </div>

        <div>
          <Label htmlFor="solutions_iv_saline_nadh">Solutions (IV/Saline/NADH, etc.)</Label>
          <Textarea
            id="solutions_iv_saline_nadh"
            {...form.register('solutions_iv_saline_nadh')}
            rows={2}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="medical_indications">Medical Indications</Label>
          <Textarea
            id="medical_indications"
            {...form.register('medical_indications')}
            rows={3}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>

        <div>
          <Label htmlFor="additional_observations_notes">Additional observations and notes</Label>
          <Textarea
            id="additional_observations_notes"
            {...form.register('additional_observations_notes')}
            rows={4}
            disabled={isCompleted}
            className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
          />
        </div>
      </div>

      {/* File Upload */}
      <div className="border-t pt-4">
        <Label htmlFor="photo_of_vitals_medical_notes_url">Photo of Vitals and Medical Notes (URL)</Label>
        <Input
          id="photo_of_vitals_medical_notes_url"
          type="url"
          {...form.register('photo_of_vitals_medical_notes_url')}
          placeholder="https://..."
          disabled={isCompleted}
          className={`mt-1 ${isCompleted ? 'bg-gray-50' : ''}`}
        />
        <p className="text-xs text-gray-500 mt-1">
          Upload photo to storage first, then paste the URL here
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
