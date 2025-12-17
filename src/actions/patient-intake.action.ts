'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { patientIntakeFormSchema } from '@/lib/validations/patient-intake'
import { headers } from 'next/headers'
import { sendEmail } from './email.action'

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
    
    // Parse signature_date
    const signatureDate = new Date(parsedInput.signature_date)
    
    // Insert form submission
    const { data, error } = await supabase
      .from('patient_intake_forms')
      .insert({
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        email: parsedInput.email,
        phone_number: parsedInput.phone_number,
        date_of_birth: dateOfBirth,
        gender: parsedInput.gender,
        address: parsedInput.address,
        city: parsedInput.city,
        state: parsedInput.state,
        zip_code: parsedInput.zip_code,
        emergency_contact_first_name: parsedInput.emergency_contact_first_name,
        emergency_contact_last_name: parsedInput.emergency_contact_last_name,
        emergency_contact_email: parsedInput.emergency_contact_email,
        emergency_contact_phone: parsedInput.emergency_contact_phone,
        emergency_contact_address: parsedInput.emergency_contact_address,
        emergency_contact_relationship: parsedInput.emergency_contact_relationship,
        privacy_policy_accepted: parsedInput.privacy_policy_accepted,
        consent_for_treatment: parsedInput.consent_for_treatment,
        risks_and_benefits: parsedInput.risks_and_benefits,
        pre_screening_health_assessment: parsedInput.pre_screening_health_assessment,
        voluntary_participation: parsedInput.voluntary_participation,
        confidentiality: parsedInput.confidentiality,
        liability_release: parsedInput.liability_release,
        payment_collection_1: parsedInput.payment_collection_1,
        payment_collection_2: parsedInput.payment_collection_2,
        ibogaine_therapy_consent_accepted: parsedInput.ibogaine_therapy_consent_accepted,
        service_agreement_accepted: parsedInput.service_agreement_accepted,
        release_consent_accepted: parsedInput.release_consent_accepted,
        final_acknowledgment_accepted: parsedInput.final_acknowledgment_accepted,
        signature_data: parsedInput.signature_data,
        signature_date: signatureDate,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Send confirmation email to the user (don't await - fire and forget)
    sendConfirmationEmail(parsedInput.email, parsedInput.first_name).catch(console.error)
    
    return { success: true, data: { id: data.id } }
  })

// Send confirmation email after form submission
async function sendConfirmationEmail(email: string, firstName: string) {
  const schedulingLink = 'https://calendar.app.google/8oZsS2sTMrM9pVov7' // Replace with your actual scheduling link
  
  const htmlBody = `
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
        .cta-button {
          display: inline-block;
          background: #5D7A5F;
          color: white !important;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          margin: 20px 0;
        }
        .cta-button:hover {
          background: #4a6350;
        }
        .cta-container {
          text-align: center;
          margin: 30px 0;
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
        .divider {
          height: 1px;
          background: #eee;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iboga Wellness Institute</h1>
        </div>
        <div class="content">
          <h2>Thank You, ${firstName}!</h2>
          <p>We have received your application and are excited to connect with you on your wellness journey.</p>
          <p>Our team will review your information carefully. In the meantime, we invite you to <strong>schedule a consultation call</strong> with us at your earliest convenience.</p>
          
          <div class="cta-container">
            <a href="${schedulingLink}" class="cta-button">Schedule Your Call</a>
          </div>
          
          <p>During this call, we'll discuss:</p>
          <ul style="color: #555;">
            <li>Your health goals and expectations</li>
            <li>The treatment process and what to expect</li>
            <li>Any questions you may have</li>
            <li>Next steps in your journey</li>
          </ul>
          
          <div class="divider"></div>
          
          <p>If you have any immediate questions, feel free to reach out:</p>
          <p>
            <strong>Phone:</strong> +1 (800) 604-7294<br>
            <strong>Email:</strong> james@theibogainstitute.org
          </p>
          
          <p>We look forward to speaking with you soon!</p>
          <p>Warm regards,<br><strong>The Iboga Wellness Institute Team</strong></p>
        </div>
        <div class="footer">
          <p>Iboga Wellness Institute | Cozumel, Mexico</p>
          <p><a href="https://theibogainstitute.org">theibogainstitute.org</a></p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Thank You for Your Application - Schedule Your Consultation | Iboga Wellness Institute',
    body: htmlBody,
  })
}

