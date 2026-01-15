'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadDocument } from '@/lib/supabase/document-storage'
import { sendEmailDirect } from './email.action'
import {
  releaseFormSchema,
  outingConsentFormSchema,
  socialMediaFormSchema,
  internalRegulationsFormSchema,
  informedDissentFormSchema,
  moveToOnboardingSchema,
  getOnboardingByIdSchema,
  updateOnboardingStatusSchema,
  moveToPatientManagementSchema,
  // Admin schemas (relaxed)
  releaseFormAdminSchema,
  outingConsentFormAdminSchema,
  socialMediaFormAdminSchema,
  internalRegulationsFormAdminSchema,
  informedDissentFormAdminSchema,
} from '@/lib/validations/onboarding-forms'
import type {
  PatientOnboarding,
  PatientOnboardingWithProgress,
  OnboardingWithForms,
  OnboardingFormType,
  StaffRole,
  AdminStaffRole,
} from '@/types'

// =============================================================================
// Role Guard Helpers
// =============================================================================

const STAFF_ROLE_LIST: StaffRole[] = ['owner', 'admin', 'manager', 'doctor', 'nurse', 'psych']
const ADMIN_STAFF_ROLE_LIST: AdminStaffRole[] = ['owner', 'admin', 'manager']

function isStaffRole(role: string): role is StaffRole {
  return STAFF_ROLE_LIST.includes(role as StaffRole)
}

function isAdminStaffRole(role: string): role is AdminStaffRole {
  return ADMIN_STAFF_ROLE_LIST.includes(role as AdminStaffRole)
}

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
    return 'Unauthorized: admin staff access required'
  }
  return error.message || `${context}: unknown error`
}

// =============================================================================
// Payload Builder Helpers (only include defined values)
// =============================================================================

/**
 * Builds an update payload object, excluding undefined values
 * This prevents accidentally setting DB columns to null
 * Note: null values ARE preserved (only undefined is stripped)
 * Returns Record<string, unknown> for compatibility with Supabase update()
 */
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
// DB-Aware Validation Helper for Admin "Mark Completed"
// =============================================================================

/**
 * Validates that a form can be marked as completed by fetching the existing row,
 * merging with incoming partial update, and validating against strict patient schema.
 * 
 * WHY DB-AWARE VALIDATION?
 * - Admin updates are partial (only send fields to change)
 * - When marking complete, we need to validate the FULL merged state (existing + incoming)
 * - Validating just the incoming payload would fail even if DB already has all required fields
 * 
 * @param tableName - The form table name
 * @param onboardingId - The onboarding ID
 * @param incomingPatch - The partial update from admin
 * @param strictSchema - The strict patient submission schema to validate against
 */
async function assertCanCompleteForm<T extends Record<string, unknown>>({
  supabase,
  tableName,
  onboardingId,
  incomingPatch,
  strictSchema,
}: {
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? Awaited<T> : never
  tableName: string
  onboardingId: string
  incomingPatch: Record<string, unknown> // Accept any partial update (allows null from admin schemas)
  strictSchema: z.ZodSchema<T>
}): Promise<{ success: true } | { success: false; error: string }> {
  // Fetch existing row
  const { data: existingRow, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq('onboarding_id', onboardingId)
    .single()

  if (fetchError || !existingRow) {
    return { success: false, error: 'Form not found' }
  }

  // Merge existing row with incoming patch (incoming takes precedence)
  const merged = { ...existingRow, ...incomingPatch } as T

  // Validate merged data against strict patient schema
  try {
    strictSchema.parse(merged)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]
      return {
        success: false,
        error: firstIssue?.message || 'Validation failed: form does not meet completion requirements',
      }
    }
    return { success: false, error: 'Validation failed' }
  }
}

// =============================================================================
// Form Table Map
// =============================================================================

const FORM_TABLES: Record<OnboardingFormType, string> = {
  release: 'onboarding_release_forms',
  outing: 'onboarding_outing_consent_forms',
  social_media: 'onboarding_social_media_forms',
  regulations: 'onboarding_internal_regulations_forms',
  dissent: 'onboarding_informed_dissent_forms',
}

// =============================================================================
// MOVE PATIENT TO ONBOARDING (Using RPC)
// =============================================================================
export const movePatientToOnboarding = authActionClient
  .schema(moveToOnboardingSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()
    
    // Use local variables - don't mutate parsedInput
    let intakeFormId: string | null = parsedInput.intake_form_id || null
    let email: string | null = null

    // If only partial form provided, get email and check for completed form
    if (!intakeFormId && parsedInput.partial_intake_form_id) {
      const adminClient = createAdminClient()
      const { data: partialForm, error: partialError } = await adminClient
        .from('partial_intake_forms')
        .select('email, completed_form_id')
        .eq('id', parsedInput.partial_intake_form_id)
        .single()
      
      if (partialError || !partialForm?.email) {
        return { success: false, error: 'Partial intake form not found or missing email' }
      }
      
      email = partialForm.email
      
      // If partial form has completed intake, use that
      if (partialForm.completed_form_id) {
        intakeFormId = partialForm.completed_form_id
      }
    }

    // Call RPC
    const { data: onboardingId, error } = await supabase.rpc('create_onboarding_with_prefill', {
      p_patient_id: null,
      p_intake_form_id: intakeFormId,
      p_email: email,
    })

    if (error) {
      console.error('[movePatientToOnboarding] RPC error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to create onboarding') }
    }

    revalidatePath('/onboarding')
    revalidatePath('/patient-pipeline')

    return {
      success: true,
      data: {
        onboarding_id: onboardingId as string,
        message: 'Patient moved to onboarding successfully. 5 forms have been created.',
      },
    }
  })

// =============================================================================
// MOVE PATIENT TO ONBOARDING BY EMAIL (Direct)
// =============================================================================
const moveToOnboardingByEmailSchema = z.object({
  email: z.string().email(),
  patient_id: z.string().uuid().optional(),
  intake_form_id: z.string().uuid().optional(),
})

export const movePatientToOnboardingByEmail = authActionClient
  .schema(moveToOnboardingByEmailSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    const { data: onboardingId, error } = await supabase.rpc('create_onboarding_with_prefill', {
      p_patient_id: parsedInput.patient_id || null,
      p_intake_form_id: parsedInput.intake_form_id || null,
      p_email: parsedInput.email,
    })

    if (error) {
      console.error('[movePatientToOnboardingByEmail] RPC error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to create onboarding') }
    }

    revalidatePath('/onboarding')
    revalidatePath('/patient-pipeline')

    return {
      success: true,
      data: {
        onboarding_id: onboardingId as string,
        message: 'Patient moved to onboarding successfully. 5 forms have been created.',
      },
    }
  })

// =============================================================================
// LINK PATIENT TO ONBOARDING (Admin only)
// =============================================================================
const linkPatientToOnboardingSchema = z.object({
  onboarding_id: z.string().uuid(),
  patient_id: z.string().uuid(),
})

export const linkPatientToOnboarding = authActionClient
  .schema(linkPatientToOnboardingSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc('link_patient_to_onboarding', {
      p_onboarding_id: parsedInput.onboarding_id,
      p_patient_id: parsedInput.patient_id,
    })

    if (error) {
      console.error('[linkPatientToOnboarding] RPC error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to link patient') }
    }

    revalidatePath('/onboarding')

    return {
      success: true,
      data: { linked: data as boolean },
      message: 'Patient linked to onboarding successfully',
    }
  })

// =============================================================================
// GET ONBOARDING BY ID
// =============================================================================
export const getOnboardingById = authActionClient
  .schema(getOnboardingByIdSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    // Fetch onboarding record (RLS will filter based on role)
    const { data: onboarding, error: onboardingError } = await supabase
      .from('patient_onboarding')
      .select('*')
      .eq('id', parsedInput.onboarding_id)
      .single()

    if (onboardingError) {
      const errorMsg = onboardingError.code === 'PGRST116' 
        ? 'Onboarding record not found or access denied'
        : onboardingError.message
      return { success: false, error: errorMsg }
    }

    // Fetch all 3 forms in parallel (using maybeSingle to handle missing forms gracefully)
    const [releaseForm, outingForm, regulationsForm] = await Promise.all([
      supabase.from('onboarding_release_forms').select('*').eq('onboarding_id', parsedInput.onboarding_id).maybeSingle(),
      supabase.from('onboarding_outing_consent_forms').select('*').eq('onboarding_id', parsedInput.onboarding_id).maybeSingle(),
      supabase.from('onboarding_internal_regulations_forms').select('*').eq('onboarding_id', parsedInput.onboarding_id).maybeSingle(),
    ])

    const result: OnboardingWithForms = {
      onboarding: onboarding as PatientOnboarding,
      forms: {
        releaseForm: releaseForm.data ?? null,
        outingForm: outingForm.data ?? null,
        socialMediaForm: null, // Removed from onboarding flow
        regulationsForm: regulationsForm.data ?? null,
        dissentForm: null, // Removed from onboarding flow
      },
    }

    return { success: true, data: result }
  })

// =============================================================================
// GET ALL ONBOARDING PATIENTS (Staff only)
// =============================================================================
const getOnboardingPatientsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  status: z.enum(['in_progress', 'completed', 'moved_to_management', 'all']).default('all'),
})

export const getOnboardingPatients = authActionClient
  .schema(getOnboardingPatientsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('patient_onboarding')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parsedInput.limit)

    if (parsedInput.status !== 'all') {
      query = query.eq('status', parsedInput.status)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    // Add computed fields
    const patientsWithProgress: PatientOnboardingWithProgress[] = (data || []).map((patient) => {
      const completedForms = [
        patient.release_form_completed,
        patient.outing_consent_completed,
        patient.internal_regulations_completed,
      ].filter(Boolean).length

      return {
        ...patient,
        forms_completed: completedForms,
        forms_total: 3,
      } as PatientOnboardingWithProgress
    })

    return { success: true, data: patientsWithProgress }
  })

// Alias for backward compatibility
export const getOnboardingPatientsNew = getOnboardingPatients

// =============================================================================
// UPDATE ONBOARDING STATUS (Admin checklist items)
// =============================================================================
export const updateOnboardingStatus = authActionClient
  .schema(updateOnboardingStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    const updateData = buildUpdatePayload({
      payment_received: parsedInput.payment_received,
      travel_arranged: parsedInput.travel_arranged,
      medical_clearance: parsedInput.medical_clearance,
    })

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('patient_onboarding')
      .update(updateData)
      .eq('id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update onboarding') }
    }

    revalidatePath('/onboarding')
    return { success: true, data: data as PatientOnboarding }
  })

// =============================================================================
// UPDATE ONBOARDING DETAILS (Admin only)
// =============================================================================
const updateOnboardingDetailsSchema = z.object({
  onboarding_id: z.string().uuid(),
  notes: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  expected_arrival_date: z.string().nullable().optional(),
})

export const updateOnboardingDetails = authActionClient
  .schema(updateOnboardingDetailsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    const updateData = buildUpdatePayload({
      notes: parsedInput.notes,
      priority: parsedInput.priority,
      assigned_to: parsedInput.assigned_to,
      expected_arrival_date: parsedInput.expected_arrival_date,
    })

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('patient_onboarding')
      .update(updateData)
      .eq('id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update onboarding') }
    }

    revalidatePath('/onboarding')
    return { success: true, data: data as PatientOnboarding }
  })

// =============================================================================
// MOVE TO PATIENT MANAGEMENT
// =============================================================================
export const moveToPatientManagement = authActionClient
  .schema(moveToPatientManagementSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Check completion status
    const { data: onboarding, error: fetchError } = await supabase
      .from('patient_onboarding')
      .select('*')
      .eq('id', parsedInput.onboarding_id)
      .single()

    if (fetchError || !onboarding) {
      return { success: false, error: 'Onboarding record not found' }
    }

    const allFormsCompleted = 
      onboarding.release_form_completed &&
      onboarding.outing_consent_completed &&
      onboarding.internal_regulations_completed

    if (!allFormsCompleted) {
      return { success: false, error: 'All 3 forms must be completed before moving to patient management' }
    }

    // Check if patient_management record already exists
    const { data: existingManagement } = await supabase
      .from('patient_management')
      .select('id')
      .eq('onboarding_id', parsedInput.onboarding_id)
      .maybeSingle()

    if (existingManagement) {
      return { success: false, error: 'Patient is already in management' }
    }

    // Validate treatment_date is assigned
    if (!onboarding.treatment_date) {
      return {
        success: false,
        error: 'Treatment date must be assigned before moving to patient management',
      }
    }

    // Validate program_type
    if (!onboarding.program_type || !['neurological', 'mental_health', 'addiction'].includes(onboarding.program_type)) {
      return { success: false, error: 'Invalid program type. Cannot move to management.' }
    }

    // Get service agreement to calculate expected_departure_date
    const { data: serviceAgreement } = await supabase
      .from('service_agreements')
      .select('number_of_days')
      .eq('patient_id', onboarding.patient_id)
      .maybeSingle()

    const numberOfDays = serviceAgreement?.number_of_days || 14

    // Note: expected_departure_date will be auto-calculated by database trigger
    // but we include program_duration for reference

    // Create patient_management record
    const { data: managementData, error: managementError } = await supabase
      .from('patient_management')
      .insert({
        onboarding_id: parsedInput.onboarding_id,
        patient_id: onboarding.patient_id,
        first_name: onboarding.first_name,
        last_name: onboarding.last_name,
        email: onboarding.email,
        phone_number: onboarding.phone_number,
        date_of_birth: onboarding.date_of_birth,
        program_type: onboarding.program_type,
        arrival_date: onboarding.treatment_date, // Use assigned treatment date
        program_duration: numberOfDays, // Store duration from service agreement
        status: 'active',
        created_by: ctx.user.id,
      })
      .select()
      .single()

    if (managementError) {
      return { success: false, error: handleSupabaseError(managementError, 'Failed to create patient management record') }
    }

    // Update onboarding status
    const { data, error } = await supabase
      .from('patient_onboarding')
      .update({
        status: 'moved_to_management',
        moved_to_management_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      // Rollback: delete the management record if onboarding update fails
      await supabase
        .from('patient_management')
        .delete()
        .eq('id', managementData.id)
      
      return { success: false, error: handleSupabaseError(error, 'Failed to move to management') }
    }

    revalidatePath('/onboarding')
    revalidatePath('/patient-management')

    return { 
      success: true, 
      data: data as PatientOnboarding,
      message: 'Patient moved to patient management successfully',
    }
  })

// =============================================================================
// HELPER: Check if all onboarding forms are completed and send admin notification
// =============================================================================

async function checkAndNotifyOnboardingCompletion(onboardingId: string) {
  try {
    const adminClient = createAdminClient()
    
    // Check onboarding status after form completion
    const { data: onboarding, error: fetchError } = await adminClient
      .from('patient_onboarding')
      .select('*')
      .eq('id', onboardingId)
      .maybeSingle()

    if (fetchError || !onboarding) {
      console.error('[checkAndNotifyOnboardingCompletion] Error fetching onboarding:', fetchError)
      return
    }

    // Check if all 3 required forms are completed
    // Note: social_media_release and informed_dissent forms were removed from onboarding process
    const allFormsCompleted = 
      onboarding.release_form_completed &&
      onboarding.outing_consent_completed &&
      onboarding.internal_regulations_completed

    // Check if completion is recent (within last 5 minutes) to prevent duplicate emails
    // This handles cases where status might not be updated yet by the trigger
    const completedAt = onboarding.completed_at ? new Date(onboarding.completed_at).getTime() : null
    const now = Date.now()
    const isRecentCompletion = completedAt && (now - completedAt) < 5 * 60 * 1000 // 5 minutes

    // Send email if all forms are completed AND either:
    // 1. Status is 'completed', OR
    // 2. completed_at was set recently (within last 5 minutes) - handles trigger timing
    // This prevents duplicate emails while handling race conditions
    // Note: If all forms are completed but status isn't 'completed' yet, the trigger will set it soon
    if (allFormsCompleted && (onboarding.status === 'completed' || isRecentCompletion)) {
      const clientName = `${onboarding.first_name || ''} ${onboarding.last_name || ''}`.trim() || onboarding.email || 'Client'
      
      const adminNotificationBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Client Onboarding Complete</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
              <div class="header" style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #1a1a1a; font-size: 28px; margin: 0 0 10px 0;">Onboarding Forms Completed</h1>
              </div>
              <div class="content" style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <p>Hello,</p>
                <p>A client has completed all onboarding forms and is ready for the next steps.</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 15px 0;">Client Information</h2>
                  <p style="margin: 8px 0;"><strong>Name:</strong> ${clientName}</p>
                  <p style="margin: 8px 0;"><strong>Email:</strong> ${onboarding.email || 'N/A'}</p>
                  <p style="margin: 8px 0;"><strong>Phone:</strong> ${onboarding.phone_number || 'N/A'}</p>
                  ${onboarding.program_type ? `<p style="margin: 8px 0;"><strong>Program Type:</strong> ${onboarding.program_type}</p>` : ''}
                </div>
                <p style="margin-top: 30px;">Please review the completed onboarding forms and proceed with the next steps in the client's journey.</p>
              </div>
              <div class="footer" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888888; font-size: 14px;">
                <p>Iboga Wellness Institute | Cozumel, Mexico</p>
                <p><a href="https://theibogainstitute.org" style="color: #0066cc; text-decoration: none;">theibogainstitute.org</a></p>
              </div>
            </div>
          </body>
        </html>
      `

      await sendEmailDirect({
        to: 'james@theibogainstitute.org',
        subject: `Client Onboarding Complete - ${clientName} | Iboga Wellness Institute`,
        body: adminNotificationBody,
      })

      console.log('[checkAndNotifyOnboardingCompletion] Admin notification sent for onboarding:', onboardingId)
    }
  } catch (error) {
    console.error('[checkAndNotifyOnboardingCompletion] Error checking/sending notification:', error)
  }
}

// =============================================================================
// PATIENT FORM SUBMISSIONS (Strict validation - always sets is_completed=true)
// =============================================================================

// Submit Release Form (Patient)
export const submitReleaseForm = authActionClient
  .schema(releaseFormSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('onboarding_release_forms')
      .update({
        full_name: parsedInput.full_name,
        date_of_birth: parsedInput.date_of_birth,
        phone_number: parsedInput.phone_number,
        email: parsedInput.email,
        emergency_contact_name: parsedInput.emergency_contact_name,
        emergency_contact_phone: parsedInput.emergency_contact_phone,
        emergency_contact_email: parsedInput.emergency_contact_email,
        emergency_contact_relationship: parsedInput.emergency_contact_relationship,
        voluntary_participation: parsedInput.voluntary_participation,
        medical_conditions_disclosed: parsedInput.medical_conditions_disclosed,
        risks_acknowledged: parsedInput.risks_acknowledged,
        medical_supervision_agreed: parsedInput.medical_supervision_agreed,
        confidentiality_understood: parsedInput.confidentiality_understood,
        liability_waiver_accepted: parsedInput.liability_waiver_accepted,
        compliance_agreed: parsedInput.compliance_agreed,
        consent_to_treatment: parsedInput.consent_to_treatment,
        signature_data: parsedInput.signature_data,
        signature_date: parsedInput.signature_date,
        is_completed: true,
      })
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      console.error('[submitReleaseForm] Error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to submit release form') }
    }

    // Check if all onboarding forms are now completed and notify admin
    checkAndNotifyOnboardingCompletion(parsedInput.onboarding_id).catch((err) => {
      console.error('[submitReleaseForm] Error checking onboarding completion:', err)
    })

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Submit Outing Consent Form (Patient)
export const submitOutingConsentForm = authActionClient
  .schema(outingConsentFormSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('onboarding_outing_consent_forms')
      .update({
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        date_of_birth: parsedInput.date_of_birth,
        date_of_outing: parsedInput.date_of_outing || null,
        email: parsedInput.email,
        protocol_compliance: parsedInput.protocol_compliance,
        proper_conduct: parsedInput.proper_conduct,
        no_harassment: parsedInput.no_harassment,
        substance_prohibition: parsedInput.substance_prohibition,
        financial_penalties_accepted: parsedInput.financial_penalties_accepted,
        additional_consequences_understood: parsedInput.additional_consequences_understood,
        declaration_read_understood: parsedInput.declaration_read_understood,
        signature_data: parsedInput.signature_data,
        signature_date: parsedInput.signature_date,
        is_completed: true,
      })
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      console.error('[submitOutingConsentForm] Error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to submit outing consent form') }
    }

    // Check if all onboarding forms are now completed and notify admin
    checkAndNotifyOnboardingCompletion(parsedInput.onboarding_id).catch((err) => {
      console.error('[submitOutingConsentForm] Error checking onboarding completion:', err)
    })

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Submit Social Media Form (Patient)
export const submitSocialMediaForm = authActionClient
  .schema(socialMediaFormSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('onboarding_social_media_forms')
      .update({
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        email: parsedInput.email,
        phone_number: parsedInput.phone_number || null,
        consent_image_photograph: parsedInput.consent_image_photograph,
        consent_video_recordings: parsedInput.consent_video_recordings,
        consent_voice_recordings: parsedInput.consent_voice_recordings,
        consent_written_testimonials: parsedInput.consent_written_testimonials,
        consent_first_name_only: parsedInput.consent_first_name_only,
        authorize_recording: parsedInput.authorize_recording,
        authorize_promotional_use: parsedInput.authorize_promotional_use,
        voluntary_participation_understood: parsedInput.voluntary_participation_understood,
        confidentiality_understood: parsedInput.confidentiality_understood,
        revocation_understood: parsedInput.revocation_understood,
        anonymity_option_understood: parsedInput.anonymity_option_understood,
        signature_data: parsedInput.signature_data,
        signature_date: parsedInput.signature_date,
        is_completed: true,
      })
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      console.error('[submitSocialMediaForm] Error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to submit social media form') }
    }

    // Note: Social Media form is no longer part of onboarding completion check (only 3 forms required now)

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Submit Internal Regulations Form (Patient)
export const submitInternalRegulationsForm = authActionClient
  .schema(internalRegulationsFormSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('onboarding_internal_regulations_forms')
      .update({
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        email: parsedInput.email,
        phone_number: parsedInput.phone_number || null,
        regulations_read_understood: parsedInput.regulations_read_understood,
        rights_acknowledged: parsedInput.rights_acknowledged,
        obligations_acknowledged: parsedInput.obligations_acknowledged,
        coexistence_rules_acknowledged: parsedInput.coexistence_rules_acknowledged,
        sanctions_acknowledged: parsedInput.sanctions_acknowledged,
        acceptance_confirmed: parsedInput.acceptance_confirmed,
        signature_data: parsedInput.signature_data,
        signature_date: parsedInput.signature_date,
        is_completed: true,
      })
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      console.error('[submitInternalRegulationsForm] Error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to submit internal regulations form') }
    }

    // Check if all onboarding forms are now completed and notify admin
    checkAndNotifyOnboardingCompletion(parsedInput.onboarding_id).catch((err) => {
      console.error('[submitInternalRegulationsForm] Error checking onboarding completion:', err)
    })

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Submit Informed Dissent Form (Patient)
export const submitInformedDissentForm = authActionClient
  .schema(informedDissentFormSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('onboarding_informed_dissent_forms')
      .update({
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        official_identification: parsedInput.official_identification,
        phone_number: parsedInput.phone_number,
        address: parsedInput.address,
        email: parsedInput.email,
        treatment_refused: parsedInput.treatment_refused,
        liability_release_accepted: parsedInput.liability_release_accepted,
        no_refund_understood: parsedInput.no_refund_understood,
        decision_voluntary: parsedInput.decision_voluntary,
        no_legal_action_agreed: parsedInput.no_legal_action_agreed,
        signature_data: parsedInput.signature_data,
        signature_date: parsedInput.signature_date,
        is_completed: true,
      })
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      console.error('[submitInformedDissentForm] Error:', error)
      return { success: false, error: handleSupabaseError(error, 'Failed to submit informed dissent form') }
    }

    // Note: Informed Dissent form is no longer part of onboarding completion check (only 3 forms required now)

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// =============================================================================
// ADMIN FORM UPDATE ACTIONS (Relaxed validation - can save partial edits)
// =============================================================================

// Admin Update Release Form
export const adminUpdateReleaseForm = authActionClient
  .schema(releaseFormAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Block un-completing forms (prevents desync with onboarding completion flags)
    // SQL trigger only propagates false -> true, so un-completing would leave flags inconsistent
    if (parsedInput.is_completed === false) {
      return {
        success: false,
        error: 'Un-completing a form is not supported (would desync onboarding flags). Use SQL admin tools if reopening is needed.',
      }
    }

    // DB-aware validation: if marking as completed, validate merged state (existing + incoming)
    if (parsedInput.is_completed === true) {
      const validation = await assertCanCompleteForm({
        supabase,
        tableName: 'onboarding_release_forms',
        onboardingId: parsedInput.onboarding_id,
        incomingPatch: parsedInput,
        strictSchema: releaseFormSchema,
      })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }
    }

    // Build payload excluding undefined values (preserves null for nullable fields)
    const updateData = buildUpdatePayload({
      full_name: parsedInput.full_name,
      date_of_birth: parsedInput.date_of_birth,
      phone_number: parsedInput.phone_number,
      email: parsedInput.email,
      emergency_contact_name: parsedInput.emergency_contact_name,
      emergency_contact_phone: parsedInput.emergency_contact_phone,
      emergency_contact_email: parsedInput.emergency_contact_email,
      emergency_contact_relationship: parsedInput.emergency_contact_relationship,
      voluntary_participation: parsedInput.voluntary_participation,
      medical_conditions_disclosed: parsedInput.medical_conditions_disclosed,
      risks_acknowledged: parsedInput.risks_acknowledged,
      medical_supervision_agreed: parsedInput.medical_supervision_agreed,
      confidentiality_understood: parsedInput.confidentiality_understood,
      liability_waiver_accepted: parsedInput.liability_waiver_accepted,
      compliance_agreed: parsedInput.compliance_agreed,
      consent_to_treatment: parsedInput.consent_to_treatment,
      signature_data: parsedInput.signature_data,
      signature_date: parsedInput.signature_date,
      is_completed: parsedInput.is_completed,
      is_activated: parsedInput.is_activated,
    })

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('onboarding_release_forms')
      .update(updateData)
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update release form') }
    }

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Admin Update Outing Consent Form
export const adminUpdateOutingConsentForm = authActionClient
  .schema(outingConsentFormAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Block un-completing forms
    if (parsedInput.is_completed === false) {
      return {
        success: false,
        error: 'Un-completing a form is not supported (would desync onboarding flags). Use SQL admin tools if reopening is needed.',
      }
    }

    // DB-aware validation when marking complete
    if (parsedInput.is_completed === true) {
      const validation = await assertCanCompleteForm({
        supabase,
        tableName: 'onboarding_outing_consent_forms',
        onboardingId: parsedInput.onboarding_id,
        incomingPatch: parsedInput,
        strictSchema: outingConsentFormSchema,
      })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }
    }

    const updateData = buildUpdatePayload({
      first_name: parsedInput.first_name,
      last_name: parsedInput.last_name,
      date_of_birth: parsedInput.date_of_birth,
      date_of_outing: parsedInput.date_of_outing, // Can be null to clear
      email: parsedInput.email,
      protocol_compliance: parsedInput.protocol_compliance,
      proper_conduct: parsedInput.proper_conduct,
      no_harassment: parsedInput.no_harassment,
      substance_prohibition: parsedInput.substance_prohibition,
      financial_penalties_accepted: parsedInput.financial_penalties_accepted,
      additional_consequences_understood: parsedInput.additional_consequences_understood,
      declaration_read_understood: parsedInput.declaration_read_understood,
      signature_data: parsedInput.signature_data,
      signature_date: parsedInput.signature_date, // Can be null to clear
      is_completed: parsedInput.is_completed,
      is_activated: parsedInput.is_activated,
    })

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('onboarding_outing_consent_forms')
      .update(updateData)
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update outing consent form') }
    }

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Admin Update Social Media Form
export const adminUpdateSocialMediaForm = authActionClient
  .schema(socialMediaFormAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Block un-completing forms
    if (parsedInput.is_completed === false) {
      return {
        success: false,
        error: 'Un-completing a form is not supported (would desync onboarding flags). Use SQL admin tools if reopening is needed.',
      }
    }

    // DB-aware validation when marking complete
    if (parsedInput.is_completed === true) {
      const validation = await assertCanCompleteForm({
        supabase,
        tableName: 'onboarding_social_media_forms',
        onboardingId: parsedInput.onboarding_id,
        incomingPatch: parsedInput,
        strictSchema: socialMediaFormSchema,
      })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }
    }

    const updateData = buildUpdatePayload({
      first_name: parsedInput.first_name,
      last_name: parsedInput.last_name,
      email: parsedInput.email,
      phone_number: parsedInput.phone_number,
      consent_image_photograph: parsedInput.consent_image_photograph,
      consent_video_recordings: parsedInput.consent_video_recordings,
      consent_voice_recordings: parsedInput.consent_voice_recordings,
      consent_written_testimonials: parsedInput.consent_written_testimonials,
      consent_first_name_only: parsedInput.consent_first_name_only,
      authorize_recording: parsedInput.authorize_recording,
      authorize_promotional_use: parsedInput.authorize_promotional_use,
      voluntary_participation_understood: parsedInput.voluntary_participation_understood,
      confidentiality_understood: parsedInput.confidentiality_understood,
      revocation_understood: parsedInput.revocation_understood,
      anonymity_option_understood: parsedInput.anonymity_option_understood,
      signature_data: parsedInput.signature_data,
      signature_date: parsedInput.signature_date, // Can be null to clear
      is_completed: parsedInput.is_completed,
      is_activated: parsedInput.is_activated,
    })

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('onboarding_social_media_forms')
      .update(updateData)
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update social media form') }
    }

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Admin Update Internal Regulations Form
export const adminUpdateInternalRegulationsForm = authActionClient
  .schema(internalRegulationsFormAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Block un-completing forms
    if (parsedInput.is_completed === false) {
      return {
        success: false,
        error: 'Un-completing a form is not supported (would desync onboarding flags). Use SQL admin tools if reopening is needed.',
      }
    }

    // DB-aware validation when marking complete
    if (parsedInput.is_completed === true) {
      const validation = await assertCanCompleteForm({
        supabase,
        tableName: 'onboarding_internal_regulations_forms',
        onboardingId: parsedInput.onboarding_id,
        incomingPatch: parsedInput,
        strictSchema: internalRegulationsFormSchema,
      })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }
    }

    const updateData = buildUpdatePayload({
      first_name: parsedInput.first_name,
      last_name: parsedInput.last_name,
      email: parsedInput.email,
      phone_number: parsedInput.phone_number,
      regulations_read_understood: parsedInput.regulations_read_understood,
      rights_acknowledged: parsedInput.rights_acknowledged,
      obligations_acknowledged: parsedInput.obligations_acknowledged,
      coexistence_rules_acknowledged: parsedInput.coexistence_rules_acknowledged,
      sanctions_acknowledged: parsedInput.sanctions_acknowledged,
      acceptance_confirmed: parsedInput.acceptance_confirmed,
      signature_data: parsedInput.signature_data,
      signature_date: parsedInput.signature_date, // Can be null to clear
      is_completed: parsedInput.is_completed,
      is_activated: parsedInput.is_activated,
    })

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('onboarding_internal_regulations_forms')
      .update(updateData)
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update internal regulations form') }
    }

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// Admin Update Informed Dissent Form
export const adminUpdateInformedDissentForm = authActionClient
  .schema(informedDissentFormAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Block un-completing forms
    if (parsedInput.is_completed === false) {
      return {
        success: false,
        error: 'Un-completing a form is not supported (would desync onboarding flags). Use SQL admin tools if reopening is needed.',
      }
    }

    // DB-aware validation when marking complete
    // Note: dissent schema does NOT require booleans to be true (patient's choice)
    if (parsedInput.is_completed === true) {
      const validation = await assertCanCompleteForm({
        supabase,
        tableName: 'onboarding_informed_dissent_forms',
        onboardingId: parsedInput.onboarding_id,
        incomingPatch: parsedInput,
        strictSchema: informedDissentFormSchema,
      })
      if (!validation.success) {
        return { success: false, error: validation.error }
      }
    }

    const updateData = buildUpdatePayload({
      first_name: parsedInput.first_name,
      last_name: parsedInput.last_name,
      official_identification: parsedInput.official_identification,
      phone_number: parsedInput.phone_number,
      address: parsedInput.address,
      email: parsedInput.email,
      treatment_refused: parsedInput.treatment_refused,
      liability_release_accepted: parsedInput.liability_release_accepted,
      no_refund_understood: parsedInput.no_refund_understood,
      decision_voluntary: parsedInput.decision_voluntary,
      no_legal_action_agreed: parsedInput.no_legal_action_agreed,
      signature_data: parsedInput.signature_data,
      signature_date: parsedInput.signature_date, // Can be null to clear
      representative_name: parsedInput.representative_name,
      representative_position: parsedInput.representative_position,
      representative_signature_data: parsedInput.representative_signature_data,
      representative_signature_date: parsedInput.representative_signature_date, // Can be null to clear
      is_completed: parsedInput.is_completed,
      is_activated: parsedInput.is_activated,
    })

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('onboarding_informed_dissent_forms')
      .update(updateData)
      .eq('onboarding_id', parsedInput.onboarding_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to update informed dissent form') }
    }

    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)
    return { success: true, data }
  })

// =============================================================================
// GET FORM BY ONBOARDING ID
// =============================================================================
const getFormByOnboardingSchema = z.object({
  onboarding_id: z.string().uuid(),
  form_type: z.enum(['release', 'outing', 'social_media', 'regulations', 'dissent']),
})

export const getFormByOnboarding = authActionClient
  .schema(getFormByOnboardingSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()

    const tableName = FORM_TABLES[parsedInput.form_type]
    
    const { data: formData, error: formError } = await supabase
      .from(tableName)
      .select('*')
      .eq('onboarding_id', parsedInput.onboarding_id)
      .maybeSingle()

    if (formError) {
      return { success: false, error: handleSupabaseError(formError, 'Failed to fetch form') }
    }

    if (!formData) {
      return { success: false, error: 'Form not found or access denied' }
    }

    // Get onboarding context
    const { data: onboarding } = await supabase
      .from('patient_onboarding')
      .select('first_name, last_name, email')
      .eq('id', parsedInput.onboarding_id)
      .maybeSingle()

    return { 
      success: true, 
      data: {
        form: formData,
        onboarding: onboarding ?? null,
      },
    }
  })

// =============================================================================
// GET PATIENT'S OWN ONBOARDING
// =============================================================================
export const getMyOnboarding = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const supabase = await createClient()

    // RLS ensures only own record is returned
    const { data: onboarding, error } = await supabase
      .from('patient_onboarding')
      .select('*')
      .eq('patient_id', ctx.user.id)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    if (!onboarding) {
      return { success: false, error: 'No onboarding record found for your account' }
    }

    // Get forms (using maybeSingle for graceful null handling)
    const [releaseForm, outingForm, regulationsForm] = await Promise.all([
      supabase.from('onboarding_release_forms').select('*').eq('onboarding_id', onboarding.id).maybeSingle(),
      supabase.from('onboarding_outing_consent_forms').select('*').eq('onboarding_id', onboarding.id).maybeSingle(),
      supabase.from('onboarding_internal_regulations_forms').select('*').eq('onboarding_id', onboarding.id).maybeSingle(),
    ])

    const result: OnboardingWithForms = {
      onboarding: onboarding as PatientOnboarding,
      forms: {
        releaseForm: releaseForm.data ?? null,
        outingForm: outingForm.data ?? null,
        socialMediaForm: null, // Removed from onboarding flow
        regulationsForm: regulationsForm.data ?? null,
        dissentForm: null, // Removed from onboarding flow
      },
    }

    return { success: true, data: result }
  })

// =============================================================================
// GET ONBOARDING BY PATIENT ID (Staff only)
// =============================================================================
const getOnboardingByPatientIdSchema = z.object({
  patient_id: z.string().uuid(),
})

export const getOnboardingByPatientId = authActionClient
  .schema(getOnboardingByPatientIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Find onboarding record by patient_id
    const { data: onboardingRecord, error } = await supabase
      .from('patient_onboarding')
      .select('id')
      .eq('patient_id', parsedInput.patient_id)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    if (!onboardingRecord) {
      return { success: true, data: null }
    }

    // Fetch full onboarding data with forms
    return await getOnboardingById({ onboarding_id: onboardingRecord.id })
  })

// =============================================================================
// CHECK ONBOARDING STATUS (Staff only)
// =============================================================================
const checkOnboardingStatusSchema = z.object({
  email: z.string().email().optional(),
  intake_form_id: z.string().uuid().optional(),
  partial_intake_form_id: z.string().uuid().optional(),
}).refine(
  data => data.email || data.intake_form_id || data.partial_intake_form_id,
  'At least one search parameter is required'
)

export const checkOnboardingStatus = authActionClient
  .schema(checkOnboardingStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: staff access required' }
    }

    const supabase = await createClient()

    // Build query conditions
    let query = supabase
      .from('patient_onboarding')
      .select('id, status, created_at')

    // Apply filters
    if (parsedInput.intake_form_id) {
      query = query.eq('intake_form_id', parsedInput.intake_form_id)
    } else if (parsedInput.partial_intake_form_id) {
      query = query.eq('partial_intake_form_id', parsedInput.partial_intake_form_id)
    } else if (parsedInput.email) {
      query = query.ilike('email', parsedInput.email)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: {
        is_in_onboarding: !!data,
        onboarding: data,
      },
    }
  })

// =============================================================================
// DELETE ONBOARDING (Admin only - use with caution)
// =============================================================================
const deleteOnboardingSchema = z.object({
  onboarding_id: z.string().uuid(),
})

export const deleteOnboarding = authActionClient
  .schema(deleteOnboardingSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin staff access required' }
    }

    const supabase = await createClient()

    // Forms will be cascade deleted due to FK constraint
    const { error } = await supabase
      .from('patient_onboarding')
      .delete()
      .eq('id', parsedInput.onboarding_id)

    if (error) {
      return { success: false, error: handleSupabaseError(error, 'Failed to delete onboarding') }
    }

    revalidatePath('/onboarding')

    return { success: true, message: 'Onboarding and all associated forms deleted' }
  })

// =============================================================================
// Upload Onboarding Form Document (Admin Only)
// =============================================================================

export const uploadOnboardingFormDocument = authActionClient
  .schema(
    z.object({
      onboarding_id: z.string().uuid(),
      form_type: z.enum(['release', 'outing', 'regulations']),
      file: z.instanceof(File),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', ctx.user.id)
      .single()

    if (!profile || !isAdminStaffRole(profile.role)) {
      return { success: false, error: 'Unauthorized: Admin staff access required' }
    }

    // Verify onboarding exists
    const { data: onboarding, error: onboardingError } = await adminClient
      .from('patient_onboarding')
      .select('id, patient_id')
      .eq('id', parsedInput.onboarding_id)
      .single()

    if (onboardingError || !onboarding) {
      return { success: false, error: 'Onboarding record not found' }
    }

    // Upload document to storage
    let documentUrl: string
    let documentPath: string

    try {
      const uploadResult = await uploadDocument(
        'onboarding-form-documents',
        parsedInput.file,
        `onboarding-${parsedInput.onboarding_id}/${parsedInput.form_type}`
      )
      documentUrl = uploadResult.url
      documentPath = uploadResult.path
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      }
    }

    // Map form type to table name
    const formTableMap: Record<string, string> = {
      release: 'onboarding_release_forms',
      outing: 'onboarding_outing_consent_forms',
      regulations: 'onboarding_internal_regulations_forms',
    }

    const tableName = formTableMap[parsedInput.form_type]

    // Check if form record exists, create if not
    const { data: existingForm } = await adminClient
      .from(tableName)
      .select('id')
      .eq('onboarding_id', parsedInput.onboarding_id)
      .maybeSingle()

    if (existingForm) {
      // Update existing form
      const { error: updateError } = await adminClient
        .from(tableName)
        .update({
          document_url: documentUrl,
          document_path: documentPath,
          uploaded_by: ctx.user.id,
          uploaded_at: new Date().toISOString(),
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existingForm.id)

      if (updateError) {
        return { success: false, error: handleSupabaseError(updateError, 'Failed to update form') }
      }
    } else {
      // Create new form record with minimal required fields
      // We'll use placeholder values since this is a physical form upload
      const baseData = {
        onboarding_id: parsedInput.onboarding_id,
        patient_id: onboarding.patient_id,
        document_url: documentUrl,
        document_path: documentPath,
        uploaded_by: ctx.user.id,
        uploaded_at: new Date().toISOString(),
        is_completed: true,
        completed_at: new Date().toISOString(),
        is_activated: true,
      }

      let insertData: any

      if (parsedInput.form_type === 'release') {
        insertData = {
          ...baseData,
          full_name: 'Uploaded Document',
          date_of_birth: new Date().toISOString().split('T')[0],
          phone_number: '',
          email: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_email: '',
          emergency_contact_relationship: '',
          voluntary_participation: false,
          medical_conditions_disclosed: false,
          risks_acknowledged: false,
          medical_supervision_agreed: false,
          confidentiality_understood: false,
          liability_waiver_accepted: false,
          compliance_agreed: false,
          consent_to_treatment: false,
        }
      } else if (parsedInput.form_type === 'outing') {
        insertData = {
          ...baseData,
          first_name: 'Uploaded',
          last_name: 'Document',
          date_of_birth: new Date().toISOString().split('T')[0],
          email: '',
          protocol_compliance: false,
          proper_conduct: false,
          no_harassment: false,
          substance_prohibition: false,
          financial_penalties_accepted: false,
          additional_consequences_understood: false,
          declaration_read_understood: false,
        }
      } else {
        // regulations
        insertData = {
          ...baseData,
          first_name: 'Uploaded',
          last_name: 'Document',
          email: '',
          regulations_read_understood: false,
          rights_acknowledged: false,
          obligations_acknowledged: false,
          coexistence_rules_acknowledged: false,
          sanctions_acknowledged: false,
          acceptance_confirmed: false,
        }
      }

      const { error: insertError } = await adminClient.from(tableName).insert(insertData)

      if (insertError) {
        return { success: false, error: handleSupabaseError(insertError, 'Failed to create form record') }
      }
    }

    // The trigger will automatically update patient_onboarding form completion flags
    revalidatePath('/onboarding')
    revalidatePath(`/onboarding-forms/${parsedInput.onboarding_id}`)

    return {
      success: true,
      data: {
        document_url: documentUrl,
        document_path: documentPath,
      },
    }
  })
