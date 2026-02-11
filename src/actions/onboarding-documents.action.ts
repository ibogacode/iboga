'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendClientReadyForTaperingNotification } from './tapering-schedule.action'

const STAFF_ROLES = ['owner', 'admin', 'manager', 'doctor', 'nurse', 'psych'] as const
const ADMIN_ROLES = ['owner', 'admin', 'manager'] as const

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])
}
function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
}

const uploadOnboardingMedicalDocumentSchema = z.object({
  onboarding_id: z.string().uuid(),
  document_type: z.enum(['ekg', 'bloodwork']),
  document_path: z.string().min(1),
  document_name: z.string().optional(),
})

const skipOnboardingMedicalDocumentSchema = z.object({
  onboarding_id: z.string().uuid(),
  document_type: z.enum(['ekg', 'bloodwork']),
})

/**
 * Record an onboarding medical document (EKG or Bloodwork) after client uploads to storage.
 * When both EKG and Bloodwork are present, notifies Omar that client is ready for tapering schedule.
 */
export const recordOnboardingMedicalDocument = authActionClient
  .schema(uploadOnboardingMedicalDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()

    // Verify patient owns this onboarding
    const { data: onboarding, error: onboardingError } = await supabase
      .from('patient_onboarding')
      .select('id, patient_id, email, first_name, last_name, ready_for_tapering_notified_at, ekg_skipped, bloodwork_skipped')
      .eq('id', parsedInput.onboarding_id)
      .single()

    if (onboardingError || !onboarding) {
      return { success: false, error: 'Onboarding record not found' }
    }

    const isOwner =
      onboarding.patient_id === ctx.user.id ||
      (onboarding.email && onboarding.email.toLowerCase().trim() === (ctx.user.email ?? '').toLowerCase().trim())
    if (!isOwner) {
      return { success: false, error: 'You do not have access to this onboarding record' }
    }

    // Upsert document record (one per type per onboarding)
    const { error: upsertError } = await supabase
      .from('onboarding_medical_documents')
      .upsert(
        {
          onboarding_id: parsedInput.onboarding_id,
          document_type: parsedInput.document_type,
          document_path: parsedInput.document_path,
          document_name: parsedInput.document_name ?? null,
          uploaded_by: ctx.user.id,
        },
        { onConflict: 'onboarding_id,document_type' }
      )

    if (upsertError) {
      console.error('[recordOnboardingMedicalDocument] Upsert error:', upsertError)
      return { success: false, error: 'Failed to save document record' }
    }

    // Check if both EKG and Bloodwork are complete (uploaded or skipped) and we haven't notified yet
    const { data: docs } = await supabase
      .from('onboarding_medical_documents')
      .select('document_type')
      .eq('onboarding_id', parsedInput.onboarding_id)

    const hasEkg = docs?.some((d) => d.document_type === 'ekg') ?? false
    const hasBloodwork = docs?.some((d) => d.document_type === 'bloodwork') ?? false
    const ekgComplete = hasEkg || !!onboarding.ekg_skipped
    const bloodworkComplete = hasBloodwork || !!onboarding.bloodwork_skipped
    const alreadyNotified = !!onboarding.ready_for_tapering_notified_at

    if (ekgComplete && bloodworkComplete && !alreadyNotified) {
      await supabase
        .from('patient_onboarding')
        .update({ ready_for_tapering_notified_at: new Date().toISOString() })
        .eq('id', parsedInput.onboarding_id)

      sendClientReadyForTaperingNotification(
        onboarding.first_name ?? 'Patient',
        onboarding.last_name ?? '',
        onboarding.email ?? '',
        parsedInput.onboarding_id,
        { ekgSkipped: onboarding.ekg_skipped ?? false, bloodworkSkipped: onboarding.bloodwork_skipped ?? false }
      ).catch((err) => console.error('[recordOnboardingMedicalDocument] Failed to notify Omar:', err))
    }

    revalidatePath('/patient/tasks')
    revalidatePath('/patient/documents')
    return { success: true, data: { recorded: true } }
  })

/**
 * Skip EKG or Bloodwork upload (client). Tests will be done at institute after arrival.
 * When both are complete (uploaded or skipped), notifies Omar for tapering schedule.
 */
export const skipOnboardingMedicalDocument = authActionClient
  .schema(skipOnboardingMedicalDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()

    const { data: onboarding, error: onboardingError } = await supabase
      .from('patient_onboarding')
      .select('id, patient_id, email, first_name, last_name, ready_for_tapering_notified_at, ekg_skipped, bloodwork_skipped')
      .eq('id', parsedInput.onboarding_id)
      .single()

    if (onboardingError || !onboarding) {
      return { success: false, error: 'Onboarding record not found' }
    }

    const isOwner =
      onboarding.patient_id === ctx.user.id ||
      (onboarding.email && onboarding.email.toLowerCase().trim() === (ctx.user.email ?? '').toLowerCase().trim())
    if (!isOwner) {
      return { success: false, error: 'You do not have access to this onboarding record' }
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> =
      parsedInput.document_type === 'ekg'
        ? { ekg_skipped: true, ekg_skipped_at: now }
        : { bloodwork_skipped: true, bloodwork_skipped_at: now }

    const { error: updateError } = await supabase
      .from('patient_onboarding')
      .update(updates)
      .eq('id', parsedInput.onboarding_id)

    if (updateError) {
      console.error('[skipOnboardingMedicalDocument] Update error:', updateError)
      return { success: false, error: 'Failed to save skip' }
    }

    const { data: docs } = await supabase
      .from('onboarding_medical_documents')
      .select('document_type')
      .eq('onboarding_id', parsedInput.onboarding_id)

    const hasEkg = docs?.some((d) => d.document_type === 'ekg') ?? false
    const hasBloodwork = docs?.some((d) => d.document_type === 'bloodwork') ?? false
    const ekgComplete = hasEkg || parsedInput.document_type === 'ekg' || !!onboarding.ekg_skipped
    const bloodworkComplete =
      hasBloodwork || parsedInput.document_type === 'bloodwork' || !!onboarding.bloodwork_skipped
    const alreadyNotified = !!onboarding.ready_for_tapering_notified_at

    if (ekgComplete && bloodworkComplete && !alreadyNotified) {
      await supabase
        .from('patient_onboarding')
        .update({ ready_for_tapering_notified_at: now })
        .eq('id', parsedInput.onboarding_id)

      const ekgSkipped = parsedInput.document_type === 'ekg' || !!onboarding.ekg_skipped
      const bloodworkSkipped = parsedInput.document_type === 'bloodwork' || !!onboarding.bloodwork_skipped

      sendClientReadyForTaperingNotification(
        onboarding.first_name ?? 'Patient',
        onboarding.last_name ?? '',
        onboarding.email ?? '',
        parsedInput.onboarding_id,
        { ekgSkipped, bloodworkSkipped }
      ).catch((err) => console.error('[skipOnboardingMedicalDocument] Failed to notify Omar:', err))
    }

    revalidatePath('/patient/tasks')
    revalidatePath('/patient/documents')
    return { success: true, data: { skipped: true } }
  })

const getOnboardingMedicalDocumentViewUrlSchema = z.object({
  onboarding_id: z.string().uuid(),
  document_type: z.enum(['ekg', 'bloodwork']),
})

/** Staff only: get a signed URL to view an onboarding medical document. */
export const getOnboardingMedicalDocumentViewUrl = authActionClient
  .schema(getOnboardingMedicalDocumentViewUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaff(ctx.user.role)) {
      return { success: false, error: 'Unauthorized' }
    }
    const supabase = await createClient()
    const { data: doc } = await supabase
      .from('onboarding_medical_documents')
      .select('document_path')
      .eq('onboarding_id', parsedInput.onboarding_id)
      .eq('document_type', parsedInput.document_type)
      .maybeSingle()
    if (!doc?.document_path) {
      return { success: false, error: 'Document not found' }
    }
    const adminClient = createAdminClient()
    const { data: signed } = await adminClient.storage
      .from('onboarding-medical-documents')
      .createSignedUrl(doc.document_path, 3600)
    if (!signed?.signedUrl) {
      return { success: false, error: 'Failed to generate view URL' }
    }
    return { success: true, data: { url: signed.signedUrl } }
  })

const adminSkipOnboardingMedicalDocumentSchema = z.object({
  onboarding_id: z.string().uuid(),
  document_type: z.enum(['ekg', 'bloodwork']),
})

/** Admin only: mark EKG or Bloodwork as skipped on behalf of patient. */
export const adminSkipOnboardingMedicalDocument = authActionClient
  .schema(adminSkipOnboardingMedicalDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdmin(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin access required' }
    }
    const supabase = await createClient()
    const { data: onboarding, error: onboardingError } = await supabase
      .from('patient_onboarding')
      .select('id, first_name, last_name, email, ready_for_tapering_notified_at, ekg_skipped, bloodwork_skipped')
      .eq('id', parsedInput.onboarding_id)
      .single()
    if (onboardingError || !onboarding) {
      return { success: false, error: 'Onboarding record not found' }
    }
    const now = new Date().toISOString()
    const updates: Record<string, unknown> =
      parsedInput.document_type === 'ekg'
        ? { ekg_skipped: true, ekg_skipped_at: now }
        : { bloodwork_skipped: true, bloodwork_skipped_at: now }
    const { error: updateError } = await supabase
      .from('patient_onboarding')
      .update(updates)
      .eq('id', parsedInput.onboarding_id)
    if (updateError) {
      return { success: false, error: 'Failed to save skip' }
    }
    const { data: docs } = await supabase
      .from('onboarding_medical_documents')
      .select('document_type')
      .eq('onboarding_id', parsedInput.onboarding_id)
    const hasEkg = docs?.some((d) => d.document_type === 'ekg') ?? false
    const hasBloodwork = docs?.some((d) => d.document_type === 'bloodwork') ?? false
    const ekgComplete = hasEkg || parsedInput.document_type === 'ekg' || !!onboarding.ekg_skipped
    const bloodworkComplete =
      hasBloodwork || parsedInput.document_type === 'bloodwork' || !!onboarding.bloodwork_skipped
    const alreadyNotified = !!onboarding.ready_for_tapering_notified_at
    if (ekgComplete && bloodworkComplete && !alreadyNotified) {
      await supabase
        .from('patient_onboarding')
        .update({ ready_for_tapering_notified_at: now })
        .eq('id', parsedInput.onboarding_id)
      const ekgSkipped = parsedInput.document_type === 'ekg' || !!onboarding.ekg_skipped
      const bloodworkSkipped = parsedInput.document_type === 'bloodwork' || !!onboarding.bloodwork_skipped
      sendClientReadyForTaperingNotification(
        onboarding.first_name ?? 'Patient',
        onboarding.last_name ?? '',
        onboarding.email ?? '',
        parsedInput.onboarding_id,
        { ekgSkipped, bloodworkSkipped }
      ).catch((err) => console.error('[adminSkipOnboardingMedicalDocument] Failed to notify Omar:', err))
    }
    revalidatePath('/patient/tasks')
    revalidatePath('/patient/documents')
    revalidatePath(`/patient-pipeline/patient-profile/${parsedInput.onboarding_id}`)
    return { success: true, data: { skipped: true } }
  })
