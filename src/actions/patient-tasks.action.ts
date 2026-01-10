'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const getPatientTasksSchema = z.object({})

export interface PatientTask {
  id: string
  type: 'intake' | 'medical_history' | 'service_agreement' | 'ibogaine_consent' | 'onboarding_release' | 'onboarding_outing' | 'onboarding_social_media' | 'onboarding_regulations' | 'onboarding_dissent'
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed' | 'locked'
  estimatedTime: string
  isRequired: boolean
  isOptional: boolean
  completedAt?: string
  formId: string
  link?: string
  uploadedDocument?: {
    url: string
    name: string
  }
}

export interface OnboardingStatus {
  isInOnboarding: boolean
  status?: 'in_progress' | 'completed' | 'moved_to_management'
  onboardingId?: string
  formsCompleted?: number
  formsTotal?: number
}

/**
 * Get patient's forms and tasks
 */
export const getPatientTasks = authActionClient
  .schema(getPatientTasksSchema)
  .action(async ({ ctx }) => {
    const supabase = await createClient()
    const patientId = ctx.user.id

    // Get patient profile to get email for matching forms
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', patientId)
      .single()

    if (profileError || !profile) {
      console.error('[getPatientTasks] Profile error:', profileError)
      return { success: false, error: 'Patient profile not found' }
    }

    const patientEmail = (profile.email || '').trim().toLowerCase()
    console.log('[getPatientTasks] Patient ID:', patientId)
    console.log('[getPatientTasks] Profile email (original):', profile.email)
    console.log('[getPatientTasks] Profile email (normalized):', patientEmail)
    console.log('[getPatientTasks] Profile name:', profile.first_name, profile.last_name)
    const tasks: PatientTask[] = []

    // Check for uploaded documents by admin/owner (existing patient documents)
    // These documents indicate forms that have been completed via document upload
    let uploadedDocuments: Map<string, any> = new Map() // form_type -> document
    let partialFormId: string | null = null
    
    // Use admin client to check for documents (secure since we're checking patient's own data)
    const adminClient = createAdminClient()
    
    // First, find partial intake form for this patient (to get documents)
    if (patientEmail) {
      const { data: partialForms } = await adminClient
        .from('partial_intake_forms')
        .select('id, email')
        .eq('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (partialForms && partialForms.length > 0) {
        partialFormId = partialForms[0].id
      }
    }
    
    // Get uploaded documents for this patient's partial form
    if (partialFormId) {
      // Use admin client to check documents (secure - only checking this patient's own documents)
      const { data: existingDocs } = await adminClient
        .from('existing_patient_documents')
        .select('form_type, document_url, document_name, uploaded_at, id')
        .eq('partial_intake_form_id', partialFormId)
      
      if (existingDocs) {
        existingDocs.forEach((doc: any) => {
          uploadedDocuments.set(doc.form_type, doc)
        })
        console.log('[getPatientTasks] Found uploaded documents:', Array.from(uploadedDocuments.keys()))
      }
    }

    // Check if patient is in onboarding stage early (used to determine form completion status)
    // If patient is in onboarding, it means they've completed all 4 initial forms
    const { data: onboarding } = await supabase
      .from('patient_onboarding')
      .select('id, status')
      .eq('patient_id', patientId)
      .maybeSingle()
    const isInOnboarding = !!onboarding
    console.log('[getPatientTasks] Patient in onboarding:', isInOnboarding)

    // 1. Check for Patient Intake Form (Application Form)
    // Check by email (forms might be filled before profile creation)
    // Use case-insensitive comparison and also check by name as fallback
    let intakeForm = null
    if (patientEmail) {
      // First try exact email match (case-insensitive via ilike)
      console.log('[getPatientTasks] Searching intake forms with email:', patientEmail)
      const { data: intakeFormsByEmail, error: emailError } = await supabase
        .from('patient_intake_forms')
        .select('id, email, created_at, first_name, last_name')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)

      if (emailError) {
        console.error('[getPatientTasks] Intake form email query error:', emailError)
        // If RLS error, log it specifically
        if (emailError.code === '42501' || emailError.message?.includes('permission') || emailError.message?.includes('policy')) {
          console.error('[getPatientTasks] RLS POLICY ERROR - Patient may not have permission to view intake forms. Make sure migration 20241210000020_add_patient_view_own_intake_forms_rls.sql is run.')
        }
      } else {
        console.log('[getPatientTasks] Intake forms found by email:', intakeFormsByEmail?.length || 0)
        if (intakeFormsByEmail && intakeFormsByEmail.length > 0) {
          intakeForm = intakeFormsByEmail[0]
          console.log('[getPatientTasks] ✓ Found intake form by email:', intakeForm.id)
          console.log('[getPatientTasks]   Form email:', intakeForm.email)
          console.log('[getPatientTasks]   Form name:', intakeForm.first_name, intakeForm.last_name)
          console.log('[getPatientTasks]   Created at:', intakeForm.created_at)
        } else {
          // Fallback: Try matching by name if email doesn't match
          // This handles cases where email might have changed or been entered differently
          if (profile.first_name && profile.last_name) {
            const { data: intakeFormsByName, error: nameError } = await supabase
              .from('patient_intake_forms')
              .select('id, email, created_at, first_name, last_name')
              .ilike('first_name', profile.first_name.trim())
              .ilike('last_name', profile.last_name.trim())
              .order('created_at', { ascending: false })
              .limit(1)

            if (nameError) {
              console.error('[getPatientTasks] Intake form name query error:', nameError)
            } else if (intakeFormsByName && intakeFormsByName.length > 0) {
              intakeForm = intakeFormsByName[0]
              console.log('[getPatientTasks] Found intake form by name:', intakeForm.id, 'Form email:', intakeForm.email, 'Profile email:', patientEmail)
            }
          }

          if (!intakeForm) {
            console.log('[getPatientTasks] No intake form found for email:', patientEmail, 'or name:', profile.first_name, profile.last_name)
          }
        }
      }
    } else {
      console.log('[getPatientTasks] No patient email, trying to find by name only')
      // If no email, try to find by name
      if (profile.first_name && profile.last_name) {
        const { data: intakeFormsByName, error: nameError } = await supabase
          .from('patient_intake_forms')
          .select('id, email, created_at, first_name, last_name')
          .ilike('first_name', profile.first_name.trim())
          .ilike('last_name', profile.last_name.trim())
          .order('created_at', { ascending: false })
          .limit(1)

        if (!nameError && intakeFormsByName && intakeFormsByName.length > 0) {
          intakeForm = intakeFormsByName[0]
          console.log('[getPatientTasks] Found intake form by name (no email):', intakeForm.id)
        }
      }
    }

    // Check if intake form document was uploaded (for existing patient flow)
    const hasIntakeDocument = uploadedDocuments.has('intake')
    const intakeDocument = uploadedDocuments.get('intake')
    
    // Priority: FIRST check if patient-filled form exists (portal flow), 
    // THEN check for uploaded documents (existing patient flow)
    if (intakeForm) {
      // Patient filled form themselves through portal - show as completed with view link
      tasks.push({
        id: `intake-${intakeForm.id}`,
        type: 'intake',
        title: 'Application Form',
        description: 'Patient intake and application information.',
        status: 'completed',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: intakeForm.created_at,
        formId: intakeForm.id,
        link: `/intake?view=${intakeForm.id}`,
      })
    } else if (hasIntakeDocument && intakeDocument) {
      // No patient-filled form exists, but document was uploaded by admin (existing patient flow)
      tasks.push({
        id: `intake-doc-${intakeDocument.id}`,
        type: 'intake',
        title: 'Application Form',
        description: 'Application form document uploaded by admin.',
        status: 'completed',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: intakeDocument.uploaded_at,
        formId: intakeDocument.id,
        link: '#', // Document view link will be handled separately
        uploadedDocument: {
          url: intakeDocument.document_url,
          name: intakeDocument.document_name || 'Application Form Document',
        },
      })
    } else {
      // No form and no document - not started (portal flow - new patient)
      tasks.push({
        id: 'intake-new',
        type: 'intake',
        title: 'Application Form',
        description: 'Complete your patient intake and application.',
        status: 'not_started',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        formId: '',
        link: '/intake',
      })
    }

    // 2. Check for Medical History Form
    // Check by email (case-insensitive), intake_form_id, and by name as fallback
    let medicalForm = null

    // Strategy 1: Try by intake_form_id first (most reliable link)
    if (intakeForm) {
      const { data: medicalByIntake, error: intakeError } = await supabase
        .from('medical_history_forms')
        .select('id, email, intake_form_id, first_name, last_name, created_at')
        .eq('intake_form_id', intakeForm.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (intakeError) {
        console.error('[getPatientTasks] Medical history form intake_form_id query error:', intakeError)
        if (intakeError.code === '42501' || intakeError.message?.includes('permission') || intakeError.message?.includes('policy')) {
          console.error('[getPatientTasks] RLS POLICY ERROR - Patient may not have permission to view medical history forms. Make sure migration 20241210000020_add_patient_view_own_intake_forms_rls.sql is run.')
        }
      } else if (medicalByIntake && medicalByIntake.length > 0) {
        medicalForm = medicalByIntake[0]
        console.log('[getPatientTasks] ✓ Found medical history form by intake_form_id:', medicalForm.id)
      }
    }

    // Strategy 2: If not found, try by email (case-insensitive)
    if (!medicalForm && patientEmail) {
      const { data: medicalByEmail, error: emailError } = await supabase
        .from('medical_history_forms')
        .select('id, email, intake_form_id, first_name, last_name, created_at')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)

      if (emailError) {
        console.error('[getPatientTasks] Medical history form email query error:', emailError)
        if (emailError.code === '42501' || emailError.message?.includes('permission') || emailError.message?.includes('policy')) {
          console.error('[getPatientTasks] RLS POLICY ERROR - Patient may not have permission to view medical history forms. Make sure migration 20241210000020_add_patient_view_own_intake_forms_rls.sql is run.')
        }
      } else if (medicalByEmail && medicalByEmail.length > 0) {
        medicalForm = medicalByEmail[0]
        console.log('[getPatientTasks] ✓ Found medical history form by email:', medicalForm.id)
      }
    }

    // Strategy 3: If still not found and we have patient name, try by name matching
    if (!medicalForm && profile.first_name && profile.last_name) {
      const { data: medicalByName, error: nameError } = await supabase
        .from('medical_history_forms')
        .select('id, email, intake_form_id, first_name, last_name, created_at')
        .ilike('first_name', profile.first_name.trim())
        .ilike('last_name', profile.last_name.trim())
        .order('created_at', { ascending: false })
        .limit(1)

      if (nameError) {
        console.error('[getPatientTasks] Medical history form name query error:', nameError)
      } else if (medicalByName && medicalByName.length > 0) {
        medicalForm = medicalByName[0]
        console.log('[getPatientTasks] ✓ Found medical history form by name:', medicalForm.id, 'Form email:', medicalForm.email, 'Profile email:', patientEmail)
      }
    }

    if (!medicalForm) {
      console.log('[getPatientTasks] No medical history form found after trying all strategies')
    }

    // Check if medical history document was uploaded (for existing patient flow)
    const hasMedicalDocument = uploadedDocuments.has('medical')
    const medicalDocument = uploadedDocuments.get('medical')

    // Priority: FIRST check if patient filled form themselves (portal flow), 
    // THEN check for uploaded documents (existing patient flow)
    if (medicalForm) {
      // Check if form has signature (indicates patient completed it through portal)
      // Note: medical_history_forms doesn't have is_completed column, so we rely on signature
      const { data: fullMedicalForm } = await adminClient
        .from('medical_history_forms')
        .select('signature_data, signature_date')
        .eq('id', medicalForm.id)
        .maybeSingle()
      
      // Form is considered completed if it has signature data
      // signature_date is NOT NULL in schema, so we check signature_data which indicates actual completion
      const hasSignature = fullMedicalForm?.signature_data && 
        fullMedicalForm.signature_data.trim() !== ''
      
      // If patient is in onboarding, forms should be considered completed if they exist
      // (onboarding only happens after completing all 4 initial forms)
      const shouldConsiderCompleted = hasSignature || isInOnboarding
      
      // If form exists and has signature (or patient is in onboarding), it's completed (portal flow)
      // If form exists but no signature and not in onboarding, check if there's an uploaded document as fallback
      if (shouldConsiderCompleted) {
        // Patient filled form themselves - show as completed with view link
        tasks.push({
          id: `medical-${medicalForm.id}`,
          type: 'medical_history',
          title: 'Medical Health History',
          description: 'Helps our medical team prepare for your treatment.',
          status: 'completed',
          estimatedTime: '~15 min',
          isRequired: true,
          isOptional: false,
          completedAt: medicalForm.created_at,
          formId: medicalForm.id,
          link: `/medical-history?view=${medicalForm.id}`,
        })
      } else if (hasMedicalDocument && medicalDocument) {
        // Form exists but no signature - check if document was uploaded (existing patient fallback)
        tasks.push({
          id: `medical-doc-${medicalDocument.id}`,
          type: 'medical_history',
          title: 'Medical Health History',
          description: 'Medical history document uploaded by admin.',
          status: 'completed',
          estimatedTime: '~15 min',
          isRequired: true,
          isOptional: false,
          completedAt: medicalDocument.uploaded_at,
          formId: medicalDocument.id,
          link: '#', // Document view link will be handled separately
          uploadedDocument: {
            url: medicalDocument.document_url,
            name: medicalDocument.document_name || 'Medical History Document',
          },
        })
      } else {
        // Form exists but not completed (portal flow - patient needs to complete)
        const intakeFormId = intakeForm?.id || null
        tasks.push({
          id: `medical-${medicalForm.id}`,
          type: 'medical_history',
          title: 'Medical Health History',
          description: 'Helps our medical team prepare for your treatment.',
          status: 'not_started',
          estimatedTime: '~15 min',
          isRequired: true,
          isOptional: false,
          formId: medicalForm.id,
          link: intakeFormId ? `/medical-history?intake_form_id=${intakeFormId}&view=${medicalForm.id}` : `/medical-history?view=${medicalForm.id}`,
        })
      }
    } else if (hasMedicalDocument && medicalDocument) {
      // No patient-filled form exists, but document was uploaded by admin (existing patient flow)
      tasks.push({
        id: `medical-doc-${medicalDocument.id}`,
        type: 'medical_history',
        title: 'Medical Health History',
        description: 'Medical history document uploaded by admin.',
        status: 'completed',
        estimatedTime: '~15 min',
        isRequired: true,
        isOptional: false,
        completedAt: medicalDocument.uploaded_at,
        formId: medicalDocument.id,
        link: '#', // Document view link will be handled separately
        uploadedDocument: {
          url: medicalDocument.document_url,
          name: medicalDocument.document_name || 'Medical History Document',
        },
      })
    } else {
      // No form and no document - not started (portal flow - new patient)
      const intakeFormId = intakeForm?.id || null
      tasks.push({
        id: 'medical-new',
        type: 'medical_history',
        title: 'Medical Health History',
        description: 'Helps our medical team prepare for your treatment.',
        status: 'not_started',
        estimatedTime: '~15',
        isRequired: true,
        isOptional: false,
        formId: '',
        link: intakeFormId ? `/medical-history?intake_form_id=${intakeFormId}` : '/medical-history',
      })
    }

    // 3. Check for Service Agreement
    // Check by patient_id first (most reliable), then by patient_email (case-insensitive)
    let serviceAgreement = null

    // First try by patient_id (most reliable link)
    if (patientId) {
      const { data: serviceByPatientId, error: patientIdError } = await supabase
        .from('service_agreements')
        .select('id, patient_id, patient_email, created_at, is_activated, activated_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!patientIdError && serviceByPatientId && serviceByPatientId.length > 0) {
        serviceAgreement = serviceByPatientId[0]
        console.log('[getPatientTasks] Found service agreement by patient_id:', serviceAgreement.id)
      } else if (patientEmail) {
        // Fallback to email (case-insensitive)
        const { data: serviceByEmail, error: emailError } = await supabase
          .from('service_agreements')
          .select('id, patient_id, patient_email, created_at, is_activated, activated_at')
          .ilike('patient_email', patientEmail)
          .order('created_at', { ascending: false })
          .limit(1)

        if (!emailError && serviceByEmail && serviceByEmail.length > 0) {
          serviceAgreement = serviceByEmail[0]
          console.log('[getPatientTasks] Found service agreement by patient_email:', serviceAgreement.id)
        } else {
          console.log('[getPatientTasks] No service agreement found by patient_id or patient_email')
        }
      } else {
        console.log('[getPatientTasks] No service agreement found (no patient_id match, no email)')
      }
    } else if (patientEmail) {
      // If no patient_id, try by email only
      const { data: serviceByEmail, error: emailError } = await supabase
        .from('service_agreements')
        .select('id, patient_id, patient_email, created_at, is_activated, activated_at')
        .ilike('patient_email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!emailError && serviceByEmail && serviceByEmail.length > 0) {
        serviceAgreement = serviceByEmail[0]
        console.log('[getPatientTasks] Found service agreement by patient_email (no patient_id):', serviceAgreement.id)
      } else {
        console.log('[getPatientTasks] No service agreement found by patient_email')
      }
    }

    // Log final task statuses for debugging
    console.log('[getPatientTasks] Final tasks:')
    tasks.forEach(task => {
      console.log(`  - ${task.title}: ${task.status} (ID: ${task.id}, FormID: ${task.formId})`)
    })
    console.log('[getPatientTasks] Final tasks count:', tasks.length)

    // Check if service agreement document was uploaded (for existing patient flow)
    const hasServiceDocument = uploadedDocuments.has('service')
    const serviceDocument = uploadedDocuments.get('service')

    // Priority: FIRST check if patient-filled form exists (portal flow), 
    // THEN check for uploaded documents (existing patient flow)
    if (serviceAgreement) {
      if (serviceAgreement.is_activated) {
        // Check if patient signature fields are filled to determine if completed (portal flow)
        // Fetch full service agreement data to check completion status
        // Use same query structure as admin view (patient-profile.action.ts) for consistency
        const { data: fullServiceAgreement, error: fetchError } = await adminClient
          .from('service_agreements')
          .select('patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
          .eq('id', serviceAgreement.id)
          .maybeSingle()

        // If error fetching, log and continue (form might still exist, check later)
        if (fetchError) {
          console.error('[getPatientTasks] Error fetching service agreement:', fetchError.message)
        }

        // Form is considered completed if it has the essential signature fields
        // Match the admin view check logic from patient-profile.action.ts (lines 356-362)
        // Essential fields: patient_signature_name, patient_signature_date, and patient_signature_data
        // Note: This matches the simplified admin check - only requires name, date, and data (not first_name/last_name)
        const hasSignatureName = fullServiceAgreement?.patient_signature_name && 
          typeof fullServiceAgreement.patient_signature_name === 'string' &&
          fullServiceAgreement.patient_signature_name.trim() !== ''
        const hasSignatureDate = fullServiceAgreement?.patient_signature_date !== null && 
          fullServiceAgreement?.patient_signature_date !== undefined &&
          fullServiceAgreement?.patient_signature_date !== ''
        const hasSignatureData = fullServiceAgreement?.patient_signature_data &&
          typeof fullServiceAgreement.patient_signature_data === 'string' &&
          fullServiceAgreement.patient_signature_data.trim() !== '' &&
          fullServiceAgreement.patient_signature_data.length > 0
        
        // Form is complete if it has signature name, date, and signature data (exact match with admin view check)
        const isPatientSignatureComplete = Boolean(hasSignatureName && hasSignatureDate && hasSignatureData)
        
        // If patient is in onboarding, forms should be considered completed if they exist
        // (onboarding only happens after completing all 4 initial forms)
        // Note: service_agreements table doesn't have is_completed column - completion is determined by signature fields
        const shouldConsiderCompleted = isPatientSignatureComplete || isInOnboarding

        tasks.push({
          id: `service-${serviceAgreement.id}`,
          type: 'service_agreement',
          title: 'Service Agreement',
          description: shouldConsiderCompleted
            ? 'Service agreement completed.'
            : 'Please review and sign the service agreement.',
          status: shouldConsiderCompleted ? 'completed' : 'not_started',
          estimatedTime: '~5 min',
          isRequired: true,
          isOptional: false,
          completedAt: shouldConsiderCompleted ? serviceAgreement.created_at : undefined,
          formId: serviceAgreement.id,
          link: shouldConsiderCompleted
            ? `/patient/service-agreement?view=${serviceAgreement.id}`
            : `/patient/service-agreement`,
        })
      } else {
        tasks.push({
          id: `service-${serviceAgreement.id}`,
          type: 'service_agreement',
          title: 'Service Agreement',
          description: 'Waiting for admin activation. This form will be available soon.',
          status: 'locked',
          estimatedTime: '~5 min',
          isRequired: true,
          isOptional: false,
          formId: serviceAgreement.id,
          link: '#',
        })
      }
    } else if (hasServiceDocument && serviceDocument) {
      // No patient-filled form exists, but document was uploaded by admin (existing patient flow)
      tasks.push({
        id: `service-doc-${serviceDocument.id}`,
        type: 'service_agreement',
        title: 'Service Agreement',
        description: 'Service agreement document uploaded by admin.',
        status: 'completed',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: serviceDocument.uploaded_at,
        formId: serviceDocument.id,
        link: '#', // Document view link will be handled separately
        uploadedDocument: {
          url: serviceDocument.document_url,
          name: serviceDocument.document_name || 'Service Agreement Document',
        },
      })
    } else {
      // Form doesn't exist yet - show as locked until admin creates and activates it
      tasks.push({
        id: 'service-new',
        type: 'service_agreement',
        title: 'Service Agreement',
        description: 'Waiting for admin activation. This form will be available soon.',
        status: 'locked',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        formId: '',
        link: '#',
      })
    }

    // 4. Check for Ibogaine Consent Form
    let ibogaineConsentForm = null

    // Strategy 1: Try by patient_id first (most reliable link)
    if (patientId) {
      const { data: consentByPatientId, error: patientIdError } = await supabase
        .from('ibogaine_consent_forms')
        .select('id, patient_id, email, intake_form_id, created_at, is_activated, activated_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!patientIdError && consentByPatientId && consentByPatientId.length > 0) {
        ibogaineConsentForm = consentByPatientId[0]
        console.log('[getPatientTasks] ✓ Found ibogaine consent form by patient_id:', ibogaineConsentForm.id)
      }
    }

    // Strategy 2: Try by intake_form_id if available
    if (!ibogaineConsentForm && intakeForm) {
      const { data: consentByIntake, error: intakeError } = await supabase
        .from('ibogaine_consent_forms')
        .select('id, patient_id, email, intake_form_id, created_at, is_activated, activated_at')
        .eq('intake_form_id', intakeForm.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!intakeError && consentByIntake && consentByIntake.length > 0) {
        ibogaineConsentForm = consentByIntake[0]
        console.log('[getPatientTasks] ✓ Found ibogaine consent form by intake_form_id:', ibogaineConsentForm.id)
      }
    }

    // Strategy 3: Try by email (case-insensitive)
    if (!ibogaineConsentForm && patientEmail) {
      const { data: consentByEmail, error: emailError } = await supabase
        .from('ibogaine_consent_forms')
        .select('id, patient_id, email, intake_form_id, created_at, is_activated, activated_at')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!emailError && consentByEmail && consentByEmail.length > 0) {
        ibogaineConsentForm = consentByEmail[0]
        console.log('[getPatientTasks] ✓ Found ibogaine consent form by email:', ibogaineConsentForm.id)
      }
    }

    // Check if ibogaine consent document was uploaded (for existing patient flow)
    const hasIbogaineDocument = uploadedDocuments.has('ibogaine')
    const ibogaineDocument = uploadedDocuments.get('ibogaine')

    // Priority: FIRST check if patient-filled form exists (portal flow), 
    // THEN check for uploaded documents (existing patient flow)
    if (ibogaineConsentForm) {
      if (ibogaineConsentForm.is_activated) {
        // Check if patient signature fields are filled to determine if completed (portal flow)
        // Use admin client to also check is_completed flag
        const { data: fullConsentForm } = await adminClient
          .from('ibogaine_consent_forms')
          .select('signature_data, signature_date, signature_name, is_completed')
          .eq('id', ibogaineConsentForm.id)
          .single()

        const isPatientSignatureComplete = fullConsentForm &&
          fullConsentForm.signature_data &&
          fullConsentForm.signature_data.trim() !== '' &&
          fullConsentForm.signature_date &&
          fullConsentForm.signature_name &&
          fullConsentForm.signature_name.trim() !== ''

        // Check if form is marked as completed (could be from admin upload, but form exists so prioritize patient view)
        const isCompletedByAdmin = fullConsentForm?.is_completed === true
        
        // If patient is in onboarding, forms should be considered completed if they exist
        // (onboarding only happens after completing all 4 initial forms)
        const shouldConsiderCompleted = isPatientSignatureComplete || isCompletedByAdmin || isInOnboarding

        tasks.push({
          id: `ibogaine-consent-${ibogaineConsentForm.id}`,
          type: 'ibogaine_consent',
          title: 'Ibogaine Therapy Consent Form',
          description: shouldConsiderCompleted
            ? 'Consent form for Ibogaine therapy treatment.'
            : 'Please review and complete the consent form.',
          status: shouldConsiderCompleted ? 'completed' : 'not_started',
          estimatedTime: '~5 min',
          isRequired: true,
          isOptional: false,
          completedAt: shouldConsiderCompleted ? ibogaineConsentForm.created_at : undefined,
          formId: ibogaineConsentForm.id,
          link: shouldConsiderCompleted
            ? `/patient/ibogaine-consent?formId=${ibogaineConsentForm.id}`
            : `/patient/ibogaine-consent`,
        })
      } else {
        tasks.push({
          id: `ibogaine-consent-${ibogaineConsentForm.id}`,
          type: 'ibogaine_consent',
          title: 'Ibogaine Therapy Consent Form',
          description: 'Waiting for admin activation. This form will be available soon.',
          status: 'locked',
          estimatedTime: '~5 min',
          isRequired: true,
          isOptional: false,
          formId: ibogaineConsentForm.id,
          link: '#',
        })
      }
    } else if (hasIbogaineDocument && ibogaineDocument) {
      // No patient-filled form exists, but document was uploaded by admin (existing patient flow)
      tasks.push({
        id: `ibogaine-doc-${ibogaineDocument.id}`,
        type: 'ibogaine_consent',
        title: 'Ibogaine Therapy Consent Form',
        description: 'Ibogaine consent document uploaded by admin.',
        status: 'completed',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: ibogaineDocument.uploaded_at,
        formId: ibogaineDocument.id,
        link: '#', // Document view link will be handled separately
        uploadedDocument: {
          url: ibogaineDocument.document_url,
          name: ibogaineDocument.document_name || 'Ibogaine Consent Form Document',
        },
      })
    } else {
      // Form doesn't exist yet - show as locked until admin creates and activates it
      tasks.push({
        id: 'ibogaine-consent-new',
        type: 'ibogaine_consent',
        title: 'Ibogaine Therapy Consent Form',
        description: 'Waiting for admin activation. This form will be available soon.',
        status: 'locked',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        formId: '',
        link: '#',
      })
    }

    // 5. Check for Onboarding Forms (if patient is in onboarding stage)
    // Note: onboarding check was done earlier to determine form completion status
    let onboardingStatus: OnboardingStatus = { isInOnboarding: false }
    const { data: onboardingFull } = await supabase
      .from('patient_onboarding')
      .select('id, status, release_form_completed, outing_consent_completed, internal_regulations_completed')
      .eq('patient_id', patientId)
      .maybeSingle()

    if (onboardingFull) {
      onboardingStatus = {
        isInOnboarding: true,
        status: onboardingFull.status as 'in_progress' | 'completed' | 'moved_to_management',
        onboardingId: onboardingFull.id,
        formsCompleted: [
          onboardingFull.release_form_completed,
          onboardingFull.outing_consent_completed,
          onboardingFull.internal_regulations_completed,
        ].filter(Boolean).length,
        formsTotal: 3,
      }

      // Fetch all 3 onboarding forms
      if (!onboardingFull) {
        return { success: false, error: 'Onboarding record not found' }
      }

      const [releaseForm, outingForm, regulationsForm] = await Promise.all([
        supabase.from('onboarding_release_forms').select('id, is_completed, is_activated, completed_at').eq('onboarding_id', onboardingFull.id).maybeSingle(),
        supabase.from('onboarding_outing_consent_forms').select('id, is_completed, is_activated, completed_at').eq('onboarding_id', onboardingFull.id).maybeSingle(),
        supabase.from('onboarding_internal_regulations_forms').select('id, is_completed, is_activated, completed_at').eq('onboarding_id', onboardingFull.id).maybeSingle(),
      ])

      // Helper function to determine task status
      const getOnboardingTaskStatus = (form: { data: any } | null): 'not_started' | 'in_progress' | 'completed' | 'locked' => {
        if (!form?.data) return 'locked'
        if (!form.data.is_activated) return 'locked'
        if (form.data.is_completed) return 'completed'
        // If form exists and is activated but not completed, it's in progress (patient can edit it)
        return 'in_progress'
      }

      // Add Release Form task
      tasks.push({
        id: `onboarding-release-${releaseForm?.data?.id || onboardingFull.id}`,
        type: 'onboarding_release',
        title: 'Release Form',
        description: 'Iboga Wellness Institute Release Form',
        status: getOnboardingTaskStatus(releaseForm),
        estimatedTime: '~10 min',
        isRequired: true,
        isOptional: false,
        completedAt: releaseForm?.data?.completed_at || undefined,
        formId: releaseForm?.data?.id || '',
        link: releaseForm?.data?.is_activated ? `/onboarding-forms/${onboardingFull.id}/release-form` : '#',
      })

      // Add Outing Consent Form task
      tasks.push({
        id: `onboarding-outing-${outingForm?.data?.id || onboardingFull.id}`,
        type: 'onboarding_outing',
        title: 'Outing/Transfer Consent',
        description: 'Consent form for outings and transfers',
        status: getOnboardingTaskStatus(outingForm),
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: outingForm?.data?.completed_at || undefined,
        formId: outingForm?.data?.id || '',
        link: outingForm?.data?.is_activated ? `/onboarding-forms/${onboardingFull.id}/outing-consent` : '#',
      })

      // Add Internal Regulations Form task
      tasks.push({
        id: `onboarding-regulations-${regulationsForm?.data?.id || onboardingFull.id}`,
        type: 'onboarding_regulations',
        title: 'Internal Regulations',
        description: 'Acknowledgment of clinic rules and regulations',
        status: getOnboardingTaskStatus(regulationsForm),
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: regulationsForm?.data?.completed_at || undefined,
        formId: regulationsForm?.data?.id || '',
        link: regulationsForm?.data?.is_activated ? `/onboarding-forms/${onboardingFull.id}/internal-regulations` : '#',
      })
    }

    // Calculate task statistics (include onboarding forms)
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const totalRequiredTasks = tasks.filter(t => t.isRequired).length
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length

    return {
      success: true,
      data: {
        tasks,
        statistics: {
          completed: completedTasks,
          total: totalRequiredTasks,
          inProgress: inProgressTasks,
          required: tasks.filter(t => t.isRequired && t.status !== 'completed').length,
          optional: tasks.filter(t => t.isOptional).length,
        },
        onboardingStatus,
      },
    }
  })
