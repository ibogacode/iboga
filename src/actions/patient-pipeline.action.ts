'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
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
    
    // Map creators to partial forms
    const data = (partialForms || []).map((form: any) => {
      const creator = creators.find((c: any) => c.id === form.created_by)
      return {
        ...form,
        creator: creator || null
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
    
    return { 
      success: true, 
      data: directApplications
    }
  })
