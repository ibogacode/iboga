'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmailDirect } from './email.action'

// Helper to check admin/manager role
function isAdminStaffRole(role: string | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

// Schema for schedule day
const scheduleDaySchema = z.object({
  day: z.number().int().min(1),
  dose: z.string().optional().default(''), // Optional - can be empty for "None" or "Hold" days
  notes: z.string().optional().default(''), // Can be multi-line
  label: z.string().optional().default(''), // Optional custom label like "Day Before Ibogaine"
})

// =============================================================================
// CREATE TAPERING SCHEDULE
// =============================================================================
const createTaperingScheduleSchema = z.object({
  onboarding_id: z.string().uuid(),
  starting_dose: z.string().optional().default(''), // Optional
  total_days: z.number().int().min(1).max(30).default(7),
  schedule_days: z.array(scheduleDaySchema),
  additional_notes: z.string().optional(),
})

export const createTaperingSchedule = authActionClient
  .schema(createTaperingScheduleSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin/manager access required' }
    }

    const supabase = await createClient()

    // Get onboarding record to link patient_id
    const { data: onboarding, error: onboardingError } = await supabase
      .from('patient_onboarding')
      .select('id, patient_id')
      .eq('id', parsedInput.onboarding_id)
      .single()

    if (onboardingError || !onboarding) {
      return { success: false, error: 'Onboarding record not found' }
    }

    // Check if a schedule already exists for this onboarding
    const { data: existing } = await supabase
      .from('tapering_schedules')
      .select('id')
      .eq('onboarding_id', parsedInput.onboarding_id)
      .single()

    if (existing) {
      return { success: false, error: 'A tapering schedule already exists for this patient' }
    }

    const { data, error } = await supabase
      .from('tapering_schedules')
      .insert({
        onboarding_id: parsedInput.onboarding_id,
        patient_id: onboarding.patient_id,
        starting_dose: parsedInput.starting_dose,
        total_days: parsedInput.total_days,
        schedule_days: parsedInput.schedule_days,
        additional_notes: parsedInput.additional_notes || null,
        status: 'draft',
        created_by: ctx.user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createTaperingSchedule] Error:', error)
      return { success: false, error: 'Failed to create tapering schedule' }
    }

    revalidatePath(`/patient-pipeline/patient-profile`)

    return { success: true, data: { id: data.id } }
  })

// =============================================================================
// GET TAPERING SCHEDULE BY ONBOARDING ID
// =============================================================================
const getTaperingScheduleSchema = z.object({
  onboarding_id: z.string().uuid(),
})

export const getTaperingScheduleByOnboarding = authActionClient
  .schema(getTaperingScheduleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()

    // Staff can view any schedule, patients can only view their own sent schedules
    const isStaff = isAdminStaffRole(ctx.user.role) || 
      ctx.user.role === 'doctor' || 
      ctx.user.role === 'nurse' || 
      ctx.user.role === 'psych'

    let query = supabase
      .from('tapering_schedules')
      .select(`
        *,
        created_by_profile:created_by(first_name, last_name)
      `)
      .eq('onboarding_id', parsedInput.onboarding_id)

    if (!isStaff) {
      // Patients can only see sent/acknowledged schedules
      query = query.in('status', ['sent', 'acknowledged'])
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[getTaperingScheduleByOnboarding] Error:', error)
      return { success: false, error: 'Failed to fetch tapering schedule' }
    }

    return { success: true, data }
  })

// =============================================================================
// GET TAPERING SCHEDULE FOR PATIENT (by patient_id)
// =============================================================================
const getTaperingScheduleForPatientSchema = z.object({
  patient_id: z.string().uuid().optional(),
})

export const getTaperingScheduleForPatient = authActionClient
  .schema(getTaperingScheduleForPatientSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const patientId = parsedInput.patient_id || ctx.user.id

    // If not staff, can only view own schedule
    const isStaff = isAdminStaffRole(ctx.user.role) || 
      ctx.user.role === 'doctor' || 
      ctx.user.role === 'nurse' || 
      ctx.user.role === 'psych'

    if (!isStaff && patientId !== ctx.user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    let query = supabase
      .from('tapering_schedules')
      .select(`
        *,
        created_by_profile:created_by(first_name, last_name)
      `)
      .eq('patient_id', patientId)

    if (!isStaff) {
      query = query.in('status', ['sent', 'acknowledged'])
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[getTaperingScheduleForPatient] Error:', error)
      return { success: false, error: 'Failed to fetch tapering schedule' }
    }

    return { success: true, data }
  })

// =============================================================================
// UPDATE TAPERING SCHEDULE
// =============================================================================
const updateTaperingScheduleSchema = z.object({
  id: z.string().uuid(),
  starting_dose: z.string().optional(), // Optional - can be empty
  total_days: z.number().int().min(1).max(30).optional(),
  schedule_days: z.array(scheduleDaySchema).optional(),
  additional_notes: z.string().optional(),
})

export const updateTaperingSchedule = authActionClient
  .schema(updateTaperingScheduleSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin/manager access required' }
    }

    const supabase = await createClient()

    // Check if schedule exists and is draft
    const { data: existing, error: fetchError } = await supabase
      .from('tapering_schedules')
      .select('id, status')
      .eq('id', parsedInput.id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Tapering schedule not found' }
    }

    if (existing.status !== 'draft') {
      return { success: false, error: 'Cannot edit a schedule that has already been sent' }
    }

    const updateData: Record<string, any> = {}
    if (parsedInput.starting_dose !== undefined) updateData.starting_dose = parsedInput.starting_dose || ''
    if (parsedInput.total_days) updateData.total_days = parsedInput.total_days
    if (parsedInput.schedule_days) updateData.schedule_days = parsedInput.schedule_days
    if (parsedInput.additional_notes !== undefined) updateData.additional_notes = parsedInput.additional_notes

    const { error } = await supabase
      .from('tapering_schedules')
      .update(updateData)
      .eq('id', parsedInput.id)

    if (error) {
      console.error('[updateTaperingSchedule] Error:', error)
      return { success: false, error: 'Failed to update tapering schedule' }
    }

    revalidatePath(`/patient-pipeline/patient-profile`)

    return { success: true }
  })

// =============================================================================
// SEND TAPERING SCHEDULE TO CLIENT
// =============================================================================
const sendTaperingScheduleSchema = z.object({
  id: z.string().uuid(),
})

export const sendTaperingScheduleToClient = authActionClient
  .schema(sendTaperingScheduleSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin/manager access required' }
    }

    const adminClient = createAdminClient()

    // Get the schedule with patient info
    const { data: schedule, error: fetchError } = await adminClient
      .from('tapering_schedules')
      .select(`
        *,
        onboarding:onboarding_id(email, first_name, last_name, patient_id)
      `)
      .eq('id', parsedInput.id)
      .single()

    if (fetchError || !schedule) {
      return { success: false, error: 'Tapering schedule not found' }
    }

    if (schedule.status === 'sent' || schedule.status === 'acknowledged') {
      return { success: false, error: 'Schedule has already been sent to the client' }
    }

    // Validate schedule has days
    const scheduleDays = schedule.schedule_days as Array<{ day: number; dose: string; notes?: string; label?: string }>
    if (!scheduleDays || scheduleDays.length === 0) {
      return { success: false, error: 'Cannot send an empty schedule' }
    }

    const onboarding = schedule.onboarding as { email: string; first_name: string; last_name: string; patient_id: string } | null
    if (!onboarding?.email) {
      return { success: false, error: 'Patient email not found' }
    }

    // Helper to format notes as bullet points
    const formatNotes = (notes: string) => {
      const lines = notes.split('\n').filter(line => line.trim())
      if (lines.length <= 1) return notes
      return '<ul style="margin: 4px 0 0 16px; padding: 0;">' + 
        lines.map(line => `<li style="margin: 2px 0;">${line.trim().replace(/^[•\-]\s*/, '')}</li>`).join('') + 
        '</ul>'
    }

    // Build schedule HTML for email
    const scheduleHtml = scheduleDays
      .sort((a, b) => a.day - b.day) // Sort ascending (Day 1 first)
      .map(day => `
        <div style="margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-radius: 8px;">
          <div style="font-weight: 600; color: #5D7A5F; margin-bottom: 4px;">
            Day ${day.day}${day.label ? ` <span style="font-weight: 400; color: #666;">(${day.label})</span>` : ''}
          </div>
          ${day.dose ? `<div style="font-size: 14px; color: #333;"><strong>Dose:</strong> ${day.dose}</div>` : ''}
          ${day.notes ? `<div style="font-size: 13px; color: #666; margin-top: 4px;"><strong>Notes:</strong> ${formatNotes(day.notes)}</div>` : ''}
        </div>
      `).join('')

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.theibogainstitute.org'
    const loginUrl = `${baseUrl}/login`

    const emailHtml = `
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
          .schedule-box {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
          }
          .schedule-header {
            background: #5D7A5F;
            color: white;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .footer { 
            padding: 30px; 
            text-align: center; 
            font-size: 14px; 
            color: #888;
            background: #f9f9f9;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Iboga Wellness Institute</h1>
          </div>
          <div class="content">
            <h2>Your Tapering Schedule is Ready</h2>
            <p>Hello ${onboarding.first_name},</p>
            <p>Your personalized medication tapering schedule has been prepared by our medical team. Please follow this schedule carefully in preparation for your treatment.</p>
            
            <div class="schedule-box">
              <div class="schedule-header">
                <strong>Tapering Schedule</strong><br>
                <span style="font-size: 14px;">${schedule.starting_dose ? `Starting Dose: ${schedule.starting_dose} | ` : ''}Duration: ${schedule.total_days} days</span>
              </div>
              
              ${scheduleHtml}
              
              ${schedule.additional_notes ? `
                <div style="margin-top: 16px; padding: 12px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                  <strong>Additional Notes:</strong><br>
                  ${schedule.additional_notes}
                </div>
              ` : ''}
            </div>
            
            <p><strong>Important:</strong> If you have any questions about your tapering schedule or experience any unusual symptoms, please contact our medical team immediately.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #5D7A5F; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">View in Patient Portal</a>
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
            <p>https://theibogainstitute.org</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send email to patient
    const emailResult = await sendEmailDirect({
      to: onboarding.email,
      subject: 'Your Tapering Schedule is Ready | Iboga Wellness Institute',
      body: emailHtml,
    })

    if (!emailResult.success) {
      console.error('[sendTaperingScheduleToClient] Email failed:', emailResult.error)
      // Continue anyway to update status - email can be resent
    }

    // Update schedule status to sent
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('tapering_schedules')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        client_notified_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.id)

    if (updateError) {
      console.error('[sendTaperingScheduleToClient] Update error:', updateError)
      return { success: false, error: 'Schedule sent but failed to update status' }
    }

    revalidatePath(`/patient-pipeline/patient-profile`)

    return { 
      success: true, 
      data: { 
        email_sent: emailResult.success,
        message: emailResult.success 
          ? 'Schedule sent to patient successfully' 
          : 'Schedule marked as sent but email delivery may have failed'
      }
    }
  })

// =============================================================================
// DELETE TAPERING SCHEDULE (draft only)
// =============================================================================
const deleteTaperingScheduleSchema = z.object({
  id: z.string().uuid(),
})

export const deleteTaperingSchedule = authActionClient
  .schema(deleteTaperingScheduleSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isAdminStaffRole(ctx.user.role)) {
      return { success: false, error: 'Unauthorized: admin/manager access required' }
    }

    const supabase = await createClient()

    // Check if schedule exists and is draft
    const { data: existing, error: fetchError } = await supabase
      .from('tapering_schedules')
      .select('id, status')
      .eq('id', parsedInput.id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Tapering schedule not found' }
    }

    if (existing.status !== 'draft') {
      return { success: false, error: 'Cannot delete a schedule that has already been sent' }
    }

    const { error } = await supabase
      .from('tapering_schedules')
      .delete()
      .eq('id', parsedInput.id)

    if (error) {
      console.error('[deleteTaperingSchedule] Error:', error)
      return { success: false, error: 'Failed to delete tapering schedule' }
    }

    revalidatePath(`/patient-pipeline/patient-profile`)

    return { success: true }
  })

// =============================================================================
// ACKNOWLEDGE TAPERING SCHEDULE (patient marks as viewed)
// =============================================================================
const acknowledgeTaperingScheduleSchema = z.object({
  id: z.string().uuid(),
})

export const acknowledgeTaperingSchedule = authActionClient
  .schema(acknowledgeTaperingScheduleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()

    // Get schedule and verify patient owns it
    const { data: schedule, error: fetchError } = await supabase
      .from('tapering_schedules')
      .select('id, patient_id, status')
      .eq('id', parsedInput.id)
      .single()

    if (fetchError || !schedule) {
      return { success: false, error: 'Tapering schedule not found' }
    }

    // Only the patient can acknowledge, or staff can do it on their behalf
    const isStaff = isAdminStaffRole(ctx.user.role) || 
      ctx.user.role === 'doctor' || 
      ctx.user.role === 'nurse'

    if (!isStaff && schedule.patient_id !== ctx.user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (schedule.status !== 'sent') {
      return { success: false, error: 'Schedule must be in sent status to acknowledge' }
    }

    const { error } = await supabase
      .from('tapering_schedules')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.id)

    if (error) {
      console.error('[acknowledgeTaperingSchedule] Error:', error)
      return { success: false, error: 'Failed to acknowledge schedule' }
    }

    return { success: true }
  })

// =============================================================================
// SEND ADMIN NOTIFICATION FOR NEW ONBOARDING
// =============================================================================
export async function sendTaperingScheduleAdminNotification(
  patientFirstName: string,
  patientLastName: string,
  patientEmail: string,
  onboardingId: string
) {
  const adminEmail = 'omar@theibogainstitute.org'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.theibogainstitute.org'
  const profileUrl = `${baseUrl}/patient-pipeline/patient-profile/${onboardingId}`

  const emailHtml = `
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
          background: #f9f9f9;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>New Patient in Onboarding - Tapering Schedule Required</h2>
          <p>Hello,</p>
          <p>A new patient has been moved to the onboarding stage and requires a tapering schedule to be prepared.</p>
          
          <div class="info-box">
            <p><strong>Patient Information:</strong></p>
            <p><strong>Name:</strong> ${patientFirstName} ${patientLastName}</p>
            <p><strong>Email:</strong> ${patientEmail}</p>
          </div>
          
          <p>Please prepare the tapering schedule for this patient at your earliest convenience.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileUrl}" style="display: inline-block; background: #5D7A5F; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">View Patient Profile</a>
          </div>
          
          <p>Best regards,<br><strong>Iboga Wellness Institute System</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `

  const result = await sendEmailDirect({
    to: adminEmail,
    subject: `New Patient Onboarding - Tapering Schedule Required: ${patientFirstName} ${patientLastName}`,
    body: emailHtml,
  })

  if (!result.success) {
    console.error('[sendTaperingScheduleAdminNotification] Email failed:', result.error)
  } else {
    console.log('[sendTaperingScheduleAdminNotification] Admin notification sent successfully')
  }

  return result
}

// =============================================================================
// SEND OMAR NOTIFICATION: CLIENT READY FOR TAPERING (EKG + BLOODWORK UPLOADED)
// =============================================================================
export async function sendClientReadyForTaperingNotification(
  patientFirstName: string,
  patientLastName: string,
  patientEmail: string,
  onboardingId: string
) {
  const adminEmail = 'omar@theibogainstitute.org'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.theibogainstitute.org'
  const profileUrl = `${baseUrl}/patient-pipeline/patient-profile/${onboardingId}`

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #5D7A5F; color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 400; }
        .content { padding: 40px 30px; background: white; }
        .content h2 { color: #5D7A5F; font-size: 24px; margin-top: 0; }
        .content p { font-size: 16px; color: #555; margin-bottom: 20px; }
        .info-box { background: #f9f9f9; border-left: 4px solid #5D7A5F; padding: 20px; margin: 20px 0; }
        .footer { padding: 30px; text-align: center; font-size: 14px; color: #888; background: #f9f9f9; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Iboga Wellness Institute</h1></div>
        <div class="content">
          <h2>Client Ready for Tapering Schedule</h2>
          <p>Hello,</p>
          <p><strong>${patientFirstName} ${patientLastName}</strong> has completed the required onboarding steps: all 3 forms are done and both <strong>EKG</strong> and <strong>Bloodwork</strong> results have been uploaded.</p>
          <div class="info-box">
            <p><strong>Patient:</strong> ${patientFirstName} ${patientLastName}</p>
            <p><strong>Email:</strong> ${patientEmail}</p>
          </div>
          <p>This client is ready for you to prepare the tapering schedule.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileUrl}" style="display: inline-block; background: #5D7A5F; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">View Patient Profile</a>
          </div>
          <p>Best regards,<br><strong>Iboga Wellness Institute System</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `

  const result = await sendEmailDirect({
    to: adminEmail,
    subject: `Client Ready for Tapering Schedule: ${patientFirstName} ${patientLastName}`,
    body: emailHtml,
  })

  if (!result.success) {
    console.error('[sendClientReadyForTaperingNotification] Email failed:', result.error)
  } else {
    console.log('[sendClientReadyForTaperingNotification] Omar notified successfully')
  }

  return result
}
