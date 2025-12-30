'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOnboardingPatients } from '@/actions/onboarding.action'
import { Loader2, Users, CheckCircle2, Clock, Eye, Calendar, CreditCard, Plane, Stethoscope, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface OnboardingPatient {
  id: string
  first_name: string
  last_name: string
  email: string
  program_type: string | null
  created_at: string
  forms_completed: number
  forms_total: number
}

// Onboarding steps before arrival
const ONBOARDING_STEPS = [
  { id: 'forms', label: 'All Forms Completed', icon: FileCheck },
  { id: 'payment', label: 'Payment Received', icon: CreditCard },
  { id: 'travel', label: 'Travel Arranged', icon: Plane },
  { id: 'medical_clearance', label: 'Medical Clearance', icon: Stethoscope },
  { id: 'final_confirmation', label: 'Final Confirmation', icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<OnboardingPatient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOnboardingPatients()
  }, [])

  async function loadOnboardingPatients() {
    setIsLoading(true)
    try {
      const result = await getOnboardingPatients({ limit: 100 })
      if (result?.data?.success && result.data.data) {
        setPatients(result.data.data)
      }
    } catch (error) {
      console.error('Error loading onboarding patients:', error)
    } finally {
      setIsLoading(false)
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
    if (!programType) return 'Program Not Selected'
    const programMap: Record<string, string> = {
      neurological: 'Neurological Treatment Program',
      mental_health: 'Mental Health Treatment Program',
      addiction: 'Addiction Treatment Program',
    }
    return programMap[programType] || programType
  }

  function handleViewPatient(intakeFormId: string) {
    router.push(`/patient-pipeline/patient-profile/${intakeFormId}`)
  }

  // Calculate stats
  const totalOnboarding = patients.length
  const readyForArrival = patients.filter(p => {
    // For now, all patients with 4/4 forms are in onboarding
    // In the future, we can add more criteria (payment, travel, etc.)
    return p.forms_completed === 4
  }).length

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
          Track pre-arrival paperwork, signatures, and readiness
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
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">All forms completed (4/4)</p>
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
                {patients.reduce((sum, p) => sum + p.forms_completed, 0)}/{patients.length * 4}
              </p>
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">100% completion rate</p>
            </>
          )}
        </div>

        {/* Ready for Arrival */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Ready for Arrival</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{readyForArrival}</p>
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">All steps completed</p>
            </>
          )}
        </div>

        {/* Avg. Time to Complete */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Avg. Time to Complete</p>
          <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">-</p>
          <p className="text-gray-400 text-xs sm:text-sm">Goal: &lt; 4 days</p>
        </div>
      </div>

      {/* Patients List */}
      <div className="mt-6 sm:mt-8">
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
            <p className="text-gray-400 text-xs sm:text-sm mt-2">Patients who complete all 4 forms will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient Name
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Forms Status
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Onboarding Steps
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => (
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
                        <div className="text-xs sm:text-sm text-gray-900">
                          {formatProgramName(patient.program_type)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs sm:text-sm font-medium text-emerald-600">
                            {patient.forms_completed}/{patient.forms_total}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          {ONBOARDING_STEPS.map((step, index) => {
                            const StepIcon = step.icon
                            const isCompleted = index === 0 // Forms step is always completed for these patients
                            return (
                              <div
                                key={step.id}
                                className="flex items-center gap-1"
                                title={step.label}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                                ) : (
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />
                                )}
                                <span className="text-[10px] sm:text-xs text-gray-600 hidden sm:inline">
                                  {step.label}
                                </span>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPatient(patient.id)}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 min-h-[44px] sm:min-h-0"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
