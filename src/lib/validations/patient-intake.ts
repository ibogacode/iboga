import { z } from 'zod'

export const patientIntakeFormSchema = z.object({
  // Personal Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .refine((email) => {
      // Check for proper domain format (must have @ and domain with TLD)
      const parts = email.split('@')
      if (parts.length !== 2) return false
      const domain = parts[1]
      if (!domain || domain.length === 0) return false
      // Must have at least one dot and TLD
      const domainParts = domain.split('.')
      return domainParts.length >= 2 && domainParts[domainParts.length - 1].length >= 2
    }, 'Please enter a valid email address with a proper domain'),
  phone_number: z.string()
    .min(1, 'Phone number is required')
    .regex(/^[\d\s\(\)\-]+$/, 'Please enter a valid phone number')
    .refine((phone) => {
      // Remove all non-digit characters and check minimum length
      const digitsOnly = phone.replace(/\D/g, '')
      return digitsOnly.length >= 10
    }, 'Phone number must contain at least 10 digits'),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional().nullable(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'Please select a state'),
  zip_code: z.string()
    .min(1, 'Zip code is required')
    .refine((val) => {
      // Only allow numbers and hyphens (US zip code format: 5 digits or 5+4 format)
      const zipPattern = /^\d{5}(-\d{4})?$/
      return zipPattern.test(val)
    }, 'Please enter a valid zip code (e.g., 12345 or 12345-6789)'),
  
  // Emergency Contact Information
  emergency_contact_first_name: z.string().min(1, 'Emergency contact first name is required'),
  emergency_contact_last_name: z.string().min(1, 'Emergency contact last name is required'),
  emergency_contact_email: z.union([
    z.string().email('Please enter a valid email address'),
    z.literal(''),
  ]).optional().nullable(),
  emergency_contact_phone: z.string()
    .min(1, 'Emergency contact phone number is required')
    .regex(/^[\d\s\(\)\-]+$/, 'Please enter a valid phone number')
    .refine((phone) => {
      // Remove all non-digit characters and check minimum length
      const digitsOnly = phone.replace(/\D/g, '')
      return digitsOnly.length >= 10
    }, 'Phone number must contain at least 10 digits'),
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

