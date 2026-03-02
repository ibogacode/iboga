'use server'

import { revalidatePath } from 'next/cache'
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

    // OPTIMIZATION: Fetch patient profile, partial form, and intake form in parallel
    const id = parsedInput.patientId || parsedInput.partialFormId || parsedInput.intakeFormId
    
    if (id) {
      const [patientResult, partialResult, intakeResult] = await Promise.all([
        // Try as patient profile ID
        adminClient
          .from('profiles')
          .select('*')
          .eq('id', id)
          .eq('role', 'patient')
          .maybeSingle(),
        // Try as partial form ID
        adminClient
          .from('partial_intake_forms')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        // Try as intake form ID
        adminClient
          .from('patient_intake_forms')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
      ])
      
      if (patientResult.data) patientData = patientResult.data
      if (partialResult.data) partialForm = partialResult.data
      if (intakeResult.data) intakeForm = intakeResult.data
    }

    // If we found partial form with completed_form_id, get that intake form
    if (partialForm?.completed_form_id && !intakeForm) {
      const { data: intakeData } = await adminClient
        .from('patient_intake_forms')
        .select('*')
        .eq('id', partialForm.completed_form_id)
        .maybeSingle()
      if (intakeData) intakeForm = intakeData
    }

    // If we found forms but no patient, try to find patient by email
    const formEmail = intakeForm?.email || partialForm?.email
    if (!patientData && formEmail) {
      const { data: patientProfile } = await adminClient
        .from('profiles')
        .select('*')
        .ilike('email', formEmail)
        .eq('role', 'patient')
        .maybeSingle()
      if (patientProfile) patientData = patientProfile
    }
    
    // If we have patient data but no forms yet, try to get forms by email in parallel
    if (patientData?.email && (!intakeForm || !partialForm)) {
      const [intakeByEmail, partialByEmail] = await Promise.all([
        !intakeForm ? adminClient
          .from('patient_intake_forms')
          .select('*')
          .ilike('email', patientData.email)
          .order('created_at', { ascending: false })
          .limit(1) : Promise.resolve({ data: null }),
        !partialForm ? adminClient
          .from('partial_intake_forms')
          .select('*')
          .ilike('email', patientData.email)
          .order('created_at', { ascending: false })
          .limit(1) : Promise.resolve({ data: null }),
      ])
      
      if (intakeByEmail.data?.[0]) intakeForm = intakeByEmail.data[0]
      if (partialByEmail.data?.[0]) partialForm = partialByEmail.data[0]
    }

    // If we still don't have patient data but have forms, create a basic patient object
    if (!patientData && (intakeForm || partialForm)) {
      const source = intakeForm || partialForm
      patientData = {
        id: null,
        first_name: source.first_name,
        last_name: source.last_name,
        email: source.email,
        phone: source.phone_number,
        role: 'patient',
      }
    }

    if (!patientData && !intakeForm && !partialForm) {
      return { success: false, error: 'Patient not found - no forms or profile found with the provided ID' }
    }

    // If we still don't have patient data, create a minimal one
    if (!patientData) {
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
    const intakeFormId = intakeForm?.id

    // OPTIMIZATION: Fetch all form data in parallel
    const [
      medicalHistoryResult,
      serviceAgreementResult,
      ibogaineConsentResult,
      existingDocsResult,
      onboardingResult,
    ] = await Promise.all([
      // Medical history form
      intakeFormId
        ? adminClient
            .from('medical_history_forms')
            .select('*')
            .eq('intake_form_id', intakeFormId)
            .order('created_at', { ascending: false })
            .limit(1)
        : patientEmail
          ? adminClient
              .from('medical_history_forms')
              .select('*')
              .ilike('email', patientEmail)
              .order('created_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: null }),
      
      // Service agreement
      patientId
        ? adminClient
            .from('service_agreements')
            .select('*, is_activated, activated_at, activated_by, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1)
        : patientEmail
          ? adminClient
              .from('service_agreements')
              .select('*, is_activated, activated_at, activated_by, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
              .ilike('patient_email', patientEmail)
              .order('created_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: null }),
      
      // Ibogaine consent form
      patientId
        ? adminClient
            .from('ibogaine_consent_forms')
            .select('*, is_activated, activated_at, activated_by, signature_data, signature_date, signature_name')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1)
        : intakeFormId
          ? adminClient
              .from('ibogaine_consent_forms')
              .select('*, is_activated, activated_at, activated_by, signature_data, signature_date, signature_name')
              .eq('intake_form_id', intakeFormId)
              .order('created_at', { ascending: false })
              .limit(1)
          : patientEmail
            ? adminClient
                .from('ibogaine_consent_forms')
                .select('*, is_activated, activated_at, activated_by, signature_data, signature_date, signature_name')
                .ilike('email', patientEmail)
                .order('created_at', { ascending: false })
                .limit(1)
            : Promise.resolve({ data: null }),
      
      // Existing patient documents
      partialForm?.id
        ? adminClient
            .from('existing_patient_documents')
            .select('*')
            .eq('partial_intake_form_id', partialForm.id)
        : patientEmail
          ? adminClient
              .from('partial_intake_forms')
              .select('id')
              .eq('email', patientEmail)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
      
      // Onboarding
      patientId
        ? adminClient
            .from('patient_onboarding')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : patientEmail
          ? adminClient
              .from('patient_onboarding')
              .select('*')
              .ilike('email', patientEmail)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
    ])

    const medicalHistoryForm = medicalHistoryResult.data?.[0] || null
    const serviceAgreement = serviceAgreementResult.data?.[0] || null
    const ibogaineConsentForm = ibogaineConsentResult.data?.[0] || null

    // Handle existing patient documents
    let existingPatientDocuments: any[] = []
    if (partialForm?.id && existingDocsResult.data) {
      existingPatientDocuments = existingDocsResult.data
    } else if (!partialForm?.id && existingDocsResult.data && patientEmail) {
      const partialFormIds = existingDocsResult.data.map((pf: { id: string }) => pf.id)
      if (partialFormIds.length > 0) {
        const { data: docs } = await adminClient
          .from('existing_patient_documents')
          .select('*')
          .in('partial_intake_form_id', partialFormIds)
        if (docs) existingPatientDocuments = docs
      }
    }

    // Also check by intake form id for documents
    if (intakeFormId) {
      const { data: partialsForIntake } = await adminClient
        .from('partial_intake_forms')
        .select('id')
        .eq('completed_form_id', intakeFormId)

      if (partialsForIntake && partialsForIntake.length > 0) {
        const partialIds = partialsForIntake.map(p => p.id)
        const { data: docsByIntake } = await adminClient
          .from('existing_patient_documents')
          .select('*')
          .in('partial_intake_form_id', partialIds)

        if (docsByIntake && docsByIntake.length > 0) {
          const existingIds = new Set(existingPatientDocuments.map((d: { id: string }) => d.id))
          const toAdd = docsByIntake.filter((d: { id: string }) => !existingIds.has(d.id))
          existingPatientDocuments = [...existingPatientDocuments, ...toAdd]
        }
      }
    }

    // Get onboarding forms and medical documents in parallel if onboarding exists
    let onboardingData: any = null
    const onboarding = onboardingResult.data
    if (onboarding) {
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

    // OPTIMIZATION: Load billing, lead notes, lead tasks, staff list, and patient management in parallel
    // This eliminates client-side waterfall of API calls
    const leadIds = [patientData?.id, partialForm?.id, intakeForm?.id].filter(Boolean) as string[]
    const uniqueLeadIds = [...new Set(leadIds)]
    
    const [
      billingPaymentsResult,
      leadNotesResults,
      leadTasksResults,
      staffListResult,
      patientManagementResult,
    ] = await Promise.all([
      // Billing payments
      serviceAgreement?.id && serviceAgreement?.is_activated
        ? adminClient
            .from('patient_billing_payments')
            .select('*')
            .eq('service_agreement_id', serviceAgreement.id)
            .order('payment_received_at', { ascending: false })
        : Promise.resolve({ data: null }),
      
      // Lead notes for all possible lead IDs
      Promise.all(
        uniqueLeadIds.map(leadId =>
          adminClient
            .from('lead_note_entries')
            .select(`
              id,
              lead_id,
              notes,
              created_at,
              created_by,
              created_by_profile:created_by(first_name, last_name)
            `)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
        )
      ),
      
      // Lead tasks for all possible lead IDs
      Promise.all(
        uniqueLeadIds.map(leadId =>
          adminClient
            .from('lead_tasks')
            .select(`
              id,
              lead_id,
              title,
              description,
              status,
              due_date,
              assigned_to_id,
              created_by_id,
              created_at,
              updated_at
            `)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
        )
      ),
      
      // Staff list for task assignment
      adminClient
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['owner', 'admin', 'manager', 'sales', 'staff', 'medical_staff', 'customer_service'])
        .order('first_name'),
      
      // Patient management record
      patientId
        ? adminClient
            .from('patient_management')
            .select('*')
            .eq('patient_id', patientId)
            .in('status', ['active', 'discharged', 'transferred'])
            .order('created_at', { ascending: false })
            .limit(1)
        : Promise.resolve({ data: null }),
    ])

    const billingPayments = billingPaymentsResult.data || []

    // Merge lead notes from all IDs and deduplicate
    const notesById = new Map<string, any>()
    leadNotesResults.forEach(result => {
      if (result.data) {
        result.data.forEach((row: any) => {
          if (!notesById.has(row.id)) {
            const profile = row.created_by_profile
            const createdByName = profile
              ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || null
              : null
            notesById.set(row.id, {
              id: row.id,
              lead_id: row.lead_id,
              notes: row.notes ?? '',
              created_at: row.created_at,
              created_by: row.created_by,
              created_by_name: createdByName,
            })
          }
        })
      }
    })
    const leadNotes = Array.from(notesById.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Merge lead tasks from all IDs and deduplicate
    const tasksById = new Map<string, any>()
    const profileIds = new Set<string>()
    leadTasksResults.forEach(result => {
      if (result.data) {
        result.data.forEach((t: any) => {
          if (!tasksById.has(t.id)) {
            tasksById.set(t.id, t)
            if (t.created_by_id) profileIds.add(t.created_by_id)
            if (t.assigned_to_id) profileIds.add(t.assigned_to_id)
          }
        })
      }
    })
    
    // Get profile names for tasks
    let taskProfileNames: Record<string, string> = {}
    const taskProfileIdsArray = Array.from(profileIds)
    if (taskProfileIdsArray.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', taskProfileIdsArray)
      profiles?.forEach((p: any) => {
        taskProfileNames[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
      })
    }
    
    const leadTasks = Array.from(tasksById.values())
      .map((t: any) => ({
        ...t,
        created_by_name: taskProfileNames[t.created_by_id] || null,
        assigned_to_name: t.assigned_to_id ? (taskProfileNames[t.assigned_to_id] || null) : null,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Process staff list
    const staffList = (staffListResult.data || []).map((s: any) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
      role: s.role,
    }))

    const patientManagement = Array.isArray(patientManagementResult.data)
      ? patientManagementResult.data[0] ?? null
      : patientManagementResult.data ?? null

    return {
      success: true,
      data: {
        patient: patientData,
        intakeForm,
        partialForm,
        medicalHistoryForm,
        serviceAgreement,
        ibogaineConsentForm,
        existingPatientDocuments,
        onboarding: onboardingData,
        billingPayments,
        leadNotes,
        leadTasks,
        staffList,
        patientManagement,
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

// =============================================================================
// Delete client (owner/admin only): remove from onboarding, management, profile,
// consent, medical history, partial/intake forms, and auth. Verifies no records remain.
// Supports both: patientId (profile) and partialFormId (inquiry-only lead, no profile).
// =============================================================================
const deleteClientSchema = z.object({
  patientId: z.string().uuid().optional(),
  partialFormId: z.string().uuid().optional(),
}).refine((data) => data.patientId ?? data.partialFormId, { message: 'Either patientId or partialFormId is required' })

export const deleteClient = authActionClient
  .schema(deleteClientSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!callerProfile || !hasOwnerAccess(callerProfile.role)) {
      return { success: false, error: 'Only owner or admin can delete a client' }
    }

    const partialFormId = parsedInput.partialFormId
    if (partialFormId) {
      // ---------- Inquiry-only lead (no profile): delete by partial_intake_forms.id ----------
      const { data: partialForm, error: partialErr } = await admin
        .from('partial_intake_forms')
        .select('id, email, recipient_email, completed_form_id')
        .eq('id', partialFormId)
        .single()
      if (partialErr || !partialForm) {
        return { success: false, error: 'Lead (partial form) not found' }
      }
      const leadEmail = (partialForm.email ?? partialForm.recipient_email ?? '').trim().toLowerCase()
      const completedFormId = partialForm.completed_form_id ?? undefined

      // Lead-scoped tables (lead_id = partial form id)
      const { error: notesErr } = await admin.from('lead_note_entries').delete().eq('lead_id', partialFormId)
      if (notesErr) return { success: false, error: `Failed to delete lead_note_entries: ${notesErr.message}` }
      const { error: tasksErr } = await admin.from('lead_tasks').delete().eq('lead_id', partialFormId)
      if (tasksErr) return { success: false, error: `Failed to delete lead_tasks: ${tasksErr.message}` }

      // Onboarding rows that reference this partial form (CASCADE will remove clinical_director_consult_forms, onboarding_medical_documents)
      const { error: onboardingErr } = await admin.from('patient_onboarding').delete().eq('partial_intake_form_id', partialFormId)
      if (onboardingErr) return { success: false, error: `Failed to delete patient_onboarding: ${onboardingErr.message}` }
      // Onboarding by intake_form_id if this partial had a completed form
      if (completedFormId) {
        const { error: obByIntakeErr } = await admin.from('patient_onboarding').delete().eq('intake_form_id', completedFormId)
        if (obByIntakeErr) return { success: false, error: `Failed to delete patient_onboarding (by intake): ${obByIntakeErr.message}` }
      }

      // Consent/agreement by intake_form_id or email (inquiry may have forms by email)
      if (completedFormId) {
        const { error: icErr } = await admin.from('ibogaine_consent_forms').delete().eq('intake_form_id', completedFormId)
        if (icErr) return { success: false, error: `Failed to delete ibogaine_consent_forms: ${icErr.message}` }
        const { error: saByIntakeErr } = await admin.from('service_agreements').delete().eq('intake_form_id', completedFormId)
        if (saByIntakeErr) return { success: false, error: `Failed to delete service_agreements (by intake): ${saByIntakeErr.message}` }
      }
      if (leadEmail) {
        const { error: icEmailErr } = await admin.from('ibogaine_consent_forms').delete().ilike('email', leadEmail)
        if (icEmailErr) return { success: false, error: `Failed to delete ibogaine_consent_forms (by email): ${icEmailErr.message}` }
        const { error: saEmailErr } = await admin.from('service_agreements').delete().ilike('patient_email', leadEmail)
        if (saEmailErr) return { success: false, error: `Failed to delete service_agreements (by email): ${saEmailErr.message}` }
      }

      if (completedFormId) {
        const { error: mhErr } = await admin.from('medical_history_forms').delete().eq('intake_form_id', completedFormId)
        if (mhErr) return { success: false, error: `Failed to delete medical_history_forms: ${mhErr.message}` }
      }

      const { error: docErr } = await admin.from('existing_patient_documents').delete().eq('partial_intake_form_id', partialFormId)
      if (docErr) return { success: false, error: `Failed to delete existing_patient_documents: ${docErr.message}` }

      const { error: partialDelErr } = await admin.from('partial_intake_forms').delete().eq('id', partialFormId)
      if (partialDelErr) return { success: false, error: `Failed to delete partial_intake_forms: ${partialDelErr.message}` }

      if (completedFormId) {
        const { error: intakeErr } = await admin.from('patient_intake_forms').delete().eq('id', completedFormId)
        if (intakeErr) return { success: false, error: `Failed to delete patient_intake_forms: ${intakeErr.message}` }
      }

      revalidatePath('/patient-pipeline')
      revalidatePath('/onboarding')
      return { success: true, message: 'Lead and all related records deleted. No remaining records found.' }
    }

    // ---------- Profile (patient) path: full delete including auth ----------
    const patientId = parsedInput.patientId!
    const { data: patientProfile, error: profileErr } = await admin
      .from('profiles')
      .select('id, role, email')
      .eq('id', patientId)
      .single()
    if (profileErr || !patientProfile) {
      return { success: false, error: 'Client profile not found' }
    }
    if (patientProfile.role !== 'patient') {
      return { success: false, error: 'Can only delete client (patient) profiles' }
    }
    const clientEmail = (patientProfile.email ?? '').trim().toLowerCase()

    const intakeFormIds: string[] = []
    const partialFormIds: string[] = []

    const { data: onboardings } = await admin
      .from('patient_onboarding')
      .select('id, intake_form_id, partial_intake_form_id')
      .eq('patient_id', patientId)
    if (onboardings) {
      onboardings.forEach((o) => {
        if (o.intake_form_id) intakeFormIds.push(o.intake_form_id)
        if (o.partial_intake_form_id) partialFormIds.push(o.partial_intake_form_id)
      })
    }
    // Include any intake forms by email (inquiry/app form not yet linked via onboarding)
    if (clientEmail) {
      const { data: intakeByEmail } = await admin
        .from('patient_intake_forms')
        .select('id')
        .ilike('email', clientEmail)
      if (intakeByEmail?.length) {
        intakeByEmail.forEach((r) => intakeFormIds.push(r.id))
      }
    }
    const uniqueIntakeFormIds = [...new Set(intakeFormIds)]

    const deleteSteps: Array<{ table: string; fn: () => Promise<{ error: unknown } | null> }> = [
      { table: 'user_notifications', fn: async () => { const r = await admin.from('user_notifications').delete().eq('user_id', patientId); return r.error ? { error: r.error } : null } },
      { table: 'lead_note_entries', fn: async () => { const r = await admin.from('lead_note_entries').delete().eq('lead_id', patientId); return r.error ? { error: r.error } : null } },
      { table: 'lead_tasks', fn: async () => { const r = await admin.from('lead_tasks').delete().eq('lead_id', patientId); return r.error ? { error: r.error } : null } },
      { table: 'patient_billing_payments', fn: async () => { const r = await admin.from('patient_billing_payments').delete().eq('patient_id', patientId); return r.error ? { error: r.error } : null } },
      { table: 'tapering_schedules', fn: async () => { const r = await admin.from('tapering_schedules').delete().eq('patient_id', patientId); return r.error ? { error: r.error } : null } },
      { table: 'patient_management_medical_intake_reports', fn: async () => { const r = await admin.from('patient_management_medical_intake_reports').delete().eq('patient_id', patientId); return r.error ? { error: r.error } : null } },
      { table: 'patient_management', fn: async () => { const r = await admin.from('patient_management').delete().eq('patient_id', patientId); return r.error ? { error: r.error } : null } },
      { table: 'patient_onboarding', fn: async () => { const r = await admin.from('patient_onboarding').delete().eq('patient_id', patientId); return r.error ? { error: r.error } : null } },
    ]

    for (const step of deleteSteps) {
      const result = await step.fn()
      if (result?.error) {
        return { success: false, error: `Failed to delete from ${step.table}: ${String((result.error as Error).message)}` }
      }
    }

    if (uniqueIntakeFormIds.length > 0) {
      const { error: mhErr } = await admin.from('medical_history_forms').delete().in('intake_form_id', uniqueIntakeFormIds)
      if (mhErr) return { success: false, error: `Failed to delete medical_history_forms: ${mhErr.message}` }
    }

    const { error: icErr } = await admin.from('ibogaine_consent_forms').delete().eq('patient_id', patientId)
    if (icErr) return { success: false, error: `Failed to delete ibogaine_consent_forms: ${icErr.message}` }
    if (clientEmail) {
      const { error: icEmailErr } = await admin.from('ibogaine_consent_forms').delete().ilike('email', clientEmail)
      if (icEmailErr) return { success: false, error: `Failed to delete ibogaine_consent_forms (by email): ${icEmailErr.message}` }
    }

    const { error: saErr } = await admin.from('service_agreements').delete().eq('patient_id', patientId)
    if (saErr) return { success: false, error: `Failed to delete service_agreements: ${saErr.message}` }
    if (clientEmail) {
      const { error: saEmailErr } = await admin.from('service_agreements').delete().ilike('patient_email', clientEmail)
      if (saEmailErr) return { success: false, error: `Failed to delete service_agreements (by email): ${saEmailErr.message}` }
    }

    // Delete existing_patient_documents and partial_intake_forms BEFORE patient_intake_forms
    if (partialFormIds.length > 0) {
      const { error: docErr } = await admin.from('existing_patient_documents').delete().in('partial_intake_form_id', partialFormIds)
      if (docErr) return { success: false, error: `Failed to delete existing_patient_documents: ${docErr.message}` }
    }
    const { error: docByUserErr } = await admin.from('existing_patient_documents').delete().eq('uploaded_by', patientId)
    if (docByUserErr) return { success: false, error: `Failed to delete existing_patient_documents (by uploader): ${docByUserErr.message}` }

    if (partialFormIds.length > 0) {
      const { error: partialErr } = await admin.from('partial_intake_forms').delete().in('id', partialFormIds)
      if (partialErr) return { success: false, error: `Failed to delete partial_intake_forms: ${partialErr.message}` }
    }
    const { error: partialByCreatorErr } = await admin.from('partial_intake_forms').delete().eq('created_by', patientId)
    if (partialByCreatorErr) return { success: false, error: `Failed to delete partial_intake_forms (by creator): ${partialByCreatorErr.message}` }
    if (clientEmail) {
      const { data: partialByEmail } = await admin.from('partial_intake_forms').select('id').ilike('recipient_email', clientEmail)
      if (partialByEmail?.length) {
        const ids = partialByEmail.map((r) => r.id)
        const { error: partialEmailErr } = await admin.from('partial_intake_forms').delete().in('id', ids)
        if (partialEmailErr) return { success: false, error: `Failed to delete partial_intake_forms (by email): ${partialEmailErr.message}` }
      }
    }

    if (uniqueIntakeFormIds.length > 0) {
      const { error: intakeErr } = await admin.from('patient_intake_forms').delete().in('id', uniqueIntakeFormIds)
      if (intakeErr) return { success: false, error: `Failed to delete patient_intake_forms: ${intakeErr.message}` }
    }

    try {
      const { data: avatarFiles } = await admin.storage.from('avatars').list(patientId)
      if (avatarFiles?.length) {
        const paths = avatarFiles.map((f) => `${patientId}/${f.name}`)
        await admin.storage.from('avatars').remove(paths)
      }
    } catch {
      // ignore storage errors (bucket may not exist or no files)
    }

    const { error: profileDelErr } = await admin.from('profiles').delete().eq('id', patientId)
    if (profileDelErr) return { success: false, error: `Failed to delete profile: ${profileDelErr.message}` }

    const { error: authErr } = await admin.auth.admin.deleteUser(patientId)
    if (authErr) return { success: false, error: `Failed to delete auth user: ${authErr.message}` }

    const { data: profileCheck } = await admin.from('profiles').select('id').eq('id', patientId).maybeSingle()
    if (profileCheck) {
      return { success: false, error: 'Verification failed: profile still exists after delete' }
    }
    const { data: authUser } = await admin.auth.admin.getUserById(patientId)
    if (authUser?.user) {
      return { success: false, error: 'Verification failed: auth user still exists after delete' }
    }

    revalidatePath('/patient-pipeline')
    revalidatePath('/onboarding')
    return { success: true, message: 'Client and all related records deleted. No remaining records found.' }
  })
