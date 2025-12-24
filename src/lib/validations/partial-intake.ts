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
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  email: z.string()
    .email('Please enter a valid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
}).refine((data) => {
  // If filled by self, require patient information
  if (data.filled_by === 'self') {
    if (!data.first_name || data.first_name.trim() === '') {
      return false
    }
    if (!data.last_name || data.last_name.trim() === '') {
      return false
    }
    if (!data.email || data.email.trim() === '') {
      return false
    }
  }
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
  message: 'Please fill in all required information',
  path: ['filled_by'],
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
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  email: z.string()
    .email('Please enter a valid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone_number: z.string()
    .optional()
    .nullable()
    .refine((phone) => {
      if (!phone || phone.trim() === '') return true // Optional when someone else fills
      const digitsOnly = phone.replace(/\D/g, '')
      return digitsOnly.length >= 10
    }, 'Phone number must contain at least 10 digits'),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.trim() === '') return true // Optional when someone else fills
      const zipPattern = /^\d{5}(-\d{4})?$/
      return zipPattern.test(val)
    }, 'Please enter a valid zip code (e.g., 12345 or 12345-6789)'),
  emergency_contact_first_name: z.string().optional().nullable(),
  emergency_contact_last_name: z.string().optional().nullable(),
  emergency_contact_email: z.union([
    z.string().email('Please enter a valid email address'),
    z.literal(''),
  ]).optional().nullable(),
  emergency_contact_phone: z.string()
    .optional()
    .nullable()
    .refine((phone) => {
      if (!phone || phone.trim() === '') return true // Optional when someone else fills
      const digitsOnly = phone.replace(/\D/g, '')
      return digitsOnly.length >= 10
    }, 'Phone number must contain at least 10 digits'),
  emergency_contact_address: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  program_type: z.enum(['neurological', 'mental_health', 'addiction']).optional().nullable(),
}).refine((data) => {
  // If filled by self, require patient information
  if (data.filled_by === 'self') {
    if (!data.first_name || data.first_name.trim() === '') {
      return false
    }
    if (!data.last_name || data.last_name.trim() === '') {
      return false
    }
    if (!data.email || data.email.trim() === '') {
      return false
    }
    if (!data.phone_number || data.phone_number.trim() === '') {
      return false
    }
    if (!data.address || data.address.trim() === '') {
      return false
    }
    if (!data.city || data.city.trim() === '') {
      return false
    }
    if (!data.state || data.state.trim() === '') {
      return false
    }
    if (!data.zip_code || data.zip_code.trim() === '') {
      return false
    }
    if (!data.emergency_contact_first_name || data.emergency_contact_first_name.trim() === '') {
      return false
    }
    if (!data.emergency_contact_last_name || data.emergency_contact_last_name.trim() === '') {
      return false
    }
    if (!data.emergency_contact_phone || data.emergency_contact_phone.trim() === '') {
      return false
    }
    if (!data.program_type) {
      return false
    }
  }
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
  message: 'Please fill in all required information',
  path: ['filled_by'],
})

// Union schema for both modes
export const partialIntakeFormSchema = z.discriminatedUnion('mode', [
  minimalIntakeSchema,
  partialIntakeSchema,
])

export type MinimalIntakeFormValues = z.infer<typeof minimalIntakeSchema>
export type PartialIntakeFormValues = z.infer<typeof partialIntakeSchema>
export type PartialIntakeFormSchemaValues = z.infer<typeof partialIntakeFormSchema>
