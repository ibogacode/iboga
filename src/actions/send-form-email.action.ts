'use server'

import { authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendMedicalHistoryFormEmail, sendServiceAgreementFormEmail, sendIbogaineConsentFormEmail } from '@/actions/email.action'
import { sendPartialIntakeFormEmail } from '@/actions/partial-intake.action'

const sendFormEmailSchema = z.object({
  formType: z.enum(['intake', 'medical', 'service', 'ibogaine']),
  patientId: z.string().optional(),
  intakeFormId: z.string().optional(),
  partialFormId: z.string().optional(),
})

export const sendFormEmail = authActionClient
  .schema(sendFormEmailSchema)
  .action(async ({ parsedInput, ctx }) => {
    const adminClient = createAdminClient()
    
    // Get patient/intake/partial form data to determine recipient
    let patientEmail: string | null = null
    let patientFirstName: string | null = null
    let patientLastName: string | null = null
    let recipientEmail: string | null = null
    let recipientName: string | null = null
    let filledBy: 'self' | 'someone_else' = 'self'
    let fillerEmail: string | null = null
    let fillerFirstName: string | null = null
    let fillerLastName: string | null = null
    let actualIntakeFormId: string | null = null
    
    // Try to get data from partial form first (if exists)
    if (parsedInput.partialFormId) {
      const { data: partialForm } = await adminClient
        .from('partial_intake_forms')
        .select('email, first_name, last_name, recipient_email, recipient_name, filled_by, filler_email, filler_first_name, filler_last_name, completed_form_id')
        .eq('id', parsedInput.partialFormId)
        .maybeSingle()
      
      if (partialForm) {
        patientEmail = partialForm.email
        patientFirstName = partialForm.first_name
        patientLastName = partialForm.last_name
        filledBy = partialForm.filled_by || 'self'
        fillerEmail = partialForm.filler_email
        fillerFirstName = partialForm.filler_first_name
        fillerLastName = partialForm.filler_last_name
        actualIntakeFormId = partialForm.completed_form_id
        
        // Determine recipient: if filled_by is someone_else, send to filler, otherwise to patient
        if (filledBy === 'someone_else' && fillerEmail) {
          recipientEmail = fillerEmail
          recipientName = partialForm.recipient_name || (fillerFirstName && fillerLastName ? `${fillerFirstName} ${fillerLastName}` : fillerEmail)
        } else {
          recipientEmail = partialForm.recipient_email || partialForm.email
          recipientName = partialForm.recipient_name || (patientFirstName && patientLastName ? `${patientFirstName} ${patientLastName}` : recipientEmail)
        }
      }
    }
    
    // If no partial form, try intake form
    if (!recipientEmail && parsedInput.intakeFormId) {
      const { data: intakeForm } = await adminClient
        .from('patient_intake_forms')
        .select('email, first_name, last_name, filled_by, filler_email, filler_first_name, filler_last_name')
        .eq('id', parsedInput.intakeFormId)
        .maybeSingle()
      
      if (intakeForm) {
        patientEmail = intakeForm.email
        patientFirstName = intakeForm.first_name
        patientLastName = intakeForm.last_name
        filledBy = intakeForm.filled_by || 'self'
        fillerEmail = intakeForm.filler_email
        fillerFirstName = intakeForm.filler_first_name
        fillerLastName = intakeForm.filler_last_name
        actualIntakeFormId = parsedInput.intakeFormId
        
        // Determine recipient: if filled_by is someone_else, send to filler, otherwise to patient
        if (filledBy === 'someone_else' && fillerEmail) {
          recipientEmail = fillerEmail
          recipientName = fillerFirstName && fillerLastName ? `${fillerFirstName} ${fillerLastName}` : fillerEmail
        } else {
          recipientEmail = intakeForm.email
          recipientName = patientFirstName && patientLastName ? `${patientFirstName} ${patientLastName}` : recipientEmail
        }
      }
    }
    
    // If still no recipient, try patient profile
    if (!recipientEmail && parsedInput.patientId) {
      const { data: patient } = await adminClient
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', parsedInput.patientId)
        .eq('role', 'patient')
        .maybeSingle()
      
      if (patient) {
        recipientEmail = patient.email
        recipientName = patient.first_name && patient.last_name 
          ? `${patient.first_name} ${patient.last_name}` 
          : patient.email
        patientFirstName = patient.first_name
        patientLastName = patient.last_name
      }
    }
    
    if (!recipientEmail) {
      return { success: false, error: 'Could not determine recipient email address' }
    }
    
    // Generate form link based on form type
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://portal.theibogainstitute.org')
    
    let formLink = ''
    let emailResult
    
    if (parsedInput.formType === 'intake') {
      // For intake, create a new partial form
      // This should be handled by createPartialIntakeForm, but we can send email directly if form already exists
      if (parsedInput.partialFormId) {
        const { data: partialForm } = await adminClient
          .from('partial_intake_forms')
          .select('token')
          .eq('id', parsedInput.partialFormId)
          .maybeSingle()
        
        if (partialForm?.token) {
          formLink = `${baseUrl}/intake?token=${partialForm.token}`
          
          emailResult = await sendPartialIntakeFormEmail(
            recipientEmail,
            recipientName || 'Patient',
            patientFirstName,
            patientLastName,
            formLink,
            'minimal',
            filledBy,
            fillerFirstName,
            fillerLastName
          )
        } else {
          return { success: false, error: 'Partial form not found' }
        }
      } else {
        return { success: false, error: 'Partial form ID required for intake form' }
      }
    } else if (parsedInput.formType === 'medical') {
      // Medical history form link - use actual intake form ID if available
      if (actualIntakeFormId) {
        formLink = `${baseUrl}/medical-history?intake_form_id=${actualIntakeFormId}`
      } else if (parsedInput.intakeFormId) {
        formLink = `${baseUrl}/medical-history?intake_form_id=${parsedInput.intakeFormId}`
      } else {
        formLink = `${baseUrl}/medical-history`
      }
      
      emailResult = await sendMedicalHistoryFormEmail(
        recipientEmail,
        recipientName || 'Patient',
        patientFirstName,
        patientLastName,
        formLink,
        filledBy,
        fillerFirstName,
        fillerLastName
      )
    } else if (parsedInput.formType === 'service') {
      // Service agreement form link - use actual intake form ID if available
      if (actualIntakeFormId) {
        formLink = `${baseUrl}/patient/service-agreement?intake_form_id=${actualIntakeFormId}`
      } else if (parsedInput.intakeFormId) {
        formLink = `${baseUrl}/patient/service-agreement?intake_form_id=${parsedInput.intakeFormId}`
      } else {
        formLink = `${baseUrl}/patient/service-agreement`
      }
      
      emailResult = await sendServiceAgreementFormEmail(
        recipientEmail,
        recipientName || 'Patient',
        patientFirstName,
        patientLastName,
        formLink,
        filledBy,
        fillerFirstName,
        fillerLastName
      )
    } else if (parsedInput.formType === 'ibogaine') {
      // Ibogaine consent form link - use actual intake form ID if available
      if (actualIntakeFormId) {
        formLink = `${baseUrl}/patient/ibogaine-consent?intake_form_id=${actualIntakeFormId}`
      } else if (parsedInput.intakeFormId) {
        formLink = `${baseUrl}/patient/ibogaine-consent?intake_form_id=${parsedInput.intakeFormId}`
      } else {
        formLink = `${baseUrl}/patient/ibogaine-consent`
      }
      
      emailResult = await sendIbogaineConsentFormEmail(
        recipientEmail,
        recipientName || 'Patient',
        patientFirstName,
        patientLastName,
        formLink,
        filledBy,
        fillerFirstName,
        fillerLastName
      )
    } else {
      return { success: false, error: 'Invalid form type' }
    }
    
    if (emailResult?.success) {
      return { 
        success: true, 
        data: { 
          message: `Form email sent successfully to ${recipientEmail}`,
          recipientEmail 
        } 
      }
    } else {
      return { 
        success: false, 
        error: emailResult?.error || 'Failed to send email' 
      }
    }
  })

