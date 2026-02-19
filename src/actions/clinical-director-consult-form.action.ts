'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ClinicalDirectorConsultFormData } from './clinical-director-consult-form.types'

function isStaffRole(role: string | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager' || role === 'doctor' || role === 'nurse' || role === 'psych'
}

const getClinicalDirectorConsultFormSchema = z.object({
  onboarding_id: z.string().uuid(),
})

export const getClinicalDirectorConsultFormByOnboarding = authActionClient
  .schema(getClinicalDirectorConsultFormSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized' }
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clinical_director_consult_forms')
      .select('*')
      .eq('onboarding_id', parsedInput.onboarding_id)
      .maybeSingle()
    if (error) {
      console.error('[getClinicalDirectorConsultFormByOnboarding] Error:', error)
      return { success: false, error: 'Failed to fetch form' }
    }
    return { success: true, data: data as ClinicalDirectorConsultFormData | null }
  })

const upsertClinicalDirectorConsultFormSchema = z.object({
  onboarding_id: z.string().uuid(),
  psychedelics_before: z.boolean().optional().nullable(),
  psychedelics_which: z.string().optional().nullable(),
  supplements_regular: z.string().optional().nullable(),
  arrival_date: z.string().optional().nullable(),
  arrival_time: z.string().optional().nullable(),
  questions_concerns_prior_arrival: z.string().optional().nullable(),
  dietary_restrictions_allergies: z.string().optional().nullable(),
  substance_use_caffeine_nicotine_alcohol: z.string().optional().nullable(),
  substance_use_frequency_amount: z.string().optional().nullable(),
  diagnosed_conditions: z.string().optional().nullable(),
  substances_used_past: z.string().optional().nullable(),
  substances_started_when: z.string().optional().nullable(),
  substances_current: z.string().optional().nullable(),
  substances_current_frequency_amount: z.string().optional().nullable(),
  substances_current_last_use_date: z.string().optional().nullable(),
  withdrawal_symptoms_before: z.boolean().optional().nullable(),
  previous_detox_rehab: z.boolean().optional().nullable(),
  previous_detox_rehab_times: z.number().int().min(0).optional().nullable(),
})

export const upsertClinicalDirectorConsultForm = authActionClient
  .schema(upsertClinicalDirectorConsultFormSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized' }
    }
    const supabase = await createClient()
    const payload = {
      onboarding_id: parsedInput.onboarding_id,
      psychedelics_before: parsedInput.psychedelics_before ?? null,
      psychedelics_which: parsedInput.psychedelics_which ?? null,
      supplements_regular: parsedInput.supplements_regular ?? null,
      arrival_date: parsedInput.arrival_date ?? null,
      arrival_time: parsedInput.arrival_time ?? null,
      questions_concerns_prior_arrival: parsedInput.questions_concerns_prior_arrival ?? null,
      dietary_restrictions_allergies: parsedInput.dietary_restrictions_allergies ?? null,
      substance_use_caffeine_nicotine_alcohol: parsedInput.substance_use_caffeine_nicotine_alcohol ?? null,
      substance_use_frequency_amount: parsedInput.substance_use_frequency_amount ?? null,
      diagnosed_conditions: parsedInput.diagnosed_conditions ?? null,
      substances_used_past: parsedInput.substances_used_past ?? null,
      substances_started_when: parsedInput.substances_started_when ?? null,
      substances_current: parsedInput.substances_current ?? null,
      substances_current_frequency_amount: parsedInput.substances_current_frequency_amount ?? null,
      substances_current_last_use_date: parsedInput.substances_current_last_use_date ?? null,
      withdrawal_symptoms_before: parsedInput.withdrawal_symptoms_before ?? null,
      previous_detox_rehab: parsedInput.previous_detox_rehab ?? null,
      previous_detox_rehab_times: parsedInput.previous_detox_rehab_times ?? null,
    }
    const { data, error } = await supabase
      .from('clinical_director_consult_forms')
      .upsert(payload, { onConflict: 'onboarding_id' })
      .select('id')
      .single()
    if (error) {
      console.error('[upsertClinicalDirectorConsultForm] Error:', error)
      return { success: false, error: 'Failed to save form' }
    }
    revalidatePath('/patient-pipeline/patient-profile')
    return { success: true, data: { id: data.id } }
  })
