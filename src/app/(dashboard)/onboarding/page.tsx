'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOnboardingPatientsNew, moveToPatientManagement } from '@/actions/onboarding-forms.action'
import { 
  Loader2, Users, CheckCircle2, Clock, Eye, Calendar, CreditCard, 
  Plane, Stethoscope, FileCheck, ArrowRight, Send, UserCheck,
  FileText, FileSignature, Camera, BookOpen, FileX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface OnboardingPatient {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  program_type: string | null
  status: string
  created_at: string
  forms_completed: number
  forms_total: number
  release_form_completed: boolean
  outing_consent_completed: boolean
  social_media_release_completed: boolean
  internal_regulations_completed: boolean
  informed_dissent_completed: boolean
  payment_received: boolean
  travel_arranged: boolean
  medical_clearance: boolean
}

// Onboarding forms
const ONBOARDING_FORMS = [
  { id: 'release', label: 'Release Form', icon: FileSignature, key: 'release_form_completed' },
  { id: 'outing', label: 'Outing Consent', icon: Plane, key: 'outing_consent_completed' },
  { id: 'social_media', label: 'Social Media', icon: Camera, key: 'social_media_release_completed' },
  { id: 'regulations', label: 'Regulations', icon: BookOpen, key: 'internal_regulations_completed' },
  { id: 'dissent', label: 'Informed Dissent', icon: FileX, key: 'informed_dissent_completed' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<OnboardingPatient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [movingPatient, setMovingPatient] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    loadOnboardingPatients()
  }, [statusFilter])

  async function loadOnboardingPatients() {
    setIsLoading(true)
    try {
      const result = await getOnboardingPatientsNew({ 
        limit: 100,
        status: statusFilter === 'all' ? 'all' : statusFilter,
      })
      if (result?.data?.success && result.data.data) {
        // Filter out moved_to_management unless showing all
        const filteredPatients = result.data.data.filter((p: OnboardingPatient) => 
          statusFilter === 'all' ? p.status !== 'moved_to_management' : true
        )
        setPatients(filteredPatients)
      }
    } catch (error) {
      console.error('Error loading onboarding patients:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMoveToManagement(onboardingId: string) {
    setMovingPatient(onboardingId)
    try {
      const result = await moveToPatientManagement({ onboarding_id: onboardingId })
      if (result?.data?.success) {
        toast.success('Patient moved to Patient Management successfully')
        loadOnboardingPatients()
      } else {
        toast.error(result?.data?.error || 'Failed to move patient')
      }
    } catch (error) {
      console.error('Error moving patient:', error)
      toast.error('An error occurred')
    } finally {
      setMovingPatient(null)
    }
  }

  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  function formatProgramName(programType: string | null): string {
    if (!programType) return 'Not Selected'
    const programMap: Record<string, string> = {
      neurological: 'Neurological',
      mental_health: 'Mental Health',
      addiction: 'Addiction',
    }
    return programMap[programType] || programType
  }

  function handleViewPatient(onboardingId: string) {
    // Open the onboarding forms page in a new tab
    window.open(`/onboarding-forms/${onboardingId}`, '_blank')
  }

  function copyFormLink(onboardingId: string) {
    const link = `${window.location.origin}/onboarding-forms/${onboardingId}`
    navigator.clipboard.writeText(link)
    toast.success('Form link copied to clipboard')
  }

  // Calculate stats
  const totalOnboarding = patients.length
  const completedForms = patients.filter(p => p.forms_completed === 5).length
  const inProgress = patients.filter(p => p.forms_completed < 5).length
  const totalFormsCompleted = patients.reduce((sum, p) => sum + p.forms_completed, 0)
  const totalFormsPossible = patients.length * 5

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: '44px',
            fontWeight: 400,
            color: 'black',
            wordWrap: 'break-word'
          }}
          className="text-2xl sm:text-3xl md:text-[44px]"
        >
          Onboarding
        </h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">
          Track onboarding forms completion and move patients to treatment
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Patients in Onboarding */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Patients in Onboarding</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{totalOnboarding}</p>
              <p className="text-blue-600 text-xs sm:text-sm font-medium">{inProgress} in progress</p>
            </>
          )}
        </div>

        {/* Forms Completed */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Forms Completed</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">
                {totalFormsCompleted}/{totalFormsPossible}
              </p>
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">
                {totalFormsPossible > 0 ? Math.round((totalFormsCompleted / totalFormsPossible) * 100) : 0}% completion rate
              </p>
            </>
          )}
        </div>

        {/* Ready for Treatment */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Ready for Treatment</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{completedForms}</p>
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">All 5 forms completed</p>
            </>
          )}
        </div>

        {/* Pending Forms */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Pending Forms</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">
                {totalFormsPossible - totalFormsCompleted}
              </p>
              <p className="text-amber-600 text-xs sm:text-sm font-medium">Awaiting completion</p>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 sm:mt-8 flex gap-2 mb-4">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('in_progress')}
        >
          In Progress
        </Button>
        <Button
          variant={statusFilter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('completed')}
        >
          Completed
        </Button>
      </div>

      {/* Patients List */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Patients in Onboarding</h2>
          <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
            {totalOnboarding}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 text-sm sm:text-base">No patients in onboarding yet.</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">
              Patients who complete all 4 pipeline forms and are moved to onboarding will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Forms Progress
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Status
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => {
                    const allFormsCompleted = patient.forms_completed === 5
                    
                    return (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[150px] sm:max-w-none">
                            {patient.email}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className="text-xs sm:text-sm text-gray-900">
                            {formatProgramName(patient.program_type)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  allFormsCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${(patient.forms_completed / 5) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              allFormsCompleted ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {patient.forms_completed}/5
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {ONBOARDING_FORMS.map((form) => {
                              const isCompleted = patient[form.key as keyof OnboardingPatient]
                              const FormIcon = form.icon
                              return (
                                <div
                                  key={form.id}
                                  className="flex items-center"
                                  title={`${form.label}: ${isCompleted ? 'Completed' : 'Pending'}`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-gray-300" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500">
                            {formatDate(patient.created_at)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyFormLink(patient.id)}
                              title="Copy form link"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPatient(patient.id)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            {allFormsCompleted && (
                              <Button
                                size="sm"
                                onClick={() => handleMoveToManagement(patient.id)}
                                disabled={movingPatient === patient.id}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                {movingPatient === patient.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Move to Treatment</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Form Legend</h3>
        <div className="flex flex-wrap gap-4">
          {ONBOARDING_FORMS.map((form) => {
            const FormIcon = form.icon
            return (
              <div key={form.id} className="flex items-center gap-2 text-sm text-gray-600">
                <FormIcon className="h-4 w-4" />
                <span>{form.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
