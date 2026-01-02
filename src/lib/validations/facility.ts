import { z } from 'zod'
import { UserRole } from '@/types'

export const addEmployeeSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'doctor', 'psych', 'nurse', 'driver'] as const, {
    error: 'Please select a valid role',
  }),
  phone: z.string().optional(),
  designation: z.string().optional(),
  payRatePerDay: z.string().optional().refine(
    (val) => {
      if (!val) return true // Optional field
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    },
    { message: 'Pay rate must be a valid number greater than or equal to 0' }
  ),
})

export const updateEmployeeSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'doctor', 'psych', 'nurse', 'driver'] as const, {
    error: 'Please select a valid role',
  }),
  phone: z.string().optional(),
  designation: z.string().optional(),
  payRatePerDay: z.string().optional().refine(
    (val) => {
      if (!val) return true // Optional field
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    },
    { message: 'Pay rate must be a valid number greater than or equal to 0' }
  ),
})

export const addPatientSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  notes: z.string().optional(),
})
