'use server'

import { z } from 'zod'
import { actionClient, authActionClient } from '@/lib/safe-action'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ibogaineConsentFormSchema } from '@/lib/validations/ibogaine-consent'
import { headers } from 'next/headers'

/**
 * Get intake form data by ID for auto-population
 */
export async function getIntakeFormDataForConsent(intakeFormId: string) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('patient_intake_forms')
    .select('*')
    .eq('id', intakeFormId)
    .single()
  
  if (error || !data) {
    return { success: false, error: 'Application form not found' }
  }
  
  return { success: true, data }
}

export const submitIbogaineConsentForm = actionClient
  .schema(ibogaineConsentFormSchema)
  .action(async ({ parsedInput }) => {
    // Use admin client (service role) for public form submissions
    // This bypasses RLS and allows inserts from both logged-in and anonymous users
    const supabase = createAdminClient()
    
    // Get IP address and user agent for audit purposes
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    
    // Parse dates
    const dateOfBirth = new Date(parsedInput.date_of_birth)
    const treatmentDate = new Date(parsedInput.treatment_date)
    const signatureDate = new Date(parsedInput.signature_date)
    
    // Insert form submission
    const { data, error } = await supabase
      .from('ibogaine_consent_forms')
      .insert({
        patient_id: parsedInput.patient_id || null,
        intake_form_id: parsedInput.intake_form_id || null,
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        date_of_birth: dateOfBirth,
        phone_number: parsedInput.phone_number,
        email: parsedInput.email,
        address: parsedInput.address,
        treatment_date: treatmentDate,
        facilitator_doctor_name: parsedInput.facilitator_doctor_name,
        consent_for_treatment: parsedInput.consent_for_treatment,
        risks_and_benefits: parsedInput.risks_and_benefits,
        pre_screening_health_assessment: parsedInput.pre_screening_health_assessment,
        voluntary_participation: parsedInput.voluntary_participation,
        confidentiality: parsedInput.confidentiality,
        liability_release: parsedInput.liability_release,
        payment_collection: parsedInput.payment_collection,
        signature_data: parsedInput.signature_data,
        signature_date: signatureDate,
        signature_name: parsedInput.signature_name,
      })
      .select('id')
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { 
      success: true, 
      data: { 
        id: data.id,
        message: 'Ibogaine Therapy Consent Form submitted successfully' 
      } 
    }
  })

// Get ibogaine consent form by ID for patient viewing
export const getIbogaineConsentFormForPatient = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    
    // Get form
    const { data: form, error } = await supabase
      .from('ibogaine_consent_forms')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !form) {
      return { success: false, error: 'Form not found' }
    }
    
    // Check if patient has access (by patient_id or email match)
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', ctx.user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Allow if patient_id matches, email matches, or user is staff
    const hasAccess = 
      form.patient_id === ctx.user.id ||
      form.email.toLowerCase() === profile.email?.toLowerCase() ||
      ['owner', 'admin', 'doctor', 'nurse', 'manager'].includes(profile.role || '')
    
    if (!hasAccess) {
      return { success: false, error: 'Unauthorized' }
    }
    
    return { success: true, data: form }
  })

// Get ibogaine consent form by ID (admin/owner)
export const getIbogaineConsentFormById = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    
    // Check if user is admin/owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', ctx.user.id)
      .single()
    
    if (!profile || !['owner', 'admin', 'doctor', 'nurse', 'manager'].includes(profile.role || '')) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get form
    const { data: form, error } = await supabase
      .from('ibogaine_consent_forms')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !form) {
      return { success: false, error: 'Form not found' }
    }
    
    return { success: true, data: form }
  })

