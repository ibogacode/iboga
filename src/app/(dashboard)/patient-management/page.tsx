'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPatientManagementList, dischargePatient } from '@/actions/patient-management.action'
import {
  Loader2, Users, CheckCircle2, Clock, Calendar, FileCheck,
  Stethoscope, FileText, Activity, AlertCircle, UserCheck, ClipboardList, LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface PatientManagementRecord {
  id: string
  patient_id: string | null
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  program_type: 'neurological' | 'mental_health' | 'addiction'
  status: 'active' | 'discharged' | 'transferred'
  arrival_date: string
  expected_departure_date: string | null
  assigned_to: string | null
  intake_report_completed: boolean
  parkinsons_psychological_report_completed: boolean
  parkinsons_mortality_scales_completed: boolean
  created_at: string
}

export default function PatientManagementPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientManagementRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'discharged' | 'transferred' | 'all'>('active')
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false)
  const [selectedPatientForDischarge, setSelectedPatientForDischarge] = useState<PatientManagementRecord | null>(null)
  const [isDischarging, setIsDischarging] = useState(false)

  useEffect(() => {
    loadPatientManagementList()
  }, [statusFilter])

  async function loadPatientManagementList() {
    setIsLoading(true)
    try {
      const result = await getPatientManagementList({ 
        limit: 100,
        status: statusFilter === 'all' ? 'all' : statusFilter,
      })
      if (result?.data?.success && result.data.data) {
        setPatients(result.data.data)
      } else {
        console.error('Failed to load patient management list:', result?.data?.error)
        if (result?.data?.error) {
          toast.error(result.data.error)
        }
      }
    } catch (error) {
      console.error('Error loading patient management list:', error)
        toast.error('Failed to load client management records')
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    try {
      // Parse the date string (assuming it's in YYYY-MM-DD format from database)
      // Since arrival_date is a DATE type (not TIMESTAMPTZ), it's just a date without time
      // We'll parse it and format it in EST timezone context
      
      // Parse the date string (YYYY-MM-DD format from PostgreSQL DATE type)
      const date = new Date(dateString + 'T00:00:00') // Add time to avoid timezone issues
      
      // Format as MMDDYYYY (e.g., "01/01/2024")
      // Using MM/dd/yyyy format for readability
      return format(date, 'MM/dd/yyyy')
    } catch (error) {
      console.error('Error formatting date:', error, dateString)
      return dateString
    }
  }

  function formatProgramName(programType: string): string {
    const programMap: Record<string, string> = {
      neurological: 'Neurological',
      mental_health: 'Mental Health',
      addiction: 'Addiction',
    }
    return programMap[programType] || programType
  }

  function getOneTimeFormsCompleted(patient: PatientManagementRecord): number {
    let completed = 0
    // Neurological: Only count Parkinson's forms (2 forms)
    // Non-neurological: Only count Intake Report (1 form)
    if (patient.program_type === 'neurological') {
      if (patient.parkinsons_psychological_report_completed) completed++
      if (patient.parkinsons_mortality_scales_completed) completed++
    } else {
      if (patient.intake_report_completed) completed++
    }
    
    return completed
  }

  function getOneTimeFormsTotal(patient: PatientManagementRecord): number {
    // Neurological: 2 Parkinson's forms only (no Intake Report)
    // Non-neurological: 1 Intake Report only
    return patient.program_type === 'neurological' ? 2 : 1
  }

  function handleDischargeClick(patient: PatientManagementRecord) {
    setSelectedPatientForDischarge(patient)
    setDischargeDialogOpen(true)
  }

  async function confirmDischarge() {
    if (!selectedPatientForDischarge) return

    setIsDischarging(true)
    try {
      const result = await dischargePatient({
        management_id: selectedPatientForDischarge.id,
      })

      if (result?.data?.success) {
        toast.success(result.data.message || 'Client discharged successfully')
        loadPatientManagementList()
        setDischargeDialogOpen(false)
        setSelectedPatientForDischarge(null)
      } else {
        toast.error(result?.data?.error || 'Failed to discharge client')
      }
    } catch (error) {
      console.error('Error discharging patient:', error)
      toast.error('An error occurred while discharging client')
    } finally {
      setIsDischarging(false)
    }
  }

  // Calculate stats
  const activePatients = patients.filter(p => p.status === 'active').length
  const dischargedPatients = patients.filter(p => p.status === 'discharged').length
  const transferredPatients = patients.filter(p => p.status === 'transferred').length
  const totalPatients = patients.length

  // Calculate one-time forms completion
  const totalOneTimeFormsCompleted = patients.reduce((sum, p) => sum + getOneTimeFormsCompleted(p), 0)
  const totalOneTimeFormsPossible = patients.reduce((sum, p) => sum + getOneTimeFormsTotal(p), 0)

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
          Client Management
        </h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">
          Manage active clients, daily forms, and treatment progress
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Active Patients */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Active Clients</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{activePatients}</p>
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">
                {totalPatients > 0 ? Math.round((activePatients / totalPatients) * 100) : 0}% of total
              </p>
            </>
          )}
        </div>

        {/* Total Patients */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Total Clients</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{totalPatients}</p>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-400">{dischargedPatients} discharged</span>
                {transferredPatients > 0 && (
                  <span className="text-gray-400">• {transferredPatients} transferred</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* One-Time Forms Completed */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">One-Time Forms</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">
                {totalOneTimeFormsCompleted}/{totalOneTimeFormsPossible}
              </p>
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">
                {totalOneTimeFormsPossible > 0 ? Math.round((totalOneTimeFormsCompleted / totalOneTimeFormsPossible) * 100) : 0}% completion rate
              </p>
            </>
          )}
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Current View</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">
                {statusFilter === 'all' ? totalPatients : patients.length}
              </p>
              <p className="text-blue-600 text-xs sm:text-sm font-medium capitalize">
                {statusFilter === 'all' ? 'All Statuses' : statusFilter} clients
              </p>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 sm:mt-8 flex gap-2 mb-4 flex-wrap">
        <Button
          variant={statusFilter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={statusFilter === 'discharged' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('discharged')}
        >
          Discharged
        </Button>
        <Button
          variant={statusFilter === 'transferred' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('transferred')}
        >
          Transferred
        </Button>
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
      </div>

      {/* Patients List */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {statusFilter === 'all' ? 'All Clients' : `Clients - ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
          </h2>
          <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
            {patients.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-100 text-center">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm sm:text-base">No clients found.</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">
              {statusFilter === 'active' 
                ? 'Clients who are moved to management from onboarding will appear here.'
                : `No clients with status "${statusFilter}" found.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Arrival Date
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => {
                    const oneTimeFormsCompleted = getOneTimeFormsCompleted(patient)
                    const oneTimeFormsTotal = getOneTimeFormsTotal(patient)
                    const allOneTimeFormsCompleted = oneTimeFormsCompleted === oneTimeFormsTotal
                    
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
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            patient.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-700'
                              : patient.status === 'discharged'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500">
                            {formatDate(patient.arrival_date)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/patient-management/${patient.id}/one-time-forms`)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">
                                {allOneTimeFormsCompleted ? 'One-Time Forms: done' : 'One-Time Forms'}
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/patient-management/${patient.id}/daily-forms`)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <ClipboardList className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">
                                {patient.status === 'active' ? 'Daily Forms' : 'Daily Forms (review)'}
                              </span>
                            </Button>
                            {patient.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDischargeClick(patient)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <LogOut className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Discharge</span>
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

      {/* Discharge Confirmation Dialog */}
      <AlertDialog open={dischargeDialogOpen} onOpenChange={setDischargeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discharge Client?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPatientForDischarge && (
                <>
                  This will discharge <strong>{selectedPatientForDischarge.first_name} {selectedPatientForDischarge.last_name}</strong> and set their actual departure date to today.
                  {selectedPatientForDischarge.expected_departure_date && (
                    <div className="mt-2 text-sm">
                      Expected departure was: <strong>{formatDate(selectedPatientForDischarge.expected_departure_date)}</strong>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDischarging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDischarge}
              disabled={isDischarging}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDischarging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discharging...
                </>
              ) : (
                'Discharge Client'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
