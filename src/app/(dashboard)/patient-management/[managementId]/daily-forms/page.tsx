'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  getPatientManagement, 
  getDailyFormsByManagementId 
} from '@/actions/patient-management.action'
import { DailyPsychologicalUpdateForm } from '@/components/forms/patient-management/daily-psychological-update-form'
import { DailyMedicalUpdateForm } from '@/components/forms/patient-management/daily-medical-update-form'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Stethoscope, 
  CheckCircle2, 
  Clock,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PatientManagementData {
  id: string
  first_name: string
  last_name: string
  program_type: 'neurological' | 'mental_health' | 'addiction'
  status: 'active' | 'discharged' | 'transferred'
}

interface DailyForm {
  id: string
  form_date: string
  is_completed: boolean
  started_at: string | null
  submitted_at: string | null
  started_by: string | null
  filled_by: string | null
  // Daily Psychological Update fields
  guest_first_name?: string
  guest_last_name?: string
  time?: string
  emotional_state_today?: string
  emotional_shifts_since_last_report?: string
  vivid_dreams_resurfacing_memories?: string
  feeling_connected_to_emotions?: string
  changes_memory_focus_concentration?: string
  feeling_present_aware?: string
  discomfort_side_effects?: string
  energy_level?: number
  experiencing_tremors_muscle_stiffness?: string
  motor_function_details?: string
  how_guest_looks_physically?: string
  how_guest_describes_feeling?: string
  additional_notes_observations?: string
  // Daily Medical Update fields
  patient_first_name?: string
  patient_last_name?: string
  checked_vitals?: boolean
  did_they_feel_hungry?: string
  using_bathroom_normally?: string
  hydrating?: string
  experiencing_tremors_motor_function?: string
  withdrawal_symptoms?: string
  how_guest_looks?: string
  how_guest_says_they_feel?: string
  morning_vital_signs?: string
  morning_symptoms?: string
  morning_evolution?: string
  afternoon_vital_signs?: string
  afternoon_symptoms?: string
  afternoon_evolution?: string
  night_vital_signs?: string
  night_symptoms?: string
  night_evolution?: string
  ibogaine_dose_time?: string
  medication_schedule?: string
  solutions_iv_saline_nadh?: string
  medical_indications?: string
  additional_observations_notes?: string
  photo_of_vitals_medical_notes_url?: string
  signature_data?: string
  signature_date?: string
}

export default function DailyFormsPage() {
  const params = useParams()
  const router = useRouter()
  const managementId = params.managementId as string

  const [management, setManagement] = useState<PatientManagementData | null>(null)
  const [psychologicalForms, setPsychologicalForms] = useState<DailyForm[]>([])
  const [medicalForms, setMedicalForms] = useState<DailyForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [selectedFormType, setSelectedFormType] = useState<'psychological' | 'medical' | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    loadData()
  }, [managementId])

  async function loadData() {
    setIsLoading(true)
    try {
      const [managementResult, formsResult] = await Promise.all([
        getPatientManagement({ management_id: managementId }),
        getDailyFormsByManagementId({ management_id: managementId }),
      ])

      if (managementResult?.data?.success && managementResult.data.data) {
        setManagement(managementResult.data.data as PatientManagementData)
      }

      if (formsResult?.data?.success && formsResult.data.data) {
        setPsychologicalForms(formsResult.data.data.psychological || [])
        setMedicalForms(formsResult.data.data.medical || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load daily forms')
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenForm(type: 'psychological' | 'medical', date?: string) {
    if (date) {
      setSelectedDate(date)
      setSelectedFormType(type)
      setIsDialogOpen(true)
    } else {
      // Show date picker
      setSelectedFormType(type)
      setShowDatePicker(true)
    }
  }

  function handleDateSelected() {
    if (selectedDate && selectedFormType) {
      setShowDatePicker(false)
      setIsDialogOpen(true)
    }
  }

  function handleCloseDialog() {
    setIsDialogOpen(false)
    setSelectedFormType(null)
    loadData() // Reload to refresh form statuses
  }

  function getFormForDate(forms: DailyForm[], date: string) {
    return forms.find(f => f.form_date === date)
  }

  function getTodayFormStatus() {
    const today = format(new Date(), 'yyyy-MM-dd')
    const psychForm = getFormForDate(psychologicalForms, today)
    const medForm = getFormForDate(medicalForms, today)
    
    return {
      psychological: psychForm,
      medical: medForm,
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!management) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-gray-500">Patient management record not found</p>
        </div>
      </div>
    )
  }

  if (management.status !== 'active') {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            Daily forms can only be filled for patients with 'active' status. 
            Current status: {management.status}
          </p>
        </div>
      </div>
    )
  }

  const todayStatus = getTodayFormStatus()
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/patient-management')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patient Management
        </Button>
        <h1 
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '44px',
            fontWeight: 400,
            color: 'black',
          }}
          className="text-2xl sm:text-3xl md:text-[44px]"
        >
          Daily Forms
        </h1>
        <p className="text-gray-600 mt-2">
          {management.first_name} {management.last_name}
        </p>
      </div>

      {/* Today's Forms Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Daily Psychological Update */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Daily Psychological Update</h3>
            </div>
            {todayStatus.psychological?.is_completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : todayStatus.psychological ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : null}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Track emotional state, cognitive function, and staff observations
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenForm('psychological', today)}
              variant={todayStatus.psychological?.is_completed ? 'outline' : 'default'}
              className="flex-1"
            >
              {todayStatus.psychological?.is_completed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  View Today's Form
                </>
              ) : todayStatus.psychological ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Continue Today's Form
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Today's Form
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOpenForm('psychological')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Select Date
            </Button>
          </div>
        </div>

        {/* Daily Medical Update */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Daily Medical Update</h3>
            </div>
            {todayStatus.medical?.is_completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : todayStatus.medical ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : null}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Track vitals, symptoms, medications, and treatment progress
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenForm('medical', today)}
              variant={todayStatus.medical?.is_completed ? 'outline' : 'default'}
              className="flex-1"
            >
              {todayStatus.medical?.is_completed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  View Today's Form
                </>
              ) : todayStatus.medical ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Continue Today's Form
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Today's Form
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOpenForm('medical')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Select Date
            </Button>
          </div>
        </div>
      </div>

      {/* Forms History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Psychological Forms History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Psychological Updates History</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {psychologicalForms.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No forms submitted yet</p>
            ) : (
              psychologicalForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(form.form_date), 'MMM dd, yyyy')}
                      </p>
                      {form.started_at && (
                        <p className="text-xs text-gray-500">
                          Started: {format(new Date(form.started_at), 'MMM dd, HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.is_completed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm('psychological', form.form_date)}
                        >
                          View
                        </Button>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-amber-500" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenForm('psychological', form.form_date)}
                        >
                          Continue
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Medical Forms History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Updates History</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {medicalForms.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No forms submitted yet</p>
            ) : (
              medicalForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(form.form_date), 'MMM dd, yyyy')}
                      </p>
                      {form.started_at && (
                        <p className="text-xs text-gray-500">
                          Started: {format(new Date(form.started_at), 'MMM dd, HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.is_completed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm('medical', form.form_date)}
                        >
                          View
                        </Button>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-amber-500" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenForm('medical', form.form_date)}
                        >
                          Continue
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFormType === 'psychological' ? 'Daily Psychological Update' : 'Daily Medical Update'} - {format(new Date(selectedDate), 'MMMM dd, yyyy')}
            </DialogTitle>
          </DialogHeader>
          {selectedFormType === 'psychological' && management && (
            <DailyPsychologicalUpdateForm
              managementId={managementId}
              patientFirstName={management.first_name}
              patientLastName={management.last_name}
              formDate={selectedDate}
              programType={management.program_type}
              isCompleted={getFormForDate(psychologicalForms, selectedDate)?.is_completed}
              isStarted={!!getFormForDate(psychologicalForms, selectedDate)}
              initialData={getFormForDate(psychologicalForms, selectedDate)}
              onSuccess={handleCloseDialog}
            />
          )}
          {selectedFormType === 'medical' && management && (
            <DailyMedicalUpdateForm
              managementId={managementId}
              patientFirstName={management.first_name}
              patientLastName={management.last_name}
              formDate={selectedDate}
              programType={management.program_type}
              isCompleted={getFormForDate(medicalForms, selectedDate)?.is_completed}
              isStarted={!!getFormForDate(medicalForms, selectedDate)}
              initialData={getFormForDate(medicalForms, selectedDate)}
              onSuccess={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Date Selection Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Select Date for {selectedFormType === 'psychological' ? 'Psychological' : 'Medical'} Update
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-date">Date</Label>
              <Input
                id="form-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')} // Can't select future dates
              />
            </div>
            <Button
              onClick={handleDateSelected}
              className="w-full"
              disabled={!selectedDate}
            >
              Open Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
