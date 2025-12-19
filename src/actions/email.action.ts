'use server'

import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

export const sendEmail = actionClient
  .schema(sendEmailSchema)
  .action(async ({ parsedInput }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    try {
      const url = `${supabaseUrl}/functions/v1/send-email`
      console.log('Calling edge function:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to: parsedInput.to,
          subject: parsedInput.subject,
          body: parsedInput.body,
        }),
      })

      const responseText = await response.text()
      console.log('Edge function response:', response.status, responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        return { success: false, error: `Invalid response: ${responseText}` }
      }

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send email' }
      }

      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
    }
  })

// Helper function to send inquiry confirmation email
export async function sendInquiryConfirmationEmail(
  email: string,
  firstName: string
) {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5D7A5F; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>Thank you, ${firstName}!</h2>
          <p>We have received your inquiry and are excited to connect with you.</p>
          <p>Our team will review your information and reach out within 24-48 hours to discuss the next steps in your wellness journey.</p>
          <p>In the meantime, if you have any questions, feel free to reply to this email or call us at <strong>+1 (800) 604-7294</strong>.</p>
          <p>Warm regards,<br>The Iboga Wellness Institute</p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Thank you for your inquiry - Iboga Wellness Institute',
    body: htmlBody,
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
  // Get base URL for login link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const loginUrl = `${baseUrl}/login`

  // Format role name for display
  const roleDisplayName = role.charAt(0).toUpperCase() + role.slice(1)

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
          margin: 30px 0;
        }
        .credentials-box p {
          margin: 10px 0;
          font-size: 15px;
        }
        .credentials-box strong {
          color: #5D7A5F;
          display: inline-block;
          min-width: 100px;
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
        .security-note {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>Welcome to the Team, ${firstName}!</h2>
          <p>Your account has been created for the Iboga Wellness Institute portal. You can now access the system with your role as <strong>${roleDisplayName}</strong>.</p>
          
          <div class="credentials-box">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>

          <div class="security-note">
            <strong>🔒 Security Note:</strong> For your security, please change your password after your first login.
          </div>

          <div class="cta-container">
            <a href="${loginUrl}" class="cta-button">Login to Portal</a>
          </div>

          <p>If you have any questions or need assistance, please contact your administrator.</p>
          
          <p>Welcome aboard!<br>The Iboga Wellness Institute Team</p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Welcome to Iboga Wellness Institute - Your Portal Access',
    body: htmlBody,
  })
}

// Helper function to send patient password setup email
export async function sendPatientPasswordSetupEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  isFiller: boolean = false,
  fillerEmail?: string,
  fillerFirstName?: string,
  fillerLastName?: string
) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  // Get base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const redirectTo = `${baseUrl}/reset-password`

  // Send password reset email to patient email (the account email)
  const { error } = await supabase.auth.resetPasswordForEmail(patientEmail, {
    redirectTo,
  })

  if (error) {
    console.error('Failed to send password setup email:', error)
    return { success: false, error: error.message }
  }
  
  // If this is for a filler, also send notification email to filler
  if (isFiller && fillerEmail) {
    // Send notification to filler (without password reset link)
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
            <p>We have created a patient portal account for <strong>${firstName} ${lastName}</strong> based on the intake form you submitted.</p>
            <div class="info-box">
              <p><strong>Account Information:</strong></p>
              <p><strong>Patient Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Account Email:</strong> ${patientEmail}</p>
              <p><strong>Important:</strong> A password setup email has been sent to ${patientEmail}. Please share this information with ${firstName} so they can access their patient portal.</p>
            </div>
            <p>The patient will receive an email at ${patientEmail} with a link to set up their password. Once they set their password, they can log in to their patient portal.</p>
            <p>If you have any questions, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> james@theibogainstitute.org
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
    
    await sendEmail({
      to: fillerEmail,
      subject: `Patient Account Created for ${firstName} ${lastName} | Iboga Wellness Institute`,
      body: fillerHtmlBody,
    }).catch(console.error)
  }

  // Send a custom email to patient explaining the account creation
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
          <h2>Welcome to Your Patient Portal, ${firstName}!</h2>
          <p>We have created your patient portal account based on your intake form submission.</p>
          <p>To get started, you'll need to set up your password. We've sent you a separate email with a secure link to set your password.</p>
          
          <div class="security-note">
            <strong>🔒 Next Steps:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Check your email for the password setup link</li>
              <li>Click the link to set your password</li>
              <li>Once your password is set, you can log in to your patient portal</li>
            </ul>
          </div>

          <p>If you have any questions or need assistance, please contact us:</p>
          <p>
            <strong>Phone:</strong> +1 (800) 604-7294<br>
            <strong>Email:</strong> james@theibogainstitute.org
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

  return sendEmail({
    to: patientEmail,
    subject: 'Welcome to Your Patient Portal - Set Up Your Password | Iboga Wellness Institute',
    body: htmlBody,
  })
}

