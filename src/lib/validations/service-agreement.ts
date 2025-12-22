import { z } from 'zod'

export const serviceAgreementSchema = z.object({
  // Patient Information
  patient_first_name: z.string().min(1, 'First name is required'),
  patient_last_name: z.string().min(1, 'Last name is required'),
  patient_email: z.string().email('Valid email is required'),
  patient_phone_number: z.string().min(1, 'Phone number is required'),
  
  // Fees & Payment
  total_program_fee: z.string().min(1, 'Total program fee is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num > 0
    },
    { message: 'Total program fee must be a valid number greater than 0' }
  ),
  deposit_amount: z.string().min(1, 'Deposit amount is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num > 0
    },
    { message: 'Deposit amount must be a valid number greater than 0' }
  ),
  deposit_percentage: z.string().min(1, 'Deposit percentage is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num >= 0 && num <= 100
    },
    { message: 'Deposit percentage must be between 0 and 100' }
  ),
  remaining_balance: z.string().min(1, 'Remaining balance is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num >= 0
    },
    { message: 'Remaining balance must be a valid number' }
  ),
  payment_method: z.string().min(1, 'Payment method is required'),
  
  // Patient Signature
  patient_signature_name: z.string().min(1, 'Patient signature name is required'),
  patient_signature_first_name: z.string().min(1, 'Patient first name is required'),
  patient_signature_last_name: z.string().min(1, 'Patient last name is required'),
  patient_signature_date: z.string().min(1, 'Patient signature date is required'),
  patient_signature_data: z.string().optional(),
  
  // Provider Signature
  provider_signature_name: z.string().min(1, 'Provider signature name is required'),
  provider_signature_first_name: z.string().min(1, 'Provider first name is required'),
  provider_signature_last_name: z.string().min(1, 'Provider last name is required'),
  provider_signature_date: z.string().min(1, 'Provider signature date is required'),
  provider_signature_data: z.string().optional(),
  
  // File Upload
  uploaded_file_url: z.string().optional(),
  uploaded_file_name: z.string().optional(),
  
  // Optional links
  patient_id: z.string().uuid().optional(),
  intake_form_id: z.string().uuid().optional(),
})

export type ServiceAgreementFormValues = z.infer<typeof serviceAgreementSchema>
