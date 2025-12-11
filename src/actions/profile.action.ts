'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  designation: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
})

export const updateProfileAction = actionClient
  .schema(updateProfileSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(parsedInput)
      .eq('id', user.id)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    revalidatePath('/profile')
    return { success: true }
  })

const updateAvatarSchema = z.object({
  avatar_url: z.string().url('Invalid avatar URL'),
})

export const updateAvatarAction = actionClient
  .schema(updateAvatarSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: parsedInput.avatar_url })
      .eq('id', user.id)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    revalidatePath('/profile')
    return { success: true }
  })

