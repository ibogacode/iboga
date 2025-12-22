'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasOwnerAccess } from '@/lib/utils'
import { z } from 'zod'

// Schema for fetching pipeline data
const getPipelineDataSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(100),
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
    
    // Map creators to partial forms and add form completion counts
    const adminClient = createAdminClient()
    const data = await Promise.all((partialForms || []).map(async (form: any) => {
      const creator = creators.find((c: any) => c.id === form.created_by)
      
      // Get form completion counts for this patient
      const patientEmail = form.email?.toLowerCase().trim()
      let completedCount = 0
      let totalForms = 3 // Intake, Medical History, Service Agreement
      
      if (form.completed_form_id) {
        // Intake form is completed
        completedCount++
        
        // Check for medical history form
        const { data: medicalData } = await adminClient
          .from('medical_history_forms')
          .select('id')
          .eq('intake_form_id', form.completed_form_id)
          .limit(1)
        
        if (medicalData && medicalData.length > 0) {
          completedCount++
        }
        
      // Check for service agreement (by intake_form_id or patient_email)
      let serviceData = null
      if (patientEmail) {
        const { data: serviceByEmail } = await adminClient
          .from('service_agreements')
          .select('id')
          .ilike('patient_email', patientEmail)
          .limit(1)
        
        if (serviceByEmail && serviceByEmail.length > 0) {
          serviceData = serviceByEmail
        }
      }
      
      if (!serviceData) {
        const { data: serviceByIntake } = await adminClient
          .from('service_agreements')
          .select('id')
          .eq('intake_form_id', form.completed_form_id)
          .limit(1)
        
        if (serviceByIntake && serviceByIntake.length > 0) {
          serviceData = serviceByIntake
        }
      }
      
      if (serviceData && serviceData.length > 0) {
        completedCount++
      }
      } else if (patientEmail) {
        // Intake form not completed yet, but check if patient has any forms
        // Check for intake form by email
        const { data: intakeData } = await adminClient
          .from('patient_intake_forms')
          .select('id')
          .ilike('email', patientEmail)
          .limit(1)
        
        if (intakeData && intakeData.length > 0) {
          completedCount++
          const intakeFormId = intakeData[0].id
          
          // Check for medical history
          const { data: medicalData } = await adminClient
            .from('medical_history_forms')
            .select('id')
            .eq('intake_form_id', intakeFormId)
            .limit(1)
          
          if (medicalData && medicalData.length > 0) {
            completedCount++
          }
          
          // Check for service agreement (by intake_form_id or patient_email)
          let serviceData = null
          if (patientEmail) {
            const { data: serviceByEmail } = await adminClient
              .from('service_agreements')
              .select('id')
              .ilike('patient_email', patientEmail)
              .limit(1)
            
            if (serviceByEmail && serviceByEmail.length > 0) {
              serviceData = serviceByEmail
            }
          }
          
          if (!serviceData) {
            const { data: serviceByIntake } = await adminClient
              .from('service_agreements')
              .select('id')
              .eq('intake_form_id', intakeFormId)
              .limit(1)
            
            if (serviceByIntake && serviceByIntake.length > 0) {
              serviceData = serviceByIntake
            }
          }
          
          if (serviceData && serviceData.length > 0) {
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
    }))
    
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
    
    // Add form completion counts for each public form
    const adminClient = createAdminClient()
    const dataWithCounts = await Promise.all(directApplications.map(async (form: any) => {
      const patientEmail = form.email?.toLowerCase().trim()
      let completedCount = 0
      let totalForms = 3 // Intake, Medical History, Service Agreement
      
      // Intake form is completed (since this is a public intake form)
      completedCount++
      const intakeFormId = form.id
      
      // Check for medical history form
      const { data: medicalData } = await adminClient
        .from('medical_history_forms')
        .select('id')
        .eq('intake_form_id', intakeFormId)
        .limit(1)
      
      if (medicalData && medicalData.length > 0) {
        completedCount++
      }
      
      // Check for service agreement (by intake_form_id or patient_email)
      const patientEmailForService = form.email?.toLowerCase().trim()
      let serviceData = null
      if (patientEmailForService) {
        const { data: serviceByEmail } = await adminClient
          .from('service_agreements')
          .select('id')
          .ilike('patient_email', patientEmailForService)
          .limit(1)
        
        if (serviceByEmail && serviceByEmail.length > 0) {
          serviceData = serviceByEmail
        }
      }
      
      if (!serviceData) {
        const { data: serviceByIntake } = await adminClient
          .from('service_agreements')
          .select('id')
          .eq('intake_form_id', intakeFormId)
          .limit(1)
        
        if (serviceByIntake && serviceByIntake.length > 0) {
          serviceData = serviceByIntake
        }
      }
      
      if (serviceData && serviceData.length > 0) {
        completedCount++
      }
      
      return {
        ...form,
        formCompletion: {
          completed: completedCount,
          total: totalForms
        }
      }
    }))
    
    return { 
      success: true, 
      data: dataWithCounts
    }
  })
