'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { isStaffRole, hasOwnerAccess } from '@/lib/utils'
import { sendEmailDirect } from '@/actions/email.action'

const recordBillingPaymentSchema = z.object({
  patient_id: z.string().uuid(),
  service_agreement_id: z.string().uuid(),
  amount_received: z.number().min(0),
  is_full_payment: z.boolean(),
  payment_received_at: z.string().datetime(),
  next_reminder_date: z.string().optional(), // YYYY-MM-DD
  send_reminder_now: z.boolean().optional(),
})

const getBillingPaymentsSchema = z.object({
  service_agreement_id: z.string().uuid(),
})

const sendBalanceReminderSchema = z.object({
  patient_id: z.string().uuid(),
  service_agreement_id: z.string().uuid(),
  payment_record_id: z.string().uuid().optional(),
  next_reminder_date: z.string().optional(),
})

const turnOffBillingReminderSchema = z.object({
  payment_record_id: z.string().uuid(),
})

const updateBillingPaymentSchema = z.object({
  payment_record_id: z.string().uuid(),
  amount_received: z.number().min(0),
  is_full_payment: z.boolean(),
  payment_received_at: z.string().datetime(),
  turn_off_reminder: z.boolean().optional(),
})

export const recordBillingPayment = authActionClient
  .schema(recordBillingPaymentSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Only staff can record billing payments' }
    }
    const supabase = createAdminClient()

    const { data: agreement } = await supabase
      .from('service_agreements')
      .select('id, patient_id, patient_email, patient_first_name, patient_last_name, total_program_fee')
      .eq('id', parsedInput.service_agreement_id)
      .single()

    if (!agreement) {
      return { success: false, error: 'Service agreement not found' }
    }
    if (agreement.patient_id !== parsedInput.patient_id) {
      return { success: false, error: 'Patient does not match service agreement' }
    }

    const { data: payment, error: insertError } = await supabase
      .from('patient_billing_payments')
      .insert({
        patient_id: parsedInput.patient_id,
        service_agreement_id: parsedInput.service_agreement_id,
        amount_received: parsedInput.amount_received,
        is_full_payment: parsedInput.is_full_payment,
        payment_received_at: parsedInput.payment_received_at,
        recorded_by: ctx.user.id,
        next_reminder_date: parsedInput.next_reminder_date || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[recordBillingPayment]', insertError)
      return { success: false, error: insertError.message }
    }

    const shouldSendReminder =
      !parsedInput.is_full_payment &&
      (parsedInput.send_reminder_now === true || !!parsedInput.next_reminder_date)

    if (shouldSendReminder && agreement.patient_email) {
      const totalAmount = Number(agreement.total_program_fee)
      const received = parsedInput.amount_received
      // Balance due = total amount (from service agreement) minus sum of all recorded payments
      const { data: allPayments } = await supabase
        .from('patient_billing_payments')
        .select('amount_received')
        .eq('service_agreement_id', parsedInput.service_agreement_id)
      const totalReceived = (allPayments || []).reduce((sum, p) => sum + Number(p.amount_received), 0)
      const balanceAfter = Math.max(0, totalAmount - totalReceived)
      const firstName = agreement.patient_first_name || 'Client'
      const lastName = agreement.patient_last_name || ''
      const nextDate = parsedInput.next_reminder_date
        ? new Date(parsedInput.next_reminder_date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null

      const subject = 'Reminder: Balance payment due - Iboga Wellness Institute'
      const body = buildBalanceReminderEmailBody({
        firstName,
        lastName,
        amountReceived: received,
        balanceRemaining: balanceAfter,
        nextPaymentDate: nextDate,
      })

      const emailResult = await sendEmailDirect({
        to: agreement.patient_email,
        subject,
        body,
      })

      if (emailResult.success && payment) {
        await supabase
          .from('patient_billing_payments')
          .update({ balance_reminder_sent_at: new Date().toISOString() })
          .eq('id', payment.id)
      }
    }

    return { success: true, data: payment }
  })

export const getBillingPayments = authActionClient
  .schema(getBillingPaymentsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Only staff can view billing payments' }
    }
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('patient_billing_payments')
      .select('*')
      .eq('service_agreement_id', parsedInput.service_agreement_id)
      .order('payment_received_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data: data || [] }
  })

export const sendBalanceReminder = authActionClient
  .schema(sendBalanceReminderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStaffRole(ctx.user.role)) {
      return { success: false, error: 'Only staff can send balance reminders' }
    }
    const supabase = createAdminClient()

    const { data: agreement } = await supabase
      .from('service_agreements')
      .select('id, patient_email, patient_first_name, patient_last_name, total_program_fee')
      .eq('id', parsedInput.service_agreement_id)
      .single()

    if (!agreement) {
      return { success: false, error: 'Service agreement not found' }
    }

    const totalAmount = Number(agreement.total_program_fee)
    const { data: allPayments } = await supabase
      .from('patient_billing_payments')
      .select('amount_received')
      .eq('service_agreement_id', parsedInput.service_agreement_id)
    const totalReceived = (allPayments || []).reduce((sum, p) => sum + Number(p.amount_received), 0)
    const balance = Math.max(0, totalAmount - totalReceived)
    const nextDate = parsedInput.next_reminder_date
      ? new Date(parsedInput.next_reminder_date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null

    const body = buildBalanceReminderEmailBody({
      firstName: agreement.patient_first_name || 'Client',
      lastName: agreement.patient_last_name || '',
      amountReceived: 0,
      balanceRemaining: balance,
      nextPaymentDate: nextDate,
    })

    const result = await sendEmailDirect({
      to: agreement.patient_email,
      subject: 'Reminder: Balance payment due - The Iboga Wellness Institute',
      body,
    })

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to send reminder email' }
    }

    if (parsedInput.payment_record_id) {
      await supabase
        .from('patient_billing_payments')
        .update({
          balance_reminder_sent_at: new Date().toISOString(),
          next_reminder_date: parsedInput.next_reminder_date || null,
        })
        .eq('id', parsedInput.payment_record_id)
    }

    return { success: true, data: { sent: true } }
  })

export const turnOffBillingReminder = authActionClient
  .schema(turnOffBillingReminderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasOwnerAccess(ctx.user.role)) {
      return { success: false, error: 'Only admin or owner can turn off reminders' }
    }
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('patient_billing_payments')
      .update({
        next_reminder_date: null,
      })
      .eq('id', parsedInput.payment_record_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  })

export const updateBillingPayment = authActionClient
  .schema(updateBillingPaymentSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasOwnerAccess(ctx.user.role)) {
      return { success: false, error: 'Only admin or owner can update payments' }
    }
    const supabase = createAdminClient()

    const updatePayload: {
      amount_received: number
      is_full_payment: boolean
      payment_received_at: string
      next_reminder_date?: null
    } = {
      amount_received: parsedInput.amount_received,
      is_full_payment: parsedInput.is_full_payment,
      payment_received_at: parsedInput.payment_received_at,
    }
    if (parsedInput.turn_off_reminder) {
      updatePayload.next_reminder_date = null
    }

    const { data, error } = await supabase
      .from('patient_billing_payments')
      .update(updatePayload)
      .eq('id', parsedInput.payment_record_id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  })

function buildBalanceReminderEmailBody(params: {
  firstName: string
  lastName: string
  amountReceived: number
  balanceRemaining: number
  nextPaymentDate: string | null
}): string {
  const { firstName, lastName, amountReceived, balanceRemaining, nextPaymentDate } = params
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Client'
  const balanceFormatted = balanceRemaining.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
  const receivedFormatted =
    amountReceived > 0
      ? amountReceived.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        })
      : null

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: #6E7A46; color: #fff; padding: 24px 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
  .content { padding: 30px; }
  .content h2 { color: #2B2820; font-size: 18px; margin-top: 0; }
  .content p { margin: 0 0 16px; font-size: 15px; }
  .highlight { background: #F5F4F0; border-left: 4px solid #6E7A46; padding: 16px; margin: 20px 0; }
  .highlight strong { color: #6E7A46; }
  .footer { padding: 20px 30px; text-align: center; font-size: 13px; color: #777; background: #F5F4F0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>The Iboga Wellness Institute</h1></div>
    <div class="content">
      <h2>Balance payment reminder</h2>
      <p>Dear ${name},</p>
      <p>This is a friendly reminder regarding your outstanding balance for the program.</p>
      ${receivedFormatted ? `<p>We have recorded a payment of <strong>${receivedFormatted}</strong>. Thank you.</p>` : ''}
      <div class="highlight">
        <p><strong>Balance due:</strong> ${balanceFormatted}</p>
        ${nextPaymentDate ? `<p><strong>Payment due by:</strong> ${nextPaymentDate}</p>` : ''}
      </div>
      <p>Please contact us to arrange payment or if you have any questions.</p>
      <p>Best regards,<br>Iboga Wellness Institute</p>
    </div>
    <div class="footer">This email was sent from The Iboga Wellness Institute.</div>
  </div>
</body>
</html>
  `.trim()
}
