'use server'

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional().nullable(),
  last_name: z.string().min(1, 'Last name is required').optional().nullable(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional().nullable(),
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

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatarAction(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }
  
  const file = formData.get('file') as File | null
  
  if (!file) {
    return { success: false, error: 'No file provided' }
  }
  
  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { success: false, error: 'File size exceeds 10MB limit.' }
  }
  
  // Delete old avatars first
  const { data: oldFiles } = await supabase.storage
    .from('avatars')
    .list(user.id)
  
  if (oldFiles && oldFiles.length > 0) {
    const filePaths = oldFiles.map(f => `${user.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(filePaths)
  }
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`
  
  // Upload file
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })
  
  if (uploadError) {
    return { success: false, error: `Failed to upload avatar: ${uploadError.message}` }
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)
  
  // Update profile with avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
  
  if (updateError) {
    return { success: false, error: `Failed to update profile: ${updateError.message}` }
  }
  
  revalidatePath('/profile')
  return { success: true, avatarUrl: publicUrl }
}

/**
 * Remove avatar image from Supabase Storage
 */
export async function removeAvatarAction() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }
  
  // Delete all user's avatars
  const { data: files, error: listError } = await supabase.storage
    .from('avatars')
    .list(user.id)
  
  if (listError) {
    return { success: false, error: `Failed to list avatars: ${listError.message}` }
  }
  
  if (files && files.length > 0) {
    const filePaths = files.map(file => `${user.id}/${file.name}`)
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove(filePaths)
    
    if (deleteError) {
      return { success: false, error: `Failed to delete avatars: ${deleteError.message}` }
    }
  }
  
  // Clear avatar_url from profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id)
  
  if (updateError) {
    return { success: false, error: `Failed to update profile: ${updateError.message}` }
  }
  
  revalidatePath('/profile')
  return { success: true }
}

