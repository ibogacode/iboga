'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { patientIntakeFormSchema } from '@/lib/validations/patient-intake'
import { headers } from 'next/headers'

export const submitPatientIntakeForm = actionClient
  .schema(patientIntakeFormSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    
    // Get IP address and user agent for audit purposes
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    
    // Parse date_of_birth if provided
    let dateOfBirth: Date | null = null
    if (parsedInput.date_of_birth) {
      dateOfBirth = new Date(parsedInput.date_of_birth)
    }
    
    // Parse signature_date
    const signatureDate = new Date(parsedInput.signature_date)
    
    // Insert form submission
    const { data, error } = await supabase
      .from('patient_intake_forms')
      .insert({
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        email: parsedInput.email,
        phone_number: parsedInput.phone_number,
        date_of_birth: dateOfBirth,
        gender: parsedInput.gender,
        address: parsedInput.address,
        city: parsedInput.city,
        state: parsedInput.state,
        zip_code: parsedInput.zip_code,
        emergency_contact_first_name: parsedInput.emergency_contact_first_name,
        emergency_contact_last_name: parsedInput.emergency_contact_last_name,
        emergency_contact_email: parsedInput.emergency_contact_email,
        emergency_contact_phone: parsedInput.emergency_contact_phone,
        emergency_contact_address: parsedInput.emergency_contact_address,
        emergency_contact_relationship: parsedInput.emergency_contact_relationship,
        privacy_policy_accepted: parsedInput.privacy_policy_accepted,
        consent_for_treatment: parsedInput.consent_for_treatment,
        risks_and_benefits: parsedInput.risks_and_benefits,
        pre_screening_health_assessment: parsedInput.pre_screening_health_assessment,
        voluntary_participation: parsedInput.voluntary_participation,
        confidentiality: parsedInput.confidentiality,
        liability_release: parsedInput.liability_release,
        payment_collection_1: parsedInput.payment_collection_1,
        payment_collection_2: parsedInput.payment_collection_2,
        ibogaine_therapy_consent_accepted: parsedInput.ibogaine_therapy_consent_accepted,
        service_agreement_accepted: parsedInput.service_agreement_accepted,
        release_consent_accepted: parsedInput.release_consent_accepted,
        final_acknowledgment_accepted: parsedInput.final_acknowledgment_accepted,
        signature_data: parsedInput.signature_data,
        signature_date: signatureDate,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data: { id: data.id } }
  })

