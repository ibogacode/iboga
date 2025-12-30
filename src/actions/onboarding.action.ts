'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

const getOnboardingPatientsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
})

// Get patients who have completed all 4 forms (ready for onboarding)
export const getOnboardingPatients = authActionClient
  .schema(getOnboardingPatientsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Check if user is owner/admin
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
    }

    // Get all intake forms (completed)
    const { data: allIntakeForms, error: intakeError } = await adminClient
      .from('patient_intake_forms')
      .select('id, first_name, last_name, email, created_at, program_type')
      .order('created_at', { ascending: false })
      .limit(parsedInput.limit * 2) // Get more to filter
    
    if (intakeError) {
      return { success: false, error: intakeError.message }
    }

    // Also get partial intake forms (for existing patients with uploaded documents)
    const { data: allPartialForms, error: partialError } = await adminClient
      .from('partial_intake_forms')
      .select('id, first_name, last_name, email, created_at, program_type, completed_form_id')
      .order('created_at', { ascending: false })
      .limit(parsedInput.limit * 2)
    
    if (partialError) {
      return { success: false, error: partialError.message }
    }

    // Combine both sources - we'll check all patients
    const allPatients = [
      ...(allIntakeForms || []).map((f: any) => ({ ...f, source: 'intake_form' as const })),
      ...(allPartialForms || []).map((f: any) => ({ 
        ...f, 
        source: 'partial_form' as const, 
        intake_form_id: f.completed_form_id || null, // Only use completed_form_id if it exists
      })),
    ]

    if (allPatients.length === 0) {
      return { success: true, data: [] }
    }

    const intakeFormIds = allPatients
      .filter(p => p.source === 'intake_form')
      .map(f => f.id)
    const partialFormIds = allPatients
      .filter(p => p.source === 'partial_form')
      .map(f => f.id)
    const patientEmails = allPatients
      .map(f => f.email?.toLowerCase().trim())
      .filter(Boolean) as string[]

    // Get all intake form IDs including those linked from partial forms
    const allIntakeFormIdsForLookup = [
      ...intakeFormIds,
      ...allPatients
        .filter(p => p.source === 'partial_form' && p.intake_form_id)
        .map(p => p.intake_form_id),
    ]

    // Batch fetch all related forms by intake_form_id
    const [medicalHistoryData, serviceAgreementData, ibogaineConsentData] = await Promise.all([
      // Medical History
      allIntakeFormIdsForLookup.length > 0
        ? adminClient
            .from('medical_history_forms')
            .select('intake_form_id, patient_email')
            .in('intake_form_id', allIntakeFormIdsForLookup)
        : Promise.resolve({ data: [] }),
      // Service Agreements
      allIntakeFormIdsForLookup.length > 0
        ? adminClient
            .from('service_agreements')
            .select('intake_form_id, patient_email')
            .in('intake_form_id', allIntakeFormIdsForLookup)
        : Promise.resolve({ data: [] }),
      // Ibogaine Consent
      allIntakeFormIdsForLookup.length > 0
        ? adminClient
            .from('ibogaine_consent_forms')
            .select('intake_form_id, email')
            .in('intake_form_id', allIntakeFormIdsForLookup)
        : Promise.resolve({ data: [] }),
    ])

    // Also fetch forms by email for partial forms without completed_form_id
    const partialFormsWithoutCompleted = allPatients
      .filter(p => p.source === 'partial_form' && !p.intake_form_id)
      .map(p => p.email?.toLowerCase().trim())
      .filter(Boolean) as string[]

    const [medicalHistoryByEmail, serviceAgreementByEmail, ibogaineConsentByEmail] = await Promise.all([
      // Medical History by email
      partialFormsWithoutCompleted.length > 0
        ? adminClient
            .from('medical_history_forms')
            .select('patient_email')
            .then((result) => {
              // Filter by email in memory (Supabase doesn't support ILIKE in array)
              const filtered = (result.data || []).filter((m: any) => 
                m.patient_email && partialFormsWithoutCompleted.includes(m.patient_email.toLowerCase().trim())
              )
              return { data: filtered }
            })
        : Promise.resolve({ data: [] }),
      // Service Agreements by email
      partialFormsWithoutCompleted.length > 0
        ? adminClient
            .from('service_agreements')
            .select('patient_email')
            .then((result) => {
              const filtered = (result.data || []).filter((sa: any) => 
                sa.patient_email && partialFormsWithoutCompleted.includes(sa.patient_email.toLowerCase().trim())
              )
              return { data: filtered }
            })
        : Promise.resolve({ data: [] }),
      // Ibogaine Consent by email
      partialFormsWithoutCompleted.length > 0
        ? adminClient
            .from('ibogaine_consent_forms')
            .select('email')
            .then((result) => {
              const filtered = (result.data || []).filter((ic: any) => 
                ic.email && partialFormsWithoutCompleted.includes(ic.email.toLowerCase().trim())
              )
              return { data: filtered }
            })
        : Promise.resolve({ data: [] }),
    ])

    // Create lookup maps
    const medicalHistorySet = new Set(
      (medicalHistoryData.data || []).map((m: any) => m.intake_form_id).filter(Boolean)
    )
    const medicalHistoryByEmailMap = new Map<string, boolean>()
    ;(medicalHistoryData.data || [])
      .filter((m: any) => m.patient_email)
      .forEach((m: any) => {
        medicalHistoryByEmailMap.set(m.patient_email.toLowerCase().trim(), true)
      })
    ;(medicalHistoryByEmail.data || [])
      .filter((m: any) => m.patient_email)
      .forEach((m: any) => {
        medicalHistoryByEmailMap.set(m.patient_email.toLowerCase().trim(), true)
      })

    const serviceAgreementByIntake = new Map(
      (serviceAgreementData.data || []).map((sa: any) => [sa.intake_form_id, true]).filter(([id]) => id)
    )
    const serviceAgreementByEmailMap = new Map<string, boolean>()
    ;(serviceAgreementData.data || [])
      .filter((sa: any) => sa.patient_email)
      .forEach((sa: any) => {
        serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), true)
      })
    ;(serviceAgreementByEmail.data || [])
      .filter((sa: any) => sa.patient_email)
      .forEach((sa: any) => {
        serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), true)
      })

    const ibogaineConsentByIntake = new Map(
      (ibogaineConsentData.data || []).map((ic: any) => [ic.intake_form_id, true]).filter(([id]) => id)
    )
    const ibogaineConsentByEmailMap = new Map<string, boolean>()
    ;(ibogaineConsentData.data || [])
      .filter((ic: any) => ic.email)
      .forEach((ic: any) => {
        ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), true)
      })
    ;(ibogaineConsentByEmail.data || [])
      .filter((ic: any) => ic.email)
      .forEach((ic: any) => {
        ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), true)
      })

    // Map existing documents by partial form ID and email
    const existingDocsByPartialFormId = new Map<string, Set<string>>()
    const existingDocsByEmail = new Map<string, Set<string>>()
    
    if (partialFormIds.length > 0) {
      const { data: existingDocs } = await adminClient
        .from('existing_patient_documents')
        .select('partial_intake_form_id, form_type')
        .in('partial_intake_form_id', partialFormIds)
      
      // Create a map of partial form ID to email from allPatients
      const partialFormEmailMap = new Map<string, string>()
      allPatients
        .filter(p => p.source === 'partial_form')
        .forEach((pf: any) => {
          if (pf.email) {
            partialFormEmailMap.set(pf.id, pf.email.toLowerCase().trim())
          }
        })
      
      // Map documents by partial form ID
      ;(existingDocs || []).forEach((doc: any) => {
        if (doc.partial_intake_form_id) {
          if (!existingDocsByPartialFormId.has(doc.partial_intake_form_id)) {
            existingDocsByPartialFormId.set(doc.partial_intake_form_id, new Set())
          }
          existingDocsByPartialFormId.get(doc.partial_intake_form_id)?.add(doc.form_type)
          
          // Also map by email
          const email = partialFormEmailMap.get(doc.partial_intake_form_id)
          if (email) {
            if (!existingDocsByEmail.has(email)) {
              existingDocsByEmail.set(email, new Set())
            }
            existingDocsByEmail.get(email)?.add(doc.form_type)
          }
        }
      })
    }

    // Filter to only patients who have completed all 4 forms
    const onboardingPatients = allPatients.filter((patient: any) => {
      const email = patient.email?.toLowerCase().trim()
      // For partial forms, use completed_form_id if available, otherwise null (we'll check by email)
      const patientId = patient.source === 'intake_form' 
        ? patient.id 
        : (patient.intake_form_id && patient.intake_form_id !== patient.id ? patient.intake_form_id : null)
      let completedCount = 0
      const totalForms = 4

      // Check intake form
      if (patient.source === 'intake_form') {
        // Has completed intake form
        completedCount++
      } else {
        // Partial form - check if has intake document or completed form
        const hasIntakeDoc = existingDocsByPartialFormId.get(patient.id)?.has('intake') || false
        const hasCompletedIntake = !!patient.completed_form_id
        if (hasIntakeDoc || hasCompletedIntake) {
          completedCount++
        }
      }

      // Check medical history
      const hasMedicalByIntake = patientId && medicalHistorySet.has(patientId)
      const hasMedicalByEmail = email && medicalHistoryByEmailMap.has(email)
      const hasMedicalDoc = patient.source === 'partial_form' 
        ? existingDocsByPartialFormId.get(patient.id)?.has('medical') || false
        : email && existingDocsByEmail.get(email)?.has('medical')
      if (hasMedicalByIntake || hasMedicalByEmail || hasMedicalDoc) {
        completedCount++
      }

      // Check service agreement
      const hasServiceByIntake = patientId && serviceAgreementByIntake.has(patientId)
      const hasServiceByEmail = email && serviceAgreementByEmailMap.has(email)
      const hasServiceDoc = patient.source === 'partial_form'
        ? existingDocsByPartialFormId.get(patient.id)?.has('service') || false
        : email && existingDocsByEmail.get(email)?.has('service')
      if (hasServiceByIntake || hasServiceByEmail || hasServiceDoc) {
        completedCount++
      }

      // Check ibogaine consent
      const hasIbogaineByIntake = patientId && ibogaineConsentByIntake.has(patientId)
      const hasIbogaineByEmail = email && ibogaineConsentByEmailMap.has(email)
      const hasIbogaineDoc = patient.source === 'partial_form'
        ? existingDocsByPartialFormId.get(patient.id)?.has('ibogaine') || false
        : email && existingDocsByEmail.get(email)?.has('ibogaine')
      if (hasIbogaineByIntake || hasIbogaineByEmail || hasIbogaineDoc) {
        completedCount++
      }

      return completedCount === totalForms
    })

    // Limit results
    const limitedPatients = onboardingPatients.slice(0, parsedInput.limit)

    return {
      success: true,
      data: limitedPatients.map((patient: any) => ({
        id: patient.source === 'intake_form' ? patient.id : patient.id, // Use partial form ID if from partial form
        first_name: patient.first_name,
        last_name: patient.last_name,
        email: patient.email,
        program_type: patient.program_type,
        created_at: patient.created_at,
        forms_completed: 4,
        forms_total: 4,
        source: patient.source, // Track source for navigation
        intake_form_id: patient.intake_form_id || (patient.source === 'intake_form' ? patient.id : null),
      })),
    }
  })

