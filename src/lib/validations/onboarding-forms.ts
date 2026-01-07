import { z } from 'zod'

// =============================================================================
// SHARED VALIDATION HELPERS
// =============================================================================

/**
 * ISO date format (YYYY-MM-DD) - required for PostgreSQL DATE columns
 */
export const isoDate = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
)

/**
 * Optional ISO date - accepts empty string or valid date, converts empty to undefined
 */
export const isoDateOptional = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  isoDate.optional()
)

/**
 * Nullable optional ISO date - allows null, empty string, or valid date
 * Used for admin schemas where admins need to explicitly clear nullable date fields
 */
export const isoDateNullableOptional = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.union([isoDate, z.null()]).optional()
)

/**
 * Email that accepts empty string as undefined (for optional fields)
 */
export const emailOptional = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string().email().optional()
)

// =============================================================================
// 1. RELEASE FORM - PATIENT SUBMIT (Strict)
// =============================================================================
export const releaseFormSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  // Participant Information
  full_name: z.string().min(1, 'Full name is required'),
  date_of_birth: isoDate,
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  
  // Emergency Contact Information
  emergency_contact_name: z.string().min(1, 'Emergency contact name is required'),
  emergency_contact_phone: z.string().min(1, 'Emergency contact phone is required'),
  emergency_contact_email: emailOptional, // Optional: use if available, otherwise leave empty
  emergency_contact_relationship: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ), // Optional: use if available, otherwise leave empty
  
  // Acknowledgment and Consent (must all be true for patient submit)
  voluntary_participation: z.boolean().refine(val => val === true, 'You must acknowledge voluntary participation'),
  medical_conditions_disclosed: z.boolean().refine(val => val === true, 'You must acknowledge medical conditions disclosure'),
  risks_acknowledged: z.boolean().refine(val => val === true, 'You must acknowledge the risks'),
  medical_supervision_agreed: z.boolean().refine(val => val === true, 'You must agree to medical supervision'),
  confidentiality_understood: z.boolean().refine(val => val === true, 'You must understand confidentiality terms'),
  liability_waiver_accepted: z.boolean().refine(val => val === true, 'You must accept the liability waiver'),
  compliance_agreed: z.boolean().refine(val => val === true, 'You must agree to compliance'),
  consent_to_treatment: z.boolean().refine(val => val === true, 'You must consent to treatment'),
  
  // Signature (required for patient submit)
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: isoDate,
})

export type ReleaseFormInput = z.infer<typeof releaseFormSchema>

// =============================================================================
// 1. RELEASE FORM - ADMIN UPDATE (Relaxed with conditional validation)
// =============================================================================
export const releaseFormAdminSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  // All fields optional for partial updates
  full_name: z.string().optional(),
  date_of_birth: isoDateOptional,
  phone_number: z.string().optional(),
  email: emailOptional,
  
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_email: emailOptional,
  emergency_contact_relationship: z.string().optional(),
  
  // Booleans - optional, no "must be true" requirement
  voluntary_participation: z.boolean().optional(),
  medical_conditions_disclosed: z.boolean().optional(),
  risks_acknowledged: z.boolean().optional(),
  medical_supervision_agreed: z.boolean().optional(),
  confidentiality_understood: z.boolean().optional(),
  liability_waiver_accepted: z.boolean().optional(),
  compliance_agreed: z.boolean().optional(),
  consent_to_treatment: z.boolean().optional(),
  
  signature_data: z.string().optional(),
  signature_date: isoDateNullableOptional, // Nullable: admin can clear signature
  
  // Admin-only fields
  is_completed: z.boolean().optional(),
  is_activated: z.boolean().optional(),
}).refine(
  (data) => {
    // Note: This refine is kept for documentation but actual validation happens
    // in server action after merging with existing DB row (DB-aware validation)
    if (data.is_completed === true) {
      const requiredFields = [
        data.full_name,
        data.date_of_birth,
        data.phone_number,
        data.email,
        data.emergency_contact_name,
        data.emergency_contact_phone,
        // emergency_contact_email and emergency_contact_relationship are optional
        data.signature_data,
        data.signature_date,
      ]
      const requiredBooleans = [
        data.voluntary_participation,
        data.medical_conditions_disclosed,
        data.risks_acknowledged,
        data.medical_supervision_agreed,
        data.confidentiality_understood,
        data.liability_waiver_accepted,
        data.compliance_agreed,
        data.consent_to_treatment,
      ]
      
      // All required fields must be present and non-empty
      const fieldsValid = requiredFields.every(f => f !== undefined && f !== '')
      // All required booleans must be true
      const booleansValid = requiredBooleans.every(b => b === true)
      
      return fieldsValid && booleansValid
    }
    return true
  },
  {
    message: 'When marking as completed, all required fields must be filled and all consent checkboxes must be checked',
    path: ['is_completed'],
  }
)

export type ReleaseFormAdminInput = z.infer<typeof releaseFormAdminSchema>

// =============================================================================
// 2. OUTING/TRANSFER CONSENT FORM - PATIENT SUBMIT (Strict)
// =============================================================================
export const outingConsentFormSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  // Participant Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: isoDate,
  date_of_outing: isoDateOptional,
  email: z.string().email('Valid email is required'),
  
  // Consent Declaration (must all be true for patient submit)
  protocol_compliance: z.boolean().refine(val => val === true, 'You must agree to protocol compliance'),
  proper_conduct: z.boolean().refine(val => val === true, 'You must agree to proper conduct'),
  no_harassment: z.boolean().refine(val => val === true, 'You must agree to no harassment policy'),
  substance_prohibition: z.boolean().refine(val => val === true, 'You must agree to substance prohibition'),
  financial_penalties_accepted: z.boolean().refine(val => val === true, 'You must accept financial penalties terms'),
  additional_consequences_understood: z.boolean().refine(val => val === true, 'You must understand additional consequences'),
  declaration_read_understood: z.boolean().refine(val => val === true, 'You must confirm you have read and understood'),
  
  // Signature (required for patient submit)
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: isoDate,
})

export type OutingConsentFormInput = z.infer<typeof outingConsentFormSchema>

// =============================================================================
// 2. OUTING/TRANSFER CONSENT FORM - ADMIN UPDATE (Relaxed)
// =============================================================================
export const outingConsentFormAdminSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: isoDateOptional,
  date_of_outing: isoDateNullableOptional, // Nullable: admin can clear this field
  email: emailOptional,
  
  protocol_compliance: z.boolean().optional(),
  proper_conduct: z.boolean().optional(),
  no_harassment: z.boolean().optional(),
  substance_prohibition: z.boolean().optional(),
  financial_penalties_accepted: z.boolean().optional(),
  additional_consequences_understood: z.boolean().optional(),
  declaration_read_understood: z.boolean().optional(),
  
  signature_data: z.string().optional(),
  signature_date: isoDateNullableOptional, // Nullable: admin can clear signature
  
  is_completed: z.boolean().optional(),
  is_activated: z.boolean().optional(),
}).refine(
  (data) => {
    // Note: This refine is kept for documentation but actual validation happens
    // in server action after merging with existing DB row (DB-aware validation)
    if (data.is_completed === true) {
      const requiredFields = [
        data.first_name,
        data.last_name,
        data.date_of_birth,
        data.email,
        data.signature_data,
        data.signature_date,
      ]
      const requiredBooleans = [
        data.protocol_compliance,
        data.proper_conduct,
        data.no_harassment,
        data.substance_prohibition,
        data.financial_penalties_accepted,
        data.additional_consequences_understood,
        data.declaration_read_understood,
      ]
      
      const fieldsValid = requiredFields.every(f => f !== undefined && f !== '')
      const booleansValid = requiredBooleans.every(b => b === true)
      
      return fieldsValid && booleansValid
    }
    return true
  },
  {
    message: 'When marking as completed, all required fields must be filled and all consent checkboxes must be checked',
    path: ['is_completed'],
  }
)

export type OutingConsentFormAdminInput = z.infer<typeof outingConsentFormAdminSchema>

// =============================================================================
// 3. SOCIAL MEDIA RELEASE FORM - PATIENT SUBMIT (Strict)
// =============================================================================
export const socialMediaFormSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  // Patient Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone_number: z.string().optional(),
  
  // Consent Options (optional - patient can decline all)
  consent_image_photograph: z.boolean(),
  consent_video_recordings: z.boolean(),
  consent_voice_recordings: z.boolean(),
  consent_written_testimonials: z.boolean(),
  consent_first_name_only: z.boolean(),
  
  // Authorization
  authorize_recording: z.boolean(),
  authorize_promotional_use: z.boolean(),
  
  // Patient Rights Acknowledgment (required - must be true)
  voluntary_participation_understood: z.boolean().refine(val => val === true, 'You must acknowledge voluntary participation'),
  confidentiality_understood: z.boolean().refine(val => val === true, 'You must acknowledge confidentiality'),
  revocation_understood: z.boolean().refine(val => val === true, 'You must acknowledge revocation rights'),
  anonymity_option_understood: z.boolean().refine(val => val === true, 'You must acknowledge anonymity option'),
  
  // Signature (required for patient submit)
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: isoDate,
})

export type SocialMediaFormInput = z.infer<typeof socialMediaFormSchema>

// =============================================================================
// 3. SOCIAL MEDIA RELEASE FORM - ADMIN UPDATE (Relaxed)
// =============================================================================
export const socialMediaFormAdminSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: emailOptional,
  phone_number: z.string().optional(),
  
  // Consent options - no requirement to be true
  consent_image_photograph: z.boolean().optional(),
  consent_video_recordings: z.boolean().optional(),
  consent_voice_recordings: z.boolean().optional(),
  consent_written_testimonials: z.boolean().optional(),
  consent_first_name_only: z.boolean().optional(),
  
  authorize_recording: z.boolean().optional(),
  authorize_promotional_use: z.boolean().optional(),
  
  // Patient rights acknowledgment
  voluntary_participation_understood: z.boolean().optional(),
  confidentiality_understood: z.boolean().optional(),
  revocation_understood: z.boolean().optional(),
  anonymity_option_understood: z.boolean().optional(),
  
  signature_data: z.string().optional(),
  signature_date: isoDateNullableOptional, // Nullable: admin can clear signature
  
  is_completed: z.boolean().optional(),
  is_activated: z.boolean().optional(),
}).refine(
  (data) => {
    // Note: This refine is kept for documentation but actual validation happens
    // in server action after merging with existing DB row (DB-aware validation)
    if (data.is_completed === true) {
      const requiredFields = [
        data.first_name,
        data.last_name,
        data.email,
        data.signature_data,
        data.signature_date,
      ]
      // Only the "understood" booleans are required to be true
      const requiredBooleans = [
        data.voluntary_participation_understood,
        data.confidentiality_understood,
        data.revocation_understood,
        data.anonymity_option_understood,
      ]
      
      const fieldsValid = requiredFields.every(f => f !== undefined && f !== '')
      const booleansValid = requiredBooleans.every(b => b === true)
      
      return fieldsValid && booleansValid
    }
    return true
  },
  {
    message: 'When marking as completed, all required fields must be filled and patient rights must be acknowledged',
    path: ['is_completed'],
  }
)

export type SocialMediaFormAdminInput = z.infer<typeof socialMediaFormAdminSchema>

// =============================================================================
// 4. INTERNAL REGULATIONS FORM - PATIENT SUBMIT (Strict)
// =============================================================================
export const internalRegulationsFormSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  // Patient Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone_number: z.string().optional(),
  
  // Acknowledgment of Acceptance (must all be true for patient submit)
  regulations_read_understood: z.boolean().refine(val => val === true, 'You must confirm you have read the regulations'),
  rights_acknowledged: z.boolean().refine(val => val === true, 'You must acknowledge your rights'),
  obligations_acknowledged: z.boolean().refine(val => val === true, 'You must acknowledge your obligations'),
  coexistence_rules_acknowledged: z.boolean().refine(val => val === true, 'You must acknowledge coexistence rules'),
  sanctions_acknowledged: z.boolean().refine(val => val === true, 'You must acknowledge sanctions'),
  acceptance_confirmed: z.boolean().refine(val => val === true, 'You must confirm acceptance'),
  
  // Signature (required for patient submit)
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: isoDate,
})

export type InternalRegulationsFormInput = z.infer<typeof internalRegulationsFormSchema>

// =============================================================================
// 4. INTERNAL REGULATIONS FORM - ADMIN UPDATE (Relaxed)
// =============================================================================
export const internalRegulationsFormAdminSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: emailOptional,
  phone_number: z.string().optional(),
  
  regulations_read_understood: z.boolean().optional(),
  rights_acknowledged: z.boolean().optional(),
  obligations_acknowledged: z.boolean().optional(),
  coexistence_rules_acknowledged: z.boolean().optional(),
  sanctions_acknowledged: z.boolean().optional(),
  acceptance_confirmed: z.boolean().optional(),
  
  signature_data: z.string().optional(),
  signature_date: isoDateNullableOptional, // Nullable: admin can clear signature
  
  is_completed: z.boolean().optional(),
  is_activated: z.boolean().optional(),
}).refine(
  (data) => {
    // Note: This refine is kept for documentation but actual validation happens
    // in server action after merging with existing DB row (DB-aware validation)
    if (data.is_completed === true) {
      const requiredFields = [
        data.first_name,
        data.last_name,
        data.email,
        data.signature_data,
        data.signature_date,
      ]
      const requiredBooleans = [
        data.regulations_read_understood,
        data.rights_acknowledged,
        data.obligations_acknowledged,
        data.coexistence_rules_acknowledged,
        data.sanctions_acknowledged,
        data.acceptance_confirmed,
      ]
      
      const fieldsValid = requiredFields.every(f => f !== undefined && f !== '')
      const booleansValid = requiredBooleans.every(b => b === true)
      
      return fieldsValid && booleansValid
    }
    return true
  },
  {
    message: 'When marking as completed, all required fields must be filled and all acknowledgments must be checked',
    path: ['is_completed'],
  }
)

export type InternalRegulationsFormAdminInput = z.infer<typeof internalRegulationsFormAdminSchema>

// =============================================================================
// 5. LETTER OF INFORMED DISSENT - PATIENT SUBMIT (Strict)
// Note: Dissent booleans are NOT required to be true - this is a dissent form
// =============================================================================
export const informedDissentFormSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  // Patient Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  official_identification: z.string().min(1, 'Official identification is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  email: z.string().email('Valid email is required'),
  
  // Statement of Dissent - NOT required to be true (patient's choice)
  treatment_refused: z.boolean(),
  liability_release_accepted: z.boolean(),
  no_refund_understood: z.boolean(),
  decision_voluntary: z.boolean(),
  no_legal_action_agreed: z.boolean(),
  
  // Patient Signature (required for patient submit)
  signature_data: z.string().min(1, 'Signature is required'),
  signature_date: isoDate,
})

export type InformedDissentFormInput = z.infer<typeof informedDissentFormSchema>

// =============================================================================
// 5. LETTER OF INFORMED DISSENT - ADMIN UPDATE (Relaxed)
// =============================================================================
export const informedDissentFormAdminSchema = z.object({
  onboarding_id: z.string().uuid(),
  
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  official_identification: z.string().optional(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  email: emailOptional,
  
  // Dissent booleans - NOT required to be true even when completed
  treatment_refused: z.boolean().optional(),
  liability_release_accepted: z.boolean().optional(),
  no_refund_understood: z.boolean().optional(),
  decision_voluntary: z.boolean().optional(),
  no_legal_action_agreed: z.boolean().optional(),
  
  signature_data: z.string().optional(),
  signature_date: isoDateNullableOptional, // Nullable: admin can clear signature
  
  // Representative fields (optional)
  representative_name: z.string().optional(),
  representative_position: z.string().optional(),
  representative_signature_data: z.string().optional(),
  representative_signature_date: isoDateNullableOptional, // Nullable: admin can clear
  
  is_completed: z.boolean().optional(),
  is_activated: z.boolean().optional(),
}).refine(
  (data) => {
    // Note: This refine is kept for documentation but actual validation happens
    // in server action after merging with existing DB row (DB-aware validation)
    if (data.is_completed === true) {
      // Only require patient info and signature - NOT dissent booleans
      const requiredFields = [
        data.first_name,
        data.last_name,
        data.official_identification,
        data.phone_number,
        data.address,
        data.email,
        data.signature_data,
        data.signature_date,
      ]
      
      return requiredFields.every(f => f !== undefined && f !== '')
    }
    return true
  },
  {
    message: 'When marking as completed, all patient information fields and signature are required',
    path: ['is_completed'],
  }
)

export type InformedDissentFormAdminInput = z.infer<typeof informedDissentFormAdminSchema>

// =============================================================================
// ONBOARDING MANAGEMENT SCHEMAS
// =============================================================================

export const moveToOnboardingSchema = z.object({
  intake_form_id: z.string().uuid().optional(),
  partial_intake_form_id: z.string().uuid().optional(),
}).refine(
  data => data.intake_form_id || data.partial_intake_form_id,
  'Either intake_form_id or partial_intake_form_id is required'
)

export type MoveToOnboardingInput = z.infer<typeof moveToOnboardingSchema>

export const getOnboardingByIdSchema = z.object({
  onboarding_id: z.string().uuid(),
})

export type GetOnboardingByIdInput = z.infer<typeof getOnboardingByIdSchema>

export const updateOnboardingStatusSchema = z.object({
  onboarding_id: z.string().uuid(),
  payment_received: z.boolean().optional(),
  travel_arranged: z.boolean().optional(),
  medical_clearance: z.boolean().optional(),
})

export type UpdateOnboardingStatusInput = z.infer<typeof updateOnboardingStatusSchema>

export const moveToPatientManagementSchema = z.object({
  onboarding_id: z.string().uuid(),
})

export type MoveToPatientManagementInput = z.infer<typeof moveToPatientManagementSchema>

// =============================================================================
// LINK PATIENT SCHEMA
// =============================================================================

export const linkPatientToOnboardingSchema = z.object({
  onboarding_id: z.string().uuid(),
  patient_id: z.string().uuid(),
})

export type LinkPatientToOnboardingInput = z.infer<typeof linkPatientToOnboardingSchema>

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// These are aliases to the new admin schemas
export const adminReleaseFormSchema = releaseFormAdminSchema
export const adminOutingConsentFormSchema = outingConsentFormAdminSchema
export const adminSocialMediaFormSchema = socialMediaFormAdminSchema
export const adminInternalRegulationsFormSchema = internalRegulationsFormAdminSchema
export const adminInformedDissentFormSchema = informedDissentFormAdminSchema

export type AdminReleaseFormInput = ReleaseFormAdminInput
export type AdminOutingConsentFormInput = OutingConsentFormAdminInput
export type AdminSocialMediaFormInput = SocialMediaFormAdminInput
export type AdminInternalRegulationsFormInput = InternalRegulationsFormAdminInput
export type AdminInformedDissentFormInput = InformedDissentFormAdminInput
