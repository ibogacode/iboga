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

// Call send-email-template edge function
async function sendEmailTemplate(
  supabaseUrl: string,
  serviceRoleKey: string,
  type: string,
  params: Record<string, any>
) {
  const url = `${supabaseUrl}/functions/v1/send-email-template`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ type, ...params }),
  })
  return await response.json()
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

    // Find all patients where must_change_password = true
    const { data: patients, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'patient')
      .eq('must_change_password', true)

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
        const patientEmailResult = await sendEmailTemplate(
          supabaseUrl,
          supabaseServiceKey,
          'patient_login_reminder',
          {
            to: patient.email,
            firstName: patient.first_name || 'Patient',
            lastName: patient.last_name || '',
            password: tempPassword,
          }
        )

        if (patientEmailResult?.success) {
          sent++
          console.log(`[send-patient-reminders] ✅ Patient reminder sent to ${patient.email}`)
        } else {
          failed++
          console.error(`[send-patient-reminders] ❌ Failed to send patient reminder:`, patientEmailResult?.error)
        }

        // If form was filled by someone else, also send reminder to filler
        if (intakeForm && intakeForm.filled_by === 'someone_else' && intakeForm.filler_email) {
          try {
            const fillerEmailResult = await sendEmailTemplate(
              supabaseUrl,
              supabaseServiceKey,
              'filler_login_reminder',
              {
                to: intakeForm.filler_email,
                firstName: intakeForm.filler_first_name || 'there',
                lastName: intakeForm.filler_last_name || '',
                patientFirstName: intakeForm.first_name || patient.first_name || 'Patient',
                patientLastName: intakeForm.last_name || patient.last_name || '',
                patientEmail: patient.email,
                password: tempPassword,
              }
            )

            if (fillerEmailResult?.success) {
              sent++
              console.log(`[send-patient-reminders] ✅ Filler reminder sent to ${intakeForm.filler_email}`)
            } else {
              failed++
              console.error(`[send-patient-reminders] ❌ Failed to send filler reminder:`, fillerEmailResult?.error)
            }
          } catch (fillerError) {
            failed++
            console.error(`[send-patient-reminders] ❌ Error sending filler reminder:`, fillerError)
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

