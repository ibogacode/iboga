import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Generate form activation reminder email
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('[send-form-reminders] Starting form reminder job...')

    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    let sent = 0
    let failed = 0

    // Get access token once for all emails
    const accessToken = await getAccessToken()

    // Get all patients
    const { data: patients, error: patientsError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'patient')
      .not('email', 'is', null)

    if (patientsError) {
      console.error('[send-form-reminders] Error fetching patients:', patientsError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch patients',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!patients || patients.length === 0) {
      console.log('[send-form-reminders] No patients found')
      return new Response(
        JSON.stringify({
          success: true,
          data: { sent: 0, failed: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-form-reminders] Processing ${patients.length} patients`)

    // Process each patient
    for (const patient of patients) {
      const patientEmail = (patient.email || '').trim().toLowerCase()
      if (!patientEmail) continue

      const patientFirstName = patient.first_name || 'Patient'
      const patientLastName = patient.last_name || ''

      // 1. Check for incomplete Application Form (Intake Form)
      const { data: intakeForms } = await supabase
        .from('patient_intake_forms')
        .select('id')
        .ilike('email', patientEmail)
        .limit(1)

      if (!intakeForms || intakeForms.length === 0) {
        // Patient doesn't have an intake form - send reminder
        try {
          const emailContent = generateFormActivationReminderEmail(
            patient.email!,
            patientFirstName,
            patientLastName,
            'intake',
            'Application Form'
          )

          const result = await sendGmailEmail(
            accessToken,
            patient.email!,
            emailContent.subject,
            emailContent.body
          )

          sent++
          console.log(`[send-form-reminders] ✅ Application form reminder sent to ${patient.email}, messageId: ${result.id}`)
        } catch (error) {
          failed++
          console.error(`[send-form-reminders] ❌ Error sending application form reminder to ${patient.email}:`, error)
        }
      }

      // 2. Check for incomplete Medical History Form
      const { data: medicalForms } = await supabase
        .from('medical_history_forms')
        .select('id')
        .ilike('email', patientEmail)
        .limit(1)

      if (!medicalForms || medicalForms.length === 0) {
        // Patient doesn't have a medical history form - send reminder
        try {
          const emailContent = generateFormActivationReminderEmail(
            patient.email!,
            patientFirstName,
            patientLastName,
            'medical_history',
            'Medical Health History'
          )

          const result = await sendGmailEmail(
            accessToken,
            patient.email!,
            emailContent.subject,
            emailContent.body
          )

          sent++
          console.log(`[send-form-reminders] ✅ Medical history reminder sent to ${patient.email}, messageId: ${result.id}`)
        } catch (error) {
          failed++
          console.error(`[send-form-reminders] ❌ Error sending medical history reminder to ${patient.email}:`, error)
        }
      }

      // 3. Check for incomplete Service Agreement (only if activated)
      const { data: serviceAgreements } = await supabase
        .from('service_agreements')
        .select('id, patient_email, patient_first_name, patient_last_name, is_activated, activated_at, patient_signature_name, patient_signature_data')
        .or(`patient_id.eq.${patient.id},patient_email.ilike.${patientEmail}`)
        .eq('is_activated', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (serviceAgreements && serviceAgreements.length > 0) {
        const serviceAgreement = serviceAgreements[0]
        // Check if form is incomplete (no patient signature)
        const isIncomplete = !serviceAgreement.patient_signature_name || 
                            serviceAgreement.patient_signature_name.trim() === '' ||
                            !serviceAgreement.patient_signature_data ||
                            serviceAgreement.patient_signature_data.trim() === ''

        if (isIncomplete) {
          // Only send reminder if activated more than 48 hours ago
          if (serviceAgreement.activated_at) {
            const activatedAt = new Date(serviceAgreement.activated_at)
            if (activatedAt <= fortyEightHoursAgo) {
              try {
                const emailContent = generateFormActivationReminderEmail(
                  serviceAgreement.patient_email || patient.email!,
                  serviceAgreement.patient_first_name || patientFirstName,
                  serviceAgreement.patient_last_name || patientLastName,
                  'service_agreement',
                  'Service Agreement'
                )

                const result = await sendGmailEmail(
                  accessToken,
                  serviceAgreement.patient_email || patient.email!,
                  emailContent.subject,
                  emailContent.body
                )

                sent++
                console.log(`[send-form-reminders] ✅ Service agreement reminder sent to ${serviceAgreement.patient_email || patient.email}, messageId: ${result.id}`)
              } catch (error) {
                failed++
                console.error(`[send-form-reminders] ❌ Error sending service agreement reminder:`, error)
              }
            }
          }
        }
      }

      // 4. Check for incomplete Ibogaine Consent Form (only if activated)
      const { data: ibogaineForms } = await supabase
        .from('ibogaine_consent_forms')
        .select('id, email, first_name, last_name, is_activated, activated_at, signature_data, signature_name')
        .or(`patient_id.eq.${patient.id},email.ilike.${patientEmail}`)
        .eq('is_activated', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (ibogaineForms && ibogaineForms.length > 0) {
        const ibogaineForm = ibogaineForms[0]
        // Check if form is incomplete (no signature data or signature name)
        const isIncomplete = !ibogaineForm.signature_data || 
                            ibogaineForm.signature_data.trim() === '' ||
                            !ibogaineForm.signature_name ||
                            ibogaineForm.signature_name.trim() === ''

        if (isIncomplete) {
          // Only send reminder if activated more than 48 hours ago
          if (ibogaineForm.activated_at) {
            const activatedAt = new Date(ibogaineForm.activated_at)
            if (activatedAt <= fortyEightHoursAgo) {
              try {
                const emailContent = generateFormActivationReminderEmail(
                  ibogaineForm.email || patient.email!,
                  ibogaineForm.first_name || patientFirstName,
                  ibogaineForm.last_name || patientLastName,
                  'ibogaine_consent',
                  'Ibogaine Consent Form'
                )

                const result = await sendGmailEmail(
                  accessToken,
                  ibogaineForm.email || patient.email!,
                  emailContent.subject,
                  emailContent.body
                )

                sent++
                console.log(`[send-form-reminders] ✅ Ibogaine consent reminder sent to ${ibogaineForm.email || patient.email}, messageId: ${result.id}`)
              } catch (error) {
                failed++
                console.error(`[send-form-reminders] ❌ Error sending ibogaine consent reminder:`, error)
              }
            }
          }
        }
      }
    }

    console.log(`[send-form-reminders] Completed: ${sent} sent, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sent,
          failed,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-form-reminders] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

