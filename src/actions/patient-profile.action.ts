'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasOwnerAccess } from '@/lib/utils'

// Schema for getting patient profile
const getPatientProfileSchema = z.object({
  patientId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  partialFormId: z.string().uuid().optional(),
  intakeFormId: z.string().uuid().optional(),
})

// Get patient profile with all form statuses
export const getPatientProfile = authActionClient
  .schema(getPatientProfileSchema)
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

    let patientData: any = null
    let intakeForm: any = null
    let partialForm: any = null

    // Try to find patient by different identifiers
    if (parsedInput.patientId) {
      // Get by patient profile ID
      const { data: patientProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', parsedInput.patientId)
        .eq('role', 'patient')
        .maybeSingle()
      
      if (patientProfile) {
        patientData = patientProfile
      }
    } else if (parsedInput.email) {
      // Get by email
      const { data: patientProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('email', parsedInput.email)
        .eq('role', 'patient')
        .maybeSingle()
      
      if (patientProfile) {
        patientData = patientProfile
      }
    }

    // Get intake form or partial form first (prioritize by what ID was provided)
    if (parsedInput.intakeFormId) {
      console.log('[getPatientProfile] Looking for intake form:', parsedInput.intakeFormId)
      const { data, error } = await adminClient
        .from('patient_intake_forms')
        .select('*')
        .eq('id', parsedInput.intakeFormId)
        .maybeSingle()
      
      console.log('[getPatientProfile] Intake form result:', { data: !!data, error })
      
      if (data) {
        intakeForm = data
        // If we don't have patient data yet, try to find by email
        if (!patientData && data.email) {
          const { data: patientProfile } = await adminClient
            .from('profiles')
            .select('*')
            .eq('email', data.email)
            .eq('role', 'patient')
            .maybeSingle()
          
          if (patientProfile) {
            patientData = patientProfile
          }
        }
      }
    }
    
    if (parsedInput.partialFormId) {
      console.log('[getPatientProfile] Looking for partial form:', parsedInput.partialFormId)
      // Get partial form
      const { data, error } = await adminClient
        .from('partial_intake_forms')
        .select('*')
        .eq('id', parsedInput.partialFormId)
        .maybeSingle()
      
      console.log('[getPatientProfile] Partial form result:', { data: !!data, error })
      
      if (data) {
        partialForm = data
        // Get intake form if completed
        if (data.completed_form_id) {
          const { data: intakeData } = await adminClient
            .from('patient_intake_forms')
            .select('*')
            .eq('id', data.completed_form_id)
            .maybeSingle()
          
          if (intakeData) {
            intakeForm = intakeData
          }
        }
        
        // If we don't have patient data yet, try to find by email
        if (!patientData && data.email) {
          const { data: patientProfile } = await adminClient
            .from('profiles')
            .select('*')
            .eq('email', data.email)
            .eq('role', 'patient')
            .maybeSingle()
          
          if (patientProfile) {
            patientData = patientProfile
          }
        }
      }
    }
    
    // If we have patient data but no forms yet, try to get latest intake form
    if (patientData?.email && !intakeForm && !partialForm) {
      const { data: intakeForms } = await adminClient
        .from('patient_intake_forms')
        .select('*')
        .ilike('email', patientData.email)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (intakeForms && intakeForms.length > 0) {
        intakeForm = intakeForms[0]
      }
    }

    // If we still don't have patient data but have intake form, create a basic patient object
    if (!patientData && intakeForm) {
      console.log('[getPatientProfile] Creating patient object from intake form')
      patientData = {
        id: null,
        first_name: intakeForm.first_name,
        last_name: intakeForm.last_name,
        email: intakeForm.email,
        phone: intakeForm.phone_number,
        role: 'patient',
      }
    }

    // If we still don't have patient data but have partial form, create a basic patient object
    if (!patientData && partialForm) {
      console.log('[getPatientProfile] Creating patient object from partial form')
      patientData = {
        id: null,
        first_name: partialForm.first_name,
        last_name: partialForm.last_name,
        email: partialForm.email,
        phone: partialForm.phone_number,
        role: 'patient',
      }
    }

    console.log('[getPatientProfile] Final patient data:', { 
      hasPatient: !!patientData, 
      hasIntake: !!intakeForm, 
      hasPartial: !!partialForm 
    })

    if (!patientData && !intakeForm && !partialForm) {
      console.error('[getPatientProfile] No patient data, intake form, or partial form found')
      return { success: false, error: 'Patient not found - no forms or profile found with the provided ID' }
    }

    // If we still don't have patient data, create a minimal one
    if (!patientData) {
      console.log('[getPatientProfile] Creating minimal patient object')
      patientData = {
        id: null,
        first_name: intakeForm?.first_name || partialForm?.first_name || 'Unknown',
        last_name: intakeForm?.last_name || partialForm?.last_name || 'Patient',
        email: intakeForm?.email || partialForm?.email || '',
        phone: intakeForm?.phone_number || partialForm?.phone_number || null,
        role: 'patient',
      }
    }

    // Get form statuses
    const patientEmail = patientData.email || intakeForm?.email || partialForm?.email
    const patientId = patientData.id

    // Get medical history form
    let medicalHistoryForm: any = null
    if (intakeForm?.id) {
      const { data: medicalData } = await adminClient
        .from('medical_history_forms')
        .select('*')
        .eq('intake_form_id', intakeForm.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (medicalData && medicalData.length > 0) {
        medicalHistoryForm = medicalData[0]
      }
    } else if (patientEmail) {
      const { data: medicalData } = await adminClient
        .from('medical_history_forms')
        .select('*')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (medicalData && medicalData.length > 0) {
        medicalHistoryForm = medicalData[0]
      }
    }

    // Get service agreement
    let serviceAgreement: any = null
    if (patientId) {
      const { data: serviceData } = await adminClient
        .from('service_agreements')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (serviceData && serviceData.length > 0) {
        serviceAgreement = serviceData[0]
      }
    } else if (patientEmail) {
      const { data: serviceData } = await adminClient
        .from('service_agreements')
        .select('*')
        .ilike('patient_email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (serviceData && serviceData.length > 0) {
        serviceAgreement = serviceData[0]
      }
    }

    // Get ibogaine consent form
    let ibogaineConsentForm: any = null
    if (patientId) {
      const { data: consentData } = await adminClient
        .from('ibogaine_consent_forms')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (consentData && consentData.length > 0) {
        ibogaineConsentForm = consentData[0]
      }
    } else if (intakeForm?.id) {
      const { data: consentData } = await adminClient
        .from('ibogaine_consent_forms')
        .select('*')
        .eq('intake_form_id', intakeForm.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (consentData && consentData.length > 0) {
        ibogaineConsentForm = consentData[0]
      }
    } else if (patientEmail) {
      const { data: consentData } = await adminClient
        .from('ibogaine_consent_forms')
        .select('*')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (consentData && consentData.length > 0) {
        ibogaineConsentForm = consentData[0]
      }
    }

    // Determine form statuses with proper types
    const intakeStatus: 'completed' | 'pending' | 'not_started' = intakeForm ? 'completed' : partialForm ? 'pending' : 'not_started'
    const medicalHistoryStatus: 'completed' | 'not_started' = medicalHistoryForm ? 'completed' : 'not_started'
    const serviceAgreementStatus: 'completed' | 'not_started' = serviceAgreement ? 'completed' : 'not_started'
    const ibogaineConsentStatus: 'completed' | 'not_started' = ibogaineConsentForm ? 'completed' : 'not_started'

    return {
      success: true,
      data: {
        patient: patientData,
        intakeForm,
        partialForm,
        medicalHistoryForm,
        serviceAgreement,
        ibogaineConsentForm,
        formStatuses: {
          intake: intakeStatus,
          medicalHistory: medicalHistoryStatus,
          serviceAgreement: serviceAgreementStatus,
          ibogaineConsent: ibogaineConsentStatus,
        },
      },
    }
  })

// Get intake form by ID for viewing
export const getIntakeFormById = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Get user profile to check role and email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role, first_name, last_name')
      .eq('id', ctx.user.id)
      .single()
    
    // Fetch the intake form
    const { data, error } = await adminClient
      .from('patient_intake_forms')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Form not found' }
    }
    
    // If user is not admin/owner, verify they own the form
    if (profile && profile.role !== 'admin' && profile.role !== 'owner') {
      const patientEmail = (profile.email || '').trim().toLowerCase()
      const formEmail = (data.email || '').trim().toLowerCase()
      
      // Check email match
      if (patientEmail && formEmail && patientEmail !== formEmail) {
        // Also check by name as fallback
        const patientFirstName = (profile.first_name || '').trim().toLowerCase()
        const patientLastName = (profile.last_name || '').trim().toLowerCase()
        const formFirstName = (data.first_name || '').trim().toLowerCase()
        const formLastName = (data.last_name || '').trim().toLowerCase()
        
        if (patientFirstName !== formFirstName || patientLastName !== formLastName) {
          return { success: false, error: 'Unauthorized - You can only view your own forms' }
        }
      }
    }
    
    return { success: true, data }
  })

// Get medical history form by ID for viewing
export const getMedicalHistoryFormById = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient
      .from('medical_history_forms')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Form not found' }
    }
    
    return { success: true, data }
  })

// Get service agreement by ID for viewing
export const getServiceAgreementById = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient
      .from('service_agreements')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Service agreement not found' }
    }
    
    return { success: true, data }
  })

export const getIbogaineConsentFormById = authActionClient
  .schema(z.object({ formId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient
      .from('ibogaine_consent_forms')
      .select('*')
      .eq('id', parsedInput.formId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Ibogaine consent form not found' }
    }
    
    return { success: true, data }
  })

// Schema for updating patient details
const updatePatientSchema = z.object({
  patientId: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
})

// Update patient details
export const updatePatientDetails = authActionClient
  .schema(updatePatientSchema)
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

    // Update patient profile
    const updateData: any = {}
    if (parsedInput.first_name !== undefined) updateData.first_name = parsedInput.first_name
    if (parsedInput.last_name !== undefined) updateData.last_name = parsedInput.last_name
    if (parsedInput.email !== undefined) updateData.email = parsedInput.email
    if (parsedInput.phone !== undefined) updateData.phone = parsedInput.phone
    if (parsedInput.date_of_birth !== undefined) updateData.date_of_birth = parsedInput.date_of_birth
    if (parsedInput.gender !== undefined) updateData.gender = parsedInput.gender
    if (parsedInput.address !== undefined) updateData.address = parsedInput.address
    if (parsedInput.city !== undefined) updateData.city = parsedInput.city
    if (parsedInput.state !== undefined) updateData.state = parsedInput.state
    if (parsedInput.zip_code !== undefined) updateData.zip_code = parsedInput.zip_code
    if (parsedInput.country !== undefined) updateData.country = parsedInput.country

    const { data, error } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', parsedInput.patientId)
      .eq('role', 'patient')
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  })
