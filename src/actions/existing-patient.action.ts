'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { createAdminClient } from '@/lib/supabase/server'
import { uploadDocument } from '@/lib/supabase/document-storage'
import { sendPatientLoginCredentialsEmail } from '@/actions/email.action'
import { revalidatePath } from 'next/cache'
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
    
    // Check if any form (partial or completed intake) already exists for this email
    const { data: existingPartialForm } = await supabase
      .from('partial_intake_forms')
      .select('id, email, first_name, last_name, completed_at, created_at')
      .eq('email', parsedInput.email)
      .is('completed_at', null) // Only check incomplete forms
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (existingPartialForm) {
      return { 
        success: false, 
        error: `Application already exists for this email address (${parsedInput.email}). An incomplete application form is already in progress. Please use the existing form or contact the patient to complete it before adding them again.` 
      }
    }
    
    // Check for completed intake forms
    const { data: existingIntakeForm } = await supabase
      .from('patient_intake_forms')
      .select('id, email, first_name, last_name, created_at')
      .eq('email', parsedInput.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // Check if patient profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', parsedInput.email)
      .eq('role', 'patient')
      .maybeSingle()
    
    if (existingProfile) {
      return { 
        success: false, 
        error: `Patient with email ${parsedInput.email} already exists in the system.` 
      }
    }
    
    // Create patient auth account
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Math.random().toString(36).slice(-8)}`
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: parsedInput.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm so they can login immediately
      user_metadata: {
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        role: 'patient',
      },
    })
    
    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create patient account' }
    }
    
    // Wait for profile trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Update or create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: parsedInput.email,
        first_name: parsedInput.first_name,
        last_name: parsedInput.last_name,
        role: 'patient',
        phone: parsedInput.phone_number || null,
        date_of_birth: parsedInput.date_of_birth || null,
        gender: parsedInput.gender || null,
        address: parsedInput.address || null,
        is_active: true,
      }, {
        onConflict: 'id',
      })
    
    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: `Failed to create patient profile: ${profileError.message}` }
    }
    
    // Generate unique token for partial intake form
    const token = crypto.randomUUID()
    
    // Parse date_of_birth if provided
    let dateOfBirth: Date | null = null
    if (parsedInput.date_of_birth) {
      dateOfBirth = new Date(parsedInput.date_of_birth)
    }
    
    // Get organization_id from current user
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', ctx.user.id)
      .single()
    
    const organizationId = currentUserProfile?.organization_id || null
    
    // Create patient record if patients table exists
    if (organizationId) {
      await supabase
        .from('patients')
        .insert({
          user_id: authData.user.id,
          first_name: parsedInput.first_name,
          last_name: parsedInput.last_name,
          email: parsedInput.email,
          phone: parsedInput.phone_number || null,
          date_of_birth: dateOfBirth,
          gender: parsedInput.gender || null,
          address: parsedInput.address || null,
          city: parsedInput.city || null,
          state: parsedInput.state || null,
          postal_code: parsedInput.zip_code || null,
          emergency_contact_name: parsedInput.emergency_contact_first_name && parsedInput.emergency_contact_last_name
            ? `${parsedInput.emergency_contact_first_name} ${parsedInput.emergency_contact_last_name}`
            : null,
          emergency_contact_phone: parsedInput.emergency_contact_phone || null,
          emergency_contact_relationship: parsedInput.emergency_contact_relationship || null,
          status: 'pending',
          organization_id: organizationId,
        })
        .select()
    }
    
    // Insert partial form with mode 'partial' for existing patient
    const { data, error } = await supabase
      .from('partial_intake_forms')
      .insert({
        token,
        mode: 'partial',
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
        recipient_email: parsedInput.email,
        recipient_name: `${parsedInput.first_name} ${parsedInput.last_name}`,
        created_by: ctx.user.id,
      })
      .select()
      .single()
    
    if (error) {
      // Clean up auth user and profile if partial form creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
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
    
    // Send email to patient with login credentials
    try {
      await sendPatientLoginCredentialsEmail(
        parsedInput.email,
        parsedInput.first_name,
        parsedInput.last_name,
        tempPassword,
        false // isFiller
      )
    } catch (emailError) {
      console.error('Error sending patient login email:', emailError)
      // Don't fail the operation if email fails - patient account is still created
    }
    
    revalidatePath('/patient-pipeline')
    revalidatePath('/facility-management')
    
    return { 
      success: true, 
      data: { 
        id: data.id,
        patientId: authData.user.id,
        token,
        message: 'Existing patient added successfully. They will receive an email with login credentials to access the patient portal.',
      } 
    }
  })

// Action to store uploaded document and mark form as completed
// Note: File is uploaded client-side, we just receive the URL
export const uploadExistingPatientDocument = authActionClient
  .schema(z.object({
    documentUrl: z.string().url('Valid document URL is required'),
    documentPath: z.string().min(1, 'Document path is required'),
    fileName: z.string().min(1, 'File name is required'),
    fileType: z.enum(['intake', 'medical', 'service', 'ibogaine']),
    patientId: z.string().uuid().optional(), // Patient profile ID
    partialFormId: z.string().uuid().optional(), // Partial intake form ID
    intakeFormId: z.string().uuid().optional(), // Completed intake form ID
  }))
  .action(async ({ parsedInput, ctx }) => {
    // Check if user is admin or owner
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
      return { success: false, error: 'Only admins and owners can upload documents' }
    }

    try {
      const supabase = createAdminClient()
      
      const documentUrl = parsedInput.documentUrl
      const documentPath = parsedInput.documentPath
      const fileName = parsedInput.fileName

      // Find or create partial intake form for this patient
      let partialFormId = parsedInput.partialFormId
      
      if (!partialFormId && parsedInput.patientId) {
        // Find partial form by patient email
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', parsedInput.patientId)
          .single()
        
        if (patientProfile?.email) {
          const { data: partialForm } = await supabase
            .from('partial_intake_forms')
            .select('id')
            .eq('email', patientProfile.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (partialForm) {
            partialFormId = partialForm.id
          }
        }
      }

      // Store document in existing_patient_documents table
      if (partialFormId) {
        const { error: docError } = await supabase
          .from('existing_patient_documents')
          .insert({
            partial_intake_form_id: partialFormId,
            form_type: parsedInput.fileType,
            document_url: documentUrl,
            document_path: documentPath,
            document_name: fileName,
            uploaded_by: ctx.user.id,
          })

        if (docError) {
          console.error('Error storing document record:', docError)
          // Continue even if document record fails
        }
      }

      // Mark the corresponding form as completed
      if (parsedInput.fileType === 'intake' && parsedInput.patientId) {
        // Create or mark intake form as completed
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name, phone, date_of_birth, gender, address, city, state')
          .eq('id', parsedInput.patientId)
          .single()
        
        // Get partial form data if available
        let partialFormData: any = null
        if (parsedInput.partialFormId) {
          const { data: partialForm } = await supabase
            .from('partial_intake_forms')
            .select('*')
            .eq('id', parsedInput.partialFormId)
            .maybeSingle()
          partialFormData = partialForm
        }
        
        if (patientProfile) {
          // Check if intake form already exists
          const { data: existingIntake } = await supabase
            .from('patient_intake_forms')
            .select('id')
            .eq('email', patientProfile.email)
            .maybeSingle()
          
          if (!existingIntake) {
            // Create patient_intake_forms record (completed by admin upload)
            // Use partial form data if available, otherwise use profile data
            const intakeData = {
              first_name: partialFormData?.first_name || patientProfile.first_name,
              last_name: partialFormData?.last_name || patientProfile.last_name,
              email: patientProfile.email,
              phone_number: partialFormData?.phone_number || patientProfile.phone || 'N/A',
              date_of_birth: partialFormData?.date_of_birth || patientProfile.date_of_birth,
              gender: partialFormData?.gender || patientProfile.gender,
              address: partialFormData?.address || patientProfile.address,
              city: partialFormData?.city || patientProfile.city,
              state: partialFormData?.state || patientProfile.state,
              zip_code: partialFormData?.zip_code || null,
              emergency_contact_first_name: partialFormData?.emergency_contact_first_name || 'N/A',
              emergency_contact_last_name: partialFormData?.emergency_contact_last_name || 'N/A',
              emergency_contact_email: partialFormData?.emergency_contact_email || null,
              emergency_contact_phone: partialFormData?.emergency_contact_phone || 'N/A',
              emergency_contact_address: partialFormData?.emergency_contact_address || null,
              emergency_contact_relationship: partialFormData?.emergency_contact_relationship || null,
              privacy_policy_accepted: true, // Admin uploaded, assume consent
              consent_for_treatment: true,
              risks_and_benefits: true,
              pre_screening_health_assessment: true,
              voluntary_participation: true,
              confidentiality: true,
              liability_release: true,
              payment_collection_1: true,
              payment_collection_2: true,
              ibogaine_therapy_consent_accepted: true,
              service_agreement_accepted: true,
              release_consent_accepted: true,
              final_acknowledgment_accepted: true,
              signature_date: new Date().toISOString().split('T')[0],
            }
            
            const { data: newIntakeForm, error: intakeError } = await supabase
              .from('patient_intake_forms')
              .insert(intakeData)
              .select()
              .single()
            
            if (!intakeError && newIntakeForm && parsedInput.partialFormId) {
              // Link partial form to completed form
              await supabase
                .from('partial_intake_forms')
                .update({
                  completed_form_id: newIntakeForm.id,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', parsedInput.partialFormId)
            }
          } else if (parsedInput.partialFormId) {
            // Link existing intake form to partial form
            await supabase
              .from('partial_intake_forms')
              .update({
                completed_form_id: existingIntake.id,
                completed_at: new Date().toISOString(),
              })
              .eq('id', parsedInput.partialFormId)
          }
        }
      } else if (parsedInput.fileType === 'medical' && parsedInput.patientId) {
        // Create or mark medical history form as completed
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', parsedInput.patientId)
          .single()
        
        if (patientProfile) {
          // Check if medical history form exists
          const { data: existingMedical } = await supabase
            .from('medical_history_forms')
            .select('id')
            .eq('patient_id', parsedInput.patientId)
            .maybeSingle()
          
          if (!existingMedical) {
            // Create medical history form record (completed by admin upload)
            await supabase
              .from('medical_history_forms')
              .insert({
                patient_id: parsedInput.patientId,
                patient_email: patientProfile.email,
                patient_first_name: patientProfile.first_name,
                patient_last_name: patientProfile.last_name,
                is_completed: true,
                completed_at: new Date().toISOString(),
                filled_by: ctx.user.id,
                filled_at: new Date().toISOString(),
              })
          } else {
            // Update existing form to completed
            await supabase
              .from('medical_history_forms')
              .update({
                is_completed: true,
                completed_at: new Date().toISOString(),
                filled_by: ctx.user.id,
                filled_at: new Date().toISOString(),
              })
              .eq('id', existingMedical.id)
          }
        }
      } else if (parsedInput.fileType === 'service' && parsedInput.patientId) {
        // Create or mark service agreement as completed
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', parsedInput.patientId)
          .single()
        
        if (patientProfile) {
          const { data: existingService } = await supabase
            .from('service_agreements')
            .select('id')
            .eq('patient_id', parsedInput.patientId)
            .maybeSingle()
          
          if (!existingService) {
            await supabase
              .from('service_agreements')
              .insert({
                patient_id: parsedInput.patientId,
                patient_email: patientProfile.email,
                patient_first_name: patientProfile.first_name,
                patient_last_name: patientProfile.last_name,
                is_completed: true,
                completed_at: new Date().toISOString(),
                filled_by: ctx.user.id,
                filled_at: new Date().toISOString(),
              })
          } else {
            await supabase
              .from('service_agreements')
              .update({
                is_completed: true,
                completed_at: new Date().toISOString(),
                filled_by: ctx.user.id,
                filled_at: new Date().toISOString(),
              })
              .eq('id', existingService.id)
          }
        }
      } else if (parsedInput.fileType === 'ibogaine' && parsedInput.patientId) {
        // Create or mark ibogaine consent as completed
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', parsedInput.patientId)
          .single()
        
        if (patientProfile) {
          const { data: existingIbogaine } = await supabase
            .from('ibogaine_consent_forms')
            .select('id')
            .eq('patient_id', parsedInput.patientId)
            .maybeSingle()
          
          if (!existingIbogaine) {
            await supabase
              .from('ibogaine_consent_forms')
              .insert({
                patient_id: parsedInput.patientId,
                patient_email: patientProfile.email,
                patient_first_name: patientProfile.first_name,
                patient_last_name: patientProfile.last_name,
                is_completed: true,
                completed_at: new Date().toISOString(),
                filled_by: ctx.user.id,
                filled_at: new Date().toISOString(),
              })
          } else {
            await supabase
              .from('ibogaine_consent_forms')
              .update({
                is_completed: true,
                completed_at: new Date().toISOString(),
                filled_by: ctx.user.id,
                filled_at: new Date().toISOString(),
              })
              .eq('id', existingIbogaine.id)
          }
        }
      }

      revalidatePath('/patient-pipeline')
      revalidatePath(`/patient-pipeline/patient-profile/${parsedInput.patientId}`)

      return {
        success: true,
        data: {
          url: parsedInput.documentUrl,
          path: parsedInput.documentPath,
          fileName: parsedInput.fileName,
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

