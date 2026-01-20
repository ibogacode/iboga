import { z } from 'zod'

export const patientIntakeFormSchema = z.object({
  // Form Filler Information
  filled_by: z.enum(['self', 'someone_else'], {
    error: 'Please select who is filling out this form',
  }),
  filler_relationship: z.string().optional().nullable(),
  filler_first_name: z.string().optional().nullable(),
  filler_last_name: z.string().optional().nullable(),
  filler_email: z.union([
    z.string().email('Please enter a valid email address'),
    z.literal(''),
  ]).optional().nullable(),
  filler_phone: z.string().optional().nullable().refine(
    (val) => {
      if (!val) return true // Optional field
      const digitsOnly = val.replace(/\D/g, '')
      return digitsOnly.length >= 10
    },
    { message: 'Phone number must contain at least 10 digits' }
  ),
  
  // Program Type
  program_type: z.enum(['neurological', 'mental_health', 'addiction'], {
    error: 'Please select a program type',
  }),
  
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
  address_line_1: z.string().min(1, 'Address Line 1 is required'),
  address_line_2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  zip_code: z.string().min(1, 'Zip code or postal code is required'),
  
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
  // Optional field for linking to partial form (not validated, just passed through)
  partialFormId: z.string().uuid().optional(),
})
  .refine((data) => {
    // If filled by someone else, require filler information
    if (data.filled_by === 'someone_else') {
      if (!data.filler_relationship || data.filler_relationship.trim() === '') {
        return false
      }
      if (!data.filler_first_name || data.filler_first_name.trim() === '') {
        return false
      }
      if (!data.filler_last_name || data.filler_last_name.trim() === '') {
        return false
      }
      if (!data.filler_email || data.filler_email.trim() === '') {
        return false
      }
      if (!data.filler_phone || data.filler_phone.trim() === '') {
        return false
      }
    }
    return true
  }, {
    message: 'Please fill in all required information for the person filling out this form',
    path: ['filler_relationship'], // Show error on relationship field
  })
  // No country-specific validation - accept any format for global compatibility

export type PatientIntakeFormValues = z.infer<typeof patientIntakeFormSchema>
