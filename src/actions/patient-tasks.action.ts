'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const getPatientTasksSchema = z.object({})

export interface PatientTask {
  id: string
  type: 'intake' | 'medical_history' | 'service_agreement' | 'ibogaine_consent'
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed'
  estimatedTime: string
  isRequired: boolean
  isOptional: boolean
  completedAt?: string
  formId: string
  link?: string
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

    if (intakeForm) {
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
    } else {
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

    if (medicalForm) {
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
    } else {
      // Link to intake form if it exists
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
        .select('id, patient_id, patient_email, created_at')
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
          .select('id, patient_id, patient_email, created_at')
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
        .select('id, patient_id, patient_email, created_at')
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

    if (serviceAgreement) {
      tasks.push({
        id: `service-${serviceAgreement.id}`,
        type: 'service_agreement',
        title: 'Service Agreement',
        description: 'Review and sign the service agreement.',
        status: 'completed',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: serviceAgreement.created_at,
        formId: serviceAgreement.id,
        link: `/patient/service-agreement?view=${serviceAgreement.id}`,
      })
    } else {
      tasks.push({
        id: 'service-new',
        type: 'service_agreement',
        title: 'Service Agreement',
        description: 'Review and sign the service agreement.',
        status: 'not_started',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        formId: '',
        link: '/patient/service-agreement',
      })
    }

    // 4. Check for Ibogaine Consent Form
    let ibogaineConsentForm = null

    // Strategy 1: Try by patient_id first (most reliable link)
    if (patientId) {
      const { data: consentByPatientId, error: patientIdError } = await supabase
        .from('ibogaine_consent_forms')
        .select('id, patient_id, email, intake_form_id, created_at')
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
        .select('id, patient_id, email, intake_form_id, created_at')
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
        .select('id, patient_id, email, intake_form_id, created_at')
        .ilike('email', patientEmail)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!emailError && consentByEmail && consentByEmail.length > 0) {
        ibogaineConsentForm = consentByEmail[0]
        console.log('[getPatientTasks] ✓ Found ibogaine consent form by email:', ibogaineConsentForm.id)
      }
    }

    if (ibogaineConsentForm) {
      tasks.push({
        id: `ibogaine-consent-${ibogaineConsentForm.id}`,
        type: 'ibogaine_consent',
        title: 'Ibogaine Therapy Consent Form',
        description: 'Consent form for Ibogaine therapy treatment.',
        status: 'completed',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        completedAt: ibogaineConsentForm.created_at,
        formId: ibogaineConsentForm.id,
        link: `/ibogaine-consent?view=${ibogaineConsentForm.id}`,
      })
    } else {
      // Link to intake form if it exists
      const intakeFormId = intakeForm?.id || null
      tasks.push({
        id: 'ibogaine-consent-new',
        type: 'ibogaine_consent',
        title: 'Ibogaine Therapy Consent Form',
        description: 'Consent form for Ibogaine therapy treatment.',
        status: 'not_started',
        estimatedTime: '~5 min',
        isRequired: true,
        isOptional: false,
        formId: '',
        link: intakeFormId ? `/ibogaine-consent?intake_form_id=${intakeFormId}` : '/ibogaine-consent',
      })
    }

    // Calculate task statistics
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
      },
    }
  })
