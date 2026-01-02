'use server'

import { z } from 'zod'
import { actionClient, authActionClient } from '@/lib/safe-action'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { medicalHistoryFormSchema } from '@/lib/validations/medical-history'
import { headers } from 'next/headers'
import { sendMedicalHistoryConfirmationEmail } from './email.action'

/**
 * Get intake form data by ID for auto-population
 */
export async function getIntakeFormData(intakeFormId: string) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('patient_intake_forms')
    .select('*')
    .eq('id', intakeFormId)
    .single()
  
  if (error || !data) {
    return { success: false, error: 'application form not found' }
  }
  
  return { success: true, data }
}

export const submitMedicalHistoryForm = actionClient
  .schema(medicalHistoryFormSchema)
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
    
    // Parse date_of_birth if provided
    let dateOfBirth: Date | null = null
    if (parsedInput.date_of_birth) {
      dateOfBirth = new Date(parsedInput.date_of_birth)
    }
    
    // Parse signature_date
    const signatureDate = new Date(parsedInput.signature_date)
    
    // Insert form submission
    const { data, error } = await supabase
      .from('medical_history_forms')
      .insert({
        intake_form_id: parsedInput.intake_form_id || null,
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        date_of_birth: dateOfBirth,
        gender: parsedInput.gender === 'M' ? 'M' : parsedInput.gender === 'F' ? 'F' : 'other',
        weight: parsedInput.weight,
        height: parsedInput.height,
        phone_number: parsedInput.phone_number,
        email: parsedInput.email,
        emergency_contact_name: parsedInput.emergency_contact_name,
        emergency_contact_phone: parsedInput.emergency_contact_phone,
        primary_care_provider: parsedInput.primary_care_provider || null,
        other_physicians: parsedInput.other_physicians || null,
        practitioners_therapists: parsedInput.practitioners_therapists || null,
        current_health_status: parsedInput.current_health_status,
        reason_for_coming: parsedInput.reason_for_coming,
        medical_conditions: parsedInput.medical_conditions,
        substance_use_history: parsedInput.substance_use_history,
        family_personal_health_info: parsedInput.family_personal_health_info || null,
        pain_stiffness_swelling: parsedInput.pain_stiffness_swelling || null,
        metabolic_health_concerns: parsedInput.metabolic_health_concerns || null,
        digestive_health: parsedInput.digestive_health || null,
        reproductive_health: parsedInput.reproductive_health || null,
        hormonal_health: parsedInput.hormonal_health || null,
        immune_health: parsedInput.immune_health || null,
        food_allergies_intolerance: parsedInput.food_allergies_intolerance || null,
        difficulties_chewing_swallowing: parsedInput.difficulties_chewing_swallowing || null,
        medications_medical_use: parsedInput.medications_medical_use || null,
        medications_mental_health: parsedInput.medications_mental_health || null,
        mental_health_conditions: parsedInput.mental_health_conditions || null,
        mental_health_treatment: parsedInput.mental_health_treatment,
        allergies: parsedInput.allergies,
        previous_psychedelics_experiences: parsedInput.previous_psychedelics_experiences,
        physical_examination_records: parsedInput.physical_examination_records || null,
        cardiac_evaluation: parsedInput.cardiac_evaluation || null,
        liver_function_tests: parsedInput.liver_function_tests || null,
        is_pregnant: parsedInput.is_pregnant || false,
        dietary_lifestyle_habits: parsedInput.dietary_lifestyle_habits,
        physical_activity_exercise: parsedInput.physical_activity_exercise,
        signature_data: parsedInput.signature_data,
        signature_date: signatureDate,
        uploaded_file_url: parsedInput.uploaded_file_url || null,
        uploaded_file_name: parsedInput.uploaded_file_name || null,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Get intake form data to check for filler details
    let intakeFormData: any = null
    if (parsedInput.intake_form_id) {
      const { data: intakeData } = await supabase
        .from('patient_intake_forms')
        .select('filled_by, filler_email, filler_first_name, filler_last_name, first_name, last_name, email')
        .eq('id', parsedInput.intake_form_id)
        .maybeSingle()
      
      if (intakeData) {
        intakeFormData = intakeData
      }
    }
    
    // Send confirmation email to patient (fire and forget - don't block response)
    sendMedicalHistoryConfirmationEmail(
      parsedInput.email,
      parsedInput.first_name,
      parsedInput.last_name
    ).catch((error) => {
      console.error('Failed to send medical history confirmation email to patient:', error)
    })
    
    // Send email to filler if application has filler details
    if (intakeFormData && intakeFormData.filled_by === 'someone_else' && intakeFormData.filler_email) {
      sendMedicalHistoryConfirmationEmail(
        intakeFormData.filler_email,
        intakeFormData.filler_first_name || 'Filler',
        intakeFormData.filler_last_name || '',
        intakeFormData.first_name || parsedInput.first_name,
        intakeFormData.last_name || parsedInput.last_name
      ).catch((error) => {
        console.error('Failed to send medical history confirmation email to filler:', error)
      })
    }
    
    return { 
      success: true, 
      data: { 
        id: data.id,
        message: 'Medical history form submitted successfully' 
      } 
    }
  })

/**
 * Upload medical history document to Supabase Storage
 */
export async function uploadMedicalHistoryDocument(formData: FormData) {
  const adminClient = createAdminClient()
  
  const file = formData.get('file') as File | null
  
  if (!file) {
    return { success: false, error: 'No file provided' }
  }
  
  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { success: false, error: 'File size exceeds 10MB limit.' }
  }
  
  // Validate file type
  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  
  if (!validTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Only PDF, images, and Word documents are allowed.' }
  }
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const fileName = `medical-history/${timestamp}-${randomId}.${fileExt}`
  
  // Upload file
  const { error: uploadError, data: uploadData } = await adminClient.storage
    .from('medical-history-documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })
  
  if (uploadError) {
    return { success: false, error: `Failed to upload file: ${uploadError.message}` }
  }
  
  // Get signed URL (since bucket is private)
  const { data: signedUrlData } = await adminClient.storage
    .from('medical-history-documents')
    .createSignedUrl(fileName, 31536000) // 1 year expiry
  
  if (!signedUrlData) {
    return { success: false, error: 'Failed to generate file URL' }
  }
  
  return { 
    success: true, 
    data: { 
      fileUrl: signedUrlData.signedUrl,
      fileName: file.name,
      storagePath: fileName
    } 
  }
}

// Get medical history form by ID for patient viewing
export const getMedicalHistoryFormForPatient = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    
    // Get user profile to check email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', ctx.user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'Profile not found' }
    }
    
    // Fetch the medical history form
    const { data, error } = await supabase
      .from('medical_history_forms')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Form not found' }
    }
    
    // Verify the form belongs to the patient (check by email)
    const patientEmail = (profile.email || '').trim().toLowerCase()
    const formEmail = (data.email || '').trim().toLowerCase()
    
    if (patientEmail && formEmail && patientEmail !== formEmail) {
      // Also check if patient is admin/owner (they can view any form)
      if (profile.role !== 'admin' && profile.role !== 'owner') {
        return { success: false, error: 'Unauthorized - You can only view your own forms' }
      }
    }
    
    return { success: true, data }
  })
