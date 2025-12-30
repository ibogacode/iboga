import { z } from 'zod'

export const ibogaineConsentFormSchema = z.object({
  // Patient Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  phone_number: z.string()
    .min(1, 'Phone number is required')
    .regex(/^[\d\s\(\)\-]+$/, 'Please enter a valid phone number')
    .refine((phone) => {
      const digitsOnly = phone.replace(/\D/g, '')
      return digitsOnly.length >= 10
    }, 'Phone number must contain at least 10 digits'),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  address: z.string().min(1, 'Address is required'),
  
  // Therapy Information
  treatment_date: z.string().min(1, 'Treatment date is required'),
  facilitator_doctor_name: z.string().min(1, 'Facilitator/Doctor name is required'),
  
  // Consent Sections (all required - checkboxes)
  consent_for_treatment: z.boolean().refine((val) => val === true, {
    message: 'You must consent to treatment',
  }),
  risks_and_benefits: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge risks and benefits',
  }),
  pre_screening_health_assessment: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge pre-screening and health assessment',
  }),
  voluntary_participation: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge voluntary participation',
  }),
  confidentiality: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge confidentiality',
  }),
  liability_release: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge liability release',
  }),
  payment_collection: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge payment collection',
  }),
  
  // Signature
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: z.string().min(1, 'Signature date is required'),
  signature_name: z.string().min(1, 'Signature name is required'),
  
  // Optional links
  patient_id: z.string().uuid().optional().nullable(),
  intake_form_id: z.string().uuid().optional().nullable(),
})

export type IbogaineConsentFormValues = z.infer<typeof ibogaineConsentFormSchema>

