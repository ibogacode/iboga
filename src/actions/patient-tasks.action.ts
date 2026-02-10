'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const getPatientTasksSchema = z.object({})

export interface PatientTask {
  id: string
  type: 'intake' | 'medical_history' | 'service_agreement' | 'ibogaine_consent' | 'onboarding_release' | 'onboarding_outing' | 'onboarding_social_media' | 'onboarding_regulations' | 'onboarding_dissent' | 'onboarding_ekg_upload' | 'onboarding_bloodwork_upload'
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
 * Optimized to run queries in parallel where possible
 */
export const getPatientTasks = authActionClient
  .schema(getPatientTasksSchema)
  .action(async ({ ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const patientId = ctx.user.id

    // ========== PHASE 1: Initial parallel queries ==========
    // Run profile, onboarding, and form lookups in parallel
    const [
      profileResult,
      onboardingResult,
      intakeFormsByPatientResult,
      medicalFormsByPatientResult,
      serviceAgreementResult,
      ibogaineConsentResult,
    ] = await Promise.all([
      // Get patient profile
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', patientId)
        .single(),
      // Check onboarding status (full query - no need to query again later)
      supabase
        .from('patient_onboarding')
        .select('id, status, release_form_completed, outing_consent_completed, internal_regulations_completed')
        .eq('patient_id', patientId)
        .maybeSingle(),
      // Try to find intake form by patient_id match in profiles
      supabase
        .from('patient_intake_forms')
        .select('id, email, created_at, first_name, last_name')
        .order('created_at', { ascending: false })
        .limit(10), // Get recent forms to match by email/name
      // Get medical forms
      supabase
        .from('medical_history_forms')
        .select('id, email, intake_form_id, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      // Get service agreements by patient_id
      supabase
        .from('service_agreements')
        .select('id, patient_id, patient_email, created_at, is_activated, activated_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1),
      // Get ibogaine consent forms by patient_id
      supabase
        .from('ibogaine_consent_forms')
        .select('id, patient_id, email, intake_form_id, created_at, is_activated, activated_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    const profile = profileResult.data
    if (profileResult.error || !profile) {
      console.error('[getPatientTasks] Profile error:', profileResult.error)
      return { success: false, error: 'Patient profile not found' }
    }

    const patientEmail = (profile.email || '').trim().toLowerCase()
    const onboardingFull = onboardingResult.data
    const isInOnboarding = !!onboardingFull
    console.log('[getPatientTasks] Patient ID:', patientId, 'Email:', patientEmail, 'Onboarding:', isInOnboarding)

    const tasks: PatientTask[] = []
    let uploadedDocuments: Map<string, any> = new Map()

    // ========== PHASE 2: Get partial form and uploaded documents in parallel ==========
    // Find partial intake form to get uploaded documents
    let partialFormId: string | null = null
    if (patientEmail) {
      const { data: partialForms } = await adminClient
        .from('partial_intake_forms')
        .select('id')
        .eq('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (partialForms?.[0]) {
        partialFormId = partialForms[0].id
        // Get uploaded documents
        const { data: existingDocs } = await adminClient
          .from('existing_patient_documents')
          .select('form_type, document_url, document_name, uploaded_at, id')
          .eq('partial_intake_form_id', partialFormId)
        
        existingDocs?.forEach((doc: any) => {
          uploadedDocuments.set(doc.form_type, doc)
        })
      }
    }

    // ========== PHASE 3: Match forms from pre-fetched data ==========
    // 1. Find intake form by email or name match from pre-fetched forms
    const intakeForms = intakeFormsByPatientResult.data || []
    let intakeForm = intakeForms.find(f => 
      f.email?.toLowerCase().trim() === patientEmail
    ) || intakeForms.find(f => 
      profile.first_name && profile.last_name &&
      f.first_name?.toLowerCase().trim() === profile.first_name.toLowerCase().trim() &&
      f.last_name?.toLowerCase().trim() === profile.last_name.toLowerCase().trim()
    ) || null
    
    if (intakeForm) {
      console.log('[getPatientTasks] ✓ Found intake form:', intakeForm.id)
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

    // 2. Find medical history form from pre-fetched data
    const medicalForms = medicalFormsByPatientResult.data || []
    let medicalForm = (intakeForm && medicalForms.find(f => f.intake_form_id === intakeForm.id)) ||
      medicalForms.find(f => f.email?.toLowerCase().trim() === patientEmail) ||
      medicalForms.find(f => 
        profile.first_name && profile.last_name &&
        f.first_name?.toLowerCase().trim() === profile.first_name.toLowerCase().trim() &&
        f.last_name?.toLowerCase().trim() === profile.last_name.toLowerCase().trim()
      ) || null
    
    if (medicalForm) {
      console.log('[getPatientTasks] ✓ Found medical form:', medicalForm.id)
    }

    // 3. Get service agreement and ibogaine consent (already fetched by patient_id, check email fallback if needed)
    let serviceAgreement = serviceAgreementResult.data?.[0] || null
    let ibogaineConsentForm = ibogaineConsentResult.data?.[0] || null

    // If not found by patient_id, try email fallback in parallel
    if (patientEmail && (!serviceAgreement || !ibogaineConsentForm)) {
      const fallbackQueries = []
      if (!serviceAgreement) {
        fallbackQueries.push(
          supabase
            .from('service_agreements')
            .select('id, patient_id, patient_email, created_at, is_activated, activated_at')
            .ilike('patient_email', patientEmail)
            .order('created_at', { ascending: false })
            .limit(1)
            .then(r => ({ type: 'service', data: r.data?.[0] }))
        )
      }
      if (!ibogaineConsentForm) {
        // Try by intake_form_id first, then email
        const consentQuery = intakeForm
          ? supabase
              .from('ibogaine_consent_forms')
              .select('id, patient_id, email, intake_form_id, created_at, is_activated, activated_at')
              .eq('intake_form_id', intakeForm.id)
              .order('created_at', { ascending: false })
              .limit(1)
          : supabase
              .from('ibogaine_consent_forms')
              .select('id, patient_id, email, intake_form_id, created_at, is_activated, activated_at')
              .ilike('email', patientEmail)
              .order('created_at', { ascending: false })
              .limit(1)
        fallbackQueries.push(
          consentQuery.then(r => ({ type: 'consent', data: r.data?.[0] }))
        )
      }
      
      const fallbackResults = await Promise.all(fallbackQueries)
      fallbackResults.forEach(r => {
        if (r.type === 'service' && r.data) {
          serviceAgreement = r.data as { id: any; patient_id: any; patient_email: any; created_at: any; is_activated: any; activated_at: any } | null
        }
        if (r.type === 'consent' && r.data) {
          ibogaineConsentForm = r.data as { id: any; patient_id: any; email: any; intake_form_id: any; created_at: any; is_activated: any; activated_at: any } | null
        }
      })
    }

    // ========== PHASE 4: Fetch signature data in parallel for all forms that need checking ==========
    const signatureQueries: Array<PromiseLike<{ type: string; data: any }>> = []
    
    if (medicalForm) {
      signatureQueries.push(
        adminClient
          .from('medical_history_forms')
          .select('signature_data, signature_date')
          .eq('id', medicalForm.id)
          .maybeSingle()
          .then(r => ({ type: 'medical', data: r.data }))
      )
    }
    
    if (serviceAgreement?.is_activated) {
      signatureQueries.push(
        adminClient
          .from('service_agreements')
          .select('patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
          .eq('id', serviceAgreement.id)
          .maybeSingle()
          .then(r => ({ type: 'service', data: r.data }))
      )
    }
    
    if (ibogaineConsentForm?.is_activated) {
      signatureQueries.push(
        adminClient
          .from('ibogaine_consent_forms')
          .select('signature_data, signature_date, signature_name')
          .eq('id', ibogaineConsentForm.id)
          .maybeSingle()
          .then(r => ({ type: 'ibogaine', data: r.data }))
      )
    }

    const signatureResults = await Promise.all(signatureQueries)
    const signatureData: Record<string, any> = {}
    signatureResults.forEach(r => { signatureData[r.type] = r.data })

    // ========== PHASE 5: Build tasks list ==========
    // Check uploaded documents
    const hasMedicalDocument = uploadedDocuments.has('medical')
    const medicalDocument = uploadedDocuments.get('medical')

    // Add Medical History task
    if (medicalForm) {
      const fullMedicalForm = signatureData.medical
      const hasSignature = fullMedicalForm?.signature_data?.trim()
      const shouldConsiderCompleted = hasSignature || isInOnboarding
      
      if (shouldConsiderCompleted) {
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
          link: '#',
          uploadedDocument: {
            url: medicalDocument.document_url,
            name: medicalDocument.document_name || 'Medical History Document',
          },
        })
      } else {
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
        link: '#',
        uploadedDocument: {
          url: medicalDocument.document_url,
          name: medicalDocument.document_name || 'Medical History Document',
        },
      })
    } else {
      const intakeFormId = intakeForm?.id || null
      tasks.push({
        id: 'medical-new',
        type: 'medical_history',
        title: 'Medical Health History',
        description: 'Helps our medical team prepare for your treatment.',
        status: 'not_started',
        estimatedTime: '~15 min',
        isRequired: true,
        isOptional: false,
        formId: '',
        link: intakeFormId ? `/medical-history?intake_form_id=${intakeFormId}` : '/medical-history',
      })
    }

    // Add Service Agreement task
    const hasServiceDocument = uploadedDocuments.has('service')
    const serviceDocument = uploadedDocuments.get('service')

    if (serviceAgreement) {
      if (serviceAgreement.is_activated) {
        const fullServiceAgreement = signatureData.service
        const hasSignatureName = fullServiceAgreement?.patient_signature_name?.trim()
        const hasSignatureDate = fullServiceAgreement?.patient_signature_date
        const hasSignatureData = fullServiceAgreement?.patient_signature_data?.trim()
        const isPatientSignatureComplete = Boolean(hasSignatureName && hasSignatureDate && hasSignatureData)
        const shouldConsiderCompleted = isPatientSignatureComplete || isInOnboarding

        tasks.push({
          id: `service-${serviceAgreement.id}`,
          type: 'service_agreement',
          title: 'Service Agreement',
          description: shouldConsiderCompleted ? 'Service agreement completed.' : 'Please review and sign the service agreement.',
          status: shouldConsiderCompleted ? 'completed' : 'not_started',
          estimatedTime: '~5 min',
          isRequired: true,
          isOptional: false,
          completedAt: shouldConsiderCompleted ? serviceAgreement.created_at : undefined,
          formId: serviceAgreement.id,
          link: shouldConsiderCompleted ? `/patient/service-agreement?view=${serviceAgreement.id}` : `/patient/service-agreement`,
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
        link: '#',
        uploadedDocument: {
          url: serviceDocument.document_url,
          name: serviceDocument.document_name || 'Service Agreement Document',
        },
      })
    } else {
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

    // Add Ibogaine Consent Form task
    const hasIbogaineDocument = uploadedDocuments.has('ibogaine')
    const ibogaineDocument = uploadedDocuments.get('ibogaine')

    if (ibogaineConsentForm) {
      if (ibogaineConsentForm.is_activated) {
        const fullConsentForm = signatureData.ibogaine
        const isPatientSignatureComplete = fullConsentForm &&
          fullConsentForm.signature_data?.trim() &&
          fullConsentForm.signature_date &&
          fullConsentForm.signature_name?.trim()
        const shouldConsiderCompleted = isPatientSignatureComplete || isInOnboarding

        tasks.push({
          id: `ibogaine-consent-${ibogaineConsentForm.id}`,
          type: 'ibogaine_consent',
          title: 'Ibogaine Therapy Consent Form',
          description: shouldConsiderCompleted ? 'Consent form for Ibogaine therapy treatment.' : 'Please review and complete the consent form.',
          status: shouldConsiderCompleted ? 'completed' : 'not_started',
          estimatedTime: '~5 min',
          isRequired: true,
          isOptional: false,
          completedAt: shouldConsiderCompleted ? ibogaineConsentForm.created_at : undefined,
          formId: ibogaineConsentForm.id,
          link: shouldConsiderCompleted ? `/patient/ibogaine-consent?formId=${ibogaineConsentForm.id}` : `/patient/ibogaine-consent`,
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
        link: '#',
        uploadedDocument: {
          url: ibogaineDocument.document_url,
          name: ibogaineDocument.document_name || 'Ibogaine Consent Form Document',
        },
      })
    } else {
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

    // 5. Add Onboarding Forms (if patient is in onboarding stage)
    // onboardingFull was already fetched in Phase 1
    let onboardingStatus: OnboardingStatus = { isInOnboarding: false }

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

      // Fetch all 3 onboarding forms and EKG/Bloodwork doc status in parallel
      const [releaseForm, outingForm, regulationsForm, medicalDocsResult] = await Promise.all([
        supabase.from('onboarding_release_forms').select('id, is_completed, is_activated, completed_at').eq('onboarding_id', onboardingFull.id).maybeSingle(),
        supabase.from('onboarding_outing_consent_forms').select('id, is_completed, is_activated, completed_at').eq('onboarding_id', onboardingFull.id).maybeSingle(),
        supabase.from('onboarding_internal_regulations_forms').select('id, is_completed, is_activated, completed_at').eq('onboarding_id', onboardingFull.id).maybeSingle(),
        supabase.from('onboarding_medical_documents').select('document_type, uploaded_at').eq('onboarding_id', onboardingFull.id),
      ])
      const medicalDocs = medicalDocsResult.data || []
      const hasEkg = medicalDocs.some((d: { document_type: string }) => d.document_type === 'ekg')
      const hasBloodwork = medicalDocs.some((d: { document_type: string }) => d.document_type === 'bloodwork')
      const ekgUploadedAt = medicalDocs.find((d: { document_type: string; uploaded_at: string }) => d.document_type === 'ekg')?.uploaded_at
      const bloodworkUploadedAt = medicalDocs.find((d: { document_type: string; uploaded_at: string }) => d.document_type === 'bloodwork')?.uploaded_at

      // Helper function to determine task status
      const getOnboardingTaskStatus = (form: { data: any } | null): 'not_started' | 'in_progress' | 'completed' | 'locked' => {
        if (!form?.data) return 'locked'
        if (!form.data.is_activated) return 'locked'
        if (form.data.is_completed) return 'completed'
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

      // Add EKG and Bloodwork upload tasks (required for tapering schedule)
      tasks.push({
        id: `onboarding-ekg-${onboardingFull.id}`,
        type: 'onboarding_ekg_upload',
        title: 'Upload EKG Results',
        description: 'Upload your EKG results. Required before we can prepare your tapering schedule.',
        status: hasEkg ? 'completed' : 'not_started',
        estimatedTime: '~2 min',
        isRequired: true,
        isOptional: false,
        completedAt: ekgUploadedAt || undefined,
        formId: onboardingFull.id,
        link: '/patient/documents',
      })
      tasks.push({
        id: `onboarding-bloodwork-${onboardingFull.id}`,
        type: 'onboarding_bloodwork_upload',
        title: 'Upload Bloodwork Results',
        description: 'Upload your bloodwork results. Required before we can prepare your tapering schedule.',
        status: hasBloodwork ? 'completed' : 'not_started',
        estimatedTime: '~2 min',
        isRequired: true,
        isOptional: false,
        completedAt: bloodworkUploadedAt || undefined,
        formId: onboardingFull.id,
        link: '/patient/documents',
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
