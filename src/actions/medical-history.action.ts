'use server'

import { z } from 'zod'
import { actionClient, authActionClient } from '@/lib/safe-action'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { medicalHistoryFormSchema } from '@/lib/validations/medical-history'
import { headers } from 'next/headers'
import { sendMedicalHistoryConfirmationEmail, sendEmailDirect } from './email.action'

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
        has_physical_examination: parsedInput.has_physical_examination || false,
        physical_examination_records: parsedInput.physical_examination_records || null,
        physical_examination_file_url: parsedInput.physical_examination_file_url || null,
        physical_examination_file_name: parsedInput.physical_examination_file_name || null,
        has_cardiac_evaluation: parsedInput.has_cardiac_evaluation || false,
        cardiac_evaluation: parsedInput.cardiac_evaluation || null,
        cardiac_evaluation_file_url: parsedInput.cardiac_evaluation_file_url || null,
        cardiac_evaluation_file_name: parsedInput.cardiac_evaluation_file_name || null,
        has_liver_function_tests: parsedInput.has_liver_function_tests || false,
        liver_function_tests: parsedInput.liver_function_tests || null,
        liver_function_tests_file_url: parsedInput.liver_function_tests_file_url || null,
        liver_function_tests_file_name: parsedInput.liver_function_tests_file_name || null,
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
    
    // Send admin notification email (fire and forget - don't block response)
    const clientName = `${parsedInput.first_name} ${parsedInput.last_name}`.trim()
    const adminNotificationBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.8; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
          }
          .header { 
            background: #5D7A5F; 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 400;
          }
          .content { 
            padding: 40px 30px; 
            background: white; 
          }
          .content h2 {
            color: #5D7A5F;
            font-size: 24px;
            margin-top: 0;
          }
          .content p {
            font-size: 16px;
            color: #555;
            margin-bottom: 20px;
          }
          .info-box {
            background: #f0f7f0;
            border-left: 4px solid #5D7A5F;
            padding: 20px;
            margin: 20px 0;
          }
          .footer { 
            padding: 30px; 
            text-align: center; 
            font-size: 14px; 
            color: #888;
            background: #f9f9f9;
            border-top: 1px solid #eee;
          }
          .footer a {
            color: #5D7A5F;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Client Ready for Service Agreement</h2>
            
            <div class="info-box">
              <p><strong>✅ Medical Health History Form Completed</strong></p>
              <p><strong>Client Name:</strong> ${clientName}</p>
              <p><strong>Client Email:</strong> ${parsedInput.email}</p>
            </div>
            
            <p>The client has successfully completed their Medical Health History form and is now ready for the Service Agreement and next steps in the process.</p>
            
            <p>Please proceed with activating the Service Agreement form for this client.</p>
            
            <p>Best regards,<br><strong>Iboga Wellness Institute System</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `
    
    sendEmailDirect({
      to: 'james@theibogainstitute.org',
      subject: `Client Ready for Service Agreement - ${clientName} | Iboga Wellness Institute`,
      body: adminNotificationBody,
    }).catch((error) => {
      console.error('Failed to send admin notification email:', error)
    })
    
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
export async function uploadMedicalHistoryDocument(formData: FormData, fileType?: 'physical-exam' | 'cardiac-eval' | 'liver-test') {
  try {
    const adminClient = createAdminClient()
    
    const file = formData.get('file') as File | null
    
    if (!file) {
      return { success: false, error: 'No file provided' }
    }
    
    // Validate file type (file size validation removed - bucket will handle limits)
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
    
    // Generate unique filename with optional type prefix for organization
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const folder = fileType ? `medical-history/${fileType}` : 'medical-history'
    const fileName = `${folder}/${timestamp}-${randomId}.${fileExt}`
    
    // Upload file
    const { error: uploadError } = await adminClient.storage
      .from('medical-history-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })
    
    if (uploadError) {
      console.error('Medical history file upload error:', uploadError)
      return { success: false, error: `Failed to upload file: ${uploadError.message}` }
    }
    
    // Get signed URL (since bucket is private)
    const { data: signedUrlData, error: urlError } = await adminClient.storage
      .from('medical-history-documents')
      .createSignedUrl(fileName, 31536000) // 1 year expiry
    
    if (urlError || !signedUrlData) {
      console.error('Medical history signed URL error:', urlError)
      return { success: false, error: `Failed to generate file URL: ${urlError?.message || 'Unknown error'}` }
    }
    
    return { 
      success: true, 
      data: { 
        fileUrl: signedUrlData.signedUrl,
        fileName: file.name,
        storagePath: fileName
      } 
    }
  } catch (error) {
    console.error('Unexpected error in uploadMedicalHistoryDocument:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred while uploading file' 
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
