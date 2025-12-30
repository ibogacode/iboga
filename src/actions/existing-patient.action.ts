'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { uploadDocument } from '@/lib/supabase/document-storage'
import crypto from 'crypto'

// Schema for adding existing patient with optional fields
const addExistingPatientSchema = z.object({
  // Basic info (required)
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  
  // Optional fields - only what they have
  phone_number: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  program_type: z.enum(['neurological', 'mental_health', 'addiction']).optional().nullable(),
  
  // Emergency contact (optional)
  emergency_contact_first_name: z.string().optional().nullable(),
  emergency_contact_last_name: z.string().optional().nullable(),
  emergency_contact_email: z.string().email().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  
  // Document uploads (optional - URLs from Supabase Storage)
  intake_form_document_url: z.string().url().optional().nullable().or(z.literal('')),
  intake_form_document_name: z.string().optional().nullable(),
  medical_history_document_url: z.string().url().optional().nullable().or(z.literal('')),
  medical_history_document_name: z.string().optional().nullable(),
  service_agreement_document_url: z.string().url().optional().nullable().or(z.literal('')),
  service_agreement_document_name: z.string().optional().nullable(),
  ibogaine_consent_document_url: z.string().url().optional().nullable().or(z.literal('')),
  ibogaine_consent_document_name: z.string().optional().nullable(),
  other_documents: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
  })).optional().nullable(),
  
  // Notes about this existing patient
  notes: z.string().optional().nullable(),
})

export const addExistingPatient = authActionClient
  .schema(addExistingPatientSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Check if user is admin or owner
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
      return { success: false, error: 'Only admins and owners can add existing patients' }
    }

    const supabase = createAdminClient()
    
    // Generate unique token
    const token = crypto.randomUUID()
    
    // Parse date_of_birth if provided
    let dateOfBirth: Date | null = null
    if (parsedInput.date_of_birth) {
      dateOfBirth = new Date(parsedInput.date_of_birth)
    }
    
    // Insert partial form with mode 'existing' (we'll need to update the schema to allow this)
    // For now, use 'partial' mode but add notes to indicate it's an existing patient
    const { data, error } = await supabase
      .from('partial_intake_forms')
      .insert({
        token,
        mode: 'partial', // Using partial mode for now
        filled_by: 'self',
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        email: parsedInput.email,
        phone_number: parsedInput.phone_number || null,
        date_of_birth: dateOfBirth,
        gender: parsedInput.gender || null,
        address: parsedInput.address || null,
        city: parsedInput.city || null,
        state: parsedInput.state || null,
        zip_code: parsedInput.zip_code || null,
        emergency_contact_first_name: parsedInput.emergency_contact_first_name || null,
        emergency_contact_last_name: parsedInput.emergency_contact_last_name || null,
        emergency_contact_email: parsedInput.emergency_contact_email || null,
        emergency_contact_phone: parsedInput.emergency_contact_phone || null,
        emergency_contact_relationship: parsedInput.emergency_contact_relationship || null,
        program_type: parsedInput.program_type || null,
        recipient_email: parsedInput.email, // Send to patient email
        recipient_name: `${parsedInput.first_name} ${parsedInput.last_name}`,
        created_by: ctx.user.id,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Store uploaded documents if provided
    const documentsToStore: Array<{
      form_type: 'intake' | 'medical' | 'service' | 'ibogaine'
      document_url: string
      document_name?: string
    }> = []

    if (parsedInput.intake_form_document_url) {
      documentsToStore.push({
        form_type: 'intake',
        document_url: parsedInput.intake_form_document_url,
        document_name: parsedInput.intake_form_document_name || 'Application Form Document',
      })
    }
    if (parsedInput.medical_history_document_url) {
      documentsToStore.push({
        form_type: 'medical',
        document_url: parsedInput.medical_history_document_url,
        document_name: parsedInput.medical_history_document_name || 'Medical History Document',
      })
    }
    if (parsedInput.service_agreement_document_url) {
      documentsToStore.push({
        form_type: 'service',
        document_url: parsedInput.service_agreement_document_url,
        document_name: parsedInput.service_agreement_document_name || 'Service Agreement Document',
      })
    }
    if (parsedInput.ibogaine_consent_document_url) {
      documentsToStore.push({
        form_type: 'ibogaine',
        document_url: parsedInput.ibogaine_consent_document_url,
        document_name: parsedInput.ibogaine_consent_document_name || 'Ibogaine Consent Form Document',
      })
    }

    // Insert documents into existing_patient_documents table
    if (documentsToStore.length > 0) {
      const { error: docError } = await supabase
        .from('existing_patient_documents')
        .insert(
          documentsToStore.map(doc => ({
            partial_intake_form_id: data.id,
            form_type: doc.form_type,
            document_url: doc.document_url,
            document_name: doc.document_name,
            uploaded_by: ctx.user.id,
          }))
        )

      if (docError) {
        console.error('Error storing documents:', docError)
        // Don't fail the entire operation if document storage fails
      }
    }
    
    return { 
      success: true, 
      data: { 
        id: data.id,
        token,
        message: 'Existing patient added successfully. They will appear in the patient pipeline.',
      } 
    }
  })

// Action to upload document to Supabase Storage
export const uploadExistingPatientDocument = authActionClient
  .schema(z.object({
    formData: z.any(), // FormData with file
    fileType: z.enum(['intake', 'medical', 'service', 'ibogaine']),
  }))
  .action(async ({ parsedInput, ctx }) => {
    // Check if user is admin or owner
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
      return { success: false, error: 'Only admins and owners can upload documents' }
    }

    try {
      const formData = parsedInput.formData as FormData
      const file = formData.get('file') as File | null

      if (!file) {
        return { success: false, error: 'No file provided' }
      }

      // Map file type to bucket
      const bucketMap: Record<string, 'intake-form-documents' | 'medical-history-documents' | 'service-agreement-documents' | 'ibogaine-consent-documents'> = {
        intake: 'intake-form-documents',
        medical: 'medical-history-documents',
        service: 'service-agreement-documents',
        ibogaine: 'ibogaine-consent-documents',
      }

      const bucketId = bucketMap[parsedInput.fileType]
      if (!bucketId) {
        return { success: false, error: 'Invalid file type' }
      }

      // Upload document
      const result = await uploadDocument(bucketId, file, 'existing-patients')

      return {
        success: true,
        data: {
          url: result.url,
          path: result.path,
          fileName: file.name,
        },
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      }
    }
  })

