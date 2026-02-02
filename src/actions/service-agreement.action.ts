'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { serviceAgreementSchema } from '@/lib/validations/service-agreement'
import { sendServiceAgreementConfirmationEmail, sendEmailDirect } from './email.action'
import { autoActivateIbogaineConsent } from './form-automation.action'
import { getServiceAgreementText } from '@/lib/agreement-templates'

/**
 * Get patient data for service agreement pre-population
 * Fetches profile and latest intake form
 */
export async function getPatientDataForServiceAgreement() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Unauthorized - Please log in' }
  }
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' }
  }
  
  // Get latest intake form for this patient (by email match)
  const { data: intakeForms, error: intakeError } = await supabase
    .from('patient_intake_forms')
    .select('*')
    .eq('email', profile.email || user.email || '')
    .order('created_at', { ascending: false })
    .limit(1)
  
  const latestIntakeForm = intakeForms && intakeForms.length > 0 ? intakeForms[0] : null
  
  // Check if there's an existing service agreement for this patient
  const patientEmail = (profile.email || user.email || '').trim().toLowerCase()
  const { data: existingAgreement } = await supabase
    .from('service_agreements')
    .select('*')
    .or(`patient_id.eq.${profile.id},patient_email.ilike.${patientEmail}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  // If form exists but not activated, return error
  if (existingAgreement && !existingAgreement.is_activated) {
    return { 
      success: false, 
      error: 'This form is not yet activated. Please wait for admin activation.' 
    }
  }
  
  // If form doesn't exist, block access (admin must create and activate it first)
  if (!existingAgreement) {
    return { 
      success: false, 
      error: 'This form is not yet available. Please wait for admin to create and activate it.' 
    }
  }
  
  return {
    success: true,
    data: {
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email || user.email,
        phone: profile.phone,
      },
      intakeForm: latestIntakeForm ? {
        id: latestIntakeForm.id,
        first_name: latestIntakeForm.first_name,
        last_name: latestIntakeForm.last_name,
        email: latestIntakeForm.email,
        phone_number: latestIntakeForm.phone_number,
        program_type: latestIntakeForm.program_type || null,
      } : null,
      existingForm: existingAgreement ? {
        id: existingAgreement.id,
        total_program_fee: existingAgreement.total_program_fee,
        deposit_amount: existingAgreement.deposit_amount,
        deposit_percentage: existingAgreement.deposit_percentage,
        remaining_balance: existingAgreement.remaining_balance,
        payment_method: existingAgreement.payment_method || null,
        provider_signature_name: existingAgreement.provider_signature_name,
        provider_signature_first_name: existingAgreement.provider_signature_first_name || null,
        provider_signature_last_name: existingAgreement.provider_signature_last_name || null,
        provider_signature_date: existingAgreement.provider_signature_date,
        program_type: existingAgreement.program_type || latestIntakeForm?.program_type || null,
        number_of_days: existingAgreement.number_of_days || null,
      } : null,
    }
  }
}

export const submitServiceAgreement = authActionClient
  .schema(serviceAgreementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = createAdminClient()
    // Allow patients to submit their own service agreements, or admins/owners to create any
    const isPatient = ctx.user.role === 'patient'
    const isAdminOrOwner = ctx.user.role === 'admin' || ctx.user.role === 'owner'
    
    if (!isPatient && !isAdminOrOwner) {
      return { success: false, error: 'Only patients, admins, and owners can create service agreements' }
    }
    
    // If patient is submitting, auto-link to their profile
    let patientId = parsedInput.patient_id
    if (isPatient && !patientId) {
      patientId = ctx.user.id
    }
    
    // Parse numeric values
    const totalProgramFee = parseFloat(parsedInput.total_program_fee.replace(/[^0-9.]/g, ''))
    const depositAmount = parseFloat(parsedInput.deposit_amount.replace(/[^0-9.]/g, ''))
    const depositPercentage = parseFloat(parsedInput.deposit_percentage.replace(/[^0-9.]/g, ''))
    const remainingBalance = parseFloat(parsedInput.remaining_balance.replace(/[^0-9.]/g, ''))
    
    // Parse dates
    const patientSignatureDate = new Date(parsedInput.patient_signature_date)
    const providerSignatureDate = new Date(parsedInput.provider_signature_date)
    
    // Check if a draft form already exists for this patient
    const patientEmail = parsedInput.patient_email.trim().toLowerCase()
    const { data: existingForm } = await supabase
      .from('service_agreements')
      .select('id, is_activated')
      .or(`patient_id.eq.${patientId || ''},patient_email.ilike.${patientEmail}`)
      .eq('intake_form_id', parsedInput.intake_form_id || null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // If form exists and is activated, update it (patient completing their fields)
    // If form doesn't exist or is draft, insert new one
    if (existingForm && existingForm.is_activated) {
      // Fetch existing form for program_type/number_of_days if not in submission
      const needFormForSnapshot = parsedInput.program_type == null || parsedInput.number_of_days == null
      const existingRow = needFormForSnapshot
        ? (await supabase
            .from('service_agreements')
            .select('program_type, number_of_days')
            .eq('id', existingForm.id)
            .single()).data
        : null
      const programType = (parsedInput.program_type ?? existingRow?.program_type ?? 'neurological') as 'neurological' | 'mental_health' | 'addiction'
      const numberOfDays = parsedInput.number_of_days ?? existingRow?.number_of_days ?? 14

      // Snapshot the agreement text at signing so completed agreements always show what was agreed to
      const agreementContentSnapshot = getServiceAgreementText({
        programType,
        totalProgramFee: totalProgramFee,
        depositPercentage: depositPercentage,
        depositAmount,
        remainingBalance,
        numberOfDays,
      })

      // Update existing activated form with patient's signature fields, payment method, and snapshot
      const { data, error } = await supabase
        .from('service_agreements')
        .update({
          payment_method: parsedInput.payment_method,
          patient_signature_name: parsedInput.patient_signature_name,
          patient_signature_first_name: parsedInput.patient_signature_first_name,
          patient_signature_last_name: parsedInput.patient_signature_last_name,
          patient_signature_date: patientSignatureDate.toISOString().split('T')[0],
          patient_signature_data: parsedInput.patient_signature_data || null,
          uploaded_file_url: parsedInput.uploaded_file_url || null,
          uploaded_file_name: parsedInput.uploaded_file_name || null,
          agreement_content_snapshot: agreementContentSnapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingForm.id)
        .select('*, total_program_fee, deposit_amount, deposit_percentage, remaining_balance')
        .single()

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to update service agreement' }
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
      // Only send if patient completed the form (has patient signature)
      if (parsedInput.patient_signature_name && parsedInput.patient_signature_name.trim() !== '') {
        sendServiceAgreementConfirmationEmail(
          parsedInput.patient_email,
          parsedInput.patient_first_name,
          parsedInput.patient_last_name
        ).catch((error) => {
          console.error('Failed to send service agreement confirmation email to patient:', error)
        })
        
        // Send email to filler if application has filler details
        if (intakeFormData && intakeFormData.filled_by === 'someone_else' && intakeFormData.filler_email) {
          sendServiceAgreementConfirmationEmail(
            intakeFormData.filler_email,
            intakeFormData.filler_first_name || 'Filler',
            intakeFormData.filler_last_name || '',
            intakeFormData.first_name || parsedInput.patient_first_name,
            intakeFormData.last_name || parsedInput.patient_last_name
          ).catch((error) => {
            console.error('Failed to send service agreement confirmation email to filler:', error)
          })
        }
        
        // Send admin notification email when client completes service agreement (fire and forget)
        const clientName = `${parsedInput.patient_first_name} ${parsedInput.patient_last_name}`.trim()
        // Use fee amounts from the updated database record (data already contains all fields from .select())
        const feeAmount = typeof data.total_program_fee === 'number' ? data.total_program_fee : parseFloat(String(data.total_program_fee || 0))
        const depAmount = typeof data.deposit_amount === 'number' ? data.deposit_amount : parseFloat(String(data.deposit_amount || 0))
        const depPct = typeof data.deposit_percentage === 'number' ? data.deposit_percentage : parseFloat(String(data.deposit_percentage || 0))
        const remBalance = typeof data.remaining_balance === 'number' ? data.remaining_balance : parseFloat(String(data.remaining_balance || 0))
        
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
                <h2>Client Service Agreement Completed</h2>
                
                <div class="info-box">
                  <p><strong>✅ Service Agreement Completed</strong></p>
                  <p><strong>Client Name:</strong> ${clientName}</p>
                  <p><strong>Client Email:</strong> ${parsedInput.patient_email}</p>
                  <p><strong>Program Fee:</strong> $${feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p><strong>Deposit:</strong> $${depAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${depPct.toFixed(2)}%)</p>
                  <p><strong>Remaining Balance:</strong> $${remBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                
                <p>The client has successfully completed and signed their Service Agreement. Please review the agreement and proceed with the next steps in the client onboarding process.</p>
                
                <p>You can view the completed Service Agreement in the patient profile section of the portal.</p>
                
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
          subject: `Client Service Agreement Completed - ${clientName} | Iboga Wellness Institute`,
          body: adminNotificationBody,
        }).catch((error) => {
          console.error('Failed to send admin notification email for service agreement:', error)
        })

        // AUTO-ACTIVATE IBOGAINE CONSENT FORM (Fire and forget)
        autoActivateIbogaineConsent({
          intakeFormId: parsedInput.intake_form_id || null,
          patientEmail: parsedInput.patient_email,
          patientFirstName: parsedInput.patient_first_name,
          patientLastName: parsedInput.patient_last_name,
          patientId: patientId || null,
        }).catch((error) => {
          console.error('[submitServiceAgreement] Failed to auto-activate ibogaine consent:', error)
        })
      }

      return { success: true, data: { id: data.id } }
    } else {
      // Get program_type from intake_form if available
      let programType: 'neurological' | 'mental_health' | 'addiction' | null = parsedInput.program_type || null
      if (!programType && parsedInput.intake_form_id) {
        const { data: intakeData } = await supabase
          .from('patient_intake_forms')
          .select('program_type')
          .eq('id', parsedInput.intake_form_id)
          .maybeSingle()
        
        if (intakeData?.program_type && ['neurological', 'mental_health', 'addiction'].includes(intakeData.program_type)) {
          programType = intakeData.program_type as 'neurological' | 'mental_health' | 'addiction'
        }
      }

      // Insert new service agreement (for admin/owner creating forms, or if no draft exists)
      const insertData: any = {
        patient_id: patientId || parsedInput.patient_id || null,
        intake_form_id: parsedInput.intake_form_id || null,
        patient_first_name: parsedInput.patient_first_name,
        patient_last_name: parsedInput.patient_last_name,
        patient_email: parsedInput.patient_email,
        patient_phone_number: parsedInput.patient_phone_number,
        total_program_fee: totalProgramFee,
        deposit_amount: depositAmount,
        deposit_percentage: depositPercentage,
        remaining_balance: remainingBalance,
        payment_method: parsedInput.payment_method,
        patient_signature_name: parsedInput.patient_signature_name,
        patient_signature_first_name: parsedInput.patient_signature_first_name,
        patient_signature_last_name: parsedInput.patient_signature_last_name,
        patient_signature_date: patientSignatureDate.toISOString().split('T')[0],
        patient_signature_data: parsedInput.patient_signature_data || null,
        provider_signature_name: parsedInput.provider_signature_name,
        provider_signature_date: providerSignatureDate.toISOString().split('T')[0],
        provider_signature_data: parsedInput.provider_signature_data || null,
        uploaded_file_url: parsedInput.uploaded_file_url || null,
        uploaded_file_name: parsedInput.uploaded_file_name || null,
        created_by: ctx.user.id,
        is_activated: isAdminOrOwner ? true : false, // Admins can create activated forms
      }

      // Only include optional provider fields if provided
      if (parsedInput.provider_signature_first_name) {
        insertData.provider_signature_first_name = parsedInput.provider_signature_first_name
      }
      if (parsedInput.provider_signature_last_name) {
        insertData.provider_signature_last_name = parsedInput.provider_signature_last_name
      }

      // Include program_type and number_of_days if provided
      if (programType) {
        insertData.program_type = programType
      }
      let insertNumberOfDays: number | undefined
      if (parsedInput.number_of_days !== undefined && parsedInput.number_of_days !== null) {
        const days = typeof parsedInput.number_of_days === 'number'
          ? parsedInput.number_of_days
          : parseInt(String(parsedInput.number_of_days), 10)
        if (!isNaN(days) && days > 0) {
          insertData.number_of_days = days
          insertNumberOfDays = days
        }
      }
      // Snapshot agreement text when inserting a completed form so viewing shows what was agreed to
      const insertSnapshot = getServiceAgreementText({
        programType: programType ?? 'neurological',
        totalProgramFee,
        depositPercentage,
        depositAmount,
        remainingBalance,
        numberOfDays: insertNumberOfDays ?? insertData.number_of_days ?? 14,
      })
      insertData.agreement_content_snapshot = insertSnapshot

      const { data, error } = await supabase
        .from('service_agreements')
        .insert(insertData)
        .select()
        .single()

      if (error || !data) {
        console.error('Error creating service agreement:', error)
        return { success: false, error: error?.message || 'Failed to create service agreement' }
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
      // Only send if patient completed the form (has patient signature)
      if (parsedInput.patient_signature_name && parsedInput.patient_signature_name.trim() !== '') {
        sendServiceAgreementConfirmationEmail(
          parsedInput.patient_email,
          parsedInput.patient_first_name,
          parsedInput.patient_last_name
        ).catch((error) => {
          console.error('Failed to send service agreement confirmation email to patient:', error)
        })
        
        // Send email to filler if application has filler details
        if (intakeFormData && intakeFormData.filled_by === 'someone_else' && intakeFormData.filler_email) {
          sendServiceAgreementConfirmationEmail(
            intakeFormData.filler_email,
            intakeFormData.filler_first_name || 'Filler',
            intakeFormData.filler_last_name || '',
            intakeFormData.first_name || parsedInput.patient_first_name,
            intakeFormData.last_name || parsedInput.patient_last_name
          ).catch((error) => {
            console.error('Failed to send service agreement confirmation email to filler:', error)
          })
        }
        
        // Send admin notification email when client completes service agreement (fire and forget)
        const clientName = `${parsedInput.patient_first_name} ${parsedInput.patient_last_name}`.trim()
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
                <h2>Client Service Agreement Completed</h2>
                
                <div class="info-box">
                  <p><strong>✅ Service Agreement Completed</strong></p>
                  <p><strong>Client Name:</strong> ${clientName}</p>
                  <p><strong>Client Email:</strong> ${parsedInput.patient_email}</p>
                  <p><strong>Program Fee:</strong> $${totalProgramFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p><strong>Deposit:</strong> $${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${depositPercentage.toFixed(2)}%)</p>
                  <p><strong>Remaining Balance:</strong> $${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                
                <p>The client has successfully completed and signed their Service Agreement. Please review the agreement and proceed with the next steps in the client onboarding process.</p>
                
                <p>You can view the completed Service Agreement in the patient profile section of the portal.</p>
                
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
          subject: `Client Service Agreement Completed - ${clientName} | Iboga Wellness Institute`,
          body: adminNotificationBody,
        }).catch((error) => {
          console.error('Failed to send admin notification email for service agreement:', error)
        })
      }

      return { success: true, data: { id: data.id } }
    }
  })

/**
 * Upload service agreement document
 */
export async function uploadServiceAgreementDocument(formData: FormData) {
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
  const fileName = `service-agreements/${timestamp}-${randomId}.${fileExt}`
  
  // Upload file
  const { error: uploadError, data: uploadData } = await adminClient.storage
    .from('service-agreement-documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })
  
  if (uploadError) {
    return { success: false, error: `Failed to upload file: ${uploadError.message}` }
  }
  
  // Get signed URL (since bucket is private)
  const { data: signedUrlData } = await adminClient.storage
    .from('service-agreement-documents')
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

// Get service agreement by ID for patient viewing
export const getServiceAgreementForPatient = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    
    // Get user profile to check patient_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', ctx.user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'Profile not found' }
    }
    
    // Fetch the service agreement
    const { data, error } = await supabase
      .from('service_agreements')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Service agreement not found' }
    }
    
    // Verify the form belongs to the patient (check by patient_id or email)
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      const patientEmail = (profile.email || '').trim().toLowerCase()
      const formEmail = (data.patient_email || '').trim().toLowerCase()
      
      if (data.patient_id !== profile.id && patientEmail !== formEmail) {
        return { success: false, error: 'Unauthorized - You can only view your own forms' }
      }
      
      // Check if form is activated
      if (!data.is_activated) {
        return { success: false, error: 'This form is not yet activated. Please wait for admin activation.' }
      }
    }
    
    return { success: true, data }
  })
