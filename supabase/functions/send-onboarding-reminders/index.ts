// Supabase Edge Function to send daily reminders for incomplete onboarding forms
// This function is triggered by a cron job

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OnboardingPatient {
  id: string
  first_name: string
  last_name: string
  email: string
  release_form_completed: boolean
  outing_consent_completed: boolean
  social_media_release_completed: boolean
  internal_regulations_completed: boolean
  informed_dissent_completed: boolean
  last_reminder_sent_at: string | null
  reminder_count: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all patients in onboarding with incomplete forms
    const { data: patients, error: fetchError } = await supabase
      .from('patient_onboarding')
      .select('*')
      .eq('status', 'in_progress')
      .or('release_form_completed.eq.false,outing_consent_completed.eq.false,social_media_release_completed.eq.false,internal_regulations_completed.eq.false,informed_dissent_completed.eq.false')

    if (fetchError) {
      console.error('Error fetching patients:', fetchError)
      throw fetchError
    }

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No patients need reminders', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Exclude prospects (no reminder emails)
    const prospectIds = new Set<string>()
    const prospectEmails = new Set<string>()
    const patientIds = [...new Set(patients.map((p: { patient_id?: string | null }) => p.patient_id).filter(Boolean))] as string[]
    const patientEmails = [...new Set(patients.map((p: { email?: string }) => (p.email || '').trim().toLowerCase()).filter(Boolean))]
    if (patientIds.length > 0) {
      const { data: prospectProfiles } = await supabase.from('profiles').select('id').eq('is_prospect', true).in('id', patientIds)
      prospectProfiles?.forEach((r: { id: string }) => prospectIds.add(r.id))
    }
    if (patientEmails.length > 0) {
      const { data: prospectByEmail } = await supabase.from('profiles').select('email').eq('is_prospect', true).in('email', patientEmails)
      prospectByEmail?.forEach((r: { email: string }) => prospectEmails.add((r.email || '').trim().toLowerCase()))
    }
    const patientsFiltered = patients.filter((p: { patient_id?: string | null; email?: string }) => {
      if (p.patient_id && prospectIds.has(p.patient_id)) return false
      if (p.email && prospectEmails.has((p.email || '').trim().toLowerCase())) return false
      return true
    })

    // Filter patients who haven't been reminded in the last 24 hours
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const patientsToRemind = patientsFiltered.filter((patient: OnboardingPatient) => {
      if (!patient.last_reminder_sent_at) return true
      const lastReminder = new Date(patient.last_reminder_sent_at)
      return lastReminder < oneDayAgo
    })

    if (patientsToRemind.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'All patients were reminded recently', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sentCount = 0
    const errors: string[] = []
    const baseUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://app.ibogawellness.com'

    for (const patient of patientsToRemind) {
      try {
        // Build list of incomplete forms
        const incompleteForms: string[] = []
        if (!patient.release_form_completed) incompleteForms.push('Release Form')
        if (!patient.outing_consent_completed) incompleteForms.push('Outing/Transfer Consent')
        if (!patient.social_media_release_completed) incompleteForms.push('Social Media Release')
        if (!patient.internal_regulations_completed) incompleteForms.push('Internal Regulations')
        if (!patient.informed_dissent_completed) incompleteForms.push('Letter of Informed Dissent')

        const formsLink = `${baseUrl}/onboarding-forms/${patient.id}`
        const completedCount = 5 - incompleteForms.length

        // Send email using Resend
        if (resendApiKey) {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                .progress { background-color: #e5e7eb; border-radius: 9999px; height: 8px; margin: 10px 0; }
                .progress-bar { background-color: #10B981; border-radius: 9999px; height: 8px; }
                .form-list { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .form-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .form-item:last-child { border-bottom: none; }
                .btn { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Onboarding Forms Reminder</h1>
                </div>
                <div class="content">
                  <p>Hello ${patient.first_name},</p>
                  <p>You have ${incompleteForms.length} onboarding form(s) remaining to complete before your treatment at Iboga Wellness Centers.</p>
                  
                  <div class="progress">
                    <div class="progress-bar" style="width: ${(completedCount / 5) * 100}%"></div>
                  </div>
                  <p style="text-align: center; color: #6b7280; font-size: 14px;">${completedCount}/5 forms completed</p>
                  
                  <div class="form-list">
                    <h3 style="margin-top: 0;">Incomplete Forms:</h3>
                    ${incompleteForms.map(form => `<div class="form-item">❌ ${form}</div>`).join('')}
                  </div>
                  
                  <p>Please complete these forms as soon as possible to ensure a smooth onboarding process.</p>
                  
                  <center>
                    <a href="${formsLink}" class="btn">Complete Your Forms</a>
                  </center>
                  
                  <p style="margin-top: 20px;">If you have any questions, please contact our team.</p>
                  <p>Best regards,<br>Iboga Wellness Centers Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated reminder. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Iboga Wellness <noreply@ibogawellness.com>',
              to: patient.email,
              subject: `Reminder: ${incompleteForms.length} Onboarding Form(s) Pending - Iboga Wellness`,
              html: emailHtml,
            }),
          })

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error(`Failed to send email to ${patient.email}:`, errorText)
            errors.push(`${patient.email}: ${errorText}`)
            continue
          }
        } else {
          console.log(`[DRY RUN] Would send reminder to ${patient.email} for forms: ${incompleteForms.join(', ')}`)
        }

        // Update reminder tracking
        await supabase
          .from('patient_onboarding')
          .update({
            last_reminder_sent_at: now.toISOString(),
            reminder_count: (patient.reminder_count || 0) + 1,
          })
          .eq('id', patient.id)

        sentCount++
      } catch (emailError) {
        console.error(`Error processing patient ${patient.id}:`, emailError)
        errors.push(`${patient.email}: ${emailError}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sentCount} reminder(s)`,
        sent: sentCount,
        total: patientsToRemind.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-onboarding-reminders:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

