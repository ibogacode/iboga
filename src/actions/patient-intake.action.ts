'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { patientIntakeFormSchema } from '@/lib/validations/patient-intake'
import { headers } from 'next/headers'
import { sendEmailDirect, sendPatientPasswordSetupEmail } from './email.action'

export const submitPatientIntakeForm = actionClient
  .schema(patientIntakeFormSchema)
  .action(async ({ parsedInput }) => {
    // Use admin client (service role) for public form submissions
    // This bypasses RLS and allows inserts from both logged-in and anonymous users
    // Safe because: server-side only, input validated by Zod, service key not exposed
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
    
    // Insert form submission
    const { data, error } = await supabase
      .from('patient_intake_forms')
      .insert({
        filled_by: parsedInput.filled_by,
        filler_relationship: parsedInput.filler_relationship || null,
        filler_first_name: parsedInput.filler_first_name || null,
        filler_last_name: parsedInput.filler_last_name || null,
        filler_email: parsedInput.filler_email || null,
        filler_phone: parsedInput.filler_phone || null,
        program_type: parsedInput.program_type,
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
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // If this form was created from a partial form, link them
    if (parsedInput.partialFormId) {
      const { error: linkError } = await supabase
        .from('partial_intake_forms')
        .update({
          completed_form_id: data.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', parsedInput.partialFormId)
      
      if (linkError) {
        console.error('Error linking partial form to completed form:', linkError)
        // Don't fail the submission if linking fails, but log it
      }
    }
    
    // Check if profile already exists for this patient email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', parsedInput.email)
      .eq('role', 'patient')
      .maybeSingle()
    
    // Create patient profile if it doesn't exist
    if (!existingProfile) {
      // Generate a temporary password (will be reset via email)
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Math.random().toString(36).slice(-8)}`
      
      // Create auth user with patient email
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: parsedInput.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email so password reset works immediately
        user_metadata: {
          first_name: parsedInput.first_name,
          last_name: parsedInput.last_name,
          role: 'patient',
        },
      })
      
      if (authError || !authData.user) {
        console.error('Error creating patient auth user:', authError)
        // Don't fail the form submission, but log the error
      } else {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Check if profile was created by trigger, then update it
        const { data: triggerCreatedProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle()
        
        if (triggerCreatedProfile) {
          // Profile exists (created by trigger), update it with patient info
          await supabase
            .from('profiles')
            .update({
              email: parsedInput.email,
              first_name: parsedInput.first_name,
              last_name: parsedInput.last_name,
              role: 'patient',
              phone: parsedInput.phone_number || null,
              is_active: true,
            })
            .eq('id', authData.user.id)
        } else {
          // Profile doesn't exist (trigger didn't fire), create it manually
          await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: parsedInput.email,
              first_name: parsedInput.first_name,
              last_name: parsedInput.last_name,
              role: 'patient',
              phone: parsedInput.phone_number || null,
              is_active: true,
            })
        }
        
        // Wait a moment for user to be fully created in Supabase before sending password reset
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Send password setup email based on who filled out the form
        if (parsedInput.filled_by === 'self') {
          // Patient filled out themselves - send password setup to patient email
          sendPatientPasswordSetupEmail(
            parsedInput.email,
            parsedInput.first_name,
            parsedInput.last_name,
            false
          ).catch((error) => {
            console.error('Error sending password setup email to patient:', error)
          })
        } else if (parsedInput.filled_by === 'someone_else' && parsedInput.filler_email) {
          // Someone else filled out - account is created with patient email
          // Send password setup to patient email AND notification to filler
          sendPatientPasswordSetupEmail(
            parsedInput.email, // Patient email (account email)
            parsedInput.first_name,
            parsedInput.last_name,
            true, // isFiller = true
            parsedInput.filler_email, // Filler email for notification
            parsedInput.filler_first_name || '',
            parsedInput.filler_last_name || ''
          ).catch((error) => {
            console.error('Error sending password setup email:', error)
          })
        }
      }
    }
    
    // Send confirmation emails based on who filled out the form
    if (parsedInput.filled_by === 'self') {
      // If patient filled out themselves, send email only to patient
    sendConfirmationEmail(
      parsedInput.email, 
      parsedInput.first_name,
      parsedInput.last_name,
      data.id
    ).catch(console.error)
    } else if (parsedInput.filled_by === 'someone_else' && parsedInput.filler_email) {
      // If someone else filled out, send emails to both patient and filler
      // Send to patient
      sendConfirmationEmail(
        parsedInput.email, 
        parsedInput.first_name,
        parsedInput.last_name,
        data.id
      ).catch((error) => {
        console.error('Error sending confirmation email to patient:', error)
      })
      
      // Send to filler person
      sendFillerConfirmationEmail(
        parsedInput.filler_email,
        parsedInput.filler_first_name || '',
        parsedInput.filler_last_name || '',
        parsedInput.first_name,
        parsedInput.last_name,
        data.id
      ).catch((error) => {
        console.error('Error sending confirmation email to filler:', error)
      })
    }
    
    return { success: true, data: { id: data.id } }
  })

// Send confirmation email after form submission
async function sendConfirmationEmail(
  email: string, 
  firstName: string,
  lastName: string,
  formId: string
) {
  const supabase = createAdminClient()
  
  // Generate unique tracking token
  const trackingToken = crypto.randomUUID()
  
  // Base calendar link
  const baseCalendarLink = 'https://calendar.app.google/jkPEGqcQcf82W6aMA'
  
  // Prepopulate name and email in calendar link
  const fullName = `${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}`
  const encodedEmail = encodeURIComponent(email)
  const prepopulatedCalendarLink = `${baseCalendarLink}?name=${fullName}&email=${encodedEmail}`
  
  // Create tracking link that redirects to prepopulated calendar
  // For localhost testing, use localhost:3000, otherwise use production URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const trackingLink = `${baseUrl}/api/track-calendar-click/${trackingToken}?redirect=${encodeURIComponent(prepopulatedCalendarLink)}`
  
  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email tracking link generated:', trackingLink)
    console.log('🔗 Prepopulated calendar link:', prepopulatedCalendarLink)
  }
  
  // Update form with tracking token and email sent timestamp
  await supabase
    .from('patient_intake_forms')
    .update({
      tracking_token: trackingToken,
      email_sent_at: new Date().toISOString(),
    })
    .eq('id', formId)
  
  const schedulingLink = trackingLink
  
  const htmlBody = `
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
        .cta-button {
          display: inline-block;
          background: #5D7A5F;
          color: white !important;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          margin: 20px 0;
        }
        .cta-button:hover {
          background: #4a6350;
        }
        .cta-container {
          text-align: center;
          margin: 30px 0;
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
        .divider {
          height: 1px;
          background: #eee;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>Thank You, ${firstName}!</h2>
          <p>We have received your application and are excited to connect with you on your wellness journey.</p>
          <p>Our team will carefully review your information and will let you know soon if you are eligible to move forward. Thank you for your interest and patience.</p>          
          <div class="cta-container">
            <a href="${schedulingLink}" class="cta-button">Schedule Your Call</a>
          </div>
          
          <p>During this call, we'll discuss:</p>
          <ul style="color: #555;">
            <li>Your health goals and expectations</li>
            <li>The treatment process and what to expect</li>
            <li>Any questions you may have</li>
            <li>Next steps in your journey</li>
          </ul>
          
          <div class="divider"></div>
          
          <p>If you have any immediate questions, feel free to reach out:</p>
          <p>
            <strong>Phone:</strong> +1 (800) 604-7294<br>
            <strong>Email:</strong> james@theibogainstitute.org
          </p>
          
          <p>We look forward to speaking with you soon!</p>
          <p>Warm regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmailDirect({
    to: email,
    subject: 'Thank You for Your Application - Schedule Your Consultation | Iboga Wellness Institute',
    body: htmlBody,
  })
}

// Send confirmation email to the person who filled out the form (when someone else filled it)
async function sendFillerConfirmationEmail(
  fillerEmail: string,
  fillerFirstName: string,
  fillerLastName: string,
  patientFirstName: string,
  patientLastName: string,
  formId: string
) {
  const supabase = createAdminClient()
  
  // Generate unique tracking token for filler email
  const trackingToken = crypto.randomUUID()
  
  // Base calendar link
  const baseCalendarLink = 'https://calendar.app.google/jkPEGqcQcf82W6aMA'
  
  // Prepopulate name and email in calendar link (using filler's info)
  const fullName = `${encodeURIComponent(fillerFirstName)}%20${encodeURIComponent(fillerLastName)}`
  const encodedEmail = encodeURIComponent(fillerEmail)
  const prepopulatedCalendarLink = `${baseCalendarLink}?name=${fullName}&email=${encodedEmail}`
  
  // Create tracking link that redirects to prepopulated calendar
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const trackingLink = `${baseUrl}/api/track-calendar-click/${trackingToken}?redirect=${encodeURIComponent(prepopulatedCalendarLink)}`
  
  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Filler email tracking link generated:', trackingLink)
    console.log('🔗 Prepopulated calendar link:', prepopulatedCalendarLink)
  }
  
  // Note: We could store filler_tracking_token in the database if needed for analytics
  // For now, we'll just use it for the tracking link
  
  const schedulingLink = trackingLink
  
  const htmlBody = `
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
          background: #f9f9f9;
          border-left: 4px solid #5D7A5F;
          padding: 20px;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: #5D7A5F;
          color: white !important;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          margin: 20px 0;
        }
        .cta-button:hover {
          background: #4a6350;
        }
        .cta-container {
          text-align: center;
          margin: 30px 0;
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
        .divider {
          height: 1px;
          background: #eee;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>Thank You, ${fillerFirstName}!</h2>
          <p>We have received the application form that you submitted on behalf of <strong>${patientFirstName} ${patientLastName}</strong>.</p>
          
          <div class="info-box">
            <p><strong>Patient Information:</strong></p>
            <p>Name: ${patientFirstName} ${patientLastName}</p>
            <p>Our team will carefully review the information and will contact the patient directly regarding their eligibility and next steps.</p>
          </div>
          
          <p>As the person who filled out this form, we wanted to confirm that:</p>
          <ul style="color: #555;">
            <li>The form has been successfully submitted</li>
            <li>Our team will review it within 24-48 hours</li>
            <li>The patient will be contacted directly regarding next steps</li>
            <li>You will receive updates if we need any additional information</li>
          </ul>
          
          <div class="cta-container">
            <a href="${schedulingLink}" class="cta-button">Schedule a Call</a>
          </div>
          
          <p>You can schedule a call with us to discuss the application or answer any questions you may have about the process.</p>
          
          <p>During this call, we can discuss:</p>
          <ul style="color: #555;">
            <li>Any questions about the application you submitted</li>
            <li>The treatment process and what to expect</li>
            <li>How we can support ${patientFirstName} on their wellness journey</li>
            <li>Next steps in the process</li>
          </ul>
          
          <div class="divider"></div>
          
          <p>If you have any immediate questions, feel free to reach out:</p>
          <p>
            <strong>Phone:</strong> +1 (800) 604-7294<br>
            <strong>Email:</strong> james@theibogainstitute.org
          </p>
          
          <p>Thank you for helping ${patientFirstName} take this important step in their wellness journey.</p>
          <p>Warm regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmailDirect({
    to: fillerEmail,
    subject: `Intake Form Submitted - Confirmation for ${patientFirstName} ${patientLastName} | Iboga Wellness Institute`,
    body: htmlBody,
  })
}

