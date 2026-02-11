'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasOwnerAccess, isStaffRole } from '@/lib/utils'

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
    
    if (!profile || !isStaffRole(profile.role)) {
      return { success: false, error: 'Unauthorized - Staff access required' }
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

    // Get service agreement (include patient signature fields to check completion)
    let serviceAgreement: any = null
    if (patientId) {
      const { data: serviceData } = await adminClient
        .from('service_agreements')
        .select('*, is_activated, activated_at, activated_by, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (serviceData && serviceData.length > 0) {
        serviceAgreement = serviceData[0]
      }
    } else if (patientEmail) {
      const { data: serviceData } = await adminClient
        .from('service_agreements')
        .select('*, is_activated, activated_at, activated_by, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
        .ilike('patient_email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (serviceData && serviceData.length > 0) {
        serviceAgreement = serviceData[0]
      }
    }

    // Get ibogaine consent form (include patient signature fields to check completion)
    let ibogaineConsentForm: any = null
    if (patientId) {
      const { data: consentData } = await adminClient
        .from('ibogaine_consent_forms')
        .select('*, is_activated, activated_at, activated_by, signature_data, signature_date, signature_name')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (consentData && consentData.length > 0) {
        ibogaineConsentForm = consentData[0]
      }
    } else if (intakeForm?.id) {
      const { data: consentData } = await adminClient
        .from('ibogaine_consent_forms')
        .select('*, is_activated, activated_at, activated_by, signature_data, signature_date, signature_name')
        .eq('intake_form_id', intakeForm.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (consentData && consentData.length > 0) {
        ibogaineConsentForm = consentData[0]
      }
    } else if (patientEmail) {
      const { data: consentData } = await adminClient
        .from('ibogaine_consent_forms')
        .select('*, is_activated, activated_at, activated_by, signature_data, signature_date, signature_name')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (consentData && consentData.length > 0) {
        ibogaineConsentForm = consentData[0]
      }
    }

    // Check for existing patient documents (uploaded documents for existing patients)
    let existingPatientDocuments: any[] = []

    // First try to find by partial form ID
    if (partialForm?.id) {
      const { data: existingDocs } = await adminClient
        .from('existing_patient_documents')
        .select('*')
        .eq('partial_intake_form_id', partialForm.id)

      if (existingDocs) {
        existingPatientDocuments = existingDocs
      }
    }

    // Also check by patient email if we have it (for documents uploaded directly)
    if (existingPatientDocuments.length === 0 && patientEmail) {
      // Find partial forms for this email and get their documents
      const { data: partialFormsForEmail } = await adminClient
        .from('partial_intake_forms')
        .select('id')
        .eq('email', patientEmail)
        .order('created_at', { ascending: false })

      if (partialFormsForEmail && partialFormsForEmail.length > 0) {
        const partialFormIds = partialFormsForEmail.map(pf => pf.id)
        const { data: existingDocs } = await adminClient
          .from('existing_patient_documents')
          .select('*')
          .in('partial_intake_form_id', partialFormIds)

        if (existingDocs) {
          existingPatientDocuments = existingDocs
        }
      }
    }

    // Get onboarding data if patient has patient_id or email
    let onboardingData: any = null
    if (patientId) {
      const { data: onboarding } = await adminClient
        .from('patient_onboarding')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (onboarding) {
        // Get onboarding forms and EKG/Bloodwork documents
        const [releaseForm, outingForm, regulationsForm, medicalDocsResult] = await Promise.all([
          adminClient
            .from('onboarding_release_forms')
            .select('*')
            .eq('onboarding_id', onboarding.id)
            .maybeSingle()
            .then(r => r.data),
          adminClient
            .from('onboarding_outing_consent_forms')
            .select('*')
            .eq('onboarding_id', onboarding.id)
            .maybeSingle()
            .then(r => r.data),
          adminClient
            .from('onboarding_internal_regulations_forms')
            .select('*')
            .eq('onboarding_id', onboarding.id)
            .maybeSingle()
            .then(r => r.data),
          adminClient
            .from('onboarding_medical_documents')
            .select('id, document_type, document_path, document_name, uploaded_at')
            .eq('onboarding_id', onboarding.id),
        ])
        const medicalDocs = medicalDocsResult.data || []
        const ekgDoc = medicalDocs.find((d: { document_type: string }) => d.document_type === 'ekg') ?? null
        const bloodworkDoc = medicalDocs.find((d: { document_type: string }) => d.document_type === 'bloodwork') ?? null

        onboardingData = {
          onboarding,
          forms: {
            releaseForm,
            outingForm,
            regulationsForm,
          },
          medicalDocuments: { ekg: ekgDoc, bloodwork: bloodworkDoc },
        }
      }
    } else if (patientEmail) {
      const { data: onboarding } = await adminClient
        .from('patient_onboarding')
        .select('*')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (onboarding) {
        // Get onboarding forms and EKG/Bloodwork documents
        const [releaseForm, outingForm, regulationsForm, medicalDocsResult] = await Promise.all([
          adminClient
            .from('onboarding_release_forms')
            .select('*')
            .eq('onboarding_id', onboarding.id)
            .maybeSingle()
            .then(r => r.data),
          adminClient
            .from('onboarding_outing_consent_forms')
            .select('*')
            .eq('onboarding_id', onboarding.id)
            .maybeSingle()
            .then(r => r.data),
          adminClient
            .from('onboarding_internal_regulations_forms')
            .select('*')
            .eq('onboarding_id', onboarding.id)
            .maybeSingle()
            .then(r => r.data),
          adminClient
            .from('onboarding_medical_documents')
            .select('id, document_type, document_path, document_name, uploaded_at')
            .eq('onboarding_id', onboarding.id),
        ])
        const medicalDocs = medicalDocsResult.data || []
        const ekgDoc = medicalDocs.find((d: { document_type: string }) => d.document_type === 'ekg') ?? null
        const bloodworkDoc = medicalDocs.find((d: { document_type: string }) => d.document_type === 'bloodwork') ?? null

        onboardingData = {
          onboarding,
          forms: {
            releaseForm,
            outingForm,
            regulationsForm,
          },
          medicalDocuments: { ekg: ekgDoc, bloodwork: bloodworkDoc },
        }
      }
    }

    // Determine form statuses with proper types
    // If there's an uploaded document for a form, mark it as completed
    const hasIntakeDocument = existingPatientDocuments.some(doc => doc.form_type === 'intake')
    const hasMedicalDocument = existingPatientDocuments.some(doc => doc.form_type === 'medical')
    const hasServiceDocument = existingPatientDocuments.some(doc => doc.form_type === 'service')
    const hasIbogaineDocument = existingPatientDocuments.some(doc => doc.form_type === 'ibogaine')

    const intakeStatus: 'completed' | 'pending' | 'not_started' = 
      intakeForm ? 'completed' : 
      (partialForm && hasIntakeDocument) ? 'completed' :
      partialForm ? 'pending' : 
      'not_started'
    
    const medicalHistoryStatus: 'completed' | 'pending' | 'not_started' =
      medicalHistoryForm ? 'completed' :
      hasMedicalDocument ? 'completed' :
      'not_started'

    // Check if service agreement is actually completed by patient (signature fields filled)
    // Match the patient-tasks check: only require essential signature fields (name, date, data)
    // patient_signature_first_name and patient_signature_last_name are optional for completion check
    const serviceAgreementStatus: 'completed' | 'pending' | 'not_started' =
      (serviceAgreement &&
       serviceAgreement.patient_signature_name &&
       serviceAgreement.patient_signature_name.trim() !== '' &&
       serviceAgreement.patient_signature_date &&
       serviceAgreement.patient_signature_data &&
       serviceAgreement.patient_signature_data.trim() !== '') ? 'completed' :
      hasServiceDocument ? 'completed' :
      serviceAgreement ? 'pending' : // Form exists but patient hasn't filled signature - show as pending
      'not_started'

    // Check if ibogaine consent is actually completed by patient (signature fields filled)
    const ibogaineConsentStatus: 'completed' | 'pending' | 'not_started' =
      (ibogaineConsentForm &&
       ibogaineConsentForm.signature_data &&
       ibogaineConsentForm.signature_data.trim() !== '' &&
       ibogaineConsentForm.signature_date &&
       ibogaineConsentForm.signature_name &&
       ibogaineConsentForm.signature_name.trim() !== '') ? 'completed' :
      hasIbogaineDocument ? 'completed' :
      ibogaineConsentForm ? 'pending' : // Form exists but patient hasn't filled signature - show as pending
      'not_started'

    return {
      success: true,
      data: {
        patient: patientData,
        intakeForm,
        partialForm,
        medicalHistoryForm,
        serviceAgreement,
        ibogaineConsentForm,
        existingPatientDocuments, // Include uploaded documents
        onboarding: onboardingData, // Include onboarding data
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

// Create Service Agreement for patient (when trigger didn't create it)
export const createServiceAgreementForPatient = authActionClient
  .schema(z.object({
    patientId: z.string().uuid().optional(),
    patientEmail: z.string().email(),
    patientFirstName: z.string(),
    patientLastName: z.string(),
    patientPhone: z.string().optional(),
    intakeFormId: z.string().uuid().optional(),
  }))
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

    // Check if service agreement already exists
    let existingQuery = adminClient
      .from('service_agreements')
      .select('id')

    if (parsedInput.patientId) {
      existingQuery = existingQuery.or(`patient_id.eq.${parsedInput.patientId},patient_email.ilike.${parsedInput.patientEmail}`)
    } else {
      existingQuery = existingQuery.ilike('patient_email', parsedInput.patientEmail)
    }

    const { data: existing } = await existingQuery.maybeSingle()

    if (existing) {
      return { success: false, error: 'Service agreement already exists for this patient' }
    }

    // Create the service agreement
    const { data, error } = await adminClient
      .from('service_agreements')
      .insert({
        patient_id: parsedInput.patientId || null,
        intake_form_id: parsedInput.intakeFormId || null,
        patient_first_name: parsedInput.patientFirstName,
        patient_last_name: parsedInput.patientLastName,
        patient_email: parsedInput.patientEmail,
        patient_phone_number: parsedInput.patientPhone || '',
        number_of_days: 14, // Default
        program_type: null, // Admin will fill
        total_program_fee: null,
        deposit_amount: null,
        deposit_percentage: null,
        remaining_balance: null,
        is_activated: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[createServiceAgreementForPatient] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  })

// Activate/Deactivate Service Agreement Form
export const activateServiceAgreement = authActionClient
  .schema(z.object({ 
    formId: z.string().uuid(),
    isActivated: z.boolean()
  }))
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

    // Get form data first to get patient email and check admin fields
    // Note: payment_method is filled by patient, not required for activation
    const { data: formData } = await adminClient
      .from('service_agreements')
      .select('patient_email, patient_first_name, patient_last_name, total_program_fee, deposit_amount, deposit_percentage, remaining_balance, provider_signature_name, provider_signature_date, number_of_days')
      .eq('id', parsedInput.formId)
      .single()

    if (!formData) {
      return { success: false, error: 'Form not found' }
    }

    // Validate admin fields are complete before activation using database function
    if (parsedInput.isActivated) {
      // First, manually check fields to provide better error messages
      const missingFields: string[] = []
      
      if (!formData.total_program_fee || formData.total_program_fee === 0) {
        missingFields.push('Total Program Fee')
      }
      if (!formData.deposit_amount || formData.deposit_amount === 0) {
        missingFields.push('Deposit Amount')
      }
      if (formData.deposit_percentage === null || formData.deposit_percentage === undefined) {
        missingFields.push('Deposit Percentage')
      }
      if (formData.remaining_balance === null || formData.remaining_balance === undefined) {
        missingFields.push('Remaining Balance')
      }
      if (!formData.number_of_days || formData.number_of_days <= 0) {
        missingFields.push('Number of Days of Program')
      }
      if (!formData.provider_signature_name || formData.provider_signature_name.trim() === '') {
        missingFields.push('Provider Signature Name')
      }
      if (!formData.provider_signature_date) {
        missingFields.push('Provider Signature Date')
      }
      
      if (missingFields.length > 0) {
        return { 
          success: false, 
          error: `Cannot activate form. Please fill in the following required fields: ${missingFields.join(', ')}.` 
        }
      }
      
      // Also check with database function for final validation
      const { data: isValid, error: checkError } = await adminClient
        .rpc('check_service_agreement_admin_fields_complete', {
          form_id: parsedInput.formId
        })
      
      if (checkError) {
        console.error('[activateServiceAgreement] Database validation error:', checkError)
        return { 
          success: false, 
          error: 'Failed to validate form fields: ' + checkError.message 
        }
      }
      
      if (!isValid) {
        // If manual check passed but DB check failed, there might be a data type issue
        console.error('[activateServiceAgreement] Validation failed. Form data:', {
          total_program_fee: formData.total_program_fee,
          deposit_amount: formData.deposit_amount,
          deposit_percentage: formData.deposit_percentage,
          remaining_balance: formData.remaining_balance,
          number_of_days: formData.number_of_days,
          provider_signature_name: formData.provider_signature_name,
          provider_signature_date: formData.provider_signature_date,
        })
        return { 
          success: false, 
          error: 'Cannot activate form. Please ensure all required admin fields are filled: Total Program Fee, Deposit Amount, Deposit Percentage, Remaining Balance, Number of Days, and Provider Signature (Name and Date).' 
        }
      }
    }

    // Update activation status
    const updateData: any = {
      is_activated: parsedInput.isActivated
    }

    if (parsedInput.isActivated) {
      updateData.activated_at = new Date().toISOString()
      updateData.activated_by = user.id
    } else {
      updateData.activated_at = null
      updateData.activated_by = null
    }

    const { data, error } = await adminClient
      .from('service_agreements')
      .update(updateData)
      .eq('id', parsedInput.formId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Send activation email if activated
    if (parsedInput.isActivated) {
      const { sendFormActivationEmail } = await import('./email.action')
      await sendFormActivationEmail(
        formData.patient_email,
        formData.patient_first_name || 'Patient',
        formData.patient_last_name || '',
        'service_agreement',
        'Service Agreement'
      )
    }

    return { success: true, data }
  })

// Activate/Deactivate Ibogaine Consent Form
export const activateIbogaineConsent = authActionClient
  .schema(z.object({ 
    formId: z.string().uuid(),
    isActivated: z.boolean()
  }))
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

    // Get form data first to get patient email and check admin fields
    const { data: formData } = await adminClient
      .from('ibogaine_consent_forms')
      .select('email, first_name, last_name, facilitator_doctor_name, date_of_birth, address')
      .eq('id', parsedInput.formId)
      .single()

    if (!formData) {
      return { success: false, error: 'Form not found' }
    }

    // Validate admin fields are complete before activation using database function
    if (parsedInput.isActivated) {
      const { data: isValid, error: checkError } = await adminClient
        .rpc('check_ibogaine_consent_admin_fields_complete', {
          form_id: parsedInput.formId
        })
      
      if (checkError) {
        return { 
          success: false, 
          error: 'Failed to validate form fields: ' + checkError.message 
        }
      }
      
      if (!isValid) {
        return { 
          success: false, 
          error: 'Cannot activate form. Please fill in all required admin fields (date of birth, and address) before activating. All text fields must be non-empty. Facilitator/Doctor name comes from defaults table. Patient signature fields will be filled by the patient after activation.' 
        }
      }
    }

    // Update activation status
    const updateData: any = {
      is_activated: parsedInput.isActivated
    }

    if (parsedInput.isActivated) {
      updateData.activated_at = new Date().toISOString()
      updateData.activated_by = user.id
      
      // Copy facilitator_doctor_name from form_defaults if not already set on form
      if (!formData.facilitator_doctor_name || formData.facilitator_doctor_name.trim() === '') {
        const { data: defaults } = await adminClient
          .from('form_defaults')
          .select('default_values')
          .eq('form_type', 'ibogaine_consent')
          .single()
        
        if (defaults?.default_values) {
          const defaultValues = typeof defaults.default_values === 'string' 
            ? JSON.parse(defaults.default_values) 
            : defaults.default_values
          if (defaultValues?.facilitator_doctor_name) {
            updateData.facilitator_doctor_name = defaultValues.facilitator_doctor_name
          }
        }
      }
    } else {
      updateData.activated_at = null
      updateData.activated_by = null
    }

    const { data, error } = await adminClient
      .from('ibogaine_consent_forms')
      .update(updateData)
      .eq('id', parsedInput.formId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Send activation email if activated
    if (parsedInput.isActivated) {
      const { sendFormActivationEmail } = await import('./email.action')
      await sendFormActivationEmail(
        formData.email,
        formData.first_name || 'Patient',
        formData.last_name || '',
        'ibogaine_consent',
        'Ibogaine Therapy Consent'
      )
    }

    return { success: true, data }
  })
