'use server'

import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

// Direct function to send email - can be called from server-side code
// This is needed because server actions can't be called from within other server actions
export async function sendEmailDirect(params: { to: string; subject: string; body: string }) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    try {
      const url = `${supabaseUrl}/functions/v1/send-email`
    console.log('[sendEmailDirect] Calling edge function:', url, 'to:', params.to)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        body: params.body,
        }),
      })

      const responseText = await response.text()
    console.log('[sendEmailDirect] Edge function response:', response.status, responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
      console.error('[sendEmailDirect] Invalid response:', responseText)
        return { success: false, error: `Invalid response: ${responseText}` }
      }

      if (!result.success) {
      console.error('[sendEmailDirect] Email failed:', result.error)
        return { success: false, error: result.error || 'Failed to send email' }
      }

    console.log('[sendEmailDirect] Email sent successfully, messageId:', result.messageId)
      return { success: true, messageId: result.messageId }
    } catch (error) {
    console.error('[sendEmailDirect] Email send error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
    }
}

// Wrapper function to call email template edge function
async function sendEmailTemplate(
  type: string,
  params: Record<string, any>
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    const url = `${supabaseUrl}/functions/v1/send-email-template`
    console.log('[sendEmailTemplate] Calling edge function:', url, 'type:', type, 'to:', params.to)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type,
        ...params,
      }),
    })

    const result = await response.json()
    
    if (!result.success) {
      console.error('[sendEmailTemplate] Email template failed:', result.error)
      return { success: false, error: result.error || 'Failed to send email' }
    }

    console.log('[sendEmailTemplate] Email template sent successfully')
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('[sendEmailTemplate] Email template error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
  }
}

// Server action for client-side use
export const sendEmail = actionClient
  .schema(sendEmailSchema)
  .action(async ({ parsedInput }) => {
    return sendEmailDirect(parsedInput)
  })

// Helper function to send inquiry confirmation email
export async function sendInquiryConfirmationEmail(
  email: string,
  firstName: string
) {
  return sendEmailTemplate('inquiry_confirmation', {
    to: email,
    firstName,
  })
}

// Helper function to send employee welcome email with login credentials
export async function sendEmployeeWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  role: string
) {
  console.log('[sendEmployeeWelcomeEmail] Sending welcome email to:', email)
  const result = await sendEmailTemplate('employee_welcome', {
    to: email,
    firstName,
    lastName,
    password,
    role,
  })
  
  if (!result.success) {
    console.error('[sendEmployeeWelcomeEmail] Failed to send email:', result.error)
  } else {
    console.log('[sendEmployeeWelcomeEmail] Email sent successfully')
  }
  
  return result
}

// Helper function to send patient login credentials email (second email, sent separately)
// This is sent after the application confirmation email
export async function sendPatientLoginCredentialsEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  password: string,
  isFiller: boolean = false,
  fillerEmail?: string,
  fillerFirstName?: string,
  fillerLastName?: string
) {
  console.log('[sendPatientLoginCredentialsEmail] Called with:', { patientEmail, firstName, lastName, isFiller, fillerEmail })
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const loginUrl = `${baseUrl}/login`

  // If this is for a filler, also send notification email to filler
  if (isFiller && fillerEmail) {
    const fillerHtmlBody = `
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
            <h2>Patient Account Created</h2>
            <p>Hello ${fillerFirstName || 'there'},</p>
            <p>We have created a patient portal account for <strong>${firstName} ${lastName}</strong> based on the application form you submitted.</p>
            <div class="info-box">
              <p><strong>Account Information:</strong></p>
              <p><strong>Patient Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Account Email:</strong> ${patientEmail}</p>
              <p><strong>Temporary Password:</strong> ${password}</p>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; font-size: 14px; color: #856404;">
              <strong>🔒 Security Note:</strong> We've included the login credentials here in case you need to help ${firstName} access their account. Please share these credentials securely with them. ${firstName} will be required to change their password on first login for security.
            </div>
            
            <p>${firstName} will also receive a separate email with their login credentials. They will be required to change their password on first login for security.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #5D7A5F; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Login to Patient Portal</a>
            </div>
            
            <p>If you have any questions, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            <p>Thank you for helping ${firstName} take this important step in their wellness journey.</p>
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p>https://theibogainstitute.org</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    console.log('[sendPatientLoginCredentialsEmail] Sending filler notification email to:', fillerEmail)
    const fillerResult = await sendEmailDirect({
      to: fillerEmail,
      subject: `Patient Account Created for ${firstName} ${lastName} | Iboga Wellness Institute`,
      body: fillerHtmlBody,
    })
    if (!fillerResult.success) {
      console.error('[sendPatientWelcomeEmail] Failed to send filler email:', fillerResult.error)
    } else {
      console.log('[sendPatientWelcomeEmail] Filler email sent successfully')
    }
  }

  // Send welcome email to patient with password included
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
        .credentials-box {
          background: #f9f9f9;
          border: 2px solid #5D7A5F;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credentials-box p {
          margin: 10px 0;
          font-size: 16px;
        }
        .credentials-box strong {
          color: #5D7A5F;
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
        .security-note {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
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
          <h2>Your Patient Portal Account is Ready, ${firstName}!</h2>
          ${isFiller && fillerFirstName ? `
          <div class="info-box" style="background: #f9f9f9; border-left: 4px solid #5D7A5F; padding: 20px; margin: 20px 0;">
            <p><strong>Account Created on Your Behalf</strong></p>
            <p>A patient portal account has been created for you by <strong>${fillerFirstName} ${fillerLastName || ''}</strong> (${fillerEmail}) who submitted your application form.</p>
            <p>You can now access your portal using the login credentials below.</p>
          </div>
          ` : `
          <p>We have created your patient portal account. You can now access your portal using the login credentials below.</p>
          `}
          
          <div class="credentials-box">
            <p><strong>Email:</strong> ${patientEmail}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
          </div>
          
          <div class="security-note">
            <strong>🔒 Security Note:</strong> For your security, you will be required to change your password after your first login. You can do this in <strong>Profile → Security</strong> settings, or you'll be prompted to change it immediately after logging in.
          </div>

          <div class="cta-container">
            <a href="${loginUrl}" class="cta-button">Login to Portal</a>
          </div>

          <p>If you have any questions or need assistance, please contact us:</p>
          <p>
            <strong>Phone:</strong> +1 (800) 604-7294<br>
            <strong>Email:</strong> contactus@theibogainstitute.org
          </p>
          
          <p>Welcome to the Iboga Wellness Institute!<br><strong>The Iboga Wellness Institute Team</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `

    console.log('[sendPatientLoginCredentialsEmail] Sending patient login credentials email to:', patientEmail)
  const result = await sendEmailDirect({
    to: patientEmail,
    subject: 'Your Patient Portal Login Credentials | Iboga Wellness Institute',
    body: htmlBody,
  })
  
  if (!result.success) {
    console.error('[sendPatientLoginCredentialsEmail] Failed to send patient email:', result.error)
  } else {
    console.log('[sendPatientLoginCredentialsEmail] Patient email sent successfully')
  }
  
  return result
}

// Helper function to send patient password setup email (kept for backward compatibility)
export async function sendPatientPasswordSetupEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  isFiller: boolean = false,
  fillerEmail?: string,
  fillerFirstName?: string,
  fillerLastName?: string
) {
  console.log('[sendPatientPasswordSetupEmail] Called with:', { patientEmail, firstName, lastName, isFiller, fillerEmail })
  
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  // Get base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const redirectTo = `${baseUrl}/reset-password`

  // Use resetPasswordForEmail - same flow as forgot password
  // This ensures PKCE flow is used properly and links work consistently
  console.log('[sendPatientPasswordSetupEmail] Triggering password reset email via Supabase...')
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(patientEmail, {
    redirectTo,
  })

  if (resetError) {
    console.error('[sendPatientPasswordSetupEmail] Failed to trigger password reset email:', resetError)
  } else {
    console.log('[sendPatientPasswordSetupEmail] Password reset email triggered successfully via Supabase')
  }
  
  // If this is for a filler, also send notification email to filler with the reset link
  if (isFiller && fillerEmail) {
    const fillerHtmlBody = `
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
          .cta-container {
            text-align: center;
            margin: 30px 0;
          }
          .security-note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
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
            word-break: break-all;
            color: #5D7A5F;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Patient Account Created</h2>
            <p>Hello ${fillerFirstName || 'there'},</p>
            <p>We have created a patient portal account for <strong>${firstName} ${lastName}</strong> based on the application form you submitted.</p>
            <div class="info-box">
              <p><strong>Account Information:</strong></p>
              <p><strong>Patient Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Account Email:</strong> ${patientEmail}</p>
            </div>
            
            <div class="security-note">
              <strong>📧 Password Setup:</strong> ${firstName} will receive a separate email with a link to set up their password. If they don't receive it within a few minutes, they can use the "Forgot Password" feature on the login page at <a href="${baseUrl}/login">${baseUrl}/login</a>.
            </div>
            
            <p>If you have any questions, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            <p>Thank you for helping ${firstName} take this important step in their wellness journey.</p>
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p>https://theibogainstitute.org</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    console.log('[sendPatientPasswordSetupEmail] Sending filler notification email to:', fillerEmail)
    const fillerResult = await sendEmailDirect({
      to: fillerEmail,
      subject: `Patient Account Created for ${firstName} ${lastName} | Iboga Wellness Institute`,
      body: fillerHtmlBody,
    })
    if (!fillerResult.success) {
      console.error('[sendPatientPasswordSetupEmail] Failed to send filler email:', fillerResult.error)
    } else {
      console.log('[sendPatientPasswordSetupEmail] Filler email sent successfully')
    }
  }

  // Send a custom email to patient with the password reset link included
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
        .security-note {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
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
          word-break: break-all;
          color: #5D7A5F;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>Welcome to Your Patient Portal, ${firstName}!</h2>
          <p>We have created your patient portal account based on your application form submission.</p>
          
          <div class="info-box">
            <p><strong>📧 Next Step - Set Up Your Password:</strong></p>
            <p>You will receive a separate email shortly with a link to set up your password. Please check your inbox (and spam folder) for an email with the subject "Reset Your Password".</p>
          </div>
          
          <div class="security-note">
            <strong>🔒 Didn't receive the password email?</strong> If you don't receive it within a few minutes, you can request a new one using the "Forgot Password" link on the login page at <a href="${baseUrl}/login">${baseUrl}/login</a>.
          </div>

          <p>If you have any questions or need assistance, please contact us:</p>
          <p>
            <strong>Phone:</strong> +1 (800) 604-7294<br>
            <strong>Email:</strong> contactus@theibogainstitute.org
          </p>
          
          <p>Welcome to the Iboga Wellness Institute!<br><strong>The Iboga Wellness Institute Team</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `

  console.log('[sendPatientPasswordSetupEmail] Sending patient welcome email to:', patientEmail)
  const result = await sendEmailDirect({
    to: patientEmail,
    subject: 'Welcome to Your Patient Portal | Iboga Wellness Institute',
    body: htmlBody,
  })
  
  if (!result.success) {
    console.error('[sendPatientPasswordSetupEmail] Failed to send patient email:', result.error)
  } else {
    console.log('[sendPatientPasswordSetupEmail] Patient email sent successfully')
  }
  
  return result
}

// Helper function to send medical history form email
export async function sendMedicalHistoryFormEmail(
  recipientEmail: string,
  recipientName: string,
  patientFirstName: string | null,
  patientLastName: string | null,
  formLink: string,
  filledBy: 'self' | 'someone_else',
  fillerFirstName?: string | null,
  fillerLastName?: string | null
) {
  const isSelf = filledBy === 'self'
  const patientName = patientFirstName && patientLastName 
    ? `${patientFirstName} ${patientLastName}` 
    : 'the patient'
  
  const greeting = isSelf 
    ? `Hello ${recipientName},`
    : `Hello ${recipientName},`
  
  const introText = isSelf
    ? `We need you to complete your Medical Health History form for your treatment at Iboga Wellness Institute.`
    : `We need you to complete the Medical Health History form for ${patientName} at Iboga Wellness Institute.`
  
  const subject = isSelf
    ? `Complete Your Medical Health History Form - ${patientName} | Iboga Wellness Institute`
    : `Complete Medical Health History Form for ${patientName} | Iboga Wellness Institute`
  
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
          <h2>Complete Your Medical Health History Form</h2>
          <p>${greeting}</p>
          <p>${introText}</p>
          
          <div class="info-box">
            <p><strong>Patient Information:</strong></p>
            <p>Name: ${patientName}</p>
            <p>Email: ${recipientEmail}</p>
            <p>Please complete the Medical Health History form with all required health information.</p>
          </div>
          
          <div class="cta-container">
            <a href="${formLink}" class="cta-button">Complete Medical Health History Form</a>
          </div>
          
          <p class="link-fallback">If the button doesn't work, copy and paste this link into your browser:<br>${formLink}</p>
          
          <p><strong>Important:</strong> This form is required for your treatment preparation. Please complete it as soon as possible.</p>
          
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

// Helper function to send service agreement form email
export async function sendServiceAgreementFormEmail(
  recipientEmail: string,
  recipientName: string,
  patientFirstName: string | null,
  patientLastName: string | null,
  formLink: string,
  filledBy: 'self' | 'someone_else',
  fillerFirstName?: string | null,
  fillerLastName?: string | null
) {
  const isSelf = filledBy === 'self'
  const patientName = patientFirstName && patientLastName 
    ? `${patientFirstName} ${patientLastName}` 
    : 'the patient'
  
  const greeting = isSelf 
    ? `Hello ${recipientName},`
    : `Hello ${recipientName},`
  
  const introText = isSelf
    ? `We need you to review and sign the Service Agreement for your treatment at Iboga Wellness Institute.`
    : `We need you to review and sign the Service Agreement for ${patientName} at Iboga Wellness Institute.`
  
  const subject = isSelf
    ? `Review and Sign Service Agreement - ${patientName} | Iboga Wellness Institute`
    : `Review and Sign Service Agreement for ${patientName} | Iboga Wellness Institute`
  
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
          <h2>Review and Sign Service Agreement</h2>
          <p>${greeting}</p>
          <p>${introText}</p>
          
          <div class="info-box">
            <p><strong>Patient Information:</strong></p>
            <p>Name: ${patientName}</p>
            <p>Email: ${recipientEmail}</p>
            <p>Please review the service agreement carefully and sign it to proceed with your treatment.</p>
          </div>
          
          <div class="cta-container">
            <a href="${formLink}" class="cta-button">Review and Sign Service Agreement</a>
          </div>
          
          <p class="link-fallback">If the button doesn't work, copy and paste this link into your browser:<br>${formLink}</p>
          
          <p><strong>Important:</strong> This agreement must be signed before treatment can begin. Please review and sign it as soon as possible.</p>
          
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


// Helper function to send ibogaine consent form email
export async function sendIbogaineConsentFormEmail(
  recipientEmail: string,
  recipientName: string,
  patientFirstName: string | null,
  patientLastName: string | null,
  formLink: string,
  filledBy: 'self' | 'someone_else',
  fillerFirstName?: string | null,
  fillerLastName?: string | null
) {
  const isSelf = filledBy === 'self'
  const patientName = patientFirstName && patientLastName 
    ? `${patientFirstName} ${patientLastName}` 
    : 'the patient'
  
  const greeting = isSelf 
    ? `Hello ${recipientName},`
    : `Hello ${recipientName},`
  
  const introText = isSelf
    ? `We need you to complete the Ibogaine Therapy Consent Form for your treatment at Iboga Wellness Institute.`
    : `We need you to complete the Ibogaine Therapy Consent Form for ${patientName} at Iboga Wellness Institute.`
  
  const subject = isSelf
    ? `Complete Your Ibogaine Therapy Consent Form - ${patientName} | Iboga Wellness Institute`
    : `Complete Ibogaine Therapy Consent Form for ${patientName} | Iboga Wellness Institute`
  
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
        .footer {
          background: #f5f5f5;
          padding: 30px;
          text-align: center;
          color: #777;
          font-size: 14px;
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
          <h2>Ibogaine Therapy Consent Form</h2>
          
          <p>${greeting}</p>
          
          <p>${introText}</p>
          
          <div class="info-box">
            <p><strong>What you need to do:</strong></p>
            <ul>
              <li>Review the consent form carefully</li>
              <li>Check all required consent checkboxes</li>
              <li>Sign the form electronically</li>
              <li>Submit the completed form</li>
            </ul>
          </div>
          
          <p>Click the button below to access and complete your consent form:</p>
          
          <div style="text-align: center;">
            <a href="${formLink}" class="cta-button">Complete Consent Form</a>
          </div>
          
          <p><strong>Important:</strong> This consent form must be completed before treatment can begin. Please complete it as soon as possible.</p>
          
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

// Helper function to send patient login reminder email
export async function sendPatientLoginReminderEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  password: string
) {
  return sendEmailTemplate('patient_login_reminder', {
    to: patientEmail,
    firstName,
    lastName,
    password,
  })
}

// Helper function to send filler reminder email (when someone else filled the form)
export async function sendFillerLoginReminderEmail(
  fillerEmail: string,
  fillerFirstName: string,
  fillerLastName: string,
  patientFirstName: string,
  patientLastName: string,
  patientEmail: string,
  patientPassword: string
) {
  return sendEmailTemplate('filler_login_reminder', {
    to: fillerEmail,
    firstName: fillerFirstName,
    lastName: fillerLastName,
    patientFirstName,
    patientLastName,
    patientEmail,
    password: patientPassword,
  })
}

// Helper function to send form activation email
export async function sendFormActivationEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  formType: 'service_agreement' | 'ibogaine_consent',
  formName: string
) {
  return sendEmailTemplate('form_activation', {
    to: patientEmail,
    firstName,
    lastName,
    formType,
    formName,
  })
}

// Helper function to send form activation reminder email (48-hour reminder)
export async function sendFormActivationReminderEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  formType: 'service_agreement' | 'ibogaine_consent',
  formName: string
) {
  return sendEmailTemplate('form_activation_reminder', {
    to: patientEmail,
    firstName,
    lastName,
    formType,
    formName,
  })
}

// Helper function to send medical history form completion confirmation email
export async function sendMedicalHistoryConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
) {
  console.log('[sendMedicalHistoryConfirmationEmail] Sending medical history confirmation email to:', email)
  const result = await sendEmailTemplate('medical_history_confirmation', {
    to: email,
    firstName,
    lastName,
    patientFirstName,
    patientLastName,
  })
  
  if (!result.success) {
    console.error('[sendMedicalHistoryConfirmationEmail] Failed to send email:', result.error)
  } else {
    console.log('[sendMedicalHistoryConfirmationEmail] Email sent successfully')
  }
  
  return result
}

// Helper function to send service agreement form completion confirmation email
export async function sendServiceAgreementConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
) {
  console.log('[sendServiceAgreementConfirmationEmail] Sending service agreement confirmation email to:', email)
  const result = await sendEmailTemplate('service_agreement_confirmation', {
    to: email,
    firstName,
    lastName,
    patientFirstName,
    patientLastName,
  })
  
  if (!result.success) {
    console.error('[sendServiceAgreementConfirmationEmail] Failed to send email:', result.error)
  } else {
    console.log('[sendServiceAgreementConfirmationEmail] Email sent successfully')
  }
  
  return result
}

// Helper function to send ibogaine consent form completion confirmation email
export async function sendIbogaineConsentConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
) {
  console.log('[sendIbogaineConsentConfirmationEmail] Sending ibogaine consent confirmation email to:', email)
  const result = await sendEmailTemplate('ibogaine_consent_confirmation', {
    to: email,
    firstName,
    lastName,
    patientFirstName,
    patientLastName,
  })
  
  if (!result.success) {
    console.error('[sendIbogaineConsentConfirmationEmail] Failed to send email:', result.error)
  } else {
    console.log('[sendIbogaineConsentConfirmationEmail] Email sent successfully')
  }

  return result
}

// Helper function to send onboarding forms email (via send-email-template edge function; from contactus)
export async function sendOnboardingFormsEmail(
  recipientEmail: string,
  recipientFirstName: string,
  recipientLastName: string,
  onboardingId: string
) {
  const result = await sendEmailTemplate('onboarding_forms', {
    to: recipientEmail,
    firstName: recipientFirstName,
    lastName: recipientLastName,
    onboardingId,
  })
  if (!result.success) {
    console.error('[sendOnboardingFormsEmail] Failed to send:', result.error)
  }
  return result
}

/** Send "Request Labs" email to client (patient). */
export async function sendRequestLabsEmail(
  patientEmail: string,
  firstName: string,
  lastName: string
) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'there'
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #5D7A5F; color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 400; }
        .content { padding: 40px 30px; background: white; }
        .content h2 { color: #5D7A5F; font-size: 24px; margin-top: 0; }
        .content p { font-size: 16px; color: #555; margin-bottom: 20px; }
        .footer { padding: 30px; text-align: center; font-size: 14px; color: #888; background: #f9f9f9; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Iboga Wellness Institute</h1></div>
        <div class="content">
          <h2>Lab Work Request</h2>
          <p>Hello ${displayName},</p>
          <p>Our team is requesting that you complete the required lab work. Please log in to the client portal and complete this task at your earliest convenience.</p>
          <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `
  const result = await sendEmailDirect({
    to: patientEmail,
    subject: 'Lab Work Request | Iboga Wellness Institute',
    body: emailHtml,
  })
  if (!result.success) {
    console.error('[sendRequestLabsEmail] Failed to send:', result.error)
  }
  return result
}
