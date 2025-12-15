'use server'

import { authActionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for fetching opportunities
const getOpportunitiesSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
})

// Get a single opportunity by ID
const getOpportunitySchema = z.object({
  id: z.string().uuid(),
})

export const getOpportunities = authActionClient
  .schema(getOpportunitiesSchema)
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
    
    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Unauthorized - Owner access required' }
    }
    
    // Fetch opportunities
    const { data, error, count } = await supabase
      .from('patient_intake_forms')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parsedInput.offset, parsedInput.offset + parsedInput.limit - 1)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { 
      success: true, 
      data: { 
        opportunities: data || [], 
        total: count || 0 
      } 
    }
  })

export const getOpportunity = authActionClient
  .schema(getOpportunitySchema)
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
    
    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Unauthorized - Owner access required' }
    }
    
    // Fetch single opportunity
    const { data, error } = await supabase
      .from('patient_intake_forms')
      .select('*')
      .eq('id', parsedInput.id)
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    if (!data) {
      return { success: false, error: 'Opportunity not found' }
    }
    
    return { success: true, data: { opportunity: data } }
  })

