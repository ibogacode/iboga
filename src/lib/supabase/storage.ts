import { createClient } from './client'

/**
 * Upload avatar image to Supabase Storage
 * @param file - File object to upload
 * @param userId - User ID (will be used as folder name)
 * @returns Public URL of uploaded image
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const supabase = createClient()
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only images are allowed.')
  }
  
  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit.')
  }
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`
  
  // Upload file
  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })
  
  if (error) {
    throw new Error(`Failed to upload avatar: ${error.message}`)
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)
  
  // Update profile with avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)
  
  if (updateError) {
    throw new Error(`Failed to update profile: ${updateError.message}`)
  }
  
  return publicUrl
}

/**
 * Delete avatar image from Supabase Storage
 * @param userId - User ID
 * @param fileName - Name of the file to delete (optional, will delete all user's avatars)
 */
export async function deleteAvatar(userId: string, fileName?: string): Promise<void> {
  const supabase = createClient()
  
  if (fileName) {
    // Delete specific file
    const { error } = await supabase.storage
      .from('avatars')
      .remove([`${userId}/${fileName}`])
    
    if (error) {
      throw new Error(`Failed to delete avatar: ${error.message}`)
    }
  } else {
    // Delete all user's avatars
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(userId)
    
    if (listError) {
      throw new Error(`Failed to list avatars: ${listError.message}`)
    }
    
    if (files && files.length > 0) {
      const filePaths = files.map(file => `${userId}/${file.name}`)
      const { error } = await supabase.storage
        .from('avatars')
        .remove(filePaths)
      
      if (error) {
        throw new Error(`Failed to delete avatars: ${error.message}`)
      }
    }
  }
  
  // Clear avatar_url from profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)
  
  if (updateError) {
    throw new Error(`Failed to update profile: ${updateError.message}`)
  }
}

/**
 * Get public URL for avatar
 * @param avatarUrl - Avatar URL from profile
 * @returns Public URL
 */
export function getAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null
  
  // If it's already a full URL, return it
  if (avatarUrl.startsWith('http')) {
    return avatarUrl
  }
  
  // Otherwise, construct the public URL
  const supabase = createClient()
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(avatarUrl)
  
  return publicUrl
}

