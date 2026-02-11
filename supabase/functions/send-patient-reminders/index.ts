import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate temporary password
function generateTempPassword(): string {
  return `Temp${Math.random().toString(36).slice(-8)}!${Math.random().toString(36).slice(-8)}`
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

// Generate patient login reminder email
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

// Generate filler login reminder email
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
          .patient-info {
            background: #e7f3e7;
            border-left: 4px solid #5D7A5F;
            padding: 15px;
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
            <h2>Reminder: Help ${patientFirstName} ${patientLastName} Complete Portal Setup</h2>
            
            <p>Hello ${fillerFirstName},</p>
            
            <div class="reminder-box">
              <p><strong>⏰ Action Required</strong></p>
              <p>We noticed that ${patientFirstName} ${patientLastName} hasn't logged into their patient portal yet. Since you filled out their intake form, we're reaching out to help them get started.</p>
            </div>
            
            <div class="patient-info">
              <p><strong>Patient Information:</strong></p>
              <p><strong>Name:</strong> ${patientFirstName} ${patientLastName}</p>
              <p><strong>Email:</strong> ${patientEmail}</p>
            </div>
            
            <div class="credentials-box">
              <p><strong>Patient Login Credentials:</strong></p>
              <p><strong>Email:</strong> ${patientEmail}</p>
              <p><strong>Temporary Password:</strong> ${patientPassword}</p>
            </div>
            
            <p>Please share these credentials with ${patientFirstName} so they can:</p>
            <ol style="color: #555; line-height: 2;">
              <li><strong>Login to their portal</strong> using the email and temporary password above</li>
              <li><strong>Change their password</strong> (they'll be prompted automatically after login)</li>
              <li><strong>Complete their remaining tasks</strong> in the patient dashboard</li>
            </ol>
            
            <div class="cta-container">
              <a href="${loginUrl}" class="cta-button">Patient Portal Login</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact us:</p>
            <p>
              <strong>Phone:</strong> +1 (800) 604-7294<br>
              <strong>Email:</strong> contactus@theibogainstitute.org
            </p>
            
            <p>Thank you for helping ${patientFirstName} on their wellness journey!</p>
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('[send-patient-reminders] Starting reminder job...')

    // Find all patients where must_change_password = true (exclude prospects – no reminders)
    const { data: patients, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'patient')
      .eq('must_change_password', true)
      .or('is_prospect.is.null,is_prospect.eq.false')

    if (error) {
      console.error('[send-patient-reminders] Error fetching patients:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!patients || patients.length === 0) {
      console.log('[send-patient-reminders] No patients need reminders')
      return new Response(
        JSON.stringify({ success: true, data: { sent: 0, failed: 0, total: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-patient-reminders] Found ${patients.length} patients needing reminders`)

    // Get Gmail access token once for all emails
    const accessToken = await getAccessToken()

    let sent = 0
    let failed = 0

    for (const patient of patients) {
      try {
        // Generate a new temporary password
        const tempPassword = generateTempPassword()

        // Update the patient's password in Supabase Auth
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          patient.id,
          { password: tempPassword }
        )

        if (passwordError) {
          console.error(`[send-patient-reminders] Error updating password for ${patient.email}:`, passwordError)
          failed++
          continue
        }

        // Check if this patient's intake form was filled by someone else
        const { data: intakeForm, error: intakeError } = await supabase
          .from('patient_intake_forms')
          .select('filled_by, filler_email, filler_first_name, filler_last_name, first_name, last_name, email')
          .eq('email', patient.email)
          .eq('filled_by', 'someone_else')
          .not('filler_email', 'is', null)
          .maybeSingle()

        if (intakeError) {
          console.error(`[send-patient-reminders] Error fetching intake form for ${patient.email}:`, intakeError)
        }

        // Send reminder to patient
        try {
          const patientEmailContent = generatePatientLoginReminderEmail(
            patient.email,
            patient.first_name || 'Patient',
            patient.last_name || '',
            tempPassword
          )

          await sendGmailEmail(
            accessToken,
            patient.email,
            patientEmailContent.subject,
            patientEmailContent.body
          )

          sent++
          console.log(`[send-patient-reminders] ✅ Patient reminder sent to ${patient.email}`)
        } catch (emailError) {
          failed++
          console.error(`[send-patient-reminders] ❌ Failed to send patient reminder to ${patient.email}:`, emailError)
        }

        // If form was filled by someone else, also send reminder to filler
        if (intakeForm && intakeForm.filled_by === 'someone_else' && intakeForm.filler_email) {
          try {
            const fillerEmailContent = generateFillerLoginReminderEmail(
              intakeForm.filler_email,
              intakeForm.filler_first_name || 'there',
              intakeForm.filler_last_name || '',
              intakeForm.first_name || patient.first_name || 'Patient',
              intakeForm.last_name || patient.last_name || '',
              patient.email,
              tempPassword
            )

            await sendGmailEmail(
              accessToken,
              intakeForm.filler_email,
              fillerEmailContent.subject,
              fillerEmailContent.body
            )

            sent++
            console.log(`[send-patient-reminders] ✅ Filler reminder sent to ${intakeForm.filler_email}`)
          } catch (fillerError) {
            failed++
            console.error(`[send-patient-reminders] ❌ Error sending filler reminder to ${intakeForm.filler_email}:`, fillerError)
          }
        }
      } catch (error) {
        failed++
        console.error(`[send-patient-reminders] ❌ Error processing patient ${patient.email}:`, error)
      }
    }

    console.log(`[send-patient-reminders] Completed: ${sent} sent, ${failed} failed, ${patients.length} total`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sent,
          failed,
          total: patients.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-patient-reminders] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
