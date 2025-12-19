import { z } from 'zod'

// Schema for minimal mode (name and email only)
export const minimalIntakeSchema = z.object({
  mode: z.literal('minimal'),
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
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
}).refine((data) => {
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
  path: ['filler_relationship'],
})

// Schema for partial mode (up to emergency contact)
export const partialIntakeSchema = z.object({
  mode: z.literal('partial'),
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
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone_number: z.string()
    .min(1, 'Phone number is required')
    .regex(/^[\d\s\(\)\-]+$/, 'Please enter a valid phone number')
    .refine((phone) => {
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
      const zipPattern = /^\d{5}(-\d{4})?$/
      return zipPattern.test(val)
    }, 'Please enter a valid zip code (e.g., 12345 or 12345-6789)'),
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
      const digitsOnly = phone.replace(/\D/g, '')
      return digitsOnly.length >= 10
    }, 'Phone number must contain at least 10 digits'),
  emergency_contact_address: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  program_type: z.enum(['neurological', 'mental_health', 'addiction'], {
    error: 'Please select a program type',
  }),
}).refine((data) => {
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
  path: ['filler_relationship'],
})

// Union schema for both modes
export const partialIntakeFormSchema = z.discriminatedUnion('mode', [
  minimalIntakeSchema,
  partialIntakeSchema,
])

export type MinimalIntakeFormValues = z.infer<typeof minimalIntakeSchema>
export type PartialIntakeFormValues = z.infer<typeof partialIntakeSchema>
export type PartialIntakeFormSchemaValues = z.infer<typeof partialIntakeFormSchema>
