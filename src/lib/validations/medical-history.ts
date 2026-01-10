import { z } from 'zod'

export const medicalHistoryFormSchema = z.object({
  // Personal Information (auto-populated from intake form)
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['M', 'F', 'other'], {
    error: 'Please select a gender',
  }),
  weight: z.string().min(1, 'Weight is required'),
  height: z.string().min(1, 'Height is required'),
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
  emergency_contact_name: z.string().min(1, 'Emergency contact name is required'),
  emergency_contact_phone: z.string()
    .min(1, 'Emergency contact phone is required')
    .regex(/^[\d\s\(\)\-]+$/, 'Please enter a valid phone number')
    .refine((phone) => {
      const digitsOnly = phone.replace(/\D/g, '')
      return digitsOnly.length >= 10
    }, 'Phone number must contain at least 10 digits'),
  
  // Health Information
  primary_care_provider: z.string().min(1, 'Primary care provider is required'),
  other_physicians: z.string().optional().nullable(),
  practitioners_therapists: z.string().optional().nullable(),
  
  // Medical History
  current_health_status: z.string().min(1, 'Current health status is required'),
  reason_for_coming: z.string().min(1, 'Reason for coming is required'),
  medical_conditions: z.string().min(1, 'Medical conditions is required'),
  substance_use_history: z.string().min(1, 'Substance use history is required'),
  family_personal_health_info: z.string().optional().nullable(),
  pain_stiffness_swelling: z.string().optional().nullable(),
  
  // Health Sections
  metabolic_health_concerns: z.string().optional().nullable(),
  digestive_health: z.string().optional().nullable(),
  reproductive_health: z.string().optional().nullable(),
  hormonal_health: z.string().optional().nullable(),
  immune_health: z.string().optional().nullable(),
  food_allergies_intolerance: z.string().optional().nullable(),
  difficulties_chewing_swallowing: z.string().optional().nullable(),
  
  // Medications
  medications_medical_use: z.string().optional().nullable(),
  medications_mental_health: z.string().optional().nullable(),
  
  // Mental Health
  mental_health_conditions: z.string().optional().nullable(),
  mental_health_treatment: z.string().min(1, 'Mental health treatment status is required'),
  
  // Allergies
  allergies: z.string().min(1, 'Allergies information is required'),
  
  // Previous Experiences
  previous_psychedelics_experiences: z.string().min(1, 'Previous psychedelics experiences is required'),
  
  // Physical Examination - Yes/No with conditional details and upload
  has_physical_examination: z.boolean().default(false),
  physical_examination_records: z.string().optional().nullable(),
  physical_examination_file_url: z.string().optional().nullable(),
  physical_examination_file_name: z.string().optional().nullable(),
  
  // Cardiac Evaluation - Yes/No with conditional details and upload
  has_cardiac_evaluation: z.boolean().default(false),
  cardiac_evaluation: z.string().optional().nullable(),
  cardiac_evaluation_file_url: z.string().optional().nullable(),
  cardiac_evaluation_file_name: z.string().optional().nullable(),
  
  // Liver Function Tests - Yes/No with conditional details and upload
  has_liver_function_tests: z.boolean().default(false),
  liver_function_tests: z.string().optional().nullable(),
  liver_function_tests_file_url: z.string().optional().nullable(),
  liver_function_tests_file_name: z.string().optional().nullable(),
  
  // Pregnancy
  is_pregnant: z.boolean().default(false),
  
  // Dietary and Lifestyle
  dietary_lifestyle_habits: z.string().min(1, 'Dietary and lifestyle habits is required'),
  physical_activity_exercise: z.string().min(1, 'Physical activity and exercise is required'),
  
  // Signature
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: z.string().min(1, 'Signature date is required'),
  
  // File upload (optional)
  uploaded_file_url: z.string().optional().nullable(),
  uploaded_file_name: z.string().optional().nullable(),
  
  // Link to intake form (optional, for auto-population)
  intake_form_id: z.union([
    z.string().uuid(),
    z.literal(''),
  ]).optional().nullable(),
})

export type MedicalHistoryFormValues = z.infer<typeof medicalHistoryFormSchema>
