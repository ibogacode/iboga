'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPatientManagementList, dischargePatient } from '@/actions/patient-management.action'
import {
  Loader2, Users, CheckCircle2, Clock, Calendar, FileCheck,
  Stethoscope, FileText, Activity, AlertCircle, UserCheck, ClipboardList, LogOut, Eye,
  ChevronDown, ChevronUp, MinusCircle
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
import { useUser } from '@/hooks/use-user.hook'
import { hasStaffAccess } from '@/lib/utils'
import { useTour } from '@/hooks/use-tour.hook'
import { FloatingTourTrigger } from '@/components/tours/floating-tour-trigger'
import { getClientManagementTourSteps } from '@/components/tours/client-management-tour'

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
  /** Set by API when client has form activity before arrival_date (treated as present) */
  display_status?: 'Present' | 'Arriving Soon' | 'Discharged' | 'Transferred'
  /** First daily or one-time form date; overrides arrival_date for display when set */
  effective_arrival_date?: string
}

export default function PatientManagementPage() {
  const router = useRouter()
  const { profile } = useUser()
  const canViewPatientProfile = hasStaffAccess(profile?.role)
  const [patients, setPatients] = useState<PatientManagementRecord[]>([])
  const [counts, setCounts] = useState<{ present: number; arriving_soon: number; discharged: number; all: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'present' | 'arriving_soon' | 'discharged' | 'all'>('present')
  const [sortBy, setSortBy] = useState<'client' | 'program' | 'status' | 'arrival_date'>('arrival_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
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
        status: statusFilter,
        include_counts: true,
      })
      if (result?.data?.success && result.data.data) {
        setPatients(result.data.data)
        if (result.data.counts) setCounts(result.data.counts)
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
      const date = new Date(dateString + 'T00:00:00')
      return format(date, 'MM/dd/yyyy')
    } catch (error) {
      console.error('Error formatting date:', error, dateString)
      return dateString
    }
  }

  /** Arrival date to display and use for sorting: effective (first form date) when set, else official arrival_date. */
  function getDisplayArrivalDate(patient: PatientManagementRecord): string {
    return patient.effective_arrival_date ?? patient.arrival_date
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

  function getDisplayStatus(patient: PatientManagementRecord): 'Present' | 'Arriving Soon' | 'Discharged' | 'Transferred' {
    if (patient.display_status) return patient.display_status
    if (patient.status === 'discharged') return 'Discharged'
    if (patient.status === 'transferred') return 'Transferred'
    if (patient.status === 'active') {
      const today = new Date().toISOString().split('T')[0]
      return patient.arrival_date <= today ? 'Present' : 'Arriving Soon'
    }
    return 'Present'
  }

  const sortedPatients = [...patients].sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'client':
        cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
        break
      case 'program':
        cmp = formatProgramName(a.program_type).localeCompare(formatProgramName(b.program_type))
        break
      case 'status':
        cmp = getDisplayStatus(a).localeCompare(getDisplayStatus(b))
        break
      case 'arrival_date':
        cmp = getDisplayArrivalDate(a).localeCompare(getDisplayArrivalDate(b))
        break
      default:
        break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(column)
      setSortDir(column === 'client' ? 'asc' : 'desc')
    }
  }

  const totalPatients = counts?.all ?? patients.length
  const dischargedCount = counts?.discharged ?? 0
  const presentCount = counts?.present ?? 0
  const arrivingCount = counts?.arriving_soon ?? 0

  // Calculate one-time forms completion
  const totalOneTimeFormsCompleted = patients.reduce((sum, p) => sum + getOneTimeFormsCompleted(p), 0)
  const totalOneTimeFormsPossible = patients.reduce((sum, p) => sum + getOneTimeFormsTotal(p), 0)

  const { startTour, isRunning } = useTour({ storageKey: 'hasSeenClientManagementTour' })

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8" data-tour="page-header">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6" data-tour="stats-cards">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Currently Present</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{presentCount}</p>
              <p className="text-emerald-600 text-xs sm:text-sm font-medium">In institute</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Total Clients</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{totalPatients}</p>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-400">{arrivingCount} arriving</span>
                <span className="text-gray-400">• {dischargedCount} discharged</span>
              </div>
            </>
          )}
        </div>
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
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-2">Current View</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : (
            <>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3">{patients.length}</p>
              <p className="text-blue-600 text-xs sm:text-sm font-medium capitalize">
                {statusFilter === 'all' ? 'All clients' : statusFilter === 'present' ? 'Currently present' : statusFilter === 'arriving_soon' ? 'Arriving soon' : 'Discharged'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Filter by status */}
      <div className="mt-6 sm:mt-8 mb-6" data-tour="status-filter">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Click to filter by status</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('present')}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              statusFilter === 'present'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Currently Present</span>
            <span className="tabular-nums">{counts?.present ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('arriving_soon')}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              statusFilter === 'arriving_soon'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span>Arriving Soon</span>
            <span className="tabular-nums">{counts?.arriving_soon ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('discharged')}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              statusFilter === 'discharged'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MinusCircle className="h-4 w-4 shrink-0" />
            <span>Discharged</span>
            <span className="tabular-nums">{counts?.discharged ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>All Clients</span>
            <span className="tabular-nums">{counts?.all ?? 0}</span>
          </button>
        </div>
      </div>

      {/* Patients List */}
      <div className="mt-4" data-tour="clients-table">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Clients</h2>
          <span className="text-sm text-gray-500">Showing {patients.length} clients</span>
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
              {statusFilter === 'present'
                ? 'Clients who are in the institute will appear here.'
                : statusFilter === 'arriving_soon'
                ? 'Clients scheduled to arrive will appear here.'
                : statusFilter === 'discharged'
                ? 'No discharged or transferred clients found.'
                : 'Clients who are moved to management from onboarding will appear here.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-tour="col-sort">
                      <button
                        type="button"
                        onClick={() => toggleSort('client')}
                        className="inline-flex items-center gap-1 group focus:outline-none"
                      >
                        Client
                        {sortBy === 'client' ? (sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <span className="inline-block h-4 w-4 opacity-0 group-hover:opacity-50">↕</span>}
                      </button>
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort('program')}
                        className="inline-flex items-center gap-1 group focus:outline-none"
                      >
                        Program
                        {sortBy === 'program' ? (sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <span className="inline-block h-4 w-4 opacity-0 group-hover:opacity-50">↕</span>}
                      </button>
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="inline-flex items-center gap-1 group focus:outline-none"
                      >
                        Status
                        {sortBy === 'status' ? (sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <span className="inline-block h-4 w-4 opacity-0 group-hover:opacity-50">↕</span>}
                      </button>
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort('arrival_date')}
                        className="inline-flex items-center gap-1 group focus:outline-none"
                      >
                        Arrival Date
                        {sortBy === 'arrival_date' ? (sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <span className="inline-block h-4 w-4 opacity-0 group-hover:opacity-50">↕</span>}
                      </button>
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" data-tour="col-actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPatients.map((patient) => {
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
                          {(() => {
                            const display = getDisplayStatus(patient)
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                display === 'Present'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : display === 'Arriving Soon'
                                  ? 'bg-amber-100 text-amber-700'
                                  : display === 'Discharged'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {display === 'Present' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                                {display}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {formatDate(getDisplayArrivalDate(patient))}
                          </div>
                          {patient.effective_arrival_date && patient.effective_arrival_date !== patient.arrival_date && (
                            <div className="text-[10px] sm:text-xs text-gray-500">
                              Scheduled: {formatDate(patient.arrival_date)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canViewPatientProfile && patient.patient_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/patient-pipeline/patient-profile/${patient.patient_id}`)}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                            )}
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
      <FloatingTourTrigger
        disabled={isRunning}
        onClick={() => startTour(getClientManagementTourSteps())}
      />
    </div>
  )
}
