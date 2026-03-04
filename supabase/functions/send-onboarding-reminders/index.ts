// Supabase Edge Function to send daily reminders for incomplete onboarding steps
// 3 forms only (Release, Outing Consent, Internal Regulations). Also reminds re: EKG/bloodwork and Clinical Director call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAISY_CALENDAR_LINK = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0cMnBbm_aBy3dpuD0i5OCegv_FYMNskCyHkVgD8qHc4Enl99atTmXmyrpHcqVTML19PzmgEAl-?gv=true'
const ONBOARDING_FORMS_TOTAL = 3

interface OnboardingRow {
  id: string
  patient_id: string | null
  first_name: string
  last_name: string
  email: string
  release_form_completed: boolean
  outing_consent_completed: boolean
  internal_regulations_completed: boolean
  consult_scheduled_at: string | null
  ekg_skipped: boolean | null
  bloodwork_skipped: boolean | null
  last_reminder_sent_at: string | null
  reminder_count: number
}

/** Build reminder email HTML matching application confirmation design (Instrument Serif, Inter, banner, CTA box, footer). */
function buildReminderEmailHtml(params: {
  firstName: string
  formsLink: string
  tasksLink: string
  incompleteForms: string[]
  completedFormsCount: number
  needEkgBloodwork: boolean
  needConsult: boolean
}): string {
  const { firstName, formsLink, tasksLink, incompleteForms, completedFormsCount, needEkgBloodwork, needConsult } = params
  const displayName = firstName || 'there'
  const pendingCount = incompleteForms.length
  const formsLabel = pendingCount === 1 ? '1 form' : `${pendingCount} forms`

  const items: string[] = []
  if (incompleteForms.length > 0) {
    items.push(`<li style="margin-bottom:6px">Complete your ${formsLabel} remaining (${completedFormsCount}/${ONBOARDING_FORMS_TOTAL} done): ${incompleteForms.join(', ')}</li>`)
  }
  if (needEkgBloodwork) {
    items.push('<li style="margin-bottom:6px">Upload EKG and bloodwork results (or skip for now in Tasks) - required before we can assign your treatment date</li>')
  }
  if (needConsult) {
    items.push('<li style="margin-bottom:6px">Schedule your call with the Clinical Director (Daisy) to review your preparation</li>')
  }
  const itemsHtml = items.length ? `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:150%;color:#535065">${items.join('')}</ul>` : ''

  let ctaHtml = ''
  if (incompleteForms.length > 0) {
    ctaHtml += `<tr><td align="center" valign="top" style="padding:12px 0;text-align:center"><a href="${formsLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Complete Your 3 Forms</a></td></tr>`
  }
  if (needConsult) {
    ctaHtml += `<tr><td align="center" valign="top" style="padding:12px 0 0;text-align:center"><a href="${DAISY_CALENDAR_LINK}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Schedule Call with Daisy</a></td></tr>`
  }
  if (needEkgBloodwork && incompleteForms.length === 0 && !needConsult) {
    ctaHtml += `<tr><td align="center" valign="top" style="padding:12px 0;text-align:center"><a href="${tasksLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Go to Tasks & Documents</a></td></tr>`
  } else if (needEkgBloodwork) {
    ctaHtml += `<tr><td align="center" valign="top" style="padding:12px 0 0;text-align:center"><a href="${tasksLink}" target="_blank" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Go to Tasks & Documents</a></td></tr>`
  }

  return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Onboarding Reminder | The Iboga Wellness Institute</title>
<link href="https://fonts.googleapis.com/css?family=Instrument+Serif:ital,wght@0,400" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,400;0,500;0,600" rel="stylesheet" />
<style>
body{margin:0;padding:0;background:#ece9df;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;} table{border-collapse:collapse;}
.banner-heading{font-family:'Instrument Serif',Georgia,serif;}
@media (max-width:620px){ table[role="presentation"]{max-width:100% !important;} .email-banner-title{font-size:36px !important;line-height:1.2 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ece9df" bgcolor="#ece9df">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ece9df" bgcolor="#ece9df">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:0 0 15px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background-image:url('https://postcards-cdn.designmodo.com/images-cdn/Iboga_wellness_institute_email_banner.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:40px 48px;border-radius:10px;background-color:#036243" bgcolor="#036243">
<table role="presentation" width="100%"><tr><td align="left" valign="middle">
<img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="140" height="39" alt="" style="display:block;border:0" />
</td></tr>
<tr><td style="padding-top:20px">
<div class="banner-heading email-banner-title" style="font-family:'Instrument Serif',Georgia,serif;font-size:50px;line-height:130%;color:#fff;letter-spacing:-0.03em">Onboarding Reminder</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:10px 10px 0 0" bgcolor="#ffffff">
<tr><td style="padding:48px">
<p style="margin:0 0 15px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Hello, ${displayName}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:150%;color:#141414;font-weight:500">This is a friendly reminder to complete your onboarding steps before your treatment at Iboga Wellness Institute.${incompleteForms.length > 0 ? ` You have completed ${completedFormsCount} of ${ONBOARDING_FORMS_TOTAL} forms; ${pendingCount} ${pendingCount === 1 ? 'form is' : 'forms are'} still pending.` : ''}</p>
<table role="presentation" width="100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0"><tr><td valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 5px"><p style="margin:0;font-size:19px;line-height:150%;color:#28243d;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif">Still to do</p></td></tr>
<tr><td align="left" valign="top" style="padding:5px 0 12px"><p style="margin:0;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif">Please complete the following when you can:</p></td></tr>
<tr><td align="left" valign="top" style="padding:0 0 12px">${itemsHtml}</td></tr>
${ctaHtml}
</table></td></tr></table>
</td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:20px 0 0"><p style="margin:0 0 8px;font-size:19px;line-height:150%;color:#28243d;font-weight:600">Contact</p>
<p style="margin:0 0 16px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">Questions? Reply to this email or reach Daisy (Clinical Director) directly.</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:16px;line-height:150%;color:rgba(40,36,61,0.8)">
<li style="margin-bottom:0">Phone: +1 (800) 604-7294</li>
<li style="margin-bottom:0">Email: <a href="mailto:daisy@theibogainstitute.org" style="color:inherit;text-decoration:none">daisy@theibogainstitute.org</a></li>
</ul>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:48px;background-color:#6e7a46;border-radius:0" bgcolor="#6e7a46">
<p style="margin:0 0 24px;font-size:21px;line-height:150%;color:#fff;font-weight:600">We look forward to supporting you on your wellness journey.</p>
<p style="margin:0;font-size:16px;line-height:150%;color:#ece9df">Warm regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
</td></tr>
<tr><td style="padding:48px;background-color:#272315;border-radius:0 0 10px 10px" bgcolor="#272315">
<table role="presentation" width="100%"><tr><td align="center" style="padding:0 0 8px"><img src="https://postcards-cdn.designmodo.com/images-cdn/Secondary_Logo_White.png" width="152" height="42" alt="" style="display:block;border:0;margin:0 auto" /></td></tr><tr><td align="center" style="padding:0 0 16px"><p style="margin:0;font-size:14px;line-height:150%;color:rgba(255,255,255,0.9);font-family:'Inter',Arial,sans-serif">The Iboga Wellness Institute</p></td></tr></table>
<table role="presentation" width="100%"><tr><td style="padding:16px 0 24px" align="center"><table role="presentation" width="478" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;max-width:100%"><tr><td style="line-height:1px;font-size:1px;border-bottom:1px solid #ffffff1a">&nbsp;</td></tr></table></td></tr></table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const baseUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://app.ibogawellness.com'

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // All in_progress onboarding (we'll filter by incomplete steps and EKG/consult below)
    const { data: patients, error: fetchError } = await supabase
      .from('patient_onboarding')
      .select('id, patient_id, first_name, last_name, email, release_form_completed, outing_consent_completed, internal_regulations_completed, consult_scheduled_at, ekg_skipped, bloodwork_skipped, last_reminder_sent_at, reminder_count')
      .eq('status', 'in_progress')

    if (fetchError) {
      console.error('Error fetching patients:', fetchError)
      throw fetchError
    }

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No patients in onboarding', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch medical documents (EKG, bloodwork) per onboarding
    const onboardingIds = patients.map((p: { id: string }) => p.id)
    const { data: medicalDocs } = await supabase
      .from('onboarding_medical_documents')
      .select('onboarding_id, document_type')
      .in('onboarding_id', onboardingIds)

    const docsByOnboarding: Record<string, { ekg: boolean; bloodwork: boolean }> = {}
    for (const id of onboardingIds) {
      docsByOnboarding[id] = { ekg: false, bloodwork: false }
    }
    for (const row of medicalDocs || []) {
      const id = (row as { onboarding_id: string; document_type: string }).onboarding_id
      const type = (row as { onboarding_id: string; document_type: string }).document_type
      if (docsByOnboarding[id]) {
        if (type === 'ekg') docsByOnboarding[id].ekg = true
        if (type === 'bloodwork') docsByOnboarding[id].bloodwork = true
      }
    }

    // Exclude prospects
    const prospectIds = new Set<string>()
    const prospectEmails = new Set<string>()
    const patientIds = [...new Set(patients.map((p: OnboardingRow) => p.patient_id).filter(Boolean))] as string[]
    const patientEmails = [...new Set(patients.map((p: { email?: string }) => (p.email || '').trim().toLowerCase()).filter(Boolean))]
    if (patientIds.length > 0) {
      const { data: prospectProfiles } = await supabase.from('profiles').select('id').eq('is_prospect', true).in('id', patientIds)
      prospectProfiles?.forEach((r: { id: string }) => prospectIds.add(r.id))
    }
    if (patientEmails.length > 0) {
      const { data: prospectByEmail } = await supabase.from('profiles').select('email').eq('is_prospect', true).in('email', patientEmails)
      prospectByEmail?.forEach((r: { email: string }) => prospectEmails.add((r.email || '').trim().toLowerCase()))
    }
    const patientsFiltered = patients.filter((p: OnboardingRow) => {
      if (p.patient_id && prospectIds.has(p.patient_id)) return false
      if (p.email && prospectEmails.has((p.email || '').trim().toLowerCase())) return false
      return true
    })

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const patientsToRemind = patientsFiltered.filter((p: OnboardingRow) => {
      if (p.last_reminder_sent_at && new Date(p.last_reminder_sent_at) >= oneDayAgo) return false
      const docs = docsByOnboarding[p.id] ?? { ekg: false, bloodwork: false }
      const ekgComplete = docs.ekg || !!p.ekg_skipped
      const bloodworkComplete = docs.bloodwork || !!p.bloodwork_skipped
      const needEkgBloodwork = !(ekgComplete && bloodworkComplete)
      const needConsult = !p.consult_scheduled_at
      // Treat as completed only when explicitly true (avoid string "false" from DB being truthy in JS)
      const releaseDone = p.release_form_completed === true
      const outingDone = p.outing_consent_completed === true
      const regulationsDone = p.internal_regulations_completed === true
      const incompleteForms: string[] = []
      if (!releaseDone) incompleteForms.push('Release Form')
      if (!outingDone) incompleteForms.push('Outing/Transfer Consent')
      if (!regulationsDone) incompleteForms.push('Internal Regulations')
      const hasSomethingToRemind = incompleteForms.length > 0 || needEkgBloodwork || needConsult
      return hasSomethingToRemind
    })

    if (patientsToRemind.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No patients need reminders', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sentCount = 0
    const errors: string[] = []

    for (const patient of patientsToRemind) {
      const p = patient as OnboardingRow
      const docs = docsByOnboarding[p.id] ?? { ekg: false, bloodwork: false }
      const ekgComplete = docs.ekg || !!p.ekg_skipped
      const bloodworkComplete = docs.bloodwork || !!p.bloodwork_skipped
      const needEkgBloodwork = !(ekgComplete && bloodworkComplete)
      const needConsult = !p.consult_scheduled_at

      // Treat as completed only when explicitly true (avoid string "false" from DB being truthy in JS)
      const releaseDone = p.release_form_completed === true
      const outingDone = p.outing_consent_completed === true
      const regulationsDone = p.internal_regulations_completed === true
      const incompleteForms: string[] = []
      if (!releaseDone) incompleteForms.push('Release Form')
      if (!outingDone) incompleteForms.push('Outing/Transfer Consent')
      if (!regulationsDone) incompleteForms.push('Internal Regulations')

      const formsLink = `${baseUrl}/onboarding-forms/${p.id}`
      const tasksLink = `${baseUrl}/patient/tasks`

      try {
        if (resendApiKey) {
          const completedFormsCount = ONBOARDING_FORMS_TOTAL - incompleteForms.length
          const emailHtml = buildReminderEmailHtml({
            firstName: p.first_name || 'there',
            formsLink,
            tasksLink,
            incompleteForms,
            completedFormsCount,
            needEkgBloodwork,
            needConsult,
          })

          const subjectParts: string[] = []
          if (incompleteForms.length > 0) {
            subjectParts.push(incompleteForms.length === 1 ? '1 form' : `${incompleteForms.length} forms`)
          }
          if (needEkgBloodwork) subjectParts.push('EKG/bloodwork')
          if (needConsult) subjectParts.push('schedule call')
          const subject = `Reminder: ${subjectParts.join(', ')} pending - Iboga Wellness Institute`

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Iboga Wellness <noreply@ibogawellness.com>',
              to: p.email,
              subject,
              html: emailHtml,
            }),
          })

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error(`Failed to send email to ${p.email}:`, errorText)
            errors.push(`${p.email}: ${errorText}`)
            continue
          }
        } else {
          console.log(`[DRY RUN] Would send reminder to ${p.email}: forms=${incompleteForms.length}, needEkgBloodwork=${needEkgBloodwork}, needConsult=${needConsult}`)
        }

        await supabase
          .from('patient_onboarding')
          .update({
            last_reminder_sent_at: now.toISOString(),
            reminder_count: (p.reminder_count || 0) + 1,
          })
          .eq('id', p.id)

        sentCount++
      } catch (emailError) {
        console.error(`Error processing patient ${p.id}:`, emailError)
        errors.push(`${p.email}: ${emailError}`)
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
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
