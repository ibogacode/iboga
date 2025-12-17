'use server'

import { actionClient } from '@/lib/safe-action'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

export const sendEmail = actionClient
  .schema(sendEmailSchema)
  .action(async ({ parsedInput }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    try {
      const url = `${supabaseUrl}/functions/v1/send-email`
      console.log('Calling edge function:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to: parsedInput.to,
          subject: parsedInput.subject,
          body: parsedInput.body,
        }),
      })

      const responseText = await response.text()
      console.log('Edge function response:', response.status, responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        return { success: false, error: `Invalid response: ${responseText}` }
      }

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send email' }
      }

      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
    }
  })

// Helper function to send inquiry confirmation email
export async function sendInquiryConfirmationEmail(
  email: string,
  firstName: string
) {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5D7A5F; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Centers</h1>
        </div>
        <div class="content">
          <h2>Thank you, ${firstName}!</h2>
          <p>We have received your inquiry and are excited to connect with you.</p>
          <p>Our team will review your information and reach out within 24-48 hours to discuss the next steps in your wellness journey.</p>
          <p>In the meantime, if you have any questions, feel free to reply to this email or call us at <strong>+1 (800) 604-7294</strong>.</p>
          <p>Warm regards,<br>The Iboga Wellness Institute</p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Centers | Cozumel, Mexico</p>
          <p>https://theibogainstitute.org</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Thank you for your inquiry - Iboga Wellness Centers',
    body: htmlBody,
  })
}

