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
  submitMedicalIntakeReport,
  updateMedicalIntakeReport,
  getCurrentStaffMemberName
} from '@/actions/patient-management.action'
import { 
  medicalIntakeReportSchema, 
  type MedicalIntakeReportInput 
} from '@/lib/validations/patient-management-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Pencil, History, Save, X, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useUser } from '@/hooks/use-user.hook'
import { FormEditHistoryDialog } from '@/components/forms/form-edit-history-dialog'

interface MedicalIntakeReportFormProps {
  managementId: string
  patientFirstName: string
  patientLastName: string
  patientDateOfBirth?: string
  arrivalDate?: string
  initialData?: Partial<MedicalIntakeReportInput> & {
    id?: string
    edit_count?: number
    edited_at?: string
    edited_by?: string
  }
  isCompleted?: boolean
  onSuccess?: () => void
}

export function MedicalIntakeReportForm({ 
  managementId, 
  patientFirstName,
  patientLastName,
  patientDateOfBirth,
  arrivalDate,
  initialData, 
  isCompleted,
  onSuccess 
}: MedicalIntakeReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const { profile } = useUser()

  // Check if user can edit (Owner, Admin, Manager)
  const canEdit = profile?.role && ['owner', 'admin', 'manager'].includes(profile.role)

  // Get current date in YYYY-MM-DD format (EST timezone)
  const getCurrentDate = () => {
    const estDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const [month, day, year] = estDate.split('/')
    return `${year}-${month}-${day}`
  }

  // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
  const isoToDateTimeLocal = (isoString: string | undefined | null): string => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  const form = useForm<MedicalIntakeReportInput>({
    resolver: zodResolver(medicalIntakeReportSchema) as any,
    defaultValues: {
      management_id: managementId,
      name: initialData?.name || `${patientFirstName} ${patientLastName}`,
      date_of_birth: initialData?.date_of_birth || patientDateOfBirth || '',
      arrival_date: initialData?.arrival_date || arrivalDate || getCurrentDate(),
      changes_since_medical_clearance: initialData?.changes_since_medical_clearance || false,
      changes_medications: initialData?.changes_medications || false,
      changes_substance_use: initialData?.changes_substance_use || false,
      changes_hospitalization: initialData?.changes_hospitalization || false,
      changes_new_symptoms: initialData?.changes_new_symptoms || false,
      changes_explanation: initialData?.changes_explanation || '',
      last_substance_use_datetime: isoToDateTimeLocal(initialData?.last_substance_use_datetime),
      medications_last_72_hours: initialData?.medications_last_72_hours || '',
      blood_pressure: initialData?.blood_pressure || '',
      heart_rate: initialData?.heart_rate || null,
      oxygen_saturation: initialData?.oxygen_saturation || null,
      temperature: initialData?.temperature || null,
      symptoms_nausea: initialData?.symptoms_nausea || false,
      symptoms_dizziness: initialData?.symptoms_dizziness || false,
      symptoms_palpitations: initialData?.symptoms_palpitations || false,
      symptoms_anxiety: initialData?.symptoms_anxiety || false,
      symptoms_pain: initialData?.symptoms_pain || false,
      last_food_intake: initialData?.last_food_intake || '',
      last_fluids: initialData?.last_fluids || '',
      well_hydrated: initialData?.well_hydrated || false,
      possibly_dehydrated: initialData?.possibly_dehydrated || false,
      current_state_calm: initialData?.current_state_calm || false,
      current_state_nervous: initialData?.current_state_nervous || false,
      current_state_overwhelmed: initialData?.current_state_overwhelmed || false,
      current_state_stable: initialData?.current_state_stable || false,
      thoughts_of_self_harm: initialData?.thoughts_of_self_harm || false,
      client_signature_data: initialData?.client_signature_data || '',
      client_signature_date: initialData?.client_signature_date || '',
      reviewed_by: initialData?.reviewed_by || '',
      reviewed_date: initialData?.reviewed_date || getCurrentDate(),
      submitted_by_name: initialData?.submitted_by_name || '',
    },
  })

  // Autofill staff member name for reviewed_by
  useEffect(() => {
    async function loadStaffMemberName() {
      if (!isCompleted && !form.getValues('reviewed_by')?.trim()) {
        try {
          const result = await getCurrentStaffMemberName({})
          if (result?.data?.success && result.data.data?.fullName) {
            form.setValue('reviewed_by', result.data.data.fullName, { shouldValidate: false, shouldDirty: false })
          }
        } catch (error) {
          console.error('Error loading staff member name:', error)
        }
      }
    }
    loadStaffMemberName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted])

  async function onSubmit(data: MedicalIntakeReportInput) {
    setIsSubmitting(true)
    try {
      // Convert datetime-local format to ISO string if provided
      const submitData = {
        ...data,
        last_substance_use_datetime: data.last_substance_use_datetime
          ? new Date(data.last_substance_use_datetime).toISOString()
          : undefined,
      }
      
      let result
      if (isEditMode && isCompleted) {
        // Use update action for editing completed forms
        result = await updateMedicalIntakeReport({
          ...submitData,
          management_id: managementId,
          is_completed: true, // Keep form as completed
        } as any)
      } else if (initialData) {
        // Legacy update path (shouldn't happen with new edit mode)
        result = await updateMedicalIntakeReport({
          ...submitData,
          is_completed: true,
        } as any)
      } else {
        // Submit new form
        result = await submitMedicalIntakeReport(submitData as any)
      }

      if (result?.data?.success) {
        toast.success(isEditMode ? 'Form updated successfully' : (initialData ? 'Medical intake report updated successfully' : 'Medical intake report submitted successfully'))
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

  const hasChanges = form.watch('changes_since_medical_clearance')

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

      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Medical Intake Report</h2>
            <p className="text-gray-600 mt-1 text-sm">
              {format(new Date(), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isCompleted && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
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
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="date_of_birth">Date of Birth *</Label>
            <Input
              id="date_of_birth"
              type="date"
              {...form.register('date_of_birth')}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="arrival_date">Arrival Date *</Label>
            <Input
              id="arrival_date"
              type="date"
              {...form.register('arrival_date')}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Changes Since Medical Clearance */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Changes Since Medical Clearance</h3>
        
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="changes_since_medical_clearance"
              checked={form.watch('changes_since_medical_clearance')}
              onCheckedChange={(checked) => {
                form.setValue('changes_since_medical_clearance', checked as boolean)
                if (!checked) {
                  form.setValue('changes_medications', false)
                  form.setValue('changes_substance_use', false)
                  form.setValue('changes_hospitalization', false)
                  form.setValue('changes_new_symptoms', false)
                  form.setValue('changes_explanation', '')
                }
              }}
              disabled={isCompleted && !isEditMode}
            />
            <Label htmlFor="changes_since_medical_clearance" className="text-base font-medium cursor-pointer">
              Changes since medical clearance? *
            </Label>
          </div>

          {hasChanges && (
            <div className="ml-6 space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="changes_medications"
                    checked={form.watch('changes_medications')}
                    onCheckedChange={(checked) => form.setValue('changes_medications', checked as boolean)}
                    disabled={isCompleted && !isEditMode}
                  />
                  <Label htmlFor="changes_medications" className="text-sm font-normal cursor-pointer">
                    Medications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="changes_substance_use"
                    checked={form.watch('changes_substance_use')}
                    onCheckedChange={(checked) => form.setValue('changes_substance_use', checked as boolean)}
                    disabled={isCompleted && !isEditMode}
                  />
                  <Label htmlFor="changes_substance_use" className="text-sm font-normal cursor-pointer">
                    Substance Use
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="changes_hospitalization"
                    checked={form.watch('changes_hospitalization')}
                    onCheckedChange={(checked) => form.setValue('changes_hospitalization', checked as boolean)}
                    disabled={isCompleted && !isEditMode}
                  />
                  <Label htmlFor="changes_hospitalization" className="text-sm font-normal cursor-pointer">
                    Hospitalization
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="changes_new_symptoms"
                    checked={form.watch('changes_new_symptoms')}
                    onCheckedChange={(checked) => form.setValue('changes_new_symptoms', checked as boolean)}
                    disabled={isCompleted && !isEditMode}
                  />
                  <Label htmlFor="changes_new_symptoms" className="text-sm font-normal cursor-pointer">
                    New Symptoms
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="changes_explanation">If yes, explain (optional)</Label>
                <Textarea
                  id="changes_explanation"
                  {...form.register('changes_explanation')}
                  rows={3}
                  disabled={isCompleted && !isEditMode}
                  placeholder="Provide details about the changes..."
                  className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Last Use & Medication Confirmation */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Last Use & Medication Confirmation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="last_substance_use_datetime">Last substance use (date/time)</Label>
            <Input
              id="last_substance_use_datetime"
              type="datetime-local"
              {...form.register('last_substance_use_datetime')}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="medications_last_72_hours">Medications taken in last 72 hours</Label>
            <Textarea
              id="medications_last_72_hours"
              {...form.register('medications_last_72_hours')}
              rows={3}
              disabled={isCompleted && !isEditMode}
              placeholder="List medications..."
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Current Physical Status (Staff) */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Current Physical Status (Staff)</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="blood_pressure">BP</Label>
            <Input
              id="blood_pressure"
              {...form.register('blood_pressure')}
              placeholder="120/80"
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="heart_rate">HR</Label>
            <Input
              id="heart_rate"
              type="number"
              min={30}
              max={200}
              {...form.register('heart_rate', { valueAsNumber: true })}
              placeholder="72"
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="oxygen_saturation">O2</Label>
            <Input
              id="oxygen_saturation"
              type="number"
              min={0}
              max={100}
              {...form.register('oxygen_saturation', { valueAsNumber: true })}
              placeholder="98"
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="temperature">Temp</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              {...form.register('temperature', { valueAsNumber: true })}
              placeholder="98.6"
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Symptoms today</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="symptoms_nausea"
                checked={form.watch('symptoms_nausea')}
                onCheckedChange={(checked) => form.setValue('symptoms_nausea', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="symptoms_nausea" className="text-sm font-normal cursor-pointer">
                Nausea
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="symptoms_dizziness"
                checked={form.watch('symptoms_dizziness')}
                onCheckedChange={(checked) => form.setValue('symptoms_dizziness', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="symptoms_dizziness" className="text-sm font-normal cursor-pointer">
                Dizziness
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="symptoms_palpitations"
                checked={form.watch('symptoms_palpitations')}
                onCheckedChange={(checked) => form.setValue('symptoms_palpitations', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="symptoms_palpitations" className="text-sm font-normal cursor-pointer">
                Palpitations
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="symptoms_anxiety"
                checked={form.watch('symptoms_anxiety')}
                onCheckedChange={(checked) => form.setValue('symptoms_anxiety', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="symptoms_anxiety" className="text-sm font-normal cursor-pointer">
                Anxiety
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="symptoms_pain"
                checked={form.watch('symptoms_pain')}
                onCheckedChange={(checked) => form.setValue('symptoms_pain', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="symptoms_pain" className="text-sm font-normal cursor-pointer">
                Pain
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Hydration & Nutrition */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Hydration & Nutrition</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="last_food_intake">Last food intake</Label>
            <Input
              id="last_food_intake"
              {...form.register('last_food_intake')}
              placeholder="e.g., 2 hours ago"
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="last_fluids">Last fluids</Label>
            <Input
              id="last_fluids"
              {...form.register('last_fluids')}
              placeholder="e.g., 1 hour ago"
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="well_hydrated"
              checked={form.watch('well_hydrated')}
              onCheckedChange={(checked) => {
                form.setValue('well_hydrated', checked as boolean)
                if (checked) form.setValue('possibly_dehydrated', false)
              }}
              disabled={isCompleted && !isEditMode}
            />
            <Label htmlFor="well_hydrated" className="text-sm font-normal cursor-pointer">
              Well hydrated
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="possibly_dehydrated"
              checked={form.watch('possibly_dehydrated')}
              onCheckedChange={(checked) => {
                form.setValue('possibly_dehydrated', checked as boolean)
                if (checked) form.setValue('well_hydrated', false)
              }}
              disabled={isCompleted && !isEditMode}
            />
            <Label htmlFor="possibly_dehydrated" className="text-sm font-normal cursor-pointer">
              Possibly dehydrated
            </Label>
          </div>
        </div>
      </div>

      {/* Mental & Emotional Check-In */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Mental & Emotional Check-In</h3>
        
        <div>
          <Label className="mb-3 block">Current state</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="current_state_calm"
                checked={form.watch('current_state_calm')}
                onCheckedChange={(checked) => form.setValue('current_state_calm', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="current_state_calm" className="text-sm font-normal cursor-pointer">
                Calm
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="current_state_nervous"
                checked={form.watch('current_state_nervous')}
                onCheckedChange={(checked) => form.setValue('current_state_nervous', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="current_state_nervous" className="text-sm font-normal cursor-pointer">
                Nervous
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="current_state_overwhelmed"
                checked={form.watch('current_state_overwhelmed')}
                onCheckedChange={(checked) => form.setValue('current_state_overwhelmed', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="current_state_overwhelmed" className="text-sm font-normal cursor-pointer">
                Overwhelmed
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="current_state_stable"
                checked={form.watch('current_state_stable')}
                onCheckedChange={(checked) => form.setValue('current_state_stable', checked as boolean)}
                disabled={isCompleted && !isEditMode}
              />
              <Label htmlFor="current_state_stable" className="text-sm font-normal cursor-pointer">
                Stable
              </Label>
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Thoughts of self-harm today? *</Label>
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="thoughts_of_self_harm_no"
                checked={form.watch('thoughts_of_self_harm') === false}
                onChange={() => form.setValue('thoughts_of_self_harm', false)}
                disabled={isCompleted && !isEditMode}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="thoughts_of_self_harm_no" className="text-base font-normal cursor-pointer">
                No
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="thoughts_of_self_harm_yes"
                checked={form.watch('thoughts_of_self_harm') === true}
                onChange={() => form.setValue('thoughts_of_self_harm', true)}
                disabled={isCompleted && !isEditMode}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="thoughts_of_self_harm_yes" className="text-base font-normal cursor-pointer">
                Yes
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Client Acknowledgement */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Client Acknowledgement</h3>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-4">
            I confirm the above information is accurate and complete.
          </p>
          
          <div>
            <Label>Client Signature</Label>
            <div className="mt-2">
              {isCompleted && form.watch('client_signature_data') ? (
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <img 
                    src={form.watch('client_signature_data') || ''} 
                    alt="Client Signature" 
                    className="max-w-full h-auto"
                  />
                  {form.watch('client_signature_date') && (
                    <p className="text-xs text-gray-500 mt-2">
                      Signed on: {form.watch('client_signature_date')}
                    </p>
                  )}
                </div>
              ) : !isCompleted ? (
                <SignaturePad
                  value={form.watch('client_signature_data') || ''}
                  onChange={(signature) => {
                    form.setValue('client_signature_data', signature)
                    form.setValue('client_signature_date', getCurrentDate())
                  }}
                  onClear={() => {
                    form.setValue('client_signature_data', '')
                    form.setValue('client_signature_date', '')
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Staff Medical Sign-Off */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Staff Medical Sign-Off (Internal)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reviewed_by">Reviewed by *</Label>
            <Input
              id="reviewed_by"
              {...form.register('reviewed_by')}
              placeholder="Staff member name"
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="reviewed_date">Date *</Label>
            <Input
              id="reviewed_date"
              type="date"
              {...form.register('reviewed_date')}
              disabled={isCompleted && !isEditMode}
              className={`mt-1 ${isCompleted && !isEditMode ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      {!isCompleted && !isEditMode && (
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

      {/* Edit History Dialog */}
      {initialData?.id && (
        <FormEditHistoryDialog
          open={showEditHistory}
          onOpenChange={setShowEditHistory}
          formTable="patient_management_medical_intake_reports"
          formId={initialData.id}
          formTitle="Medical Intake Report"
        />
      )}
    </form>
  )
}
