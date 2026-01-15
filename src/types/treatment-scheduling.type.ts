// =============================================================================
// Treatment Scheduling System Types
// =============================================================================

// Treatment schedule for capacity tracking
export interface TreatmentSchedule {
  id: string
  treatment_date: string
  capacity_used: number
  capacity_max: number
  created_at: string
  updated_at: string
}

// Date capacity status for UI
export type DateCapacityStatus = 'available' | 'limited' | 'full'

// Patient info for date capacity display
export interface DatePatient {
  id: string
  first_name: string
  last_name: string
  program_type: string
  number_of_days: number
}

// Date capacity info with patient list
export interface DateCapacity {
  date: string
  capacityUsed: number
  capacityMax: number
  status: DateCapacityStatus
  patients: DatePatient[]
}

// Treatment date assignment payload
export interface AssignTreatmentDatePayload {
  onboarding_id: string
  treatment_date: string
}

// Get available dates payload
export interface GetAvailableDatesPayload {
  startDate?: string
  endDate?: string
}

// Treatment date calendar props
export interface TreatmentDateCalendarProps {
  onboardingId: string
  patientName: string
  currentTreatmentDate?: string | null
  onSuccess?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}
