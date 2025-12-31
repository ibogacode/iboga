'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { hasOwnerAccess } from '@/lib/utils'

// Schema for admin editing Service Agreement (only admin fields)
const adminServiceAgreementSchema = z.object({
  formId: z.string().uuid(),
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
  provider_signature_name: z.string().min(1, 'Provider signature name is required'),
  provider_signature_first_name: z.string().min(1, 'Provider first name is required'),
  provider_signature_last_name: z.string().min(1, 'Provider last name is required'),
  provider_signature_date: z.string().min(1, 'Provider signature date is required'),
})

// Schema for admin editing Ibogaine Consent (only admin fields)
const adminIbogaineConsentSchema = z.object({
  formId: z.string().uuid(),
  treatment_date: z.string().min(1, 'Treatment date is required'),
  facilitator_doctor_name: z.string().min(1, 'Facilitator/Doctor name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(1, 'Address is required'),
})

// Get Service Agreement for admin editing
export const getServiceAgreementForAdminEdit = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Check if user is owner/admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
    }

    // Get form data
    const { data, error } = await adminClient
      .from('service_agreements')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()

    if (error || !data) {
      return { success: false, error: 'Form not found' }
    }

    return { success: true, data }
  })

// Update Service Agreement admin fields
export const updateServiceAgreementAdminFields = authActionClient
  .schema(adminServiceAgreementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Check if user is owner/admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
    }

    // Parse numeric values
    const totalProgramFee = parseFloat(parsedInput.total_program_fee.replace(/[^0-9.]/g, ''))
    const depositAmount = parseFloat(parsedInput.deposit_amount.replace(/[^0-9.]/g, ''))
    const depositPercentage = parseFloat(parsedInput.deposit_percentage.replace(/[^0-9.]/g, ''))
    const remainingBalance = parseFloat(parsedInput.remaining_balance.replace(/[^0-9.]/g, ''))
    
    // Parse date
    const providerSignatureDate = new Date(parsedInput.provider_signature_date)

    // Update only admin fields
    const { data, error } = await adminClient
      .from('service_agreements')
      .update({
        total_program_fee: totalProgramFee,
        deposit_amount: depositAmount,
        deposit_percentage: depositPercentage,
        remaining_balance: remainingBalance,
        provider_signature_name: parsedInput.provider_signature_name,
        provider_signature_first_name: parsedInput.provider_signature_first_name,
        provider_signature_last_name: parsedInput.provider_signature_last_name,
        provider_signature_date: providerSignatureDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.formId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  })

// Get Ibogaine Consent for admin editing
export const getIbogaineConsentForAdminEdit = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Check if user is owner/admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
    }

    // Get form data
    const { data, error } = await adminClient
      .from('ibogaine_consent_forms')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()

    if (error || !data) {
      return { success: false, error: 'Form not found' }
    }

    return { success: true, data }
  })

// Update Ibogaine Consent admin fields
export const updateIbogaineConsentAdminFields = authActionClient
  .schema(adminIbogaineConsentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Check if user is owner/admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
    }

    // Parse date
    const treatmentDate = new Date(parsedInput.treatment_date)
    const dateOfBirth = new Date(parsedInput.date_of_birth)

    // Update only admin fields
    const { data, error } = await adminClient
      .from('ibogaine_consent_forms')
      .update({
        treatment_date: treatmentDate.toISOString().split('T')[0],
        facilitator_doctor_name: parsedInput.facilitator_doctor_name,
        date_of_birth: dateOfBirth.toISOString().split('T')[0],
        address: parsedInput.address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.formId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  })

