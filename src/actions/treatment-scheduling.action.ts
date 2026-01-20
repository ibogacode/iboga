'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Helper Functions
// ============================================================================

function isAdminStaffRole(role: string): boolean {
  return ['owner', 'admin', 'manager'].includes(role)
}

// ============================================================================
// Schemas
// ============================================================================

const getAvailableTreatmentDatesSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const assignTreatmentDateSchema = z.object({
  onboarding_id: z.string().uuid(),
  treatment_date: z.string().date(),
})

// ============================================================================
// Get Available Treatment Dates
// ============================================================================

export const getAvailableTreatmentDates = authActionClient
  .schema(getAvailableTreatmentDatesSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    // Default: today to 90 days from now
    const startDate = parsedInput.startDate || new Date().toISOString().split('T')[0]
    const endDateCalc = new Date()
    endDateCalc.setDate(endDateCalc.getDate() + 90)
    const endDate = parsedInput.endDate || endDateCalc.toISOString().split('T')[0]

    // Get schedule entries
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('treatment_schedule')
      .select('*')
      .gte('treatment_date', startDate)
      .lte('treatment_date', endDate)
      .order('treatment_date', { ascending: true })

    if (scheduleError) {
      return { success: false, error: scheduleError.message }
    }

    // Get patients with assigned treatment dates from onboarding
    const { data: patients, error: patientsError } = await supabase
      .from('patient_onboarding')
      .select('id, first_name, last_name, treatment_date, program_type, patient_id')
      .not('treatment_date', 'is', null)
      .gte('treatment_date', startDate)
      .lte('treatment_date', endDate)
      .neq('status', 'moved_to_management')
      .order('treatment_date', { ascending: true })

    if (patientsError) {
      return { success: false, error: patientsError.message }
    }

    // Get existing patients from patient_management (already arrived/in facility)
    // Include discharged_at to account for early discharges
    // We need to get:
    // 1. Active patients (regardless of arrival date - they're currently in facility)
    // 2. Discharged patients whose arrival_date is within our range (for historical occupancy)
    const { data: activePatients } = await supabase
      .from('patient_management')
      .select('id, first_name, last_name, arrival_date, program_type, patient_id, program_duration, discharged_at, status')
      .not('arrival_date', 'is', null)
      .eq('status', 'active')
      .order('arrival_date', { ascending: true })

    const { data: dischargedPatients } = await supabase
      .from('patient_management')
      .select('id, first_name, last_name, arrival_date, program_type, patient_id, program_duration, discharged_at, status')
      .not('arrival_date', 'is', null)
      .eq('status', 'discharged')
      .gte('discharged_at', startDate) // Only include if discharged within or after our date range
      .order('arrival_date', { ascending: true })

    // Combine active and relevant discharged patients
    const existingPatients = [...(activePatients || []), ...(dischargedPatients || [])]

    // Get service agreements with number_of_days
    const patientIds = patients?.map((p) => p.patient_id).filter(Boolean) || []
    const existingPatientIds = existingPatients?.map((p) => p.patient_id).filter(Boolean) || []
    const allPatientIds = [...patientIds, ...existingPatientIds]

    const { data: serviceAgreements } = await supabase
      .from('service_agreements')
      .select('patient_id, number_of_days')
      .in('patient_id', allPatientIds)

    const serviceAgreementMap = new Map(
      serviceAgreements?.map((sa) => [sa.patient_id, sa.number_of_days]) || []
    )

    // Group patients by date AND calculate occupancy for all days of their stay
    const patientsByDate = new Map<string, any[]>()
    const occupancyByDate = new Map<string, number>() // Total patients in facility each day

    // Process onboarding patients (future arrivals)
    patients?.forEach((p) => {
      if (p.treatment_date) {
        const numberOfDays = serviceAgreementMap.get(p.patient_id) || 14
        const patientInfo = {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          program_type: p.program_type,
          number_of_days: numberOfDays,
          source: 'onboarding', // Mark as onboarding patient
        }

        // Add patient to their arrival date
        if (!patientsByDate.has(p.treatment_date)) {
          patientsByDate.set(p.treatment_date, [])
        }
        patientsByDate.get(p.treatment_date)!.push(patientInfo)

        // Calculate all days this patient will be in the facility
        const arrivalDate = new Date(p.treatment_date)
        for (let i = 0; i < numberOfDays; i++) {
          const currentDay = new Date(arrivalDate)
          currentDay.setDate(currentDay.getDate() + i)
          const dayStr = currentDay.toISOString().split('T')[0]

          // Only count if within our date range
          if (dayStr >= startDate && dayStr <= endDate) {
            occupancyByDate.set(dayStr, (occupancyByDate.get(dayStr) || 0) + 1)
          }
        }
      }
    })

    // Process existing patients from patient_management (already in facility)
    existingPatients?.forEach((p) => {
      if (p.arrival_date) {
        // Use program_duration if available, otherwise fall back to service agreement or default
        const numberOfDays = p.program_duration || serviceAgreementMap.get(p.patient_id) || 14
        const patientInfo = {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          program_type: p.program_type,
          number_of_days: numberOfDays,
          source: 'management', // Mark as existing patient
        }

        // Add patient to their arrival date
        if (!patientsByDate.has(p.arrival_date)) {
          patientsByDate.set(p.arrival_date, [])
        }
        patientsByDate.get(p.arrival_date)!.push(patientInfo)

        // Calculate all days this patient is/was in the facility
        // If patient was discharged early, use discharged_at date instead of full program duration
        const arrivalDate = new Date(p.arrival_date)
        let actualEndDate: Date

        if (p.status === 'discharged' && p.discharged_at) {
          // Patient was discharged - use actual discharge date
          actualEndDate = new Date(p.discharged_at)
        } else {
          // Patient still active or no discharge date - use expected end based on program duration
          actualEndDate = new Date(arrivalDate)
          actualEndDate.setDate(actualEndDate.getDate() + numberOfDays - 1)
        }

        // Calculate occupancy from arrival to actual end date
        const currentDay = new Date(arrivalDate)
        while (currentDay <= actualEndDate) {
          const dayStr = currentDay.toISOString().split('T')[0]

          // Only count if within our date range
          if (dayStr >= startDate && dayStr <= endDate) {
            occupancyByDate.set(dayStr, (occupancyByDate.get(dayStr) || 0) + 1)
          }
          currentDay.setDate(currentDay.getDate() + 1)
        }
      }
    })

    return {
      success: true,
      data: {
        schedule: scheduleData || [],
        patientsByDate: Object.fromEntries(patientsByDate),
        occupancyByDate: Object.fromEntries(occupancyByDate),
      },
    }
  })

// ============================================================================
// Assign Treatment Date
// ============================================================================

export const assignTreatmentDate = authActionClient
  .schema(assignTreatmentDateSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Validate date is not in the past
    const today = new Date().toISOString().split('T')[0]
    if (parsedInput.treatment_date < today) {
      return {
        success: false,
        error: 'Treatment date cannot be in the past',
      }
    }

    // Check if patient already has a date assigned
    const { data: existingOnboarding } = await supabase
      .from('patient_onboarding')
      .select('treatment_date, first_name, last_name')
      .eq('id', parsedInput.onboarding_id)
      .single()

    if (!existingOnboarding) {
      return { success: false, error: 'Patient not found' }
    }

    // Check capacity for the requested date
    // Only check if it's a new assignment or date change
    if (existingOnboarding.treatment_date !== parsedInput.treatment_date) {
      const { data: schedule } = await supabase
        .from('treatment_schedule')
        .select('capacity_used, capacity_max')
        .eq('treatment_date', parsedInput.treatment_date)
        .maybeSingle()

      const capacityUsed = schedule?.capacity_used || 0
      const capacityMax = schedule?.capacity_max || 4

      if (capacityUsed >= capacityMax) {
        return {
          success: false,
          error: `Date is at full capacity (${capacityMax} patients). Please select another date.`,
        }
      }
    }

    // Assign treatment date
    const { data, error } = await supabase
      .from('patient_onboarding')
      .update({
        treatment_date: parsedInput.treatment_date,
        treatment_date_assigned_by: ctx.user.id,
        treatment_date_assigned_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.onboarding_id)
      .select('id, first_name, last_name, treatment_date')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/onboarding')
    return {
      success: true,
      data,
      message: `Treatment date assigned successfully for ${existingOnboarding.first_name} ${existingOnboarding.last_name}`,
    }
  })

// ============================================================================
// Get Next Available Date
// ============================================================================

export const getNextAvailableDate = authActionClient.action(async () => {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 90)

  const { data: schedule } = await supabase
    .from('treatment_schedule')
    .select('*')
    .gte('treatment_date', today)
    .lte('treatment_date', maxDate.toISOString().split('T')[0])
    .order('treatment_date', { ascending: true })

  // Find first date with capacity
  const availableDate = schedule?.find((s) => s.capacity_used < s.capacity_max)

  if (availableDate) {
    return { success: true, data: availableDate.treatment_date }
  }

  // If no existing dates have capacity, return today
  return { success: true, data: today }
})
