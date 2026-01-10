'use server'

import { z } from 'zod'
import { actionClient, authActionClient } from '@/lib/safe-action'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ibogaineConsentFormSchema } from '@/lib/validations/ibogaine-consent'
import { headers } from 'next/headers'
import { sendIbogaineConsentConfirmationEmail, sendEmailDirect } from './email.action'

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

/**
 * Check if ibogaine consent form is activated for patient
 */
export async function checkIbogaineConsentActivation() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Unauthorized - Please log in' }
  }
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' }
  }
  
  // Only check activation for patients
  if (profile.role !== 'patient') {
    return { success: true, data: { isActivated: true } }
  }
  
  // Check if there's an existing ibogaine consent form for this patient
  // Use multi-step approach: patient_id -> intake_form_id -> email
  let existingForm: any = null
  const patientEmail = (profile.email || user.email || '').trim().toLowerCase()
  
  // Strategy 1: Try by patient_id first (most reliable link)
  if (profile.id) {
    const { data: formByPatientId } = await supabase
      .from('ibogaine_consent_forms')
      .select('*')
      .eq('patient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (formByPatientId) {
      existingForm = formByPatientId
    }
  }
  
  // Strategy 2: Try by intake_form_id if available and form not found yet
  if (!existingForm) {
    // Get latest intake form for this patient
    const { data: intakeForms } = await supabase
      .from('patient_intake_forms')
      .select('id')
      .ilike('email', patientEmail)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (intakeForms && intakeForms.length > 0) {
      const { data: formByIntakeId } = await supabase
        .from('ibogaine_consent_forms')
        .select('*')
        .eq('intake_form_id', intakeForms[0].id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (formByIntakeId) {
        existingForm = formByIntakeId
      }
    }
  }
  
  // Strategy 3: Try by email if form still not found
  if (!existingForm && patientEmail) {
    const { data: formByEmail } = await supabase
      .from('ibogaine_consent_forms')
      .select('*')
      .ilike('email', patientEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (formByEmail) {
      existingForm = formByEmail
    }
  }
  
  // If form exists but not activated, return error
  if (existingForm && !existingForm.is_activated) {
    return { 
      success: false, 
      error: 'This form is not yet activated. Please wait for admin activation.' 
    }
  }
  
  // If form doesn't exist, block access (admin must create and activate it first)
  // If form exists and is activated, allow access
  if (!existingForm) {
    return { 
      success: false, 
      error: 'This form is not yet available. Please wait for admin to create and activate it.' 
    }
  }
  
  return { 
    success: true, 
    data: { 
      isActivated: existingForm.is_activated,
      formId: existingForm.id,
      existingForm: {
        // Patient information fields
        first_name: existingForm.first_name,
        last_name: existingForm.last_name,
        email: existingForm.email,
        phone_number: existingForm.phone_number,
        date_of_birth: existingForm.date_of_birth,
        address: existingForm.address,
        patient_id: existingForm.patient_id,
        intake_form_id: existingForm.intake_form_id,
        // Admin fields (read-only for patients)
        facilitator_doctor_name: existingForm.facilitator_doctor_name,
        // Patient signature fields (if already filled)
        signature_data: existingForm.signature_data,
        signature_date: existingForm.signature_date,
        signature_name: existingForm.signature_name,
        consent_for_treatment: existingForm.consent_for_treatment,
        risks_and_benefits: existingForm.risks_and_benefits,
        pre_screening_health_assessment: existingForm.pre_screening_health_assessment,
        voluntary_participation: existingForm.voluntary_participation,
        confidentiality: existingForm.confidentiality,
        liability_release: existingForm.liability_release,
        payment_collection: existingForm.payment_collection,
      }
    } 
  }
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
    const signatureDate = new Date(parsedInput.signature_date)
    
    // Check if a draft form already exists for this patient
    const patientEmail = parsedInput.email.trim().toLowerCase()
    const { data: existingForm } = await supabase
      .from('ibogaine_consent_forms')
      .select('id, is_activated')
      .or(`patient_id.eq.${parsedInput.patient_id || ''},email.ilike.${patientEmail}`)
      .eq('intake_form_id', parsedInput.intake_form_id || null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // If form exists and is activated, update it (patient completing their fields)
    // If form doesn't exist or is draft, insert new one
    if (existingForm && existingForm.is_activated) {
      // Update existing activated form with patient's consent and signature fields
      const { data, error } = await supabase
        .from('ibogaine_consent_forms')
        .update({
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingForm.id)
        .select('id')
        .single()
      
      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to update consent form' }
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
      sendIbogaineConsentConfirmationEmail(
        parsedInput.email,
        parsedInput.first_name,
        parsedInput.last_name
      ).catch((error) => {
        console.error('Failed to send ibogaine consent confirmation email to patient:', error)
      })
      
      // Send email to filler if application has filler details
      if (intakeFormData && intakeFormData.filled_by === 'someone_else' && intakeFormData.filler_email) {
        sendIbogaineConsentConfirmationEmail(
          intakeFormData.filler_email,
          intakeFormData.filler_first_name || 'Filler',
          intakeFormData.filler_last_name || '',
          intakeFormData.first_name || parsedInput.first_name,
          intakeFormData.last_name || parsedInput.last_name
        ).catch((error) => {
          console.error('Failed to send ibogaine consent confirmation email to filler:', error)
        })
      }
      
      // Send admin notification email when client completes ibogaine consent form (fire and forget)
      // Only send if form is completed (has signature)
      if (parsedInput.signature_name && parsedInput.signature_name.trim() !== '' && parsedInput.signature_data) {
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
                <h2>Client Ibogaine Consent Form Completed</h2>
                
                <div class="info-box">
                  <p><strong>✅ Ibogaine Consent Form Completed</strong></p>
                  <p><strong>Client Name:</strong> ${clientName}</p>
                  <p><strong>Client Email:</strong> ${parsedInput.email}</p>
                  <p><strong>Form Status:</strong> Ready for Onboarding</p>
                </div>
                
                <p>The client has successfully completed and signed their Ibogaine Therapy Consent Form. The client is now ready to proceed with the onboarding steps.</p>
                
                <p>Please review the completed form and proceed with the next steps in the onboarding process.</p>
                
                <p>You can view the completed Ibogaine Consent Form in the patient profile section of the portal.</p>
                
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
          subject: `Client Ibogaine Consent Form Completed - ${clientName} | Ready for Onboarding`,
          body: adminNotificationBody,
        }).catch((error) => {
          console.error('Failed to send admin notification email for ibogaine consent:', error)
        })
      }
      
      return { 
        success: true, 
        data: { 
          id: data.id,
          message: 'Ibogaine Therapy Consent Form submitted successfully' 
        } 
      }
    } else {
      // Insert new form (for admin/owner creating forms, or if no draft exists)
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
          is_activated: true, // Public submissions are considered activated
        })
        .select('id')
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
      sendIbogaineConsentConfirmationEmail(
        parsedInput.email,
        parsedInput.first_name,
        parsedInput.last_name
      ).catch((error) => {
        console.error('Failed to send ibogaine consent confirmation email to patient:', error)
      })
      
      // Send email to filler if application has filler details
      if (intakeFormData && intakeFormData.filled_by === 'someone_else' && intakeFormData.filler_email) {
        sendIbogaineConsentConfirmationEmail(
          intakeFormData.filler_email,
          intakeFormData.filler_first_name || 'Filler',
          intakeFormData.filler_last_name || '',
          intakeFormData.first_name || parsedInput.first_name,
          intakeFormData.last_name || parsedInput.last_name
        ).catch((error) => {
          console.error('Failed to send ibogaine consent confirmation email to filler:', error)
        })
      }
      
      // Send admin notification email when client completes ibogaine consent form (fire and forget)
      // Only send if form is completed (has signature)
      if (parsedInput.signature_name && parsedInput.signature_name.trim() !== '' && parsedInput.signature_data) {
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
                <h2>Client Ibogaine Consent Form Completed</h2>
                
                <div class="info-box">
                  <p><strong>✅ Ibogaine Consent Form Completed</strong></p>
                  <p><strong>Client Name:</strong> ${clientName}</p>
                  <p><strong>Client Email:</strong> ${parsedInput.email}</p>
                  <p><strong>Form Status:</strong> Ready for Onboarding</p>
                </div>
                
                <p>The client has successfully completed and signed their Ibogaine Therapy Consent Form. The client is now ready to proceed with the onboarding steps.</p>
                
                <p>Please review the completed form and proceed with the next steps in the onboarding process.</p>
                
                <p>You can view the completed Ibogaine Consent Form in the patient profile section of the portal.</p>
                
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
          subject: `Client Ibogaine Consent Form Completed - ${clientName} | Ready for Onboarding`,
          body: adminNotificationBody,
        }).catch((error) => {
          console.error('Failed to send admin notification email for ibogaine consent:', error)
        })
      }
      
      return { 
        success: true, 
        data: { 
          id: data.id,
          message: 'Ibogaine Therapy Consent Form submitted successfully' 
        } 
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
    
    // Check if form is activated (only for patients)
    if (profile.role === 'patient' && !form.is_activated) {
      return { success: false, error: 'This form is not yet activated. Please wait for admin activation.' }
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

