import { createAdminClient } from './server'

// Document bucket configurations
const DOCUMENT_BUCKETS = {
  'intake-form-documents': {
    name: 'intake-form-documents',
    public: false,
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
    public: false,
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
    public: false,
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
    public: false,
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
  'onboarding-form-documents': {
    name: 'onboarding-form-documents',
    public: false,
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
 * Ensure a storage bucket exists, create it if it doesn't
 */
export async function ensureBucketExists(bucketId: DocumentBucketType): Promise<void> {
  const adminClient = createAdminClient()
  const config = DOCUMENT_BUCKETS[bucketId]

  // Check if bucket exists
  const { data: buckets, error: listError } = await adminClient.storage.listBuckets()
  
  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`)
  }

  const bucketExists = buckets?.some(b => b.id === bucketId)

  if (!bucketExists) {
    // Create bucket using SQL (since Supabase JS doesn't have direct bucket creation)
    // We'll need to use a migration or call the Supabase Management API
    // For now, we'll try to create it via SQL using the admin client's RPC
    // Note: This requires the bucket to be created via migration first
    // But we can check and log if it doesn't exist
    console.warn(`Bucket ${bucketId} does not exist. Please create it via migration.`)
    throw new Error(`Bucket ${bucketId} does not exist. Please run the migration to create it.`)
  }
}

/**
 * Upload a document to the specified bucket
 */
export async function uploadDocument(
  bucketId: DocumentBucketType,
  file: File,
  folder: string = 'existing-patients'
): Promise<{ url: string; path: string }> {
  const adminClient = createAdminClient()
  const config = DOCUMENT_BUCKETS[bucketId]

  // Validate file size
  if (file.size > config.fileSizeLimit) {
    throw new Error(`File size exceeds ${config.fileSizeLimit / 1024 / 1024}MB limit.`)
  }

  // Validate file type
  if (!config.allowedMimeTypes.includes(file.type as any)) {
    throw new Error('Invalid file type. Only PDF, images, and Word documents are allowed.')
  }

  // Ensure bucket exists
  await ensureBucketExists(bucketId)

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const fileName = `${folder}/${timestamp}-${randomId}.${fileExt}`

  // Upload file
  const { error: uploadError } = await adminClient.storage
    .from(bucketId)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Get signed URL (since buckets are private)
  const { data: signedUrlData, error: urlError } = await adminClient.storage
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

/**
 * Get document URL (signed URL for private buckets)
 */
export async function getDocumentUrl(
  bucketId: DocumentBucketType,
  filePath: string
): Promise<string> {
  const adminClient = createAdminClient()

  const { data: signedUrlData, error } = await adminClient.storage
    .from(bucketId as string)
    .createSignedUrl(filePath, 31536000) // 1 year expiry

  if (error || !signedUrlData) {
    throw new Error('Failed to generate file URL')
  }

  return signedUrlData.signedUrl
}

