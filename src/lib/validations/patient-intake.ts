import { z } from 'zod'

export const patientIntakeFormSchema = z.object({
  // Personal Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone_number: z.string().min(1, 'Phone number is required').regex(
    /^[\d\s\(\)\-]+$/,
    'Please enter a valid phone number'
  ),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  
  // Emergency Contact Information
  emergency_contact_first_name: z.string().min(1, 'Emergency contact first name is required'),
  emergency_contact_last_name: z.string().min(1, 'Emergency contact last name is required'),
  emergency_contact_email: z.string().email('Please enter a valid email address').optional().nullable(),
  emergency_contact_phone: z.string().min(1, 'Emergency contact phone number is required').regex(
    /^[\d\s\(\)\-]+$/,
    'Please enter a valid phone number'
  ),
  emergency_contact_address: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  
  // Consent and Agreements
  privacy_policy_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Privacy Policy to continue',
  }),
  // Ibogaine Therapy Consent - Individual sections
  consent_for_treatment: z.boolean().refine((val) => val === true, {
    message: 'You must accept Consent for Treatment to continue',
  }),
  risks_and_benefits: z.boolean().refine((val) => val === true, {
    message: 'You must accept Risks and Benefits to continue',
  }),
  pre_screening_health_assessment: z.boolean().refine((val) => val === true, {
    message: 'You must accept Pre-Screening and Health Assessment to continue',
  }),
  voluntary_participation: z.boolean().refine((val) => val === true, {
    message: 'You must accept Voluntary Participation to continue',
  }),
  confidentiality: z.boolean().refine((val) => val === true, {
    message: 'You must accept Confidentiality to continue',
  }),
  liability_release: z.boolean().refine((val) => val === true, {
    message: 'You must accept Liability Release to continue',
  }),
  payment_collection_1: z.boolean().refine((val) => val === true, {
    message: 'You must accept Payment Collection to continue',
  }),
  payment_collection_2: z.boolean().refine((val) => val === true, {
    message: 'You must accept Payment Collection to continue',
  }),
  ibogaine_therapy_consent_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept all Ibogaine Therapy Consent sections to continue',
  }),
  service_agreement_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Service Agreement to continue',
  }),
  release_consent_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Release Consent to continue',
  }),
  final_acknowledgment_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the final acknowledgment to continue',
  }),
  
  // Signature
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: z.string().min(1, 'Signature date is required'),
})

export type PatientIntakeFormValues = z.infer<typeof patientIntakeFormSchema>

