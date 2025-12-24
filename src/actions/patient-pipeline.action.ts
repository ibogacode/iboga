'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasOwnerAccess } from '@/lib/utils'
import { z } from 'zod'

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
    
    // Batch fetch all service agreements by intake_form_id
    let allServiceAgreementsByIntake: any[] = []
    if (completedIntakeFormIds.length > 0) {
      const { data } = await adminClient
        .from('service_agreements')
        .select('intake_form_id, patient_email')
        .in('intake_form_id', completedIntakeFormIds)
      allServiceAgreementsByIntake = data || []
    }
    
    // Batch fetch all service agreements by patient_email (case-insensitive)
    // Note: Supabase doesn't support batch ILIKE, so we'll check individually but cache results
    const serviceAgreementByIntakeMap = new Map<string, boolean>()
    const serviceAgreementByEmailMap = new Map<string, boolean>()
    
    // Process service agreements by intake_form_id
    allServiceAgreementsByIntake.forEach((sa: any) => {
      if (sa.intake_form_id) {
        serviceAgreementByIntakeMap.set(sa.intake_form_id, true)
      }
      if (sa.patient_email) {
        serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), true)
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
    
    // Batch fetch service agreements for intake forms found by email
    if (intakeFormIdsFromEmail.length > 0) {
      const { data: serviceAgreementsForEmailIntakes } = await adminClient
        .from('service_agreements')
        .select('intake_form_id, patient_email')
        .in('intake_form_id', intakeFormIdsFromEmail)
      
      ;(serviceAgreementsForEmailIntakes || []).forEach((sa: any) => {
        if (sa.intake_form_id) {
          serviceAgreementByIntakeMap.set(sa.intake_form_id, true)
        }
        if (sa.patient_email) {
          serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), true)
        }
      })
    }
    
    // Now calculate completion counts using the lookup maps
    const data = forms.map((form: any) => {
      const creator = creators.find((c: any) => c.id === form.created_by)
      const patientEmail = form.email?.toLowerCase().trim()
      let completedCount = 0
      const totalForms = 3 // Intake, Medical History, Service Agreement
      
      if (form.completed_form_id) {
        // Intake form is completed
        completedCount++
        
        // Check for medical history
        if (medicalHistorySet.has(form.completed_form_id)) {
          completedCount++
        }
        
        // Check for service agreement
        const hasServiceByIntake = serviceAgreementByIntakeMap.has(form.completed_form_id)
        const hasServiceByEmail = patientEmail && serviceAgreementByEmailMap.has(patientEmail)
        
        if (hasServiceByIntake || hasServiceByEmail) {
          completedCount++
        }
      } else if (patientEmail) {
        // Intake form not completed yet, check if patient has any forms
        const intakeFormId = intakeFormsByEmailMap.get(patientEmail)
        
        if (intakeFormId) {
          completedCount++ // Intake form exists
          
          // Check for medical history
          if (medicalHistorySet.has(intakeFormId)) {
            completedCount++
          }
          
          // Check for service agreement
          const hasServiceByIntake = serviceAgreementByIntakeMap.has(intakeFormId)
          const hasServiceByEmail = serviceAgreementByEmailMap.has(patientEmail)
          
          if (hasServiceByIntake || hasServiceByEmail) {
            completedCount++
          }
        }
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
    
    // Batch fetch all service agreements by intake_form_id
    const { data: allServiceAgreementsByIntake } = await adminClient
      .from('service_agreements')
      .select('intake_form_id, patient_email')
      .in('intake_form_id', intakeFormIds)
    
    // Create lookup maps
    const serviceAgreementByIntakeMap = new Map<string, boolean>()
    const serviceAgreementByEmailMap = new Map<string, boolean>()
    
    // Process service agreements
    ;(allServiceAgreementsByIntake || []).forEach((sa: any) => {
      if (sa.intake_form_id) {
        serviceAgreementByIntakeMap.set(sa.intake_form_id, true)
      }
      if (sa.patient_email) {
        serviceAgreementByEmailMap.set(sa.patient_email.toLowerCase().trim(), true)
      }
    })
    
    // Calculate completion counts using lookup maps
    const dataWithCounts = directApplications.map((form: any) => {
      const patientEmail = form.email?.toLowerCase().trim()
      let completedCount = 0
      const totalForms = 3 // Intake, Medical History, Service Agreement
      
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
