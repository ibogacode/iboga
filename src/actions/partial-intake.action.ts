'use server'

import { z } from 'zod'
import { actionClient, authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { partialIntakeFormSchema } from '@/lib/validations/partial-intake'
import { sendEmailDirect } from './email.action'
import crypto from 'crypto'

// Action to create a partial intake form and send email
export const createPartialIntakeForm = authActionClient
  .schema(partialIntakeFormSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Check if user is admin or owner
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
      return { success: false, error: 'Only admins and owners can create partial application forms' }
    }

    const supabase = createAdminClient()
    
    // Generate unique token
    const token = crypto.randomUUID()
    
    // Determine recipient email and name based on who is filling out the form
    const recipientEmail = parsedInput.filled_by === 'self' 
      ? (parsedInput.email || '')
      : (parsedInput.filler_email || '')
    
    const recipientName = parsedInput.filled_by === 'self'
      ? `${parsedInput.first_name || ''} ${parsedInput.last_name || ''}`.trim()
      : (parsedInput.filler_first_name && parsedInput.filler_last_name
          ? `${parsedInput.filler_first_name} ${parsedInput.filler_last_name}`
          : null)
    
    // Parse date_of_birth if provided
    let dateOfBirth: Date | null = null
    if (parsedInput.mode === 'partial' && parsedInput.date_of_birth) {
      dateOfBirth = new Date(parsedInput.date_of_birth)
    }
    
    // Insert partial form
    const { data, error } = await supabase
      .from('partial_intake_forms')
      .insert({
        token,
        mode: parsedInput.mode,
        filled_by: parsedInput.filled_by,
        filler_relationship: parsedInput.filler_relationship || null,
        filler_first_name: parsedInput.filler_first_name || null,
        filler_last_name: parsedInput.filler_last_name || null,
        filler_email: parsedInput.filler_email || null,
        filler_phone: parsedInput.filler_phone || null,
        first_name: parsedInput.first_name || null,
        last_name: parsedInput.last_name || null,
        email: parsedInput.email || null,
        phone_number: parsedInput.mode === 'partial' ? parsedInput.phone_number : null,
        date_of_birth: dateOfBirth,
        gender: parsedInput.mode === 'partial' ? parsedInput.gender : null,
        address: parsedInput.mode === 'partial' ? parsedInput.address : null,
        city: parsedInput.mode === 'partial' ? parsedInput.city : null,
        state: parsedInput.mode === 'partial' ? parsedInput.state : null,
        zip_code: parsedInput.mode === 'partial' ? parsedInput.zip_code : null,
        emergency_contact_first_name: parsedInput.mode === 'partial' ? parsedInput.emergency_contact_first_name : null,
        emergency_contact_last_name: parsedInput.mode === 'partial' ? parsedInput.emergency_contact_last_name : null,
        emergency_contact_email: parsedInput.mode === 'partial' ? parsedInput.emergency_contact_email : null,
        emergency_contact_phone: parsedInput.mode === 'partial' ? parsedInput.emergency_contact_phone : null,
        emergency_contact_address: parsedInput.mode === 'partial' ? parsedInput.emergency_contact_address : null,
        emergency_contact_relationship: parsedInput.mode === 'partial' ? parsedInput.emergency_contact_relationship : null,
        program_type: parsedInput.mode === 'partial' ? parsedInput.program_type : null,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        created_by: ctx.user.id,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Generate form link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
    const formLink = `${baseUrl}/intake?token=${token}`
    
    // Send email with form link based on scenario (fire and forget - don't await)
    sendPartialIntakeFormEmail(
      recipientEmail,
      recipientName || (parsedInput.filled_by === 'self' 
        ? `${parsedInput.first_name || ''} ${parsedInput.last_name || ''}`.trim()
        : `${parsedInput.filler_first_name || ''} ${parsedInput.filler_last_name || ''}`.trim()),
      parsedInput.first_name || null,
      parsedInput.last_name || null,
      formLink,
      parsedInput.mode,
      parsedInput.filled_by,
      parsedInput.filler_first_name || null,
      parsedInput.filler_last_name || null
    )
    .then(async (emailResult) => {
      // Check if email was sent successfully and update email_sent_at
      // sendEmailDirect returns { success, error?, messageId? }
      if (emailResult?.success) {
        await supabase
          .from('partial_intake_forms')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', data.id)
        console.log('[createPartialIntakeForm] Email sent and email_sent_at updated')
      } else {
        console.error('[createPartialIntakeForm] Email send failed:', emailResult?.error)
      }
    })
    .catch((error) => {
      // Log error but don't fail the action
      console.error('Failed to send email:', error)
    })
    
    return { 
      success: true, 
      data: { 
        id: data.id,
        token,
        formLink,
      } 
    }
  })

// Action to get partial form data by token
export const getPartialIntakeForm = actionClient
  .schema(z.object({ token: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('partial_intake_forms')
      .select('*')
      .eq('token', parsedInput.token)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Invalid or expired form link' }
    }
    
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { success: false, error: 'This form link has expired' }
    }
    
    // Check if already completed
    if (data.completed_at) {
      return { success: false, error: 'This form has already been completed' }
    }
    
    return { success: true, data }
  })

// Helper function to send email with form link
async function sendPartialIntakeFormEmail(
  recipientEmail: string,
  recipientName: string,
  patientFirstName: string | null,
  patientLastName: string | null,
  formLink: string,
  mode: 'minimal' | 'partial',
  filledBy: 'self' | 'someone_else',
  fillerFirstName: string | null,
  fillerLastName: string | null
) {
  // Determine email content based on scenario
  const isMinimal = mode === 'minimal'
  const isSelf = filledBy === 'self'
  
  let greeting: string
  let introText: string
  let infoBoxContent: string
  let subject: string
  
  // Scenario 1: Minimal + Self
  if (isMinimal && isSelf) {
    greeting = `Hello ${recipientName},`
    introText = `We need you to complete your application form for Iboga Wellness Institute.`
    infoBoxContent = `
      <div class="info-box">
        <p><strong>Your Information:</strong></p>
        <p>Name: ${patientFirstName || ''} ${patientLastName || ''}</p>
        <p>Email: ${recipientEmail}</p>
        <p>Please complete the application form with all required information about yourself.</p>
      </div>
    `
    subject = `Complete Your Application Form - ${patientFirstName || ''} ${patientLastName || ''} | Iboga Wellness Institute`
  }
  // Scenario 2: Minimal + Someone Else
  else if (isMinimal && !isSelf) {
    greeting = `Hello ${recipientName},`
    introText = `You have been requested to complete a patient application. Please start and fill out all patient data in the form and hit submit. Thank you.`
    infoBoxContent = `
      <div class="info-box">
        <p>Please complete this application by entering all required patient information. Once finished, click submit to complete the process. Thank you for your assistance.</p>
      </div>
    `
    subject = `Requested: Complete a Patient Application | Iboga Wellness Institute`
  }
  // Scenario 3: Partial + Self
  else if (!isMinimal && isSelf) {
    greeting = `Hello ${recipientName},`
    introText = `We need you to complete the remaining sections of your application form. Some information has already been entered for you.`
    infoBoxContent = `
      <div class="info-box">
        <p><strong>Your Information (Pre-filled):</strong></p>
        <p>Name: ${patientFirstName || ''} ${patientLastName || ''}</p>
        <p>Email: ${recipientEmail}</p>
        <p>Some information has already been entered. Please review and complete the remaining sections of the application form.</p>
      </div>
    `
    subject = `Complete Your Application Form - ${patientFirstName || ''} ${patientLastName || ''} | Iboga Wellness Institute`
  }
  // Scenario 4: Partial + Someone Else
  else {
    greeting = `Hello ${recipientName},`
    introText = `You have been asked to complete the remaining sections of the application form${patientFirstName && patientLastName ? ` for <strong>${patientFirstName} ${patientLastName}</strong>` : ''}. Some information has already been entered.`
    infoBoxContent = `
      <div class="info-box">
        <p><strong>Patient Information (Pre-filled):</strong></p>
        <p>Name: ${patientFirstName || ''} ${patientLastName || ''}</p>
        <p>Email: ${recipientEmail}</p>
        <p>Some information has already been entered. Please review and complete the remaining sections of the application form.</p>
      </div>
    `
    subject = `Complete Application Form${patientFirstName && patientLastName ? ` for ${patientFirstName} ${patientLastName}` : ''} | Iboga Wellness Institute`
  }
  
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
        .link-fallback {
          font-size: 12px;
          color: #888;
          word-break: break-all;
          margin-top: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>${isSelf 
            ? 'Complete Your Application Form' 
            : (patientFirstName && patientLastName 
                ? `Complete Application Form for ${patientFirstName} ${patientLastName}`
                : 'Complete Patient Application Form')}</h2>
          <p>${greeting}</p>
          <p>${introText}</p>
          
          ${infoBoxContent}
          
          <div class="cta-container">
            <a href="${formLink}" class="cta-button">Complete Application Form</a>
          </div>
          
          <p class="link-fallback">If the button doesn't work, copy and paste this link into your browser:<br>${formLink}</p>
          
          <p><strong>Important:</strong> This link will expire in 30 days. Please complete the form as soon as possible.</p>
          
          <p>If you have any questions, please contact us:</p>
          <p>
            <strong>Phone:</strong> +1 (800) 604-7294<br>
            <strong>Email:</strong> contactus@theibogainstitute.org
          </p>
          
          <p>Thank you,<br><strong>The Iboga Wellness Institute Team</strong></p>
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
    to: recipientEmail,
    subject: subject,
    body: htmlBody,
  })
}
