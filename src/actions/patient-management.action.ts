'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  intakeReportSchema,
  medicalIntakeReportSchema,
  parkinsonsPsychologicalReportSchema,
  parkinsonsMortalityScalesSchema,
  dailyPsychologicalUpdateSchema,
  dailyMedicalUpdateSchema,
  intakeReportAdminSchema,
  medicalIntakeReportAdminSchema,
  parkinsonsPsychologicalReportAdminSchema,
  parkinsonsMortalityScalesAdminSchema,
  dailyPsychologicalUpdateAdminSchema,
  dailyMedicalUpdateAdminSchema,
  startDailyPsychologicalUpdateSchema,
  startDailyMedicalUpdateSchema,
  dailySOWSSchema,
  dailyOOWSSchema,
  dailySOWSAdminSchema,
  dailyOOWSAdminSchema,
  startDailySOWSSchema,
  startDailyOOWSSchema,
  getPatientManagementSchema,
  getPatientManagementByPatientIdSchema,
  getPatientManagementListSchema,
  getDailyFormsByManagementIdSchema,
} from '@/lib/validations/patient-management-forms'

// Get current logged-in staff member's name for autofill
export const getCurrentStaffMemberName = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const supabase = await createClient()

    // Get user profile with name information
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('name, first_name, last_name')
      .eq('id', ctx.user.id)
      .single()

    if (error || !profile) {
      return { success: false, error: 'Failed to get staff member information' }
    }

    // Construct full name: prefer 'name' field, then first_name + last_name, then just first_name or last_name
    const fullName = profile.name || 
      (profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.first_name || profile.last_name || '')

    return { success: true, data: { fullName } }
  })
import type {
  PatientManagement,
  PatientManagementWithForms,
  PatientManagementFormType,
  PatientManagementDailyPsychologicalUpdate,
  PatientManagementDailyMedicalUpdate,
  PatientManagementDailySOWS,
  PatientManagementDailyOOWS,
  StaffRole,
} from '@/types'
import { isStaffRole } from '@/lib/utils'

// =============================================================================
// Error Handling Helpers
// =============================================================================

function handleSupabaseError(error: { code?: string; message?: string }, context: string): string {
  if (error.code === 'PGRST116') {
    return `${context}: record not found or access denied`
  }
  if (error.code === '23505') {
    return `${context}: duplicate record exists`
  }
  if (error.message?.includes('Not authorized')) {
    return 'Unauthorized: staff access required'
  }
  return error.message || `${context}: unknown error`
}

// =============================================================================
// Payload Builder Helpers
// =============================================================================

function buildUpdatePayload<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const key in input) {
    if (input[key] !== undefined) {
      payload[key] = input[key]
    }
  }
  return payload
}

// =============================================================================
// GET PATIENT MANAGEMENT RECORDS
// =============================================================================

export const getPatientManagement = authActionClient
  .schema(getPatientManagementSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patient_management')
      .select('*')
      .eq('id', parsedInput.management_id)
      .single()

    if (error || !data) {
      return { success: false, error: handleSupabaseError(error || { message: 'Unknown error' }, 'Failed to fetch patient management') }
    }

    return { success: true, data: data as PatientManagement }
  })

export const getPatientManagementByPatientId = authActionClient
  .schema(getPatientManagementByPatientIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Allow staff or the patient themselves
    if (!isStaffRole(ctx.user.role) && ctx.user.id !== parsedInput.patient_id) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patient_management')
      .select('*')
      .eq('patient_id', parsedInput.patient_id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to fetch patient management') }
    }

    return { success: true, data: data as PatientManagement | null }
  })

export const getPatientManagementList = authActionClient
  .schema(getPatientManagementListSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('patient_management')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parsedInput.offset, parsedInput.offset + parsedInput.limit - 1)

    if (parsedInput.status !== 'all') {
      query = query.eq('status', parsedInput.status)
    }

    if (parsedInput.program_type && parsedInput.program_type !== 'all') {
      query = query.eq('program_type', parsedInput.program_type)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to fetch patient management list') }
    }

    return { success: true, data: data as PatientManagement[] }
  })

// =============================================================================
// GET DAILY FORMS BY MANAGEMENT ID
// =============================================================================

export const getDailyFormsByManagementId = authActionClient
  .schema(getDailyFormsByManagementIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Build queries - join with profiles to get filler name
    let psychologicalQuery = supabase
      .from('patient_management_daily_psychological_updates')
      .select('*, filled_by_profile:profiles!patient_management_daily_psychological_updates_filled_by_fkey(first_name, last_name)')
      .eq('management_id', parsedInput.management_id)
      .order('form_date', { ascending: false })

    let medicalQuery = supabase
      .from('patient_management_daily_medical_updates')
      .select('*, filled_by_profile:profiles!patient_management_daily_medical_updates_filled_by_fkey(first_name, last_name)')
      .eq('management_id', parsedInput.management_id)
      .order('form_date', { ascending: false })

    let sowsQuery = supabase
      .from('patient_management_daily_sows')
      .select('*, filled_by_profile:profiles!patient_management_daily_sows_filled_by_fkey(first_name, last_name)')
      .eq('management_id', parsedInput.management_id)
      .order('form_date', { ascending: false })

    let oowsQuery = supabase
      .from('patient_management_daily_oows')
      .select('*, filled_by_profile:profiles!patient_management_daily_oows_filled_by_fkey(first_name, last_name)')
      .eq('management_id', parsedInput.management_id)
      .order('form_date', { ascending: false })

    // If specific date provided, filter by it
    if (parsedInput.form_date) {
      psychologicalQuery = psychologicalQuery.eq('form_date', parsedInput.form_date)
      medicalQuery = medicalQuery.eq('form_date', parsedInput.form_date)
      sowsQuery = sowsQuery.eq('form_date', parsedInput.form_date)
      oowsQuery = oowsQuery.eq('form_date', parsedInput.form_date)
    }

    const [psychologicalResult, medicalResult, sowsResult, oowsResult] = await Promise.all([
      psychologicalQuery,
      medicalQuery,
      sowsQuery,
      oowsQuery,
    ])

    if (psychologicalResult.error) {
      return { success: false, error: handleSupabaseError(psychologicalResult.error, 'Failed to fetch daily psychological updates') }
    }

    if (medicalResult.error) {
      return { success: false, error: handleSupabaseError(medicalResult.error, 'Failed to fetch daily medical updates') }
    }

    if (sowsResult.error) {
      return { success: false, error: handleSupabaseError(sowsResult.error, 'Failed to fetch daily SOWS') }
    }

    if (oowsResult.error) {
      return { success: false, error: handleSupabaseError(oowsResult.error, 'Failed to fetch daily OOWS') }
    }

    return {
      success: true,
      data: {
        psychological: psychologicalResult.data as PatientManagementDailyPsychologicalUpdate[],
        medical: medicalResult.data as PatientManagementDailyMedicalUpdate[],
        sows: sowsResult.data as PatientManagementDailySOWS[],
        oows: oowsResult.data as PatientManagementDailyOOWS[],
      },
    }
  })

// =============================================================================
// GET PATIENT MANAGEMENT WITH FORMS
// =============================================================================

export const getPatientManagementWithForms = authActionClient
  .schema(getPatientManagementSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Fetch management record
    const { data: management, error: managementError } = await supabase
      .from('patient_management')
      .select('*')
      .eq('id', parsedInput.management_id)
      .single()

    if (managementError || !management) {
      return { success: false, error: handleSupabaseError(managementError || { message: 'Unknown error' }, 'Failed to fetch patient management') }
    }

    // Fetch medical history form by email or patient_id
    let medicalHistoryPromise: any
    
    if (management.patient_id) {
      // Try to find by patient_id first (via intake form)
      const { data: intakeForm } = await supabase
        .from('patient_intake_forms')
        .select('id')
        .eq('patient_id', management.patient_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (intakeForm?.id) {
        medicalHistoryPromise = supabase
          .from('medical_history_forms')
          .select('*')
          .eq('intake_form_id', intakeForm.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      } else if (management.email) {
        // Fallback to email
        medicalHistoryPromise = supabase
          .from('medical_history_forms')
          .select('*')
          .ilike('email', management.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      } else {
        medicalHistoryPromise = Promise.resolve({ data: null, error: null })
      }
    } else if (management.email) {
      medicalHistoryPromise = supabase
        .from('medical_history_forms')
        .select('*')
        .ilike('email', management.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    } else {
      medicalHistoryPromise = Promise.resolve({ data: null, error: null })
    }

    // Fetch all forms
    const [intakeReport, medicalIntakeReport, parkinsonsPsychological, parkinsonsMortality, dailyPsychological, dailyMedical, medicalHistory] = await Promise.all([
      // Intake Report (non-neurological only)
      management.program_type !== 'neurological'
        ? supabase
            .from('patient_management_intake_reports')
            .select('*')
            .eq('management_id', parsedInput.management_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      // Medical Intake Report (all programs)
      supabase
        .from('patient_management_medical_intake_reports')
        .select('*')
        .eq('management_id', parsedInput.management_id)
        .maybeSingle(),

      // Parkinson's Psychological Report (neurological only)
      management.program_type === 'neurological'
        ? supabase
            .from('patient_management_parkinsons_psychological_reports')
            .select('*')
            .eq('management_id', parsedInput.management_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      // Parkinson's Mortality Scales (neurological only)
      management.program_type === 'neurological'
        ? supabase
            .from('patient_management_parkinsons_mortality_scales')
            .select('*')
            .eq('management_id', parsedInput.management_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      // Daily Psychological Updates (all programs, multiple records)
      supabase
        .from('patient_management_daily_psychological_updates')
        .select('*')
        .eq('management_id', parsedInput.management_id)
        .order('form_date', { ascending: false }),

      // Daily Medical Updates (all programs, multiple records)
      supabase
        .from('patient_management_daily_medical_updates')
        .select('*')
        .eq('management_id', parsedInput.management_id)
        .order('form_date', { ascending: false }),

      // Medical History Form
      medicalHistoryPromise,
    ])

    // Handle medical history result
    let medicalHistoryData = null
    if (medicalHistory && !medicalHistory.error && medicalHistory.data) {
      medicalHistoryData = medicalHistory.data
    }

    return {
      success: true,
      data: {
        management: management as PatientManagement,
        forms: {
          intakeReport: intakeReport.data || null,
          medicalIntakeReport: medicalIntakeReport.data || null,
          parkinsonsPsychologicalReport: parkinsonsPsychological.data || null,
          parkinsonsMortalityScales: parkinsonsMortality.data || null,
          dailyPsychologicalUpdates: dailyPsychological.data || [],
          dailyMedicalUpdates: dailyMedical.data || [],
          medicalHistory: medicalHistoryData,
        },
      } as PatientManagementWithForms,
    }
  })

// =============================================================================
// ONE-TIME FORM: INTAKE REPORT (All Programs)
// =============================================================================

export const submitIntakeReport = authActionClient
  .schema(intakeReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Get management record to check program_type
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, program_type')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management) {
      return { success: false, error: 'Patient management record not found' }
    }

    // Intake Report is only for non-neurological programs
    if (management.program_type === 'neurological') {
      return { success: false, error: 'Intake Report is not available for neurological programs. Please use Parkinson\'s forms instead.' }
    }

    // Check if form already exists
    const { data: existing } = await supabase
      .from('patient_management_intake_reports')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Intake report already exists for this patient' }
    }

    const { data, error } = await supabase
      .from('patient_management_intake_reports')
      .insert({
        ...parsedInput,
        patient_id: management?.patient_id || null,
        filled_by: ctx.user.id,
        filled_at: new Date().toISOString(),
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to submit intake report') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Intake report submitted successfully' }
  })

export const updateIntakeReport = authActionClient
  .schema(intakeReportAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    const updatePayload = buildUpdatePayload(parsedInput)
    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      if (!updatePayload.filled_at) {
        updatePayload.filled_at = new Date().toISOString()
      }
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
    }

    const { data, error } = await supabase
      .from('patient_management_intake_reports')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update intake report') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Intake report updated successfully' }
  })

// =============================================================================
// ONE-TIME FORM: MEDICAL INTAKE REPORT (All Programs)
// =============================================================================

export const submitMedicalIntakeReport = authActionClient
  .schema(medicalIntakeReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Get management record
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management) {
      return { success: false, error: 'Patient management record not found' }
    }

    // Check if form already exists
    const { data: existing } = await supabase
      .from('patient_management_medical_intake_reports')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Medical intake report already exists for this patient' }
    }

    // Get current staff member name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, first_name, last_name')
      .eq('id', ctx.user.id)
      .single()

    const staffName = profile?.name ||
      (profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.first_name || profile?.last_name || '')

    const { data, error } = await supabase
      .from('patient_management_medical_intake_reports')
      .insert({
        ...parsedInput,
        patient_id: management?.patient_id || null,
        filled_by: ctx.user.id,
        filled_at: new Date().toISOString(),
        submitted_by_name: staffName,
        submitted_at: new Date().toISOString(),
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to submit medical intake report') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Medical intake report submitted successfully' }
  })

export const updateMedicalIntakeReport = authActionClient
  .schema(medicalIntakeReportAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    const updatePayload = buildUpdatePayload(parsedInput)
    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      if (!updatePayload.filled_at) {
        updatePayload.filled_at = new Date().toISOString()
      }
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
      if (!updatePayload.submitted_at) {
        updatePayload.submitted_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('patient_management_medical_intake_reports')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update medical intake report') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Medical intake report updated successfully' }
  })

// =============================================================================
// ONE-TIME FORM: PARKINSON'S PSYCHOLOGICAL REPORT (Neurological Only)
// =============================================================================

export const submitParkinsonsPsychologicalReport = authActionClient
  .schema(parkinsonsPsychologicalReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Verify patient is neurological
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, program_type')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management || management.program_type !== 'neurological') {
      return { success: false, error: 'This form is only available for neurological program patients' }
    }

    // Check if form already exists
    const { data: existing } = await supabase
      .from('patient_management_parkinsons_psychological_reports')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Parkinson\'s psychological report already exists for this patient' }
    }

    // Convert number ratings to strings for database storage
    const insertData = {
      ...parsedInput,
      overall_mental_health_rating: String(parsedInput.overall_mental_health_rating),
      daily_stress_management: String(parsedInput.daily_stress_management),
      depression_sadness_severity: String(parsedInput.depression_sadness_severity),
      expressing_emotions_safety: String(parsedInput.expressing_emotions_safety),
      ibogaine_therapy_preparation: String(parsedInput.ibogaine_therapy_preparation),
      support_system_strength: String(parsedInput.support_system_strength),
      treatment_outcome_hope: String(parsedInput.treatment_outcome_hope),
      anxiety_nervousness_severity: String(parsedInput.anxiety_nervousness_severity),
      emotional_numbness_frequency: String(parsedInput.emotional_numbness_frequency),
      sleep_quality: String(parsedInput.sleep_quality),
      parkinsons_motor_symptoms_severity: String(parsedInput.parkinsons_motor_symptoms_severity),
      stiffness_difficulty_moving_frequency: String(parsedInput.stiffness_difficulty_moving_frequency),
      medication_effectiveness: String(parsedInput.medication_effectiveness),
      muscle_spasms_cramps_frequency: String(parsedInput.muscle_spasms_cramps_frequency),
      non_motor_symptoms_severity: String(parsedInput.non_motor_symptoms_severity),
      iboga_wellness_team_support: String(parsedInput.iboga_wellness_team_support),
      patient_id: management.patient_id,
      filled_by: ctx.user.id,
      filled_at: new Date().toISOString(),
      is_completed: true,
      completed_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('patient_management_parkinsons_psychological_reports')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to submit Parkinson\'s psychological report') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Parkinson\'s psychological report submitted successfully' }
  })

export const updateParkinsonsPsychologicalReport = authActionClient
  .schema(parkinsonsPsychologicalReportAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    const updatePayload = buildUpdatePayload(parsedInput)
    
    // Convert number ratings to strings for database storage if they exist
    const ratingFields = [
      'overall_mental_health_rating',
      'daily_stress_management',
      'depression_sadness_severity',
      'expressing_emotions_safety',
      'ibogaine_therapy_preparation',
      'support_system_strength',
      'treatment_outcome_hope',
      'anxiety_nervousness_severity',
      'emotional_numbness_frequency',
      'sleep_quality',
      'parkinsons_motor_symptoms_severity',
      'stiffness_difficulty_moving_frequency',
      'medication_effectiveness',
      'muscle_spasms_cramps_frequency',
      'non_motor_symptoms_severity',
      'iboga_wellness_team_support',
    ]
    
    ratingFields.forEach((field) => {
      if (updatePayload[field] !== undefined && typeof updatePayload[field] === 'number') {
        updatePayload[field] = String(updatePayload[field])
      }
    })
    
    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      if (!updatePayload.filled_at) {
        updatePayload.filled_at = new Date().toISOString()
      }
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
    }

    const { data, error } = await supabase
      .from('patient_management_parkinsons_psychological_reports')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update Parkinson\'s psychological report') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Parkinson\'s psychological report updated successfully' }
  })

// =============================================================================
// ONE-TIME FORM: PARKINSON'S MORTALITY SCALES (Neurological Only)
// =============================================================================

export const submitParkinsonsMortalityScales = authActionClient
  .schema(parkinsonsMortalityScalesSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Verify patient is neurological
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, program_type')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management || management.program_type !== 'neurological') {
      return { success: false, error: 'This form is only available for neurological program patients' }
    }

    // Check if form already exists
    const { data: existing } = await supabase
      .from('patient_management_parkinsons_mortality_scales')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Parkinson\'s mortality scales already exist for this patient' }
    }

    const { data, error } = await supabase
      .from('patient_management_parkinsons_mortality_scales')
      .insert({
        ...parsedInput,
        patient_id: management.patient_id,
        filled_by: ctx.user.id,
        filled_at: new Date().toISOString(),
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to submit Parkinson\'s mortality scales') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Parkinson\'s mortality scales submitted successfully' }
  })

export const updateParkinsonsMortalityScales = authActionClient
  .schema(parkinsonsMortalityScalesAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    const updatePayload = buildUpdatePayload(parsedInput)
    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      if (!updatePayload.filled_at) {
        updatePayload.filled_at = new Date().toISOString()
      }
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
    }

    const { data, error } = await supabase
      .from('patient_management_parkinsons_mortality_scales')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update Parkinson\'s mortality scales') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Parkinson\'s mortality scales updated successfully' }
  })

// =============================================================================
// DAILY FORM: DAILY PSYCHOLOGICAL UPDATE (All Programs)
// =============================================================================

export const startDailyPsychologicalUpdate = authActionClient
  .schema(startDailyPsychologicalUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Check if form already exists for this date
    const { data: existing } = await supabase
      .from('patient_management_daily_psychological_updates')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Daily psychological update already exists for this date' }
    }

    // Get patient_id from management record
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, first_name, last_name')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management) {
      return { success: false, error: 'Patient management record not found' }
    }

    // Create initial record with started_by tracking
    // Provide placeholder values for required NOT NULL fields that will be filled in the form
    const { data, error } = await supabase
      .from('patient_management_daily_psychological_updates')
      .insert({
        management_id: parsedInput.management_id,
        patient_id: management.patient_id,
        form_date: parsedInput.form_date,
        guest_first_name: management.first_name,
        guest_last_name: management.last_name,
        time: '', // Will be filled when submitted
        emotional_state_today: '', // Required field - will be filled when submitting
        energy_level: 5, // Required field - default middle value, will be updated when submitting
        how_guest_looks_physically: '', // Required field - will be filled when submitting
        how_guest_describes_feeling: '', // Required field - will be filled when submitting
        additional_notes_observations: '', // Required field - will be filled when submitting
        started_by: ctx.user.id,
        started_at: new Date().toISOString(),
        is_completed: false,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to start daily psychological update') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Daily psychological update started' }
  })

export const submitDailyPsychologicalUpdate = authActionClient
  .schema(dailyPsychologicalUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Check if form exists (should have been started)
    const { data: existing } = await supabase
      .from('patient_management_daily_psychological_updates')
      .select('id, started_by')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    const updatePayload: Record<string, unknown> = {
      ...parsedInput,
      filled_by: ctx.user.id,
      submitted_at: new Date().toISOString(),
      is_completed: true,
      completed_at: new Date().toISOString(),
    }

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('patient_management_daily_psychological_updates')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit daily psychological update') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'Daily psychological update submitted successfully' }
    } else {
      // Create new record (if not started, create it now)
      const { data: management } = await supabase
        .from('patient_management')
        .select('patient_id, first_name, last_name')
        .eq('id', parsedInput.management_id)
        .single()

      if (!management) {
        return { success: false, error: 'Patient management record not found' }
      }

      const { data, error } = await supabase
        .from('patient_management_daily_psychological_updates')
        .insert({
          ...updatePayload,
          patient_id: management.patient_id,
          started_by: ctx.user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit daily psychological update') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'Daily psychological update submitted successfully' }
    }
  })

export const updateDailyPsychologicalUpdate = authActionClient
  .schema(dailyPsychologicalUpdateAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    const updatePayload = buildUpdatePayload(parsedInput)
    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      updatePayload.submitted_at = new Date().toISOString()
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
    }

    const { data, error } = await supabase
      .from('patient_management_daily_psychological_updates')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update daily psychological update') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Daily psychological update updated successfully' }
  })

// =============================================================================
// DAILY FORM: DAILY MEDICAL UPDATE (All Programs)
// =============================================================================

export const startDailyMedicalUpdate = authActionClient
  .schema(startDailyMedicalUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Check if form already exists for this date
    const { data: existing } = await supabase
      .from('patient_management_daily_medical_updates')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Daily medical update already exists for this date' }
    }

    // Get patient_id from management record
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, first_name, last_name')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management) {
      return { success: false, error: 'Patient management record not found' }
    }

    // Create initial record with started_by tracking
    const { data, error } = await supabase
      .from('patient_management_daily_medical_updates')
      .insert({
        management_id: parsedInput.management_id,
        patient_id: management.patient_id,
        form_date: parsedInput.form_date,
        patient_first_name: management.first_name,
        patient_last_name: management.last_name,
        checked_vitals: false,
        started_by: ctx.user.id,
        started_at: new Date().toISOString(),
        is_completed: false,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to start daily medical update') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Daily medical update started' }
  })

export const submitDailyMedicalUpdate = authActionClient
  .schema(dailyMedicalUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Check if form exists (should have been started)
    const { data: existing } = await supabase
      .from('patient_management_daily_medical_updates')
      .select('id, started_by')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    const updatePayload: Record<string, unknown> = {
      ...parsedInput,
      filled_by: ctx.user.id,
      submitted_at: new Date().toISOString(),
      is_completed: true,
      completed_at: new Date().toISOString(),
    }

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('patient_management_daily_medical_updates')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit daily medical update') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'Daily medical update submitted successfully' }
    } else {
      // Create new record (if not started, create it now)
      const { data: management } = await supabase
        .from('patient_management')
        .select('patient_id, first_name, last_name')
        .eq('id', parsedInput.management_id)
        .single()

      if (!management) {
        return { success: false, error: 'Patient management record not found' }
      }

      const { data, error } = await supabase
        .from('patient_management_daily_medical_updates')
        .insert({
          ...updatePayload,
          patient_id: management.patient_id,
          started_by: ctx.user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit daily medical update') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'Daily medical update submitted successfully' }
    }
  })

export const updateDailyMedicalUpdate = authActionClient
  .schema(dailyMedicalUpdateAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    const updatePayload = buildUpdatePayload(parsedInput)
    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      updatePayload.submitted_at = new Date().toISOString()
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
    }

    const { data, error } = await supabase
      .from('patient_management_daily_medical_updates')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update daily medical update') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'Daily medical update updated successfully' }
  })

// =============================================================================
// DAILY FORM: SOWS (Subjective Opiate Withdrawal Scale) - Addiction Only
// =============================================================================

export const startDailySOWS = authActionClient
  .schema(startDailySOWSSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Verify patient is addiction program and get patient name
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, program_type, first_name, last_name')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management || management.program_type !== 'addiction') {
      return { success: false, error: 'SOWS form is only available for addiction program patients' }
    }

    // Check if form already exists
    const { data: existing } = await supabase
      .from('patient_management_daily_sows')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    if (existing) {
      return { success: true, data: existing, message: 'Form already started' }
    }

    const { data, error } = await supabase
      .from('patient_management_daily_sows')
      .insert({
        management_id: parsedInput.management_id,
        patient_id: management.patient_id,
        patient_first_name: management.first_name || '',
        patient_last_name: management.last_name || '',
        form_date: parsedInput.form_date,
        time: new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        started_by: ctx.user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to start SOWS form') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'SOWS form started successfully' }
  })

export const submitDailySOWS = authActionClient
  .schema(dailySOWSSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Verify patient is addiction program
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, program_type')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management || management.program_type !== 'addiction') {
      return { success: false, error: 'SOWS form is only available for addiction program patients' }
    }

    // Calculate total score
    const symptoms = [
      parsedInput.symptom_1_anxious,
      parsedInput.symptom_2_yawning,
      parsedInput.symptom_3_perspiring,
      parsedInput.symptom_4_eyes_tearing,
      parsedInput.symptom_5_nose_running,
      parsedInput.symptom_6_goosebumps,
      parsedInput.symptom_7_shaking,
      parsedInput.symptom_8_hot_flushes,
      parsedInput.symptom_9_cold_flushes,
      parsedInput.symptom_10_bones_muscles_ache,
      parsedInput.symptom_11_restless,
      parsedInput.symptom_12_nauseous,
      parsedInput.symptom_13_vomiting,
      parsedInput.symptom_14_muscles_twitch,
      parsedInput.symptom_15_stomach_cramps,
      parsedInput.symptom_16_feel_like_using_now,
    ]
    const totalScore = symptoms.reduce((sum: number, score: number | null | undefined) => sum + (score ?? 0), 0)

    // Get current user's name for submitted_by_name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('name, first_name, last_name')
      .eq('id', ctx.user.id)
      .single()

    const submittedByName = userProfile?.name ||
      (userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : userProfile?.first_name || userProfile?.last_name || '')

    // Check if form exists
    const { data: existing } = await supabase
      .from('patient_management_daily_sows')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    if (existing) {
      // Update existing form
      const { data, error } = await supabase
        .from('patient_management_daily_sows')
        .update({
          ...parsedInput,
          total_score: totalScore,
          patient_id: management.patient_id,
          filled_by: ctx.user.id,
          submitted_by_name: submittedByName,
          submitted_at: new Date().toISOString(),
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit SOWS form') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'SOWS form submitted successfully' }
    } else {
      // Get current user's name for submitted_by_name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, first_name, last_name')
        .eq('id', ctx.user.id)
        .single()

      const submittedByName = userProfile?.name ||
        (userProfile?.first_name && userProfile?.last_name
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : userProfile?.first_name || userProfile?.last_name || '')

      // Create new form
      const { data, error } = await supabase
        .from('patient_management_daily_sows')
        .insert({
          ...parsedInput,
          total_score: totalScore,
          patient_id: management.patient_id,
          started_by: ctx.user.id,
          started_at: new Date().toISOString(),
          filled_by: ctx.user.id,
          submitted_by_name: submittedByName,
          submitted_at: new Date().toISOString(),
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit SOWS form') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'SOWS form submitted successfully' }
    }
  })

export const updateDailySOWS = authActionClient
  .schema(dailySOWSAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Calculate total score if symptoms are provided
    let totalScore = parsedInput.total_score
    if (totalScore === undefined || totalScore === null) {
      const symptoms = [
        parsedInput.symptom_1_anxious,
        parsedInput.symptom_2_yawning,
        parsedInput.symptom_3_perspiring,
        parsedInput.symptom_4_eyes_tearing,
        parsedInput.symptom_5_nose_running,
        parsedInput.symptom_6_goosebumps,
        parsedInput.symptom_7_shaking,
        parsedInput.symptom_8_hot_flushes,
        parsedInput.symptom_9_cold_flushes,
        parsedInput.symptom_10_bones_muscles_ache,
        parsedInput.symptom_11_restless,
        parsedInput.symptom_12_nauseous,
        parsedInput.symptom_13_vomiting,
        parsedInput.symptom_14_muscles_twitch,
        parsedInput.symptom_15_stomach_cramps,
        parsedInput.symptom_16_feel_like_using_now,
      ]
      totalScore = symptoms.reduce((sum: number, score: number | null | undefined) => sum + (score ?? 0), 0)
    }

    const updatePayload = buildUpdatePayload(parsedInput)
    updatePayload.total_score = totalScore

    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      updatePayload.submitted_at = new Date().toISOString()
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
    }

    const { data, error } = await supabase
      .from('patient_management_daily_sows')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update SOWS form') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'SOWS form updated successfully' }
  })

// =============================================================================
// DAILY FORM: OOWS (Objective Opioid Withdrawal Scale) - Addiction Only
// =============================================================================

export const startDailyOOWS = authActionClient
  .schema(startDailyOOWSSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Verify patient is addiction program and get patient name
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, program_type, first_name, last_name')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management || management.program_type !== 'addiction') {
      return { success: false, error: 'OOWS form is only available for addiction program patients' }
    }

    // Check if form already exists
    const { data: existing } = await supabase
      .from('patient_management_daily_oows')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    if (existing) {
      return { success: true, data: existing, message: 'Form already started' }
    }

    const { data, error } = await supabase
      .from('patient_management_daily_oows')
      .insert({
        management_id: parsedInput.management_id,
        patient_id: management.patient_id,
        patient_first_name: management.first_name || '',
        patient_last_name: management.last_name || '',
        form_date: parsedInput.form_date,
        time: new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        started_by: ctx.user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to start OOWS form') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'OOWS form started successfully' }
  })

export const submitDailyOOWS = authActionClient
  .schema(dailyOOWSSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Verify patient is addiction program
    const { data: management } = await supabase
      .from('patient_management')
      .select('patient_id, program_type')
      .eq('id', parsedInput.management_id)
      .single()

    if (!management || management.program_type !== 'addiction') {
      return { success: false, error: 'OOWS form is only available for addiction program patients' }
    }

    // Calculate total score
    const symptoms = [
      parsedInput.symptom_1_yawning,
      parsedInput.symptom_2_rhinorrhoea,
      parsedInput.symptom_3_piloerection,
      parsedInput.symptom_4_perspiration,
      parsedInput.symptom_5_lacrimation,
      parsedInput.symptom_6_tremor,
      parsedInput.symptom_7_mydriasis,
      parsedInput.symptom_8_hot_cold_flushes,
      parsedInput.symptom_9_restlessness,
      parsedInput.symptom_10_vomiting,
      parsedInput.symptom_11_muscle_twitches,
      parsedInput.symptom_12_abdominal_cramps,
      parsedInput.symptom_13_anxiety,
    ]
    const totalScore = symptoms.reduce((sum: number, score: number | null | undefined) => sum + (score ?? 0), 0)

    // Get current user's name for submitted_by_name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('name, first_name, last_name')
      .eq('id', ctx.user.id)
      .single()

    const submittedByName = userProfile?.name ||
      (userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : userProfile?.first_name || userProfile?.last_name || '')

    // Check if form exists
    const { data: existing } = await supabase
      .from('patient_management_daily_oows')
      .select('id')
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .maybeSingle()

    if (existing) {
      // Update existing form
      const { data, error } = await supabase
        .from('patient_management_daily_oows')
        .update({
          ...parsedInput,
          total_score: totalScore,
          patient_id: management.patient_id,
          filled_by: ctx.user.id,
          submitted_by_name: submittedByName,
          submitted_at: new Date().toISOString(),
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit OOWS form') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'OOWS form submitted successfully' }
    } else {
      // Use already fetched userProfile
      const submittedByName = userProfile?.name ||
        (userProfile?.first_name && userProfile?.last_name
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : userProfile?.first_name || userProfile?.last_name || '')

      // Create new form
      const { data, error } = await supabase
        .from('patient_management_daily_oows')
        .insert({
          ...parsedInput,
          total_score: totalScore,
          patient_id: management.patient_id,
          started_by: ctx.user.id,
          started_at: new Date().toISOString(),
          filled_by: ctx.user.id,
          submitted_by_name: submittedByName,
          submitted_at: new Date().toISOString(),
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: handleSupabaseError(error, 'Failed to submit OOWS form') }
      }

      revalidatePath('/patient-management')
      return { success: true, data, message: 'OOWS form submitted successfully' }
    }
  })

export const updateDailyOOWS = authActionClient
  .schema(dailyOOWSAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Calculate total score if symptoms are provided
    let totalScore = parsedInput.total_score
    if (totalScore === undefined || totalScore === null) {
      const symptoms = [
        parsedInput.symptom_1_yawning,
        parsedInput.symptom_2_rhinorrhoea,
        parsedInput.symptom_3_piloerection,
        parsedInput.symptom_4_perspiration,
        parsedInput.symptom_5_lacrimation,
        parsedInput.symptom_6_tremor,
        parsedInput.symptom_7_mydriasis,
        parsedInput.symptom_8_hot_cold_flushes,
        parsedInput.symptom_9_restlessness,
        parsedInput.symptom_10_vomiting,
        parsedInput.symptom_11_muscle_twitches,
        parsedInput.symptom_12_abdominal_cramps,
        parsedInput.symptom_13_anxiety,
      ]
      totalScore = symptoms.reduce((sum: number, score: number | null | undefined) => sum + (score ?? 0), 0)
    }

    const updatePayload = buildUpdatePayload(parsedInput)
    updatePayload.total_score = totalScore

    if (parsedInput.is_completed) {
      updatePayload.completed_at = new Date().toISOString()
      updatePayload.submitted_at = new Date().toISOString()
      if (!updatePayload.filled_by) {
        updatePayload.filled_by = ctx.user.id
      }
    }

    const { data, error } = await supabase
      .from('patient_management_daily_oows')
      .update(updatePayload)
      .eq('management_id', parsedInput.management_id)
      .eq('form_date', parsedInput.form_date)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update OOWS form') }
    }

    revalidatePath('/patient-management')
    return { success: true, data, message: 'OOWS form updated successfully' }
  })
