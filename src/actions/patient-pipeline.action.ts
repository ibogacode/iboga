'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasOwnerAccess, hasStaffAccess } from '@/lib/utils'
import { z } from 'zod'
import { unstable_cache } from 'next/cache'

// Get count of scheduled patients from calendar events
export const getScheduledPatientsCount = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const supabase = await createClient()
    
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
    
    if (!profile || !hasStaffAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner, Admin, or Manager access required' }
    }
    
    try {
      // Get all calendar events
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      // Get all upcoming calendar events
      const url = `${supabaseUrl}/functions/v1/check-calendar-events`
      const requestBody = {
        getAllEvents: true, // Flag to get all events
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(requestBody),
      })
      
      const responseText = await response.text()
      
      let calendarData
      try {
        calendarData = JSON.parse(responseText)
      } catch (parseError) {
        // If we can't get calendar events, return 0
        console.error('[getScheduledPatientsCount] Failed to parse calendar response:', parseError)
        return { success: true, data: { count: 0 } }
      }
      
      if (!calendarData?.success) {
        console.warn('[getScheduledPatientsCount] Calendar API returned error:', calendarData?.error)
        return { success: true, data: { count: 0 } }
      }
      
      // Extract all attendee emails from calendar events
      const scheduledEmails = new Set<string>()
      const allEvents = calendarData.data?.events || []
      
      allEvents.forEach((event: any) => {
        // Skip cancelled events
        if (event.status === 'cancelled') {
          return
        }
        
        // Also check organizer email
        if (event.organizer?.email) {
          const normalizedEmail = event.organizer.email.toLowerCase().trim()
          scheduledEmails.add(normalizedEmail)
        }
        
        if (event.attendees && Array.isArray(event.attendees)) {
          event.attendees.forEach((attendee: any) => {
            if (attendee.email) {
              const normalizedEmail = attendee.email.toLowerCase().trim()
              scheduledEmails.add(normalizedEmail)
            }
          })
        }
      })
      
      if (scheduledEmails.size === 0) {
        return { success: true, data: { count: 0 } }
      }
      
      // Get all patient/filler emails from database
      const adminClient = createAdminClient()
      
      // Get all emails from partial intake forms (email, filler_email, and recipient_email)
      const { data: partialForms } = await adminClient
        .from('partial_intake_forms')
        .select('email, filler_email, recipient_email')
      
      // Get all emails from intake forms (including filler_email)
      const { data: intakeForms } = await adminClient
        .from('patient_intake_forms')
        .select('email, filler_email')
      
      // Collect all patient/filler emails
      const patientEmails = new Set<string>()
      
      if (partialForms) {
        partialForms.forEach((form: any) => {
          if (form.email) {
            patientEmails.add(form.email.toLowerCase().trim())
          }
          if (form.filler_email) {
            patientEmails.add(form.filler_email.toLowerCase().trim())
          }
          if (form.recipient_email) {
            patientEmails.add(form.recipient_email.toLowerCase().trim())
          }
        })
      }
      
      if (intakeForms) {
        intakeForms.forEach((form: any) => {
          if (form.email) {
            patientEmails.add(form.email.toLowerCase().trim())
          }
          if (form.filler_email) {
            patientEmails.add(form.filler_email.toLowerCase().trim())
          }
        })
      }
      
      // Count emails that appear in both sets (scheduled patients)
      let scheduledCount = 0
      const matchedEmails: string[] = []
      scheduledEmails.forEach((email) => {
        if (patientEmails.has(email)) {
          scheduledCount++
          matchedEmails.push(email)
        }
      })
      
      // Return debug info only in development
      const unmatchedCalendar = Array.from(scheduledEmails).filter(e => !patientEmails.has(e))
      const unmatchedDB = Array.from(patientEmails).filter(e => !scheduledEmails.has(e))
      const debugInfo = process.env.NODE_ENV === 'development' ? {
        calendarEmails: Array.from(scheduledEmails).sort(),
        dbEmails: Array.from(patientEmails).sort(),
        matchedEmails,
        unmatchedCalendar: unmatchedCalendar.slice(0, 10),
        unmatchedDB: unmatchedDB.slice(0, 10),
        eventsCount: allEvents.length,
        partialFormsCount: partialForms?.length || 0,
        intakeFormsCount: intakeForms?.length || 0
      } : undefined
      
      return { 
        success: true, 
        data: { 
          count: scheduledCount,
          debug: debugInfo
        } 
      }
    } catch (error) {
      console.error('[getScheduledPatientsCount] Error:', error)
      // Return 0 on error to not break the UI
      return { success: true, data: { count: 0 } }
    }
  })

// Schema for fetching pipeline data
const getPipelineDataSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
})

// Get partial intake forms (admin/owner sent forms)
export const getPartialIntakeForms = authActionClient
  .schema(getPipelineDataSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    
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
    
    if (!profile || !hasStaffAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner, Admin, or Manager access required' }
    }
    
    // Fetch partial intake forms
    const { data: partialForms, error: partialError } = await supabase
      .from('partial_intake_forms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parsedInput.limit)

    if (partialError) {
      return { success: false, error: partialError.message }
    }

    // Filter out patients who have moved to onboarding or management stages
    // Get all patient emails that are already in onboarding or management
    const partialFormEmails = (partialForms || []).map((pf: any) => pf.email?.toLowerCase().trim()).filter(Boolean)
    let movedPatientsEmails = new Set<string>()

    if (partialFormEmails.length > 0) {
      // Check patient_onboarding table in chunks to avoid query size limits
      const chunkSize = 100
      for (let i = 0; i < partialFormEmails.length; i += chunkSize) {
        const emailChunk = partialFormEmails.slice(i, i + chunkSize)
        const { data: onboardingPatients } = await supabase
          .from('patient_onboarding')
          .select('email')
          .in('email', emailChunk)

        ;(onboardingPatients || []).forEach((p: any) => {
          if (p.email) {
            movedPatientsEmails.add(p.email.toLowerCase().trim())
          }
        })
      }
    }

    // Filter out patients who are already in onboarding or management
    const filteredPartialForms = (partialForms || []).filter((pf: any) => {
      const email = pf.email?.toLowerCase().trim()
      return email && !movedPatientsEmails.has(email)
    })

    // Fetch creator profiles for partial forms
    const creatorIds = [...new Set((filteredPartialForms || []).map((pf: any) => pf.created_by).filter(Boolean))]
    let creators: any[] = []

    if (creatorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', creatorIds)

      creators = profilesData || []
    }

    // Early return if no forms to process
    if (filteredPartialForms.length === 0) {
      return { success: true, data: [] }
    }

    // Batch fetch all related data to avoid N+1 queries
    const adminClient = createAdminClient()
    const forms = filteredPartialForms

    // Collect all intake form IDs (from completed_form_id)
    const completedIntakeFormIds = forms
      .map((f: any) => f.completed_form_id)
      .filter(Boolean)

    // Collect all patient emails (deduplicated)
    const patientEmails = [...new Set(forms
      .map((f: any) => f.email?.toLowerCase().trim())
      .filter(Boolean))]

    // Batch all queries in parallel for maximum performance
    const [
      completedFormsData,
      allMedicalHistoryData,
      allServiceAgreementsByIntakeData,
      allIbogaineConsentsByIntakeData,
      existingDocsData
    ] = await Promise.all([
      // Fetch program_type from completed forms
      completedIntakeFormIds.length > 0
        ? adminClient.from('patient_intake_forms').select('id, program_type').in('id', completedIntakeFormIds)
        : Promise.resolve({ data: [] }),
      // Batch fetch all medical history forms
      completedIntakeFormIds.length > 0
        ? adminClient.from('medical_history_forms').select('intake_form_id').in('intake_form_id', completedIntakeFormIds)
        : Promise.resolve({ data: [] }),
      // Batch fetch all service agreements by intake_form_id
      completedIntakeFormIds.length > 0
        ? adminClient.from('service_agreements')
          .select('intake_form_id, patient_email, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
          .in('intake_form_id', completedIntakeFormIds)
        : Promise.resolve({ data: [] }),
      // Batch fetch ibogaine consent forms by intake_form_id
      completedIntakeFormIds.length > 0
        ? adminClient.from('ibogaine_consent_forms')
          .select('intake_form_id, email, signature_data, signature_date, signature_name')
          .in('intake_form_id', completedIntakeFormIds)
        : Promise.resolve({ data: [] }),
      // Batch fetch existing patient documents
      adminClient.from('existing_patient_documents')
        .select('partial_intake_form_id, form_type')
        .in('partial_intake_form_id', forms.map((f: any) => f.id))
    ])

    // Build lookup maps from results
    const completedFormsProgramTypeMap = new Map<string, string>()
    ;(completedFormsData.data || []).forEach((form: any) => {
      if (form.program_type) {
        completedFormsProgramTypeMap.set(form.id, form.program_type)
      }
    })

    // Create set for O(1) lookup
    const medicalHistorySet = new Set(
      (allMedicalHistoryData.data || []).map((m: any) => m.intake_form_id)
    )

    // Build service agreement maps
    const serviceAgreementByIntakeMap = new Map<string, any>()
    const serviceAgreementByEmailMap = new Map<string, any>()

    // Helper function to check if service agreement is completed
    const isServiceAgreementCompleted = (sa: any) => {
      return sa.patient_signature_name &&
        sa.patient_signature_name.trim() !== '' &&
        sa.patient_signature_first_name &&
        sa.patient_signature_first_name.trim() !== '' &&
        sa.patient_signature_last_name &&
        sa.patient_signature_last_name.trim() !== '' &&
        sa.patient_signature_date &&
        sa.patient_signature_data &&
        sa.patient_signature_data.trim() !== ''
    }

    // Process service agreements from initial query
    ;(allServiceAgreementsByIntakeData.data || []).forEach((sa: any) => {
      if (isServiceAgreementCompleted(sa)) {
        if (sa.intake_form_id) {
          serviceAgreementByIntakeMap.set(sa.intake_form_id, sa)
        }
        if (sa.patient_email) {
          serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), sa)
        }
      }
    })

    // Build ibogaine consent maps
    const ibogaineConsentByIntakeMap = new Map<string, any>()
    const ibogaineConsentByEmailMap = new Map<string, any>()

    // Helper function to check if ibogaine consent is completed
    const isIbogaineConsentCompleted = (ic: any) => {
      return ic.signature_data &&
        ic.signature_data.trim() !== '' &&
        ic.signature_date &&
        ic.signature_name &&
        ic.signature_name.trim() !== ''
    }

    // Process ibogaine consents from initial query
    ;(allIbogaineConsentsByIntakeData.data || []).forEach((ic: any) => {
      if (isIbogaineConsentCompleted(ic)) {
        if (ic.intake_form_id) {
          ibogaineConsentByIntakeMap.set(ic.intake_form_id, ic)
        }
        if (ic.email) {
          ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), ic)
        }
      }
    })

    // Build existing documents map
    const existingDocumentsByPartialFormMap = new Map<string, Set<string>>()
    ;(existingDocsData.data || []).forEach((doc: any) => {
      if (doc.partial_intake_form_id) {
        if (!existingDocumentsByPartialFormMap.has(doc.partial_intake_form_id)) {
          existingDocumentsByPartialFormMap.set(doc.partial_intake_form_id, new Set())
        }
        existingDocumentsByPartialFormMap.get(doc.partial_intake_form_id)?.add(doc.form_type)
      }
    })

    // For forms without completed_form_id, fetch intake forms by email for fallback lookup
    const intakeFormsByEmailMap = new Map<string, string>()
    const formsWithoutCompletedId = forms.filter((f: any) => !f.completed_form_id)
    if (formsWithoutCompletedId.length > 0) {
      const emailsForLookup = [...new Set(formsWithoutCompletedId.map((f: any) => f.email?.toLowerCase().trim()).filter(Boolean))]
      if (emailsForLookup.length > 0) {
        const { data: intakeForms } = await adminClient
          .from('patient_intake_forms')
          .select('id, email')
          .in('email', emailsForLookup)

        ;(intakeForms || []).forEach((form: any) => {
          const email = form.email?.toLowerCase().trim()
          if (email) {
            intakeFormsByEmailMap.set(email, form.id)
          }
        })

        // Add these intake form IDs to medical history set if they have medical history
        const intakeFormIds = Array.from(intakeFormsByEmailMap.values())
        if (intakeFormIds.length > 0) {
          const { data: medicalHistoryData } = await adminClient
            .from('medical_history_forms')
            .select('intake_form_id')
            .in('intake_form_id', intakeFormIds)

          ;(medicalHistoryData || []).forEach((m: any) => {
            medicalHistorySet.add(m.intake_form_id)
          })
        }
      }
    }
    
    // Now calculate completion counts using the lookup maps
    const data = forms.map((form: any) => {
      const creator = creators.find((c: any) => c.id === form.created_by)
      const patientEmail = form.email?.toLowerCase().trim()
      
      // Get program_type from completed form if available, otherwise use partial form's program_type
      let programType = form.program_type
      if (form.completed_form_id) {
        const completedFormProgramType = completedFormsProgramTypeMap.get(form.completed_form_id)
        if (completedFormProgramType) {
          programType = completedFormProgramType
        }
      }
      
      let completedCount = 0
      const totalForms = 4 // Intake, Medical History, Service Agreement, Ibogaine Consent
      
      // Check for uploaded documents first (existing patients)
      const uploadedDocs = existingDocumentsByPartialFormMap.get(form.id)
      const hasIntakeDoc = uploadedDocs?.has('intake') || false
      const hasMedicalDoc = uploadedDocs?.has('medical') || false
      const hasServiceDoc = uploadedDocs?.has('service') || false
      const hasIbogaineDoc = uploadedDocs?.has('ibogaine') || false
      
      if (form.completed_form_id) {
        // Intake form is completed (or has uploaded document)
        if (hasIntakeDoc) {
          completedCount++
        } else {
          completedCount++
        }
        
        // Check for medical history (form or uploaded document)
        if (hasMedicalDoc || medicalHistorySet.has(form.completed_form_id)) {
          completedCount++
        }
        
        // Check for service agreement (form with signature or uploaded document)
        const hasServiceByIntake = serviceAgreementByIntakeMap.has(form.completed_form_id)
        const hasServiceByEmail = patientEmail && serviceAgreementByEmailMap.has(patientEmail)
        
        if (hasServiceDoc || hasServiceByIntake || hasServiceByEmail) {
          completedCount++
        }
        
        // Check for ibogaine consent (form with signature or uploaded document)
        const hasIbogaineByIntake = ibogaineConsentByIntakeMap.has(form.completed_form_id)
        const hasIbogaineByEmail = patientEmail && ibogaineConsentByEmailMap.has(patientEmail)
        
        if (hasIbogaineDoc || hasIbogaineByIntake || hasIbogaineByEmail) {
          completedCount++
        }
      } else if (patientEmail) {
        // Intake form not completed yet, check if patient has any forms
        const intakeFormId = intakeFormsByEmailMap.get(patientEmail)
        
        if (intakeFormId || hasIntakeDoc) {
          completedCount++ // Intake form exists or has uploaded document
          
          // Check for medical history (form or uploaded document)
          if (hasMedicalDoc || (intakeFormId && medicalHistorySet.has(intakeFormId))) {
            completedCount++
          }
          
          // Check for service agreement (form with signature or uploaded document)
          const hasServiceByIntake = intakeFormId && serviceAgreementByIntakeMap.has(intakeFormId)
          const hasServiceByEmail = serviceAgreementByEmailMap.has(patientEmail)
          
          if (hasServiceDoc || hasServiceByIntake || hasServiceByEmail) {
            completedCount++
          }
          
          // Check for ibogaine consent (form with signature or uploaded document)
          const hasIbogaineByIntake = intakeFormId && ibogaineConsentByIntakeMap.has(intakeFormId)
          const hasIbogaineByEmail = ibogaineConsentByEmailMap.has(patientEmail)
          
          if (hasIbogaineDoc || hasIbogaineByIntake || hasIbogaineByEmail) {
            completedCount++
          }
        } else if (hasMedicalDoc || hasServiceDoc || hasIbogaineDoc) {
          // Has uploaded documents but no intake form yet
          if (hasIntakeDoc) completedCount++
          if (hasMedicalDoc) completedCount++
          if (hasServiceDoc) completedCount++
          if (hasIbogaineDoc) completedCount++
        }
      } else if (uploadedDocs && uploadedDocs.size > 0) {
        // Has uploaded documents but no email
        if (hasIntakeDoc) completedCount++
        if (hasMedicalDoc) completedCount++
        if (hasServiceDoc) completedCount++
        if (hasIbogaineDoc) completedCount++
      }
      
      return {
        ...form,
        program_type: programType, // Use program_type from completed form if available
        creator: creator || null,
        formCompletion: {
          completed: completedCount,
          total: totalForms
        }
      }
    })
    
    return { 
      success: true, 
      data: data || []
    }
  })

// Get public intake forms (direct applications)
export const getPublicIntakeForms = authActionClient
  .schema(getPipelineDataSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient()
    
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
    
    if (!profile || !hasStaffAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner, Admin, or Manager access required' }
    }
    
    // Fetch public intake forms (exclude those linked to partial forms)
    const { data, error } = await supabase
      .from('patient_intake_forms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parsedInput.limit)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Filter out forms that were completed from partial intake forms
    // by checking if they exist in partial_intake_forms.completed_form_id
    const { data: partialForms } = await supabase
      .from('partial_intake_forms')
      .select('completed_form_id')
      .not('completed_form_id', 'is', null)

    const completedFormIds = new Set(
      (partialForms || []).map((pf: any) => pf.completed_form_id)
    )

    // Filter to only show direct public applications (not from partial forms)
    let directApplications = (data || []).filter(
      (form: any) => !completedFormIds.has(form.id)
    )

    // Filter out patients who have moved to onboarding or management stages
    const publicPatientEmails = directApplications.map((f: any) => f.email?.toLowerCase().trim()).filter(Boolean)
    const movedPublicPatientsEmails = new Set<string>()

    if (publicPatientEmails.length > 0) {
      // Check patient_onboarding table
      const { data: onboardingPatients } = await supabase
        .from('patient_onboarding')
        .select('email')
        .in('email', publicPatientEmails)

      ;(onboardingPatients || []).forEach((p: any) => {
        if (p.email) {
          movedPublicPatientsEmails.add(p.email.toLowerCase().trim())
        }
      })
    }

    // Filter out patients who are already in onboarding or management
    directApplications = directApplications.filter((f: any) => {
      const email = f.email?.toLowerCase().trim()
      return email && !movedPublicPatientsEmails.has(email)
    })

    // Early return if no forms to process
    if (directApplications.length === 0) {
      return { success: true, data: [] }
    }

    // Batch fetch all related data to avoid N+1 queries
    const adminClient = createAdminClient()

    // Collect all intake form IDs
    const intakeFormIds = directApplications.map((f: any) => f.id)

    // Batch all queries in parallel for maximum performance
    const [
      allMedicalHistoryData,
      allServiceAgreementsByIntakeData,
      allIbogaineConsentsByIntakeData
    ] = await Promise.all([
      adminClient.from('medical_history_forms').select('intake_form_id').in('intake_form_id', intakeFormIds),
      adminClient.from('service_agreements')
        .select('intake_form_id, patient_email, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
        .in('intake_form_id', intakeFormIds),
      adminClient.from('ibogaine_consent_forms')
        .select('intake_form_id, email, signature_data, signature_date, signature_name')
        .in('intake_form_id', intakeFormIds)
    ])

    // Create set for O(1) lookup
    const medicalHistorySet = new Set(
      (allMedicalHistoryData.data || []).map((m: any) => m.intake_form_id)
    )

    // Helper functions
    const isServiceAgreementCompleted = (sa: any) => {
      return sa.patient_signature_name &&
        sa.patient_signature_name.trim() !== '' &&
        sa.patient_signature_first_name &&
        sa.patient_signature_first_name.trim() !== '' &&
        sa.patient_signature_last_name &&
        sa.patient_signature_last_name.trim() !== '' &&
        sa.patient_signature_date &&
        sa.patient_signature_data &&
        sa.patient_signature_data.trim() !== ''
    }

    const isIbogaineConsentCompleted = (ic: any) => {
      return ic.signature_data &&
        ic.signature_data.trim() !== '' &&
        ic.signature_date &&
        ic.signature_name &&
        ic.signature_name.trim() !== ''
    }

    // Build lookup maps
    const serviceAgreementByIntakeMap = new Map<string, any>()
    const serviceAgreementByEmailMap = new Map<string, any>()

    ;(allServiceAgreementsByIntakeData.data || []).forEach((sa: any) => {
      if (isServiceAgreementCompleted(sa)) {
        if (sa.intake_form_id) {
          serviceAgreementByIntakeMap.set(sa.intake_form_id, sa)
        }
        if (sa.patient_email) {
          serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), sa)
        }
      }
    })

    const ibogaineConsentByIntakeMap = new Map<string, any>()
    const ibogaineConsentByEmailMap = new Map<string, any>()

    ;(allIbogaineConsentsByIntakeData.data || []).forEach((ic: any) => {
      if (isIbogaineConsentCompleted(ic)) {
        if (ic.intake_form_id) {
          ibogaineConsentByIntakeMap.set(ic.intake_form_id, ic)
        }
        if (ic.email) {
          ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), ic)
        }
      }
    })
    
    // Calculate completion counts using lookup maps
    const dataWithCounts = directApplications.map((form: any) => {
      const patientEmail = form.email?.toLowerCase().trim()
      let completedCount = 0
      const totalForms = 4 // Intake, Medical History, Service Agreement, Ibogaine Consent
      
      // Intake form is completed (since this is a public intake form)
      completedCount++
      const intakeFormId = form.id
      
      // Check for medical history form
      if (medicalHistorySet.has(intakeFormId)) {
        completedCount++
      }
      
      // Check for service agreement
      const hasServiceByIntake = serviceAgreementByIntakeMap.has(intakeFormId)
      const hasServiceByEmail = patientEmail && serviceAgreementByEmailMap.has(patientEmail)
      
      if (hasServiceByIntake || hasServiceByEmail) {
        completedCount++
      }
      
      // Check for ibogaine consent form
      const hasIbogaineByIntake = ibogaineConsentByIntakeMap.has(intakeFormId)
      const hasIbogaineByEmail = patientEmail && ibogaineConsentByEmailMap.has(patientEmail)
      
      if (hasIbogaineByIntake || hasIbogaineByEmail) {
        completedCount++
      }
      
      return {
        ...form,
        formCompletion: {
          completed: completedCount,
          total: totalForms
        }
      }
    })
    
    return {
      success: true,
      data: dataWithCounts
    }
  })

// ============================================================================
// Get Pipeline Statistics
// ============================================================================
export const getPipelineStatistics = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const supabase = await createClient()

    // Check if user is staff
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !hasStaffAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Staff access required' }
    }

    try {
      const adminClient = createAdminClient()

      // Run all queries in parallel for performance
      const [
        onboardingResult,
        serviceAgreementsResult,
        previousMonthOnboardingResult,
        previousMonthServiceAgreementsResult
      ] = await Promise.all([
        // Get current count of patients in onboarding (not moved to management yet)
        adminClient
          .from('patient_onboarding')
          .select('id, status, created_at, email')
          .neq('status', 'moved_to_management'),

        // Get all service agreements for pipeline value calculation
        adminClient
          .from('service_agreements')
          .select('patient_email, total_program_fee, created_at'),

        // Get previous month onboarding count (30 days ago)
        adminClient
          .from('patient_onboarding')
          .select('id')
          .neq('status', 'moved_to_management')
          .lte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Get previous month service agreements (30 days ago)
        adminClient
          .from('service_agreements')
          .select('total_program_fee')
          .lte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // Calculate onboarding count
      const onboardingCount = onboardingResult.data?.length || 0
      const previousOnboardingCount = previousMonthOnboardingResult.data?.length || 0

      // Calculate "at risk" patients (in onboarding for more than 14 days without progress)
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      const atRiskCount = onboardingResult.data?.filter(record => {
        const createdDate = new Date(record.created_at)
        return createdDate < fourteenDaysAgo
      }).length || 0

      // Calculate pipeline value (sum of all service agreement amounts for patients in pipeline)
      // We need to match service agreements with patients who are in onboarding
      const onboardingEmails = new Set(
        onboardingResult.data?.map(o => o.email?.toLowerCase().trim()).filter(Boolean) || []
      )

      const pipelineValue = serviceAgreementsResult.data
        ?.filter(sa => {
          const email = sa.patient_email?.toLowerCase().trim()
          return email && onboardingEmails.has(email)
        })
        .reduce((sum, sa) => sum + (Number(sa.total_program_fee) || 0), 0) || 0

      // Calculate previous month pipeline value
      const previousPipelineValue = previousMonthServiceAgreementsResult.data
        ?.reduce((sum, sa) => sum + (Number(sa.total_program_fee) || 0), 0) || 0

      // Calculate month-over-month percentage change
      let monthOverMonthChange = 0
      if (previousPipelineValue > 0) {
        monthOverMonthChange = Math.round(((pipelineValue - previousPipelineValue) / previousPipelineValue) * 100)
      } else if (pipelineValue > 0) {
        monthOverMonthChange = 100 // If we had no value before and now we do, that's 100% growth
      }

      return {
        success: true,
        data: {
          onboardingCount,
          atRiskCount,
          pipelineValue,
          monthOverMonthChange,
          previousOnboardingCount,
          previousPipelineValue
        }
      }
    } catch (error) {
      console.error('[getPipelineStatistics] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pipeline statistics'
      }
    }
  })
