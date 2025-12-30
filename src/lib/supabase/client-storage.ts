'use client'

import { createClient } from './client'

// Document bucket configurations
const DOCUMENT_BUCKETS = {
  'intake-form-documents': {
    name: 'intake-form-documents',
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
  },
  'medical-history-documents': {
    name: 'medical-history-documents',
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
  },
  'service-agreement-documents': {
    name: 'service-agreement-documents',
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
  },
  'ibogaine-consent-documents': {
    name: 'ibogaine-consent-documents',
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
  },
} as const

export type DocumentBucketType = keyof typeof DOCUMENT_BUCKETS

/**
 * Upload a document directly to Supabase Storage from the client
 * This bypasses Server Action body size limits
 */
export async function uploadDocumentClient(
  bucketId: DocumentBucketType,
  file: File,
  folder: string = 'existing-patients'
): Promise<{ url: string; path: string }> {
  const supabase = createClient()
  const config = DOCUMENT_BUCKETS[bucketId]

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('You must be logged in to upload documents')
  }

  // Validate file size
  if (file.size > config.fileSizeLimit) {
    throw new Error(`File size exceeds ${config.fileSizeLimit / 1024 / 1024}MB limit.`)
  }

  // Validate file type
  if (!config.allowedMimeTypes.includes(file.type as any)) {
    throw new Error('Invalid file type. Only PDF, images, and Word documents are allowed.')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const fileName = `${folder}/${timestamp}-${randomId}.${fileExt}`

  // Upload file directly to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketId as string)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error details:', {
      message: uploadError.message,
      name: uploadError.name,
      bucketId,
      fileName,
    })
    throw new Error(`Failed to upload file: ${uploadError.message}. Please ensure you have permission to upload to this bucket.`)
  }

  // Get signed URL (since buckets are private)
  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from(bucketId as string)
    .createSignedUrl(fileName, 31536000) // 1 year expiry

  if (urlError || !signedUrlData) {
    throw new Error('Failed to generate file URL')
  }

  return {
    url: signedUrlData.signedUrl,
    path: fileName,
  }
}

