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
  provider_signature_date: z.string().min(1, 'Provider signature date is required'),
  number_of_days: z.string().min(1, 'Number of days is required').refine(
    (val) => {
      const num = parseInt(val, 10)
      return !isNaN(num) && num > 0
    },
    { message: 'Number of days must be a valid positive integer' }
  ),
})

// Schema for upgrading Service Agreement (days + amount columns + percentage only, no signatures)
const upgradeServiceAgreementSchema = z.object({
  formId: z.string().uuid(),
  number_of_days: z.string().min(1, 'Number of days is required').refine(
    (val) => {
      const num = parseInt(val, 10)
      return !isNaN(num) && num > 0
    },
    { message: 'Number of days must be a valid positive integer' }
  ),
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
})

// Schema for admin editing Ibogaine Consent (only admin fields)
// facilitator_doctor_name can be overridden per form if needed
const adminIbogaineConsentSchema = z.object({
  formId: z.string().uuid(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(1, 'Address is required'),
  facilitator_doctor_name: z.string().min(1, 'Facilitator/Doctor name is required').optional(),
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

    // Get form data including program_type from intake_form if available
    const { data, error } = await adminClient
      .from('service_agreements')
      .select('*, intake_form_id')
      .eq('id', parsedInput.formId)
      .single()

    if (error || !data) {
      return { success: false, error: 'Form not found' }
    }

    // Get program_type from intake_form if available
    let programType: 'neurological' | 'mental_health' | 'addiction' | null = data.program_type || null
    if (!programType && data.intake_form_id) {
      const { data: intakeForm } = await adminClient
        .from('patient_intake_forms')
        .select('program_type')
        .eq('id', data.intake_form_id)
        .single()
      
      if (intakeForm?.program_type && ['neurological', 'mental_health', 'addiction'].includes(intakeForm.program_type)) {
        programType = intakeForm.program_type as 'neurological' | 'mental_health' | 'addiction'
      }
    }

    return { 
      success: true, 
      data: {
        ...data,
        program_type: programType,
      }
    }
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

    // Parse numeric values and validate
    const totalProgramFee = parseFloat(parsedInput.total_program_fee.replace(/[^0-9.]/g, ''))
    const depositAmount = parseFloat(parsedInput.deposit_amount.replace(/[^0-9.]/g, ''))
    const depositPercentage = parseFloat(parsedInput.deposit_percentage.replace(/[^0-9.]/g, ''))
    const remainingBalance = parseFloat(parsedInput.remaining_balance.replace(/[^0-9.]/g, ''))
    const numberOfDays = parseInt(parsedInput.number_of_days, 10)
    
    // Validate numeric values
    if (isNaN(totalProgramFee) || totalProgramFee <= 0) {
      return { success: false, error: 'Total program fee must be a valid number greater than 0' }
    }
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return { success: false, error: 'Deposit amount must be a valid number greater than 0' }
    }
    if (isNaN(depositPercentage) || depositPercentage < 0 || depositPercentage > 100) {
      return { success: false, error: 'Deposit percentage must be between 0 and 100' }
    }
    if (isNaN(remainingBalance) || remainingBalance < 0) {
      return { success: false, error: 'Remaining balance must be a valid number greater than or equal to 0' }
    }
    if (isNaN(numberOfDays) || numberOfDays <= 0) {
      return { success: false, error: 'Number of days must be a valid positive integer' }
    }
    
    // Parse and validate date
    const providerSignatureDate = new Date(parsedInput.provider_signature_date)
    if (isNaN(providerSignatureDate.getTime())) {
      return { success: false, error: 'Provider signature date must be a valid date' }
    }
    
    // Trim text fields to ensure they're not empty
    const providerSignatureName = parsedInput.provider_signature_name.trim()
    
    if (!providerSignatureName) {
      return { success: false, error: 'Provider signature name is required' }
    }

    // Get program_type from intake_form if available
    const { data: formData } = await adminClient
      .from('service_agreements')
      .select('intake_form_id')
      .eq('id', parsedInput.formId)
      .single()

    let programType: 'neurological' | 'mental_health' | 'addiction' | null = null
    if (formData?.intake_form_id) {
      const { data: intakeForm } = await adminClient
        .from('patient_intake_forms')
        .select('program_type')
        .eq('id', formData.intake_form_id)
        .single()
      
      if (intakeForm?.program_type && ['neurological', 'mental_health', 'addiction'].includes(intakeForm.program_type)) {
        programType = intakeForm.program_type as 'neurological' | 'mental_health' | 'addiction'
      }
    }

    // Update only admin fields
    const { data, error } = await adminClient
      .from('service_agreements')
      .update({
        total_program_fee: totalProgramFee,
        deposit_amount: depositAmount,
        deposit_percentage: depositPercentage,
        remaining_balance: remainingBalance,
        provider_signature_name: providerSignatureName,
        provider_signature_date: providerSignatureDate.toISOString().split('T')[0],
        number_of_days: numberOfDays,
        program_type: programType,
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

// Upgrade Service Agreement (days, amounts, percentage only – no signatures)
export const upgradeServiceAgreement = authActionClient
  .schema(upgradeServiceAgreementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()

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

    const totalProgramFee = parseFloat(parsedInput.total_program_fee.replace(/[^0-9.]/g, ''))
    const depositAmount = parseFloat(parsedInput.deposit_amount.replace(/[^0-9.]/g, ''))
    const depositPercentage = parseFloat(parsedInput.deposit_percentage.replace(/[^0-9.]/g, ''))
    const remainingBalance = parseFloat(parsedInput.remaining_balance.replace(/[^0-9.]/g, ''))
    const numberOfDays = parseInt(parsedInput.number_of_days, 10)

    if (isNaN(totalProgramFee) || totalProgramFee <= 0) {
      return { success: false, error: 'Total program fee must be a valid number greater than 0' }
    }
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return { success: false, error: 'Deposit amount must be a valid number greater than 0' }
    }
    if (isNaN(depositPercentage) || depositPercentage < 0 || depositPercentage > 100) {
      return { success: false, error: 'Deposit percentage must be between 0 and 100' }
    }
    if (isNaN(remainingBalance) || remainingBalance < 0) {
      return { success: false, error: 'Remaining balance must be a valid number' }
    }
    if (isNaN(numberOfDays) || numberOfDays <= 0) {
      return { success: false, error: 'Number of days must be a valid positive integer' }
    }

    const { data, error } = await adminClient
      .from('service_agreements')
      .update({
        number_of_days: numberOfDays,
        total_program_fee: totalProgramFee,
        deposit_amount: depositAmount,
        deposit_percentage: depositPercentage,
        remaining_balance: remainingBalance,
        payment_method: parsedInput.payment_method.trim(),
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

    // Get facilitator_doctor_name from defaults table
    // Use adminClient to bypass RLS (service role has full access)
    const { data: defaults, error: defaultsError } = await adminClient
      .from('form_defaults')
      .select('*')
      .eq('form_type', 'ibogaine_consent')
      .maybeSingle()

    if (defaultsError) {
      console.error('[getIbogaineConsentForAdminEdit] Error fetching defaults:', defaultsError)
    }

    // Log what we got for debugging
    console.log('[getIbogaineConsentForAdminEdit] Defaults query result:', {
      hasData: !!defaults,
      formType: defaults?.form_type,
      defaultValuesType: defaults?.default_values ? typeof defaults.default_values : 'null',
      defaultValuesRaw: defaults?.default_values,
      fullDefaults: defaults
    })

    // Handle JSONB column - Supabase should automatically parse JSONB, but handle both cases
    let defaultValues: any = null
    if (defaults?.default_values) {
      if (typeof defaults.default_values === 'string') {
        try {
          defaultValues = JSON.parse(defaults.default_values)
        } catch (e) {
          console.error('[getIbogaineConsentForAdminEdit] Error parsing default_values string:', e, defaults.default_values)
        }
      } else if (typeof defaults.default_values === 'object') {
        // JSONB should already be parsed as an object
        defaultValues = defaults.default_values
      }
    }

    console.log('[getIbogaineConsentForAdminEdit] Parsed defaultValues:', defaultValues)
    
    // Extract facilitator_doctor_name from the parsed default values
    const facilitatorDoctorName = defaultValues?.facilitator_doctor_name || null
    
    console.log('[getIbogaineConsentForAdminEdit] Extracted facilitator_doctor_name:', facilitatorDoctorName)

    // Include facilitator name from defaults in response
    return { 
      success: true, 
      data: {
        ...data,
        facilitator_doctor_name_from_defaults: facilitatorDoctorName,
      }
    }
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
    const dateOfBirth = new Date(parsedInput.date_of_birth)
    const updateData: any = {
      date_of_birth: dateOfBirth.toISOString().split('T')[0],
      address: parsedInput.address,
      updated_at: new Date().toISOString(),
    }
    
    // Allow overriding facilitator_doctor_name if provided (normally comes from defaults)
    if (parsedInput.facilitator_doctor_name) {
      updateData.facilitator_doctor_name = parsedInput.facilitator_doctor_name
    }

    // Update only admin fields
    const { data, error } = await adminClient
      .from('ibogaine_consent_forms')
      .update(updateData)
      .eq('id', parsedInput.formId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  })

