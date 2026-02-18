'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { patientIntakeFormSchema } from '@/lib/validations/patient-intake'
import { headers } from 'next/headers'
import { sendEmailDirect, sendPatientLoginCredentialsEmail } from './email.action'
import { getApplicationConfirmationHtml } from '@/emails/get-application-confirmation-html'
import { getFillerConfirmationHtml } from '@/emails/get-filler-confirmation-html'
import { PROGRAM_BROCHURE_URLS } from '@/lib/program-brochure-urls'

export const submitPatientIntakeForm = actionClient
  .schema(patientIntakeFormSchema)
  .action(async ({ parsedInput }) => {
    // Use admin client (service role) for public form submissions
    // This bypasses RLS and allows inserts from both logged-in and anonymous users
    // Safe because: server-side only, input validated by Zod, service key not exposed
    const supabase = createAdminClient()
    
    // Get IP address and user agent for audit purposes
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    
    // Parse date_of_birth if provided
    let dateOfBirth: Date | null = null
    if (parsedInput.date_of_birth) {
      dateOfBirth = new Date(parsedInput.date_of_birth)
    }
    
    // Check if an intake form already exists for this email (block all duplicates)
    const { data: existingIntakeForm } = await supabase
      .from('patient_intake_forms')
      .select('id, email, first_name, last_name, created_at')
      .eq('email', parsedInput.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (existingIntakeForm) {
      // Only allow if this is completing a partial form (expected flow)
      if (parsedInput.partialFormId) {
        // Verify the partial form matches this email
        const { data: partialForm } = await supabase
          .from('partial_intake_forms')
          .select('id, email')
          .eq('id', parsedInput.partialFormId)
          .eq('email', parsedInput.email)
          .maybeSingle()
        
        if (!partialForm) {
          return { 
            success: false, 
            error: `The form link does not match the email address provided. Please use the correct form link sent to ${parsedInput.email}.` 
          }
        }
        // Allow completion of partial form even if intake form exists (they're linked)
      } else {
        // Block duplicate direct applications
        return { 
          success: false, 
          error: `Application already exists for this email address (${parsedInput.email}). If you need to submit a new application, please contact us at contactus@theibogainstitute.org or call +1 (800) 604-7294.` 
        }
      }
    }
    
    // Insert form submission
    const { data, error } = await supabase
      .from('patient_intake_forms')
      .insert({
        filled_by: parsedInput.filled_by,
        filler_relationship: parsedInput.filler_relationship || null,
        filler_first_name: parsedInput.filler_first_name || null,
        filler_last_name: parsedInput.filler_last_name || null,
        filler_email: parsedInput.filler_email || null,
        filler_phone: parsedInput.filler_phone || null,
        program_type: parsedInput.program_type,
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        email: parsedInput.email,
        phone_number: parsedInput.phone_number,
        date_of_birth: dateOfBirth,
        gender: parsedInput.gender,
        address_line_1: parsedInput.address_line_1,
        address_line_2: parsedInput.address_line_2 || null,
        city: parsedInput.city,
        zip_code: parsedInput.zip_code,
        country: parsedInput.country,
        // Keep old address field for backward compatibility (migrate from address_line_1)
        address: parsedInput.address_line_1,
        emergency_contact_first_name: parsedInput.emergency_contact_first_name,
        emergency_contact_last_name: parsedInput.emergency_contact_last_name,
        emergency_contact_email: parsedInput.emergency_contact_email,
        emergency_contact_phone: parsedInput.emergency_contact_phone,
        emergency_contact_address: parsedInput.emergency_contact_address,
        emergency_contact_relationship: parsedInput.emergency_contact_relationship,
        privacy_policy_accepted: parsedInput.privacy_policy_accepted,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // If this form was created from a partial form, link them and get is_prospect
    let partialFormIsProspect = false
    if (parsedInput.partialFormId) {
      const { error: linkError } = await supabase
        .from('partial_intake_forms')
        .update({
          completed_form_id: data.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', parsedInput.partialFormId)
      
      if (linkError) {
        console.error('Error linking partial form to completed form:', linkError)
      } else {
        const { data: partialForm } = await supabase
          .from('partial_intake_forms')
          .select('is_prospect')
          .eq('id', parsedInput.partialFormId)
          .single()
        partialFormIsProspect = partialForm?.is_prospect === true
      }
    }
    
    // Check if profile already exists for this patient email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', parsedInput.email)
      .eq('role', 'patient')
      .maybeSingle()
    
    // If completing a partial form marked as prospect, set is_prospect on existing profile too
    if (existingProfile && partialFormIsProspect) {
      await supabase
        .from('profiles')
        .update({ is_prospect: true })
        .eq('id', existingProfile.id)
    }
    
    // Track if we need to send login credentials email
    let shouldSendLoginCredentials = false
    let tempPassword = ''
    let authUserCreated = false
    
    // Create patient profile if it doesn't exist
    if (!existingProfile) {
      // Generate a temporary password (will be sent in email)
      tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Math.random().toString(36).slice(-8)}`
      
      // Create auth user with patient email
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: parsedInput.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email so password reset works immediately
        user_metadata: {
          first_name: parsedInput.first_name,
          last_name: parsedInput.last_name,
          role: 'patient',
        },
      })
      
      if (authError || !authData.user) {
        console.error('[submitPatientIntakeForm] ❌ Error creating patient auth user:', authError)
        // Don't fail the form submission, but log the error
      } else {
        authUserCreated = true
        shouldSendLoginCredentials = true
        
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Check if profile was created by trigger, then update it
        const { data: triggerCreatedProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle()
        
        if (triggerCreatedProfile) {
          // Profile exists (created by trigger), update it with patient info
          await supabase
            .from('profiles')
            .update({
              email: parsedInput.email,
              first_name: parsedInput.first_name,
              last_name: parsedInput.last_name,
              role: 'patient',
              phone: parsedInput.phone_number || null,
              is_active: true,
              must_change_password: true, // Require password change on first login
              ...(partialFormIsProspect && { is_prospect: true }),
            })
            .eq('id', authData.user.id)
        } else {
          // Profile doesn't exist (trigger didn't fire), create it manually
          await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: parsedInput.email,
              first_name: parsedInput.first_name,
              last_name: parsedInput.last_name,
              role: 'patient',
              phone: parsedInput.phone_number || null,
              is_active: true,
              must_change_password: true, // Require password change on first login
              ...(partialFormIsProspect && { is_prospect: true }),
            })
        }
        
        // Wait a moment for user to be fully created in Supabase
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Send confirmation emails FIRST (application received)
    // This is the first email: "Thank you, we'll review and let you know"
    console.log('[submitPatientIntakeForm] Sending confirmation emails...')
    if (parsedInput.filled_by === 'self') {
      // If patient filled out themselves, send one email (confirmation + credentials if new account)
      try {
        const confirmationResult = await sendConfirmationEmail(
          parsedInput.email,
          parsedInput.first_name,
          parsedInput.last_name,
          data.id,
          parsedInput.program_type,
          false,
          undefined,
          undefined,
          undefined,
          shouldSendLoginCredentials ? tempPassword : undefined
        )
        if (confirmationResult?.success) {
          console.log('[submitPatientIntakeForm] ✅ Confirmation email sent to patient:', parsedInput.email)
        } else {
          console.error('[submitPatientIntakeForm] ❌ Failed to send confirmation email:', confirmationResult?.error)
        }
      } catch (error) {
        console.error('[submitPatientIntakeForm] ❌ Error sending confirmation email:', error)
      }
    } else if (parsedInput.filled_by === 'someone_else' && parsedInput.filler_email) {
      // If someone else filled out, send emails to both patient and filler
      // Send to patient - mention that someone else submitted for them
      try {
        const confirmationResult = await sendConfirmationEmail(
          parsedInput.email,
          parsedInput.first_name,
          parsedInput.last_name,
          data.id,
          parsedInput.program_type,
          true,
          parsedInput.filler_email,
          parsedInput.filler_first_name || '',
          parsedInput.filler_last_name || '',
          shouldSendLoginCredentials ? tempPassword : undefined
        )
        if (confirmationResult?.success) {
          console.log('[submitPatientIntakeForm] ✅ Confirmation email sent to patient:', parsedInput.email)
        } else {
          console.error('[submitPatientIntakeForm] ❌ Failed to send confirmation email to patient:', confirmationResult?.error)
        }
      } catch (error) {
        console.error('[submitPatientIntakeForm] ❌ Error sending confirmation email to patient:', error)
      }
      
      // Send to filler person
      try {
        const fillerResult = await sendFillerConfirmationEmail(
          parsedInput.filler_email,
          parsedInput.filler_first_name || '',
          parsedInput.filler_last_name || '',
          parsedInput.first_name,
          parsedInput.last_name,
          data.id,
          parsedInput.program_type
        )
        if (fillerResult?.success) {
          console.log('[submitPatientIntakeForm] ✅ Confirmation email sent to filler:', parsedInput.filler_email)
        } else {
          console.error('[submitPatientIntakeForm] ❌ Failed to send confirmation email to filler:', fillerResult?.error)
        }
      } catch (error) {
        console.error('[submitPatientIntakeForm] ❌ Error sending confirmation email to filler:', error)
      }
    }
    
    // When we created a new account, credentials were included in the confirmation email.
    // Only send separate "Patient Account Created" notification to the filler (not to patient).
    if (shouldSendLoginCredentials && tempPassword && parsedInput.filled_by === 'someone_else' && parsedInput.filler_email) {
      console.log('[submitPatientIntakeForm] Sending filler notification (patient credentials already in confirmation email)...')
      try {
        const loginResult = await sendPatientLoginCredentialsEmail(
          parsedInput.email,
          parsedInput.first_name,
          parsedInput.last_name,
          tempPassword,
          true,
          parsedInput.filler_email,
          parsedInput.filler_first_name || '',
          parsedInput.filler_last_name || '',
          false // sendToPatient: credentials already in confirmation email
        )
        if (loginResult?.success) {
          console.log('[submitPatientIntakeForm] ✅ Filler notification sent:', parsedInput.filler_email)
        } else {
          const err = loginResult && 'error' in loginResult ? loginResult.error : undefined
          console.error('[submitPatientIntakeForm] ❌ Failed to send filler notification:', err)
        }
      } catch (error) {
        console.error('[submitPatientIntakeForm] ❌ Error sending filler notification:', error)
      }
    } else if (existingProfile) {
      console.log('[submitPatientIntakeForm] ⚠️ Profile already exists, skipping login credentials email')
    }
    
    return { success: true, data: { id: data.id } }
  })

// Build credentials section HTML for merged confirmation email (no border on credentials box, centered login button, mobile-friendly).
function buildCredentialsSection(patientEmail: string, tempPassword: string, loginUrl: string): string {
  return `<table role="presentation" width="100%" class="credentials-block" style="max-width:100%"><tr><td style="padding:10px 0 20px">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;max-width:100%"><tr><td align="left" valign="top" style="padding:30px 20px;background-color:#d4dabb;border-radius:11px 11px 11px 11px;border-left:6px solid #6e7a46" bgcolor="#d4dabb">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="left" valign="top" style="padding:0 0 5px"><p class="cred-heading" style="margin:0;font-size:19px;line-height:150%;color:#28243d;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif">Your Client Portal Account</p></td></tr>
<tr><td align="left" valign="top" style="padding:5px 0 0"><p class="cred-body" style="margin:0 0 12px;font-size:16px;line-height:182%;color:rgba(40,36,61,0.8);font-weight:400;font-family:'Inter',Arial,Helvetica,sans-serif;letter-spacing:-0.2px">We have created your client portal account. Use the credentials below to sign in. You will be required to change your password on first login.</p></td></tr>
<tr><td align="left" valign="top" style="padding:0"><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:8px;border:none"><tr><td align="left" style="padding:16px 20px"><p class="cred-text" style="margin:0 0 6px;font-size:16px;line-height:150%;color:#28243d;font-family:'Inter',Arial,Helvetica,sans-serif"><strong>Email:</strong> ${patientEmail}</p><p class="cred-text" style="margin:0;font-size:16px;line-height:150%;color:#28243d;font-family:'Inter',Arial,Helvetica,sans-serif"><strong>Temporary Password:</strong> ${tempPassword}</p></td></tr></table></td></tr>
<tr><td align="left" valign="top" style="padding:12px 0 0"><p class="cred-note" style="margin:0;font-size:14px;line-height:150%;color:#535065;font-family:'Inter',Arial,Helvetica,sans-serif">For security, change your password after first login in Profile → Security.</p></td></tr>
<tr><td align="center" valign="top" style="padding:20px 0 0;text-align:center"><a href="${loginUrl}" target="_blank" class="cred-cta" style="display:inline-block;box-sizing:border-box;border-radius:8px;background-color:#6e7a46;color:#fff !important;padding:10px 24px;text-decoration:none;font-size:16px;line-height:200%;font-weight:600;font-family:'Inter',Arial,Helvetica,sans-serif" bgcolor="#6e7a46">Login to Portal</a></td></tr></table></td></tr></table>
</td></tr></table>`
}

// Send confirmation email after form submission (optionally includes portal credentials when new account created).
async function sendConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  formId: string,
  programType: 'mental_health' | 'neurological' | 'addiction',
  isFiller: boolean = false,
  fillerEmail?: string,
  fillerFirstName?: string,
  fillerLastName?: string,
  tempPassword?: string
) {
  const supabase = createAdminClient()

  const trackingToken = crypto.randomUUID()
  const baseCalendarLink = 'https://calendar.app.google/jkPEGqcQcf82W6aMA'
  const fullName = `${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}`
  const encodedEmail = encodeURIComponent(email)
  const prepopulatedCalendarLink = `${baseCalendarLink}?name=${fullName}&email=${encodedEmail}`

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const trackingLink = `${baseUrl}/api/track-calendar-click/${trackingToken}?redirect=${encodeURIComponent(prepopulatedCalendarLink)}`
  const loginUrl = `${baseUrl}/login`

  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email tracking link generated:', trackingLink)
  }

  await supabase
    .from('patient_intake_forms')
    .update({
      tracking_token: trackingToken,
      email_sent_at: new Date().toISOString(),
    })
    .eq('id', formId)

  const schedulingLink = trackingLink
  const programBrochureUrl = PROGRAM_BROCHURE_URLS[programType]
  const contactEmail = 'contactus@theibogainstitute.org'
  const fillerMessage =
    isFiller && fillerFirstName && fillerEmail
      ? `<table role="presentation" width="100%" style="margin:15px 0"><tr><td style="padding:20px;background:#f9f9f9;border-left:6px solid #6e7a46;border-radius:0 8px 8px 0"><p style="margin:0 0 8px;font-size:16px;color:#28243d;font-weight:600">Application Submitted on Your Behalf</p><p style="margin:0;font-size:16px;line-height:150%;color:#535065">We have received an application that was submitted on your behalf by <strong>${fillerFirstName} ${fillerLastName || ''}</strong> (${fillerEmail}). This application is for your client portal account with the Iboga Wellness Institute.</p></td></tr></table>`
      : ''

  const credentialsSection =
    tempPassword != null && tempPassword !== ''
      ? buildCredentialsSection(email, tempPassword, loginUrl)
      : ''

  const htmlBody = getApplicationConfirmationHtml({
    firstName,
    schedulingLink,
    programBrochureUrl,
    contactEmail,
    fillerMessage,
    credentialsSection,
  })

  return sendEmailDirect({
    to: email,
    subject: 'Thank You for Your Application - Schedule Your Consultation | Iboga Wellness Institute',
    body: htmlBody,
  })
}

// Send confirmation email to the person who filled out the form (when someone else filled it)
async function sendFillerConfirmationEmail(
  fillerEmail: string,
  fillerFirstName: string,
  fillerLastName: string,
  patientFirstName: string,
  patientLastName: string,
  formId: string,
  programType: 'mental_health' | 'neurological' | 'addiction'
) {
  // Generate unique tracking token for filler email
  const trackingToken = crypto.randomUUID()

  const baseCalendarLink = 'https://calendar.app.google/jkPEGqcQcf82W6aMA'
  const fullName = `${encodeURIComponent(fillerFirstName)}%20${encodeURIComponent(fillerLastName)}`
  const encodedEmail = encodeURIComponent(fillerEmail)
  const prepopulatedCalendarLink = `${baseCalendarLink}?name=${fullName}&email=${encodedEmail}`

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
  const trackingLink = `${baseUrl}/api/track-calendar-click/${trackingToken}?redirect=${encodeURIComponent(prepopulatedCalendarLink)}`

  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Filler email tracking link generated:', trackingLink)
  }

  const schedulingLink = trackingLink
  const programBrochureUrl = PROGRAM_BROCHURE_URLS[programType]
  const contactEmail = 'contactus@theibogainstitute.org'
  const patientFullName = `${patientFirstName} ${patientLastName}`

  const htmlBody = getFillerConfirmationHtml({
    fillerFirstName,
    patientFullName,
    patientFirstName,
    schedulingLink,
    programBrochureUrl,
    contactEmail,
  })

  return sendEmailDirect({
    to: fillerEmail,
    subject: `Application Form Submitted - Confirmation for ${patientFirstName} ${patientLastName} | Iboga Wellness Institute`,
    body: htmlBody,
  })
}

