'use server'

/**
 * Form Automation Helpers
 *
 * This file contains helper functions for automating the patient intake workflow:
 * 1. Service Agreement completion → Auto-activate Ibogaine Consent Form
 * 2. Ibogaine Consent completion → Auto-create Onboarding record & send forms
 */

import { createAdminClient } from '@/lib/supabase/server'
import { sendIbogaineConsentFormEmail, sendOnboardingFormsEmail, sendEmailDirect } from './email.action'
import { revalidatePath } from 'next/cache'

/**
 * Auto-activate and send Ibogaine Consent Form after Service Agreement completion
 *
 * @param intakeFormId - The intake form ID
 * @param patientEmail - Patient's email address
 * @param patientFirstName - Patient's first name
 * @param patientLastName - Patient's last name
 * @param patientId - Optional patient profile ID
 */
export async function autoActivateIbogaineConsent({
  intakeFormId,
  patientEmail,
  patientFirstName,
  patientLastName,
  patientId,
}: {
  intakeFormId: string | null
  patientEmail: string
  patientFirstName: string
  patientLastName: string
  patientId?: string | null
}) {
  try {
    const supabase = createAdminClient()

    // Check if ibogaine consent form already exists
    const normalizedEmail = patientEmail.toLowerCase().trim()
    const { data: existingForm } = await supabase
      .from('ibogaine_consent_forms')
      .select('id, is_activated')
      .or(`patient_id.eq.${patientId || ''},intake_form_id.eq.${intakeFormId || ''},email.ilike.${normalizedEmail}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingForm) {
      // Form exists - just activate it if not already activated
      if (!existingForm.is_activated) {
        const { error: updateError } = await supabase
          .from('ibogaine_consent_forms')
          .update({
            is_activated: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingForm.id)

        if (updateError) {
          console.error('[autoActivateIbogaineConsent] Failed to activate existing form:', updateError)
          return { success: false, error: updateError.message }
        }

        console.log('[autoActivateIbogaineConsent] Activated existing ibogaine consent form:', existingForm.id)
      } else {
        console.log('[autoActivateIbogaineConsent] Ibogaine consent form already activated:', existingForm.id)
      }

      // Send email notification
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://iboga.app'
      const formLink = intakeFormId
        ? `${baseUrl}/patient/ibogaine-consent?intake_form_id=${intakeFormId}`
        : `${baseUrl}/patient/ibogaine-consent`

      await sendIbogaineConsentFormEmail(
        patientEmail,
        `${patientFirstName} ${patientLastName}`.trim(),
        patientFirstName,
        patientLastName,
        formLink,
        'self',
        null,
        null
      )

      return { success: true, formId: existingForm.id, action: 'activated_existing' }
    } else {
      // Get default facilitator_doctor_name from form_defaults
      const { data: defaults } = await supabase
        .from('form_defaults')
        .select('default_values')
        .eq('form_type', 'ibogaine_consent')
        .maybeSingle()

      const facilitatorDoctorName = defaults?.default_values?.facilitator_doctor_name || 'Dr. Omar Calderon'

      // Create new ibogaine consent form
      const { data: newForm, error: insertError } = await supabase
        .from('ibogaine_consent_forms')
        .insert({
          patient_id: patientId || null,
          intake_form_id: intakeFormId || null,
          email: patientEmail,
          first_name: patientFirstName,
          last_name: patientLastName,
          facilitator_doctor_name: facilitatorDoctorName,
          is_activated: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertError || !newForm) {
        console.error('[autoActivateIbogaineConsent] Failed to create new form:', insertError)
        return { success: false, error: insertError?.message || 'Failed to create form' }
      }

      console.log('[autoActivateIbogaineConsent] Created new ibogaine consent form:', newForm.id)

      // Send email notification
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://iboga.app'
      const formLink = intakeFormId
        ? `${baseUrl}/patient/ibogaine-consent?intake_form_id=${intakeFormId}`
        : `${baseUrl}/patient/ibogaine-consent`

      await sendIbogaineConsentFormEmail(
        patientEmail,
        `${patientFirstName} ${patientLastName}`.trim(),
        patientFirstName,
        patientLastName,
        formLink,
        'self',
        null,
        null
      )

      return { success: true, formId: newForm.id, action: 'created_new' }
    }
  } catch (error) {
    console.error('[autoActivateIbogaineConsent] Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Auto-create Onboarding record and send forms after Ibogaine Consent completion
 *
 * @param intakeFormId - The intake form ID
 * @param patientEmail - Patient's email address
 * @param patientFirstName - Patient's first name
 * @param patientLastName - Patient's last name
 * @param patientId - Optional patient profile ID
 */
export async function autoCreateOnboarding({
  intakeFormId,
  patientEmail,
  patientFirstName,
  patientLastName,
  patientId,
}: {
  intakeFormId: string | null
  patientEmail: string
  patientFirstName: string
  patientLastName: string
  patientId?: string | null
}) {
  console.log('[autoCreateOnboarding] Starting automation with params:', {
    intakeFormId,
    patientEmail,
    patientFirstName,
    patientLastName,
    patientId,
  })

  try {
    const supabase = createAdminClient()

    // Check if onboarding record already exists
    const normalizedEmail = patientEmail.toLowerCase().trim()
    console.log('[autoCreateOnboarding] Checking for existing onboarding with email:', normalizedEmail)

    const { data: existingOnboarding } = await supabase
      .from('patient_onboarding')
      .select('id, status')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingOnboarding) {
      console.log('[autoCreateOnboarding] Onboarding already exists for patient:', existingOnboarding.id)
      return { success: true, onboardingId: existingOnboarding.id, action: 'already_exists' }
    }

    console.log('[autoCreateOnboarding] No existing onboarding found, creating new one...')

    // Create onboarding record using RPC function
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('create_onboarding_with_prefill', {
        p_patient_id: patientId || null,
        p_intake_form_id: intakeFormId || null,
        p_email: normalizedEmail,
      })

    if (rpcError) {
      console.error('[autoCreateOnboarding] Failed to create onboarding via RPC:', rpcError)
      return { success: false, error: rpcError.message }
    }

    const onboardingId = rpcResult
    console.log('[autoCreateOnboarding] Created onboarding record:', onboardingId)

    // Send onboarding forms email
    try {
      await sendOnboardingFormsEmail(
        patientEmail,
        patientFirstName,
        patientLastName,
        onboardingId
      )
    } catch (emailError) {
      console.error('[autoCreateOnboarding] Failed to send onboarding email:', emailError)
      // Don't fail the whole operation if email fails
    }

    // Send admin notification that patient moved to onboarding
    const clientName = `${patientFirstName} ${patientLastName}`.trim()
    const adminNotificationBody = `
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
            background: #f0f7f0;
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
            <h2>Patient Automatically Moved to Onboarding</h2>

            <div class="info-box">
              <p><strong>✅ Automatic Onboarding Created</strong></p>
              <p><strong>Client Name:</strong> ${clientName}</p>
              <p><strong>Client Email:</strong> ${patientEmail}</p>
              <p><strong>Status:</strong> Onboarding forms sent to patient</p>
            </div>

            <p>The patient has completed all required intake forms (Intake, Medical History, Service Agreement, and Ibogaine Consent). The system has automatically created an onboarding record and sent the onboarding forms to the patient.</p>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Patient will complete 3 onboarding forms (Release, Outing Consent, Internal Regulations)</li>
              <li>Once all forms are completed, you can assign a treatment date</li>
              <li>After treatment date is assigned, you can move the patient to management</li>
            </ul>

            <p>You can view the onboarding status in the Onboarding section of the portal.</p>

            <p>Best regards,<br><strong>Iboga Wellness Institute System</strong></p>
          </div>
          <div class="footer">
            <p>Iboga Wellness Institute | Cozumel, Mexico</p>
            <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `

    sendEmailDirect({
      to: 'james@theibogainstitute.org',
      subject: `Patient Automatically Moved to Onboarding - ${clientName} | Iboga Wellness Institute`,
      body: adminNotificationBody,
    }).catch((error) => {
      console.error('[autoCreateOnboarding] Failed to send admin notification:', error)
    })

    // Revalidate patient profile and pipeline pages so they show updated onboarding status
    revalidatePath('/patient-pipeline')
    revalidatePath('/onboarding')

    // Try to revalidate patient profile page (if we know patient_id)
    if (patientId) {
      revalidatePath(`/patient-pipeline/patient-profile/${patientId}`)
    }

    return { success: true, onboardingId, action: 'created_new' }
  } catch (error) {
    console.error('[autoCreateOnboarding] Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
