// =============================================================================
// Onboarding System Types
// =============================================================================

// Staff role types
export type StaffRole = 'owner' | 'admin' | 'manager' | 'doctor' | 'nurse' | 'psych'
export type AdminStaffRole = 'owner' | 'admin' | 'manager'

export const STAFF_ROLES: StaffRole[] = ['owner', 'admin', 'manager', 'doctor', 'nurse', 'psych']
export const ADMIN_STAFF_ROLES: AdminStaffRole[] = ['owner', 'admin', 'manager']

// Onboarding status
export type OnboardingStatus = 'in_progress' | 'completed' | 'moved_to_management'
export type OnboardingPriority = 'low' | 'normal' | 'high' | 'urgent'

// =============================================================================
// Patient Onboarding
// =============================================================================
export interface PatientOnboarding {
  id: string
  intake_form_id: string | null
  partial_intake_form_id: string | null
  patient_id: string | null
  
  // Patient info
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  date_of_birth: string | null
  program_type: string | null
  
  // Emergency contact
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_email: string | null
  emergency_contact_relationship: string | null
  
  // Address
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  
  // Status
  status: OnboardingStatus
  payment_received: boolean
  travel_arranged: boolean
  medical_clearance: boolean
  
  // Form completion flags
  release_form_completed: boolean
  outing_consent_completed: boolean
  social_media_release_completed?: boolean // Removed from onboarding flow, kept for backward compatibility
  internal_regulations_completed: boolean
  informed_dissent_completed?: boolean // Removed from onboarding flow, kept for backward compatibility
  
  // Workflow
  notes: string | null
  priority: OnboardingPriority
  assigned_to: string | null
  expected_arrival_date: string | null
  
  // Timestamps
  started_at: string
  completed_at: string | null
  moved_to_management_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

// Extended type with computed fields
export interface PatientOnboardingWithProgress extends PatientOnboarding {
  forms_completed: number
  forms_total: number
}

// =============================================================================
// Onboarding Forms
// =============================================================================

// Base form fields
interface BaseOnboardingForm {
  id: string
  onboarding_id: string
  patient_id: string | null
  is_completed: boolean
  is_activated: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Release Form
export interface OnboardingReleaseForm extends BaseOnboardingForm {
  full_name: string
  date_of_birth: string
  phone_number: string
  email: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_email: string
  emergency_contact_relationship: string
  voluntary_participation: boolean
  medical_conditions_disclosed: boolean
  risks_acknowledged: boolean
  medical_supervision_agreed: boolean
  confidentiality_understood: boolean
  liability_waiver_accepted: boolean
  compliance_agreed: boolean
  consent_to_treatment: boolean
  signature_data: string | null
  signature_date: string | null
}

// Outing Consent Form
export interface OnboardingOutingConsentForm extends BaseOnboardingForm {
  first_name: string
  last_name: string
  date_of_birth: string
  date_of_outing: string | null
  email: string
  protocol_compliance: boolean
  proper_conduct: boolean
  no_harassment: boolean
  substance_prohibition: boolean
  financial_penalties_accepted: boolean
  additional_consequences_understood: boolean
  declaration_read_understood: boolean
  signature_data: string | null
  signature_date: string | null
}

// Social Media Form
export interface OnboardingSocialMediaForm extends BaseOnboardingForm {
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  consent_image_photograph: boolean
  consent_video_recordings: boolean
  consent_voice_recordings: boolean
  consent_written_testimonials: boolean
  consent_first_name_only: boolean
  authorize_recording: boolean
  authorize_promotional_use: boolean
  voluntary_participation_understood: boolean
  confidentiality_understood: boolean
  revocation_understood: boolean
  anonymity_option_understood: boolean
  signature_data: string | null
  signature_date: string | null
}

// Internal Regulations Form
export interface OnboardingInternalRegulationsForm extends BaseOnboardingForm {
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  regulations_read_understood: boolean
  rights_acknowledged: boolean
  obligations_acknowledged: boolean
  coexistence_rules_acknowledged: boolean
  sanctions_acknowledged: boolean
  acceptance_confirmed: boolean
  signature_data: string | null
  signature_date: string | null
}

// Informed Dissent Form
export interface OnboardingInformedDissentForm extends BaseOnboardingForm {
  first_name: string
  last_name: string
  official_identification: string
  phone_number: string
  address: string
  email: string
  treatment_refused: boolean
  liability_release_accepted: boolean
  no_refund_understood: boolean
  decision_voluntary: boolean
  no_legal_action_agreed: boolean
  signature_data: string | null
  signature_date: string | null
  representative_name: string | null
  representative_position: string | null
  representative_signature_data: string | null
  representative_signature_date: string | null
}

// All forms combined
export interface OnboardingForms {
  releaseForm: OnboardingReleaseForm | null
  outingForm: OnboardingOutingConsentForm | null
  socialMediaForm: OnboardingSocialMediaForm | null
  regulationsForm: OnboardingInternalRegulationsForm | null
  dissentForm: OnboardingInformedDissentForm | null
}

// Full onboarding data with forms
export interface OnboardingWithForms {
  onboarding: PatientOnboarding
  forms: OnboardingForms
}

// Form type enum for dynamic access
export type OnboardingFormType = 'release' | 'outing' | 'social_media' | 'regulations' | 'dissent'

// Table name mapping
export const FORM_TABLE_MAP: Record<OnboardingFormType, string> = {
  release: 'onboarding_release_forms',
  outing: 'onboarding_outing_consent_forms',
  social_media: 'onboarding_social_media_forms',
  regulations: 'onboarding_internal_regulations_forms',
  dissent: 'onboarding_informed_dissent_forms',
}

// =============================================================================
// Action Result Types
// =============================================================================

export interface OnboardingActionResult<T = unknown> {
  success: boolean
  error?: string
  data?: T
  message?: string
}

export interface MoveToOnboardingResult {
  onboarding_id: string
  message: string
}

export interface CheckOnboardingStatusResult {
  is_in_onboarding: boolean
  onboarding: Pick<PatientOnboarding, 'id' | 'status' | 'created_at'> | null
}

