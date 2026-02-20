/** All template types supported by send-email-template edge function (for test page and actions). */
export const EMAIL_TEMPLATE_TYPES = [
  'inquiry_confirmation',
  'employee_welcome',
  'patient_login_reminder',
  'filler_login_reminder',
  'form_activation',
  'form_activation_reminder',
  'medical_history_confirmation',
  'service_agreement_confirmation',
  'ibogaine_consent_confirmation',
  'onboarding_forms',
] as const

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number]

/** Human-readable labels for template types (e.g. for dropdown). */
export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  inquiry_confirmation: 'Inquiry confirmation',
  employee_welcome: 'Employee welcome',
  patient_login_reminder: 'Patient login reminder',
  filler_login_reminder: 'Filler login reminder',
  form_activation: 'Form activation',
  form_activation_reminder: 'Form activation reminder (48h)',
  medical_history_confirmation: 'Medical history confirmation',
  service_agreement_confirmation: 'Service agreement confirmation',
  ibogaine_consent_confirmation: 'Ibogaine consent confirmation',
  onboarding_forms: 'Onboarding forms (from Clinical Director)',
}

/** Kinds of emails sent via sendEmailDirect (Actions) – for test page. */
export const DIRECT_EMAIL_TEST_KINDS = [
  'intake_confirmation',
  'filler_confirmation',
  'patient_login_credentials',
  'filler_notification_account_created',
  'patient_password_setup',
  'filler_notification_password_reset',
  'medical_history_form_link',
  'service_agreement_form_link',
  'ibogaine_consent_form_link',
  'intake_form_link',
  'request_labs',
  'onboarding_complete_admin',
  'medical_history_admin',
  'balance_reminder',
  'tapering_schedule_client',
  'tapering_admin',
  'client_ready_tapering',
  'form_automation_admin',
] as const

export type DirectEmailTestKind = (typeof DIRECT_EMAIL_TEST_KINDS)[number]

/** Human-readable labels for direct email kinds. */
export const DIRECT_EMAIL_LABELS: Record<DirectEmailTestKind, string> = {
  intake_confirmation: 'Intake application confirmation (to patient)',
  filler_confirmation: 'Filler confirmation (when someone else filled)',
  patient_login_credentials: 'Patient login credentials',
  filler_notification_account_created: 'Filler: patient account created',
  patient_password_setup: 'Patient password setup / welcome',
  filler_notification_password_reset: 'Filler: password reset link',
  medical_history_form_link: 'Medical history form link',
  service_agreement_form_link: 'Service agreement form link',
  ibogaine_consent_form_link: 'Ibogaine consent form link',
  intake_form_link: 'Intake form link',
  request_labs: 'Request labs (to client)',
  onboarding_complete_admin: 'Onboarding complete – admin notification',
  medical_history_admin: 'Medical history submitted – admin notification',
  balance_reminder: 'Balance payment reminder (to client)',
  tapering_schedule_client: 'Tapering schedule (to client)',
  tapering_admin: 'Tapering schedule – admin notification',
  client_ready_tapering: 'Client ready for tapering – notification',
  form_automation_admin: 'Patient moved to onboarding – admin (form automation)',
}

/** Single entry for the unified email test list (template or direct). */
export interface EmailTestEntry {
  id: string
  label: string
  source: 'template' | 'direct'
}

/** Every email we send (Actions + Supabase template), for one testing list. */
export function getAllEmailTestEntries(): EmailTestEntry[] {
  const templateEntries: EmailTestEntry[] = EMAIL_TEMPLATE_TYPES.map((t) => ({
    id: t,
    label: EMAIL_TEMPLATE_LABELS[t],
    source: 'template' as const,
  }))
  const directEntries: EmailTestEntry[] = DIRECT_EMAIL_TEST_KINDS.map((k) => ({
    id: k,
    label: DIRECT_EMAIL_LABELS[k],
    source: 'direct' as const,
  }))
  return [...templateEntries, ...directEntries]
}
