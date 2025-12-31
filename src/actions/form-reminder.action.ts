'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { sendFormActivationReminderEmail } from './email.action'

/**
 * Send reminder emails to patients who have activated but incomplete forms
 * This should be called every 48 hours by a cron job
 * 
 * Logic:
 * 1. Find all activated forms (service_agreements and ibogaine_consent_forms) where is_activated = true
 * 2. Check if form was activated more than 48 hours ago
 * 3. Check if form is incomplete (no patient signature or not fully filled)
 * 4. Send reminder email to patient
 */
export async function sendFormReminders() {
  const supabase = createAdminClient()
  const now = new Date()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  
  let sent = 0
  let failed = 0
  let total = 0
  
  // Check Service Agreements
  const { data: serviceAgreements, error: serviceError } = await supabase
    .from('service_agreements')
    .select('id, patient_email, patient_first_name, patient_last_name, activated_at, patient_signature_data')
    .eq('is_activated', true)
    .not('activated_at', 'is', null)
    .lt('activated_at', fortyEightHoursAgo.toISOString())
  
  if (serviceError) {
    console.error('[sendFormReminders] Error fetching service agreements:', serviceError)
  } else if (serviceAgreements) {
    for (const agreement of serviceAgreements) {
      // Check if form is incomplete (no patient signature)
      if (!agreement.patient_signature_data) {
        total++
        try {
          const result = await sendFormActivationReminderEmail(
            agreement.patient_email,
            agreement.patient_first_name || 'Patient',
            agreement.patient_last_name || '',
            'service_agreement',
            'Service Agreement'
          )
          
          if (result?.success) {
            sent++
            console.log(`[sendFormReminders] ✅ Service agreement reminder sent to ${agreement.patient_email}`)
          } else {
            failed++
            console.error(`[sendFormReminders] ❌ Failed to send service agreement reminder:`, result?.error)
          }
        } catch (error) {
          failed++
          console.error(`[sendFormReminders] ❌ Error sending service agreement reminder:`, error)
        }
      }
    }
  }
  
  // Check Ibogaine Consent Forms
  const { data: consentForms, error: consentError } = await supabase
    .from('ibogaine_consent_forms')
    .select('id, email, first_name, last_name, activated_at, signature_data')
    .eq('is_activated', true)
    .not('activated_at', 'is', null)
    .lt('activated_at', fortyEightHoursAgo.toISOString())
  
  if (consentError) {
    console.error('[sendFormReminders] Error fetching ibogaine consent forms:', consentError)
  } else if (consentForms) {
    for (const form of consentForms) {
      // Check if form is incomplete (no signature)
      if (!form.signature_data) {
        total++
        try {
          const result = await sendFormActivationReminderEmail(
            form.email,
            form.first_name || 'Patient',
            form.last_name || '',
            'ibogaine_consent',
            'Ibogaine Therapy Consent'
          )
          
          if (result?.success) {
            sent++
            console.log(`[sendFormReminders] ✅ Ibogaine consent reminder sent to ${form.email}`)
          } else {
            failed++
            console.error(`[sendFormReminders] ❌ Failed to send ibogaine consent reminder:`, result?.error)
          }
        } catch (error) {
          failed++
          console.error(`[sendFormReminders] ❌ Error sending ibogaine consent reminder:`, error)
        }
      }
    }
  }
  
  console.log(`[sendFormReminders] Completed: ${sent} sent, ${failed} failed, ${total} total`)
  
  return { 
    success: true as const, 
    data: { 
      sent, 
      failed,
      total 
    } 
  }
}

// Type for the return value
export type SendFormRemindersResult = 
  | { success: true; data: { sent: number; failed: number; total: number } }
  | { success: false; error: string }

