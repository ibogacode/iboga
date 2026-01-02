'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasOwnerAccess } from '@/lib/utils'
import { z } from 'zod'

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
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
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
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
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
    
    // Fetch creator profiles for partial forms
    const creatorIds = [...new Set((partialForms || []).map((pf: any) => pf.created_by).filter(Boolean))]
    let creators: any[] = []
    
    if (creatorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', creatorIds)
      
      creators = profilesData || []
    }
    
    // Batch fetch all related data to avoid N+1 queries
    const adminClient = createAdminClient()
    const forms = partialForms || []
    
    // Collect all intake form IDs (from completed_form_id)
    const completedIntakeFormIds = forms
      .map((f: any) => f.completed_form_id)
      .filter(Boolean)
    
    // Collect all patient emails
    const patientEmails = forms
      .map((f: any) => f.email?.toLowerCase().trim())
      .filter(Boolean)
    
    // Batch fetch all medical history forms
    let allMedicalHistory: any[] = []
    if (completedIntakeFormIds.length > 0) {
      const { data } = await adminClient
        .from('medical_history_forms')
        .select('intake_form_id')
        .in('intake_form_id', completedIntakeFormIds)
      allMedicalHistory = data || []
    }
    
    // Create set for O(1) lookup
    const medicalHistorySet = new Set(
      (allMedicalHistory || []).map((m: any) => m.intake_form_id)
    )
    
    // Batch fetch all service agreements by intake_form_id (include signature fields)
    let allServiceAgreementsByIntake: any[] = []
    if (completedIntakeFormIds.length > 0) {
      const { data } = await adminClient
        .from('service_agreements')
        .select('intake_form_id, patient_email, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
        .in('intake_form_id', completedIntakeFormIds)
      allServiceAgreementsByIntake = data || []
    }
    
    // Batch fetch all service agreements by patient_email (case-insensitive)
    // Note: Supabase doesn't support batch ILIKE, so we'll check individually but cache results
    const serviceAgreementByIntakeMap = new Map<string, any>() // intake_form_id -> service agreement object
    const serviceAgreementByEmailMap = new Map<string, any>() // email -> service agreement object
    
    // Process service agreements by intake_form_id
    allServiceAgreementsByIntake.forEach((sa: any) => {
      // Check if service agreement is actually completed (signature fields filled)
      const isCompleted = sa.patient_signature_name && 
        sa.patient_signature_name.trim() !== '' &&
        sa.patient_signature_first_name && 
        sa.patient_signature_first_name.trim() !== '' &&
        sa.patient_signature_last_name && 
        sa.patient_signature_last_name.trim() !== '' &&
        sa.patient_signature_date &&
        sa.patient_signature_data &&
        sa.patient_signature_data.trim() !== ''
      
      if (sa.intake_form_id && isCompleted) {
        serviceAgreementByIntakeMap.set(sa.intake_form_id, sa)
      }
      if (sa.patient_email && isCompleted) {
        serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), sa)
      }
    })
    
    // For forms without completed_form_id, batch fetch intake forms by email
    const formsWithoutCompletedId = forms.filter((f: any) => !f.completed_form_id)
    const emailsForIntakeLookup = [...new Set(
      formsWithoutCompletedId.map((f: any) => f.email?.toLowerCase().trim()).filter(Boolean)
    )]
    
    // Batch fetch intake forms by emails (we'll need to do this in chunks if too many)
    const intakeFormsByEmailMap = new Map<string, string>() // email -> intake_form_id
    if (emailsForIntakeLookup.length > 0) {
      // Fetch in chunks of 50 (Supabase IN clause limit)
      const chunkSize = 50
      for (let i = 0; i < emailsForIntakeLookup.length; i += chunkSize) {
        const emailChunk = emailsForIntakeLookup.slice(i, i + chunkSize)
        const { data: intakeForms } = await adminClient
          .from('patient_intake_forms')
          .select('id, email')
          .in('email', emailChunk)
        
        ;(intakeForms || []).forEach((form: any) => {
          const email = form.email?.toLowerCase().trim()
          if (email) {
            intakeFormsByEmailMap.set(email, form.id)
          }
        })
      }
    }
    
    // Get all intake form IDs from email lookup
    const intakeFormIdsFromEmail = Array.from(intakeFormsByEmailMap.values())
    
    // Batch fetch medical history for intake forms found by email
    let medicalHistoryForEmailIntakes = []
    if (intakeFormIdsFromEmail.length > 0) {
      const { data: medicalHistoryData } = await adminClient
        .from('medical_history_forms')
        .select('intake_form_id')
        .in('intake_form_id', intakeFormIdsFromEmail)
      
      medicalHistoryForEmailIntakes = medicalHistoryData || []
      medicalHistoryForEmailIntakes.forEach((m: any) => {
        medicalHistorySet.add(m.intake_form_id)
      })
    }
    
    // Batch fetch service agreements for intake forms found by email (include signature fields)
    if (intakeFormIdsFromEmail.length > 0) {
      const { data: serviceAgreementsForEmailIntakes } = await adminClient
        .from('service_agreements')
        .select('intake_form_id, patient_email, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
        .in('intake_form_id', intakeFormIdsFromEmail)
      
      ;(serviceAgreementsForEmailIntakes || []).forEach((sa: any) => {
        // Check if service agreement is actually completed (signature fields filled)
        const isCompleted = sa.patient_signature_name && 
          sa.patient_signature_name.trim() !== '' &&
          sa.patient_signature_first_name && 
          sa.patient_signature_first_name.trim() !== '' &&
          sa.patient_signature_last_name && 
          sa.patient_signature_last_name.trim() !== '' &&
          sa.patient_signature_date &&
          sa.patient_signature_data &&
          sa.patient_signature_data.trim() !== ''
        
        if (sa.intake_form_id && isCompleted) {
          serviceAgreementByIntakeMap.set(sa.intake_form_id, sa)
        }
        if (sa.patient_email && isCompleted) {
          serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), sa)
        }
      })
    }
    
    // Batch fetch ibogaine consent forms (include signature fields)
    const ibogaineConsentByIntakeMap = new Map<string, any>() // intake_form_id -> ibogaine consent object
    const ibogaineConsentByEmailMap = new Map<string, any>() // email -> ibogaine consent object
    
    // Fetch ibogaine consent forms by intake_form_id
    const allIntakeFormIds = [...completedIntakeFormIds, ...intakeFormIdsFromEmail]
    if (allIntakeFormIds.length > 0) {
      const { data: ibogaineConsents } = await adminClient
        .from('ibogaine_consent_forms')
        .select('intake_form_id, email, signature_data, signature_date, signature_name')
        .in('intake_form_id', allIntakeFormIds)
      
      ;(ibogaineConsents || []).forEach((ic: any) => {
        // Check if ibogaine consent is actually completed (signature fields filled)
        const isCompleted = ic.signature_data && 
          ic.signature_data.trim() !== '' &&
          ic.signature_date &&
          ic.signature_name &&
          ic.signature_name.trim() !== ''
        
        if (ic.intake_form_id && isCompleted) {
          ibogaineConsentByIntakeMap.set(ic.intake_form_id, ic)
        }
        if (ic.email && isCompleted) {
          ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), ic)
        }
      })
    }
    
    // Also fetch service agreements by patient_email (case-insensitive) for forms not linked by intake_form_id
    if (patientEmails.length > 0) {
      // Fetch in chunks of 50 (Supabase IN clause limit)
      const chunkSize = 50
      for (let i = 0; i < patientEmails.length; i += chunkSize) {
        const emailChunk = patientEmails.slice(i, i + chunkSize)
        const { data: serviceAgreementsByEmail } = await adminClient
          .from('service_agreements')
          .select('patient_email, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
          .in('patient_email', emailChunk)
        
        ;(serviceAgreementsByEmail || []).forEach((sa: any) => {
          // Check if service agreement is actually completed (signature fields filled)
          const isCompleted = sa.patient_signature_name && 
            sa.patient_signature_name.trim() !== '' &&
            sa.patient_signature_first_name && 
            sa.patient_signature_first_name.trim() !== '' &&
            sa.patient_signature_last_name && 
            sa.patient_signature_last_name.trim() !== '' &&
            sa.patient_signature_date &&
            sa.patient_signature_data &&
            sa.patient_signature_data.trim() !== ''
          
          if (sa.patient_email && isCompleted) {
            serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), sa)
          }
        })
      }
    }
    
    // Also fetch ibogaine consent forms by email (case-insensitive) for forms not linked by intake_form_id
    if (patientEmails.length > 0) {
      // Fetch in chunks of 50 (Supabase IN clause limit)
      const chunkSize = 50
      for (let i = 0; i < patientEmails.length; i += chunkSize) {
        const emailChunk = patientEmails.slice(i, i + chunkSize)
        const { data: ibogaineConsentsByEmail } = await adminClient
          .from('ibogaine_consent_forms')
          .select('email, signature_data, signature_date, signature_name')
          .in('email', emailChunk)
        
        ;(ibogaineConsentsByEmail || []).forEach((ic: any) => {
          // Check if ibogaine consent is actually completed (signature fields filled)
          const isCompleted = ic.signature_data && 
            ic.signature_data.trim() !== '' &&
            ic.signature_date &&
            ic.signature_name &&
            ic.signature_name.trim() !== ''
          
          if (ic.email && isCompleted) {
            ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), ic)
          }
        })
      }
    }
    
    // Batch fetch existing patient documents (uploaded documents)
    const existingDocumentsByPartialFormMap = new Map<string, Set<string>>() // partial_form_id -> Set<form_type>
    const partialFormIds = forms.map((f: any) => f.id).filter(Boolean)
    if (partialFormIds.length > 0) {
      const { data: existingDocs } = await adminClient
        .from('existing_patient_documents')
        .select('partial_intake_form_id, form_type')
        .in('partial_intake_form_id', partialFormIds)
      
      ;(existingDocs || []).forEach((doc: any) => {
        if (doc.partial_intake_form_id) {
          if (!existingDocumentsByPartialFormMap.has(doc.partial_intake_form_id)) {
            existingDocumentsByPartialFormMap.set(doc.partial_intake_form_id, new Set())
          }
          existingDocumentsByPartialFormMap.get(doc.partial_intake_form_id)?.add(doc.form_type)
        }
      })
    }
    
    // Now calculate completion counts using the lookup maps
    const data = forms.map((form: any) => {
      const creator = creators.find((c: any) => c.id === form.created_by)
      const patientEmail = form.email?.toLowerCase().trim()
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
    
    if (!profile || !hasOwnerAccess(profile.role)) {
      return { success: false, error: 'Unauthorized - Owner or Admin access required' }
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
    const directApplications = (data || []).filter(
      (form: any) => !completedFormIds.has(form.id)
    )
    
    // Batch fetch all related data to avoid N+1 queries
    const adminClient = createAdminClient()
    
    if (directApplications.length === 0) {
      return {
        success: true,
        data: []
      }
    }
    
    // Collect all intake form IDs
    const intakeFormIds = directApplications.map((f: any) => f.id)
    
    // Collect all patient emails
    const patientEmails = directApplications
      .map((f: any) => f.email?.toLowerCase().trim())
      .filter(Boolean)
    
    // Batch fetch all medical history forms
    const { data: allMedicalHistory } = await adminClient
      .from('medical_history_forms')
      .select('intake_form_id')
      .in('intake_form_id', intakeFormIds)
    
    // Create set for O(1) lookup
    const medicalHistorySet = new Set(
      (allMedicalHistory || []).map((m: any) => m.intake_form_id)
    )
    
    // Batch fetch all service agreements by intake_form_id (include signature fields)
    const { data: allServiceAgreementsByIntake } = await adminClient
      .from('service_agreements')
      .select('intake_form_id, patient_email, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
      .in('intake_form_id', intakeFormIds)
    
    // Create lookup maps
    const serviceAgreementByIntakeMap = new Map<string, any>() // intake_form_id -> service agreement object
    const serviceAgreementByEmailMap = new Map<string, any>() // email -> service agreement object
    
    // Process service agreements
    ;(allServiceAgreementsByIntake || []).forEach((sa: any) => {
      // Check if service agreement is actually completed (signature fields filled)
      const isCompleted = sa.patient_signature_name && 
        sa.patient_signature_name.trim() !== '' &&
        sa.patient_signature_first_name && 
        sa.patient_signature_first_name.trim() !== '' &&
        sa.patient_signature_last_name && 
        sa.patient_signature_last_name.trim() !== '' &&
        sa.patient_signature_date &&
        sa.patient_signature_data &&
        sa.patient_signature_data.trim() !== ''
      
      if (sa.intake_form_id && isCompleted) {
        serviceAgreementByIntakeMap.set(sa.intake_form_id, sa)
      }
      if (sa.patient_email && isCompleted) {
        serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), sa)
      }
    })
    
    // Also fetch service agreements by patient_email (case-insensitive) for forms not linked by intake_form_id
    if (patientEmails.length > 0) {
      // Fetch in chunks of 50 (Supabase IN clause limit)
      const chunkSize = 50
      for (let i = 0; i < patientEmails.length; i += chunkSize) {
        const emailChunk = patientEmails.slice(i, i + chunkSize)
        const { data: serviceAgreementsByEmail } = await adminClient
          .from('service_agreements')
          .select('patient_email, patient_signature_name, patient_signature_first_name, patient_signature_last_name, patient_signature_date, patient_signature_data')
          .in('patient_email', emailChunk)
        
        ;(serviceAgreementsByEmail || []).forEach((sa: any) => {
          // Check if service agreement is actually completed (signature fields filled)
          const isCompleted = sa.patient_signature_name && 
            sa.patient_signature_name.trim() !== '' &&
            sa.patient_signature_first_name && 
            sa.patient_signature_first_name.trim() !== '' &&
            sa.patient_signature_last_name && 
            sa.patient_signature_last_name.trim() !== '' &&
            sa.patient_signature_date &&
            sa.patient_signature_data &&
            sa.patient_signature_data.trim() !== ''
          
          if (sa.patient_email && isCompleted) {
            serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), sa)
          }
        })
      }
    }
    
    // Batch fetch ibogaine consent forms (include signature fields)
    const ibogaineConsentByIntakeMap = new Map<string, any>() // intake_form_id -> ibogaine consent object
    const ibogaineConsentByEmailMap = new Map<string, any>() // email -> ibogaine consent object
    
    if (intakeFormIds.length > 0) {
      const { data: ibogaineConsents } = await adminClient
        .from('ibogaine_consent_forms')
        .select('intake_form_id, email, signature_data, signature_date, signature_name')
        .in('intake_form_id', intakeFormIds)
      
      ;(ibogaineConsents || []).forEach((ic: any) => {
        // Check if ibogaine consent is actually completed (signature fields filled)
        const isCompleted = ic.signature_data && 
          ic.signature_data.trim() !== '' &&
          ic.signature_date &&
          ic.signature_name &&
          ic.signature_name.trim() !== ''
        
        if (ic.intake_form_id && isCompleted) {
          ibogaineConsentByIntakeMap.set(ic.intake_form_id, ic)
        }
        if (ic.email && isCompleted) {
          ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), ic)
        }
      })
    }
    
    // Also fetch ibogaine consent forms by email (case-insensitive) for forms not linked by intake_form_id
    if (patientEmails.length > 0) {
      // Fetch in chunks of 50 (Supabase IN clause limit)
      const chunkSize = 50
      for (let i = 0; i < patientEmails.length; i += chunkSize) {
        const emailChunk = patientEmails.slice(i, i + chunkSize)
        const { data: ibogaineConsentsByEmail } = await adminClient
          .from('ibogaine_consent_forms')
          .select('email, signature_data, signature_date, signature_name')
          .in('email', emailChunk)
        
        ;(ibogaineConsentsByEmail || []).forEach((ic: any) => {
          // Check if ibogaine consent is actually completed (signature fields filled)
          const isCompleted = ic.signature_data && 
            ic.signature_data.trim() !== '' &&
            ic.signature_date &&
            ic.signature_name &&
            ic.signature_name.trim() !== ''
          
          if (ic.email && isCompleted) {
            ibogaineConsentByEmailMap.set(ic.email.toLowerCase().trim(), ic)
          }
        })
      }
    }
    
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
