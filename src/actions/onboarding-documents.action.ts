'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendClientReadyForTaperingNotification } from './tapering-schedule.action'

const uploadOnboardingMedicalDocumentSchema = z.object({
  onboarding_id: z.string().uuid(),
  document_type: z.enum(['ekg', 'bloodwork']),
  document_path: z.string().min(1),
  document_name: z.string().optional(),
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
      .select('id, patient_id, email, first_name, last_name, ready_for_tapering_notified_at')
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

    // Check if both EKG and Bloodwork are now present and we haven't notified yet
    const { data: docs } = await supabase
      .from('onboarding_medical_documents')
      .select('document_type')
      .eq('onboarding_id', parsedInput.onboarding_id)

    const hasEkg = docs?.some((d) => d.document_type === 'ekg') ?? false
    const hasBloodwork = docs?.some((d) => d.document_type === 'bloodwork') ?? false
    const alreadyNotified = !!onboarding.ready_for_tapering_notified_at

    if (hasEkg && hasBloodwork && !alreadyNotified) {
      await supabase
        .from('patient_onboarding')
        .update({ ready_for_tapering_notified_at: new Date().toISOString() })
        .eq('id', parsedInput.onboarding_id)

      sendClientReadyForTaperingNotification(
        onboarding.first_name ?? 'Patient',
        onboarding.last_name ?? '',
        onboarding.email ?? '',
        parsedInput.onboarding_id
      ).catch((err) => console.error('[recordOnboardingMedicalDocument] Failed to notify Omar:', err))
    }

    revalidatePath('/patient/tasks')
    revalidatePath('/patient/documents')
    return { success: true, data: { recorded: true } }
  })
