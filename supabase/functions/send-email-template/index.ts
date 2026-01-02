import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailTemplateRequest {
  type: string
  // Common fields
  to: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  role?: string
  formLink?: string
  formName?: string
  patientFirstName?: string
  patientLastName?: string
  patientEmail?: string
  fillerEmail?: string
  fillerFirstName?: string
  fillerLastName?: string
  filledBy?: 'self' | 'someone_else'
  formType?: 'service_agreement' | 'ibogaine_consent' | 'medical_history' | 'intake'
  intakeFormId?: string
  partialFormId?: string
  mode?: 'minimal' | 'partial'
  recipientEmail?: string
  recipientName?: string
  schedulingLink?: string
  // Add other fields as needed
}

// Get new access token using refresh token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID')
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET')
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken!,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  }

  return data.access_token
}

// Base64 URL encode for Gmail API
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const base64 = btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Send email via Gmail API
async function sendGmailEmail(accessToken: string, to: string, subject: string, body: string) {
  const fromEmail = Deno.env.get('GMAIL_FROM_EMAIL')

  const emailContent = [
    `From: Iboga Wellness Institute <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].join('\r\n')

  const encodedEmail = base64UrlEncode(emailContent)

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gmail API error: ${error}`)
  }

  return await response.json()
}

// Get base URL
function getBaseUrl(): string {
  return Deno.env.get('PORTAL_URL') || 'https://portal.theibogainstitute.org'
}

// Common email styles
const commonStyles = `
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
`

// Email template generators
function generateInquiryConfirmationEmail(firstName: string): { subject: string; body: string } {
  return {
    subject: 'Thank you for your inquiry - Iboga Wellness Institute',
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .content { padding: 20px; background: #f9f9f9; }
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
    `,
  }
}

function generateEmployeeWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  role: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const loginUrl = `${baseUrl}/login`
  const roleDisplayName = role.charAt(0).toUpperCase() + role.slice(1)

  return {
    subject: 'Welcome to Iboga Wellness Institute - Your Portal Access',
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
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
    `,
  }
}

function generatePatientLoginReminderEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  password: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const loginUrl = `${baseUrl}/login`
  const forgotPasswordUrl = `${baseUrl}/forgot-password`

  return {
    subject: 'Reminder: Please Login and Change Your Password | Iboga Wellness Institute',
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .reminder-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Reminder: Please Login and Change Your Password, ${firstName}!</h2>
            
            <div class="reminder-box">
              <p><strong>⏰ Action Required</strong></p>
              <p>We noticed you haven't logged into your patient portal yet or haven't changed your temporary password. Please complete this important step to access your account and complete your tasks.</p>
            </div>
            
            <div class="credentials-box">
              <p><strong>Email:</strong> ${patientEmail}</p>
              <p><strong>Temporary Password:</strong> ${password}</p>
            </div>
            
            <div class="security-note">
              <strong>🔒 Security Note:</strong> For your security, you will be required to change your password after your first login. You can do this in <strong>Profile → Security</strong> settings, or you'll be prompted to change it immediately after logging in.
            </div>
            
            <p>To get started, please:</p>
            <ol style="color: #555; line-height: 2;">
              <li><strong>Login to your portal</strong> using your email and the temporary password above</li>
              <li><strong>Change your password</strong> (you'll be prompted automatically after login)</li>
              <li><strong>Complete your tasks</strong> in the patient dashboard</li>
            </ol>
            
            <div class="cta-container">
              <a href="${loginUrl}" class="cta-button">Login to Portal</a>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${forgotPasswordUrl}" style="color: #5D7A5F; text-decoration: underline;">Forgot your password? Reset it here</a>
            </p>
            
            <p>If you have any questions or need assistance, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>We look forward to helping you on your wellness journey!</p>
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateFillerLoginReminderEmail(
  fillerEmail: string,
  fillerFirstName: string,
  fillerLastName: string,
  patientFirstName: string,
  patientLastName: string,
  patientEmail: string,
  patientPassword: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const loginUrl = `${baseUrl}/login`

  return {
    subject: `Reminder: Help ${patientFirstName} ${patientLastName} Complete Portal Setup | Iboga Wellness Institute`,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .reminder-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
          }
          .credentials-box {
            background: #f9f9f9;
            border: 2px solid #5D7A5F;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Reminder: Help ${patientFirstName} Complete Portal Setup, ${fillerFirstName}!</h2>
            
            <div class="reminder-box">
              <p><strong>⏰ Action Required</strong></p>
              <p>You previously filled out the application form for <strong>${patientFirstName} ${patientLastName}</strong>. They haven't logged into their patient portal yet. Please help them complete this important step.</p>
            </div>
            
            <div class="credentials-box">
              <p><strong>Patient Email:</strong> ${patientEmail}</p>
              <p><strong>Temporary Password:</strong> ${patientPassword}</p>
            </div>
            
            <p>Please share these login credentials with ${patientFirstName} so they can:</p>
            <ol style="color: #555; line-height: 2;">
              <li>Login to their patient portal</li>
              <li>Change their password</li>
              <li>Complete their required tasks</li>
            </ol>
            
            <div class="cta-container">
              <a href="${loginUrl}" class="cta-button">Go to Login Page</a>
            </div>
            
            <p>If you have any questions, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateFormActivationEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  formType: string,
  formName: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const formLink = `${baseUrl}/patient/tasks`

  return {
    subject: `Your ${formName} Form is Now Available | Iboga Wellness Institute`,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .info-box {
            background: #f0f7f0;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Your ${formName} Form is Now Available, ${firstName}!</h2>
            
            <div class="info-box">
              <p><strong>✅ Form Activated</strong></p>
              <p>Your ${formName} form has been activated and is now available for you to complete in your patient portal.</p>
            </div>
            
            <p>Please log in to your patient portal and complete the ${formName} form as soon as possible. This is an important step in your treatment preparation.</p>
            
            <div class="cta-container">
              <a href="${formLink}" class="cta-button">Go to Patient Portal</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>We look forward to continuing your wellness journey!</p>
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateFormActivationReminderEmail(
  patientEmail: string,
  firstName: string,
  lastName: string,
  formType: string,
  formName: string
): { subject: string; body: string } {
  const baseUrl = getBaseUrl()
  const formLink = `${baseUrl}/patient/tasks`

  return {
    subject: `Reminder: Complete Your ${formName} Form | Iboga Wellness Institute`,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .reminder-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Reminder: Complete Your ${formName} Form, ${firstName}!</h2>
            
            <div class="reminder-box">
              <p><strong>⏰ Action Required</strong></p>
              <p>Your ${formName} form has been activated for 48 hours, but we haven't received your submission yet. Please complete it as soon as possible.</p>
            </div>
            
            <p>To complete your ${formName} form:</p>
            <ol style="color: #555; line-height: 2;">
              <li><strong>Go to your Tasks page</strong></li>
              <li><strong>Click "Start" on the ${formName} task</strong></li>
              <li><strong>Complete and submit the form</strong></li>
            </ol>
            
            <div class="cta-container">
              <a href="${formLink}" class="cta-button">Go to Patient Portal</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>We look forward to continuing your wellness journey!</p>
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateMedicalHistoryConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
): { subject: string; body: string } {
  const isFiller = !!(patientFirstName && patientLastName)
  const displayName = `${firstName} ${lastName}`.trim()
  const patientName = isFiller ? `${patientFirstName} ${patientLastName}`.trim() : displayName

  return {
    subject: isFiller
      ? `Medical History Form Completed for ${patientName} | Iboga Wellness Institute`
      : `Thank You for Completing Your Medical History Form | Iboga Wellness Institute`,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .info-box {
            background: #f9f9f9;
            border-left: 4px solid #5D7A5F;
            padding: 20px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Thank You for Completing Your Medical History Form</h2>
            ${isFiller
        ? `
            <p>Hello ${displayName},</p>
            <div class="info-box">
              <p><strong>Form Completed on Behalf of Patient</strong></p>
              <p>You have successfully completed the medical history form for <strong>${patientName}</strong>.</p>
            </div>
            `
        : `
            <p>Hello ${displayName},</p>
            <p>Thank you for taking the time to complete your medical history form.</p>
            `}
            
            <p>Our medical team will review your health history information and will let you know if we need any further health-related details.</p>
            
            <p>If you have any questions or need to update your medical information, please don't hesitate to contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>We appreciate your cooperation in helping us provide you with the best possible care.</p>
            
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateServiceAgreementConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
): { subject: string; body: string } {
  const isFiller = !!(patientFirstName && patientLastName)
  const displayName = `${firstName} ${lastName}`.trim()
  const patientName = isFiller ? `${patientFirstName} ${patientLastName}`.trim() : displayName

  return {
    subject: isFiller
      ? `Service Agreement Completed for ${patientName} | Iboga Wellness Institute`
      : `Thank You for Completing Your Service Agreement | Iboga Wellness Institute`,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .info-box {
            background: #f9f9f9;
            border-left: 4px solid #5D7A5F;
            padding: 20px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Thank You for Completing Your Service Agreement</h2>
            ${isFiller
        ? `
            <p>Hello ${displayName},</p>
            <div class="info-box">
              <p><strong>Form Completed on Behalf of Patient</strong></p>
              <p>You have successfully completed the service agreement form for <strong>${patientName}</strong>.</p>
            </div>
            `
        : `
            <p>Hello ${displayName},</p>
            <p>Thank you for taking the time to complete your service agreement form.</p>
            `}
            
            <p>Our team will review your service agreement and will let you know if we need any further details.</p>
            
            <p>If you have any questions or need to update your service agreement information, please don't hesitate to contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>We appreciate your cooperation and look forward to providing you with exceptional care.</p>
            
            <p>Best regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

function generateIbogaineConsentConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  patientFirstName?: string,
  patientLastName?: string
): { subject: string; body: string } {
  const isFiller = !!(patientFirstName && patientLastName)
  const displayName = `${firstName} ${lastName}`.trim()
  const patientName = isFiller ? `${patientFirstName} ${patientLastName}`.trim() : displayName

  return {
    subject: isFiller
      ? `Ibogaine Consent Form Completed for ${patientName} | Iboga Wellness Institute`
      : `Thank You for Completing Your Ibogaine Consent Form | Iboga Wellness Institute`,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .info-box {
            background: #f9f9f9;
            border-left: 4px solid #5D7A5F;
            padding: 20px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Thank You for Completing Your Ibogaine Consent Form</h2>
            ${isFiller
        ? `
            <p>Hello ${displayName},</p>
            <div class="info-box">
              <p><strong>Form Completed on Behalf of Patient</strong></p>
              <p>You have successfully completed the Ibogaine Therapy Consent Form for <strong>${patientName}</strong>.</p>
            </div>
            `
        : `
            <p>Hello ${displayName},</p>
            <p>Thank you for taking the time to complete your Ibogaine Therapy Consent Form.</p>
            `}
            
            <p>Our team will review your consent form and will let you know if we need any further details.</p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Warm regards,<br>The Iboga Wellness Institute Team</p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p>https://theibogainstitute.org</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

// Main serve function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request = await req.json() as EmailTemplateRequest

    if (!request.type || !request.to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: type, to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let emailContent: { subject: string; body: string }

    // Route to appropriate template based on type
    switch (request.type) {
      case 'inquiry_confirmation':
        emailContent = generateInquiryConfirmationEmail(request.firstName || 'there')
        break

      case 'employee_welcome':
        if (!request.password || !request.role) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields for employee_welcome: password, role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateEmployeeWelcomeEmail(
          request.to,
          request.firstName || '',
          request.lastName || '',
          request.password,
          request.role
        )
        break

      case 'patient_login_reminder':
        if (!request.password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: password' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generatePatientLoginReminderEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.password
        )
        break

      case 'filler_login_reminder':
        if (!request.patientEmail || !request.patientFirstName || !request.password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields for filler_login_reminder' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateFillerLoginReminderEmail(
          request.to,
          request.firstName || 'there',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName || '',
          request.patientEmail,
          request.password
        )
        break

      case 'form_activation':
        if (!request.formName || !request.formType) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields: formName, formType' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateFormActivationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.formType,
          request.formName
        )
        break

      case 'form_activation_reminder':
        if (!request.formName || !request.formType) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields: formName, formType' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        emailContent = generateFormActivationReminderEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.formType,
          request.formName
        )
        break

      case 'medical_history_confirmation':
        emailContent = generateMedicalHistoryConfirmationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName
        )
        break

      case 'service_agreement_confirmation':
        emailContent = generateServiceAgreementConfirmationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName
        )
        break

      case 'ibogaine_consent_confirmation':
        emailContent = generateIbogaineConsentConfirmationEmail(
          request.to,
          request.firstName || 'Patient',
          request.lastName || '',
          request.patientFirstName,
          request.patientLastName
        )
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Invalid email type: ${request.type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Get access token and send email directly via Gmail API
    const accessToken = await getAccessToken()
    const result = await sendGmailEmail(accessToken, request.to, emailContent.subject, emailContent.body)

    console.log('[send-email-template] Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-email-template] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

