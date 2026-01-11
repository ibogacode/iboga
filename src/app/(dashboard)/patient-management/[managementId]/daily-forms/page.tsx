'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  getPatientManagement, 
  getDailyFormsByManagementId 
} from '@/actions/patient-management.action'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  Stethoscope, 
  CheckCircle2, 
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTodayEST, formatDateEST, formatDateFullEST } from '@/lib/utils'

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
}

export default function DailyFormsPage() {
  const params = useParams()
  const router = useRouter()
  const managementId = params.managementId as string

  const [management, setManagement] = useState<PatientManagementData | null>(null)
  const [psychologicalForms, setPsychologicalForms] = useState<DailyForm[]>([])
  const [medicalForms, setMedicalForms] = useState<DailyForm[]>([])
  const [sowsForms, setSowsForms] = useState<DailyForm[]>([])
  const [oowsForms, setOowsForms] = useState<DailyForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayEST())

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
        setSowsForms(formsResult.data.data.sows || [])
        setOowsForms(formsResult.data.data.oows || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load daily forms')
    } finally {
      setIsLoading(false)
    }
  }

  function openForm(type: 'psychological' | 'medical' | 'sows' | 'oows', date?: string) {
    const formDate = date || selectedDate
    router.push(`/patient-management/${managementId}/daily-forms/${type}?date=${formDate}`)
  }

  function getFormStatus(forms: DailyForm[], date: string) {
    const form = forms.find(f => f.form_date === date)
    if (!form) return null
    return {
      exists: true,
      isCompleted: form.is_completed,
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
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

  const psychStatus = getFormStatus(psychologicalForms, selectedDate)
  const medStatus = getFormStatus(medicalForms, selectedDate)
  const sowsStatus = getFormStatus(sowsForms, selectedDate)
  const oowsStatus = getFormStatus(oowsForms, selectedDate)
  
  const isAddictionProgram = management?.program_type === 'addiction'

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Button variant="ghost" onClick={() => router.push('/patient-management')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patient Management
        </Button>
        <h1 
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '36px',
            fontWeight: 400,
            color: 'black',
          }}
          className="text-2xl sm:text-3xl md:text-[36px]"
        >
          Daily Forms
        </h1>
        <p className="text-gray-900 mt-2 text-lg sm:text-xl font-semibold">
          {management.first_name} {management.last_name}
        </p>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <Label htmlFor="form-date" className="text-base font-semibold text-gray-900 mb-2 block">
          Select Date (EST)
        </Label>
        <Input
          id="form-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={getTodayEST()}
          className="w-full sm:max-w-xs"
        />
        <p className="text-sm text-gray-500 mt-2">
          Selected: {formatDateFullEST(selectedDate)}
        </p>
      </div>

      {/* Form Buttons */}
      <div className={`grid grid-cols-1 ${isAddictionProgram ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'} gap-4 sm:gap-6`}>
        {/* Psychological Update */}
        <div 
          className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
          onClick={() => openForm('psychological')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Psychological Update</h3>
              {psychStatus && (
                <div className="flex items-center gap-1 mt-1">
                  {psychStatus.isCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600">Completed</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600">In Progress</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Track emotional state, cognitive function, and observations
          </p>
        </div>

        {/* Medical Update */}
        <div 
          className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-300 hover:shadow-md transition-all cursor-pointer"
          onClick={() => openForm('medical')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Stethoscope className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Medical Update</h3>
              {medStatus && (
                <div className="flex items-center gap-1 mt-1">
                  {medStatus.isCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600">Completed</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600">In Progress</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Track vitals, symptoms, medications, and treatment progress
          </p>
        </div>

        {/* SOWS - Only for Addiction */}
        {isAddictionProgram && (
          <div 
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => openForm('sows')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">SOWS</h3>
                {sowsStatus && (
                  <div className="flex items-center gap-1 mt-1">
                    {sowsStatus.isCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600">Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-600">In Progress</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Subjective Opiate Withdrawal Scale
            </p>
          </div>
        )}

        {/* OOWS - Only for Addiction */}
        {isAddictionProgram && (
          <div 
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => openForm('oows')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">OOWS</h3>
                {oowsStatus && (
                  <div className="flex items-center gap-1 mt-1">
                    {oowsStatus.isCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600">Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-600">In Progress</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Objective Opioid Withdrawal Scale
            </p>
          </div>
        )}
      </div>

      {/* Forms History - Separate sections */}
      {(psychologicalForms.length > 0 || medicalForms.length > 0 || (isAddictionProgram && (sowsForms.length > 0 || oowsForms.length > 0))) && (
        <div className={`mt-8 grid grid-cols-1 ${isAddictionProgram ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'} gap-4 sm:gap-6`}>
          {/* Psychological Forms */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Psychological</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {psychologicalForms.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {[...psychologicalForms]
                    .sort((a, b) => new Date(b.form_date).getTime() - new Date(a.form_date).getTime())
                    .map((form, index) => (
                      <div
                        key={form.id}
                        className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer ${index > 0 ? 'border-t border-gray-100' : ''}`}
                        onClick={() => openForm('psychological', form.form_date)}
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateEST(form.form_date)}
                        </p>
                        {form.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">No forms yet</p>
              )}
            </div>
          </div>

          {/* Medical Forms */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Medical</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {medicalForms.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {[...medicalForms]
                    .sort((a, b) => new Date(b.form_date).getTime() - new Date(a.form_date).getTime())
                    .map((form, index) => (
                      <div
                        key={form.id}
                        className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer ${index > 0 ? 'border-t border-gray-100' : ''}`}
                        onClick={() => openForm('medical', form.form_date)}
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateEST(form.form_date)}
                        </p>
                        {form.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">No forms yet</p>
              )}
            </div>
          </div>

          {/* SOWS Forms - Only for Addiction */}
          {isAddictionProgram && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-900">SOWS</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {sowsForms.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {[...sowsForms]
                      .sort((a, b) => new Date(b.form_date).getTime() - new Date(a.form_date).getTime())
                      .map((form, index) => (
                        <div
                          key={form.id}
                          className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer ${index > 0 ? 'border-t border-gray-100' : ''}`}
                          onClick={() => openForm('sows', form.form_date)}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {formatDateEST(form.form_date)}
                          </p>
                          {form.is_completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="px-4 py-3 text-sm text-gray-500">No forms yet</p>
                )}
              </div>
            </div>
          )}

          {/* OOWS Forms - Only for Addiction */}
          {isAddictionProgram && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-gray-900">OOWS</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {oowsForms.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {[...oowsForms]
                      .sort((a, b) => new Date(b.form_date).getTime() - new Date(a.form_date).getTime())
                      .map((form, index) => (
                        <div
                          key={form.id}
                          className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer ${index > 0 ? 'border-t border-gray-100' : ''}`}
                          onClick={() => openForm('oows', form.form_date)}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {formatDateEST(form.form_date)}
                          </p>
                          {form.is_completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="px-4 py-3 text-sm text-gray-500">No forms yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
