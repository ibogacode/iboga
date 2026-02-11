'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { sendPatientLoginReminderEmail, sendFillerLoginReminderEmail } from './email.action'

/**
 * Send reminder emails to patients who have must_change_password = true
 * This should be called daily by a cron job
 * 
 * Logic:
 * 1. Find all patients where role = 'patient' AND must_change_password = true
 * 2. For each patient, generate a new temporary password
 * 3. Update the patient's password in Supabase Auth
 * 4. For each patient, check if their intake form was filled by someone else
 * 5. If filled by someone else, send reminder to BOTH patient AND filler
 * 6. If filled by self, send reminder only to patient
 */
export async function sendPatientLoginReminders() {
  const supabase = createAdminClient()
  
  // Find all patients where must_change_password = true (exclude prospects – no reminders)
  const { data: patients, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('role', 'patient')
    .eq('must_change_password', true)
    .or('is_prospect.is.null,is_prospect.eq.false')
  
  if (error) {
    console.error('[sendPatientLoginReminders] Error fetching patients:', error)
    return { success: false, error: error.message }
  }
  
  if (!patients || patients.length === 0) {
    console.log('[sendPatientLoginReminders] No patients need reminders')
    return { success: true, data: { sent: 0, failed: 0, total: 0 } }
  }
  
  console.log(`[sendPatientLoginReminders] Found ${patients.length} patients needing reminders`)
  
  let sent = 0
  let failed = 0
  
  for (const patient of patients) {
    try {
      // Generate a new temporary password
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Math.random().toString(36).slice(-8)}`
      
      // Update the patient's password in Supabase Auth
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        patient.id,
        { password: tempPassword }
      )
      
      if (passwordError) {
        console.error(`[sendPatientLoginReminders] Error updating password for ${patient.email}:`, passwordError)
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
        console.error(`[sendPatientLoginReminders] Error fetching intake form for ${patient.email}:`, intakeError)
      }
      
      // Send reminder to patient with email and password
      const patientReminderResult = await sendPatientLoginReminderEmail(
        patient.email,
        patient.first_name || 'Patient',
        patient.last_name || '',
        tempPassword
      )
      
      if (patientReminderResult?.success) {
        sent++
        console.log(`[sendPatientLoginReminders] ✅ Patient reminder sent to ${patient.email}`)
      } else {
        failed++
        console.error(`[sendPatientLoginReminders] ❌ Failed to send patient reminder to ${patient.email}:`, patientReminderResult?.error)
      }
      
      // If form was filled by someone else, also send reminder to filler
      if (intakeForm && intakeForm.filled_by === 'someone_else' && intakeForm.filler_email) {
        try {
          const fillerReminderResult = await sendFillerLoginReminderEmail(
            intakeForm.filler_email,
            intakeForm.filler_first_name || 'there',
            intakeForm.filler_last_name || '',
            intakeForm.first_name || patient.first_name || 'Patient',
            intakeForm.last_name || patient.last_name || '',
            patient.email,
            tempPassword
          )
          
          if (fillerReminderResult?.success) {
            sent++
            console.log(`[sendPatientLoginReminders] ✅ Filler reminder sent to ${intakeForm.filler_email}`)
          } else {
            failed++
            console.error(`[sendPatientLoginReminders] ❌ Failed to send filler reminder to ${intakeForm.filler_email}:`, fillerReminderResult?.error)
          }
        } catch (fillerError) {
          failed++
          console.error(`[sendPatientLoginReminders] ❌ Error sending filler reminder to ${intakeForm.filler_email}:`, fillerError)
        }
      }
    } catch (error) {
      failed++
      console.error(`[sendPatientLoginReminders] ❌ Error processing patient ${patient.email}:`, error)
    }
  }
  
  console.log(`[sendPatientLoginReminders] Completed: ${sent} sent, ${failed} failed, ${patients.length} total`)
  
  return { 
    success: true, 
    data: { 
      sent, 
      failed,
      total: patients.length 
    } 
  }
}

