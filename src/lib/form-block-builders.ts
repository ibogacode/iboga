'use client'

import { TextBlock, formatBoolean, formatDateForPDF, formatCurrencyForPDF } from './plain-text-pdf'
import { PRIVACY_POLICY_TEXT } from '@/components/forms/form-content'
import { getServiceAgreementText, getServiceAgreementTextLegacy, LEGACY_AGREEMENT_SNAPSHOT } from '@/lib/agreement-templates'

// Patient Intake Form types
interface PatientIntakeForm {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  date_of_birth: string | null
  gender: string | null
  address: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country?: string | null
  filled_by: string | null
  filler_relationship: string | null
  filler_first_name: string | null
  filler_last_name: string | null
  filler_email: string | null
  filler_phone: string | null
  program_type: string | null
  emergency_contact_first_name: string
  emergency_contact_last_name: string
  emergency_contact_email: string | null
  emergency_contact_phone: string
  emergency_contact_address: string | null
  emergency_contact_relationship: string | null
  privacy_policy_accepted: boolean
  created_at: string
}

/**
 * Build text blocks for Patient Intake Form
 */
export function buildPatientIntakeBlocks(form: PatientIntakeForm): TextBlock[] {
  const blocks: TextBlock[] = []

  // Title
  blocks.push({ type: 'h1', text: 'Client Application Form' })
  blocks.push({ type: 'spacer', height: 2 })

  // Form Filler Information (if applicable)
  if (form.filled_by === 'someone_else') {
    blocks.push({ type: 'h2', text: 'Form Filler Information' })
    
    blocks.push({ type: 'kv', key: 'Filled By', value: form.filled_by?.replaceAll('_', ' ') || 'N/A' })
    
    if (form.filler_first_name || form.filler_last_name) {
      blocks.push({ 
        type: 'kv', 
        key: 'Filler Name', 
        value: [form.filler_first_name, form.filler_last_name].filter(Boolean).join(' ') || 'N/A' 
      })
    }
    
    if (form.filler_email) {
      blocks.push({ type: 'kv', key: 'Filler Email', value: form.filler_email })
    }
    
    if (form.filler_phone) {
      blocks.push({ type: 'kv', key: 'Filler Phone', value: form.filler_phone })
    }
    
    if (form.filler_relationship) {
      blocks.push({ type: 'kv', key: 'Relationship to Client', value: form.filler_relationship })
    }
    
    blocks.push({ type: 'spacer', height: 3 })
  }

  // Personal Information
  blocks.push({ type: 'h2', text: 'Personal Information' })
  
  blocks.push({ 
    type: 'kv', 
    key: 'Client Name', 
    value: [form.first_name, form.last_name].filter(Boolean).join(' ') || 'N/A' 
  })
  
  blocks.push({ type: 'kv', key: 'Email', value: form.email })
  blocks.push({ type: 'kv', key: 'Phone Number', value: form.phone_number })
  
  if (form.date_of_birth) {
    blocks.push({ type: 'kv', key: 'Date of Birth', value: formatDateForPDF(form.date_of_birth) })
  }
  
  if (form.gender) {
    blocks.push({ type: 'kv', key: 'Gender', value: form.gender.replace('-', ' ') })
  }

  // Address
  const addressParts = [
    form.address_line_1 || form.address,
    form.address_line_2,
    form.city,
    form.state,
    form.zip_code,
    form.country
  ].filter(Boolean)
  
  if (addressParts.length > 0) {
    blocks.push({ type: 'kv', key: 'Address', value: addressParts.join(', ') })
  }

  if (form.program_type) {
    blocks.push({ type: 'kv', key: 'Program Type', value: form.program_type.replaceAll('_', ' ') })
  }

  blocks.push({ type: 'spacer', height: 3 })

  // Emergency Contact Information
  blocks.push({ type: 'h2', text: 'Emergency Contact Information' })
  
  blocks.push({ 
    type: 'kv', 
    key: 'Emergency Contact Name', 
    value: [form.emergency_contact_first_name, form.emergency_contact_last_name]
      .filter(Boolean)
      .join(' ') || 'N/A' 
  })
  
  blocks.push({ type: 'kv', key: 'Emergency Contact Phone', value: form.emergency_contact_phone })
  
  if (form.emergency_contact_email) {
    blocks.push({ type: 'kv', key: 'Emergency Contact Email', value: form.emergency_contact_email })
  }
  
  if (form.emergency_contact_address) {
    blocks.push({ type: 'kv', key: 'Emergency Contact Address', value: form.emergency_contact_address })
  }
  
  if (form.emergency_contact_relationship) {
    blocks.push({ type: 'kv', key: 'Relationship', value: form.emergency_contact_relationship })
  }

  blocks.push({ type: 'spacer', height: 3 })

  // Privacy Policy
  blocks.push({ type: 'h2', text: 'Privacy Policy' })
  
  // Parse privacy policy text with proper structure
  const lines = PRIVACY_POLICY_TEXT.split('\n')
  let currentParagraph: string[] = []
  let currentBulletPoints: string[] = []
  let lastWasHeading = false
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const nextLine = index < lines.length - 1 ? lines[index + 1].trim() : ''
    
    if (!trimmed) {
      // Empty line - flush current content
      if (currentBulletPoints.length > 0) {
        // Add each bullet point as a separate paragraph with bullet prefix
        currentBulletPoints.forEach(bullet => {
          blocks.push({ type: 'p', text: `• ${bullet}` })
        })
        currentBulletPoints = []
      } else if (currentParagraph.length > 0) {
        blocks.push({ type: 'p', text: currentParagraph.join(' ') })
        currentParagraph = []
      }
      lastWasHeading = false
      return
    }
    
    // Check if it's a numbered heading (e.g., "1. Information We Collect", "4. Data Security")
    if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
      // Flush current content before adding heading
      if (currentBulletPoints.length > 0) {
        currentBulletPoints.forEach(bullet => {
          blocks.push({ type: 'p', text: `• ${bullet}` })
        })
        currentBulletPoints = []
      } else if (currentParagraph.length > 0) {
        blocks.push({ type: 'p', text: currentParagraph.join(' ') })
        currentParagraph = []
      }
      blocks.push({ type: 'h3', text: trimmed })
      lastWasHeading = true
    } else if (/^[A-Z][^:]+:\s+/.test(trimmed)) {
      // Information type lines (e.g., "Personal Information: Name, date...")
      // These should be regular text, not bold
      if (currentBulletPoints.length > 0) {
        currentBulletPoints.forEach(bullet => {
          blocks.push({ type: 'p', text: `• ${bullet}` })
        })
        currentBulletPoints = []
      } else if (currentParagraph.length > 0) {
        blocks.push({ type: 'p', text: currentParagraph.join(' ') })
        currentParagraph = []
      }
      blocks.push({ type: 'p', text: trimmed })
      lastWasHeading = false
    } else {
      // Regular text - check if it should be a bullet point
      // After a heading, if we see multiple consecutive sentences (end with period, reasonable length),
      // treat them as bullet points
      const isCompleteSentence = trimmed.endsWith('.') && trimmed.length > 15
      const nextIsCompleteSentence = nextLine && nextLine.endsWith('.') && nextLine.length > 15 && !/^\d+\.\s+[A-Z]/.test(nextLine)
      const isLikelyBullet = isCompleteSentence && (lastWasHeading || currentBulletPoints.length > 0 || nextIsCompleteSentence) && !trimmed.includes(':')
      
      if (isLikelyBullet) {
        currentBulletPoints.push(trimmed)
        lastWasHeading = false
      } else {
        // Regular paragraph text
        if (currentBulletPoints.length > 0) {
          // Flush bullets before adding regular text
          currentBulletPoints.forEach(bullet => {
            blocks.push({ type: 'p', text: `• ${bullet}` })
          })
          currentBulletPoints = []
        }
        currentParagraph.push(trimmed)
        lastWasHeading = false
      }
    }
  })
  
  // Flush any remaining content
  if (currentBulletPoints.length > 0) {
    currentBulletPoints.forEach(bullet => {
      blocks.push({ type: 'p', text: `• ${bullet}` })
    })
  } else if (currentParagraph.length > 0) {
    blocks.push({ type: 'p', text: currentParagraph.join(' ') })
  }

  blocks.push({ type: 'spacer', height: 2 })
  blocks.push({ 
    type: 'kv', 
    key: 'Privacy Policy Acceptance', 
    value: formatBoolean(form.privacy_policy_accepted) 
  })

  return blocks
}

// Service Agreement Form types
interface ServiceAgreement {
  id: string
  patient_first_name: string
  patient_last_name: string
  patient_email: string
  patient_phone_number: string
  total_program_fee: number | string
  deposit_amount: number | string
  deposit_percentage: number | string
  remaining_balance: number | string
  payment_method: string
  patient_signature_name: string
  patient_signature_first_name: string
  patient_signature_last_name: string
  patient_signature_date: string
  provider_signature_name: string
  provider_signature_first_name?: string | null
  provider_signature_last_name?: string | null
  provider_signature_date: string
  program_type?: 'neurological' | 'mental_health' | 'addiction' | null
  number_of_days?: number | null
  agreement_content_snapshot?: string | null
  created_at: string
}

/**
 * Build text blocks for Service Agreement Form.
 * Uses agreement_content_snapshot when present (completed agreements) so PDF matches what was signed.
 */
export function buildServiceAgreementBlocks(form: ServiceAgreement): TextBlock[] {
  const blocks: TextBlock[] = []

  // Title
  blocks.push({ type: 'h1', text: 'Service Agreement' })
  blocks.push({ type: 'spacer', height: 2 })

  // Use snapshot for completed agreements so PDF matches what was signed.
  // Legacy records with LEGACY_AGREEMENT_SNAPSHOT use OLD template (what they originally signed).
  // New/unsigned records use CURRENT template.
  const rawSnapshot = form.agreement_content_snapshot?.trim()
  const templateParams = {
    programType: form.program_type || 'neurological',
    totalProgramFee: typeof form.total_program_fee === 'number'
      ? form.total_program_fee
      : parseFloat(String(form.total_program_fee).replace(/[^0-9.]/g, '')) || 0,
    depositPercentage: typeof form.deposit_percentage === 'number'
      ? form.deposit_percentage
      : parseFloat(String(form.deposit_percentage)) || 50,
    depositAmount: typeof form.deposit_amount === 'number'
      ? form.deposit_amount
      : parseFloat(String(form.deposit_amount).replace(/[^0-9.]/g, '')) || 0,
    remainingBalance: typeof form.remaining_balance === 'number'
      ? form.remaining_balance
      : parseFloat(String(form.remaining_balance).replace(/[^0-9.]/g, '')) || 0,
    numberOfDays: form.number_of_days || 14,
  }
  let agreementText: string
  if (rawSnapshot && rawSnapshot !== LEGACY_AGREEMENT_SNAPSHOT) {
    // Real snapshot: use it as-is
    agreementText = rawSnapshot
  } else if (rawSnapshot === LEGACY_AGREEMENT_SNAPSHOT) {
    // Legacy completed (sentinel): use OLD template so they see what they originally signed
    agreementText = getServiceAgreementTextLegacy(templateParams)
  } else {
    // No snapshot (new/unsigned): use CURRENT template
    agreementText = getServiceAgreementText(templateParams)
  }

  // Parse agreement text with proper structure (similar to privacy policy)
  const lines = agreementText.split('\n')
  let currentParagraph: string[] = []
  let currentBulletPoints: string[] = []
  let lastWasHeading = false
  let inBulletSection = false
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const nextLine = index < lines.length - 1 ? lines[index + 1].trim() : ''
    
    if (!trimmed) {
      // Empty line - flush current content
      if (currentBulletPoints.length > 0) {
        // Add each bullet point as a separate paragraph with bullet prefix
        currentBulletPoints.forEach(bullet => {
          blocks.push({ type: 'p', text: `• ${bullet}` })
        })
        currentBulletPoints = []
        inBulletSection = false
      } else if (currentParagraph.length > 0) {
        blocks.push({ type: 'p', text: currentParagraph.join(' ') })
        currentParagraph = []
      }
      lastWasHeading = false
      return
    }
    
    // Check if it's a numbered heading (e.g., "1. Purpose of Agreement", "2a. Pre-Treatment Services")
    if (/^\d+[a-z]?\.\s+[A-Z]/.test(trimmed)) {
      // Flush current content before adding heading
      if (currentBulletPoints.length > 0) {
        currentBulletPoints.forEach(bullet => {
          blocks.push({ type: 'p', text: `• ${bullet}` })
        })
        currentBulletPoints = []
        inBulletSection = false
      } else if (currentParagraph.length > 0) {
        blocks.push({ type: 'p', text: currentParagraph.join(' ') })
        currentParagraph = []
      }
      blocks.push({ type: 'h3', text: trimmed })
      lastWasHeading = true
      // Sections 2b, 3, 6, 7, 9 typically have bullet points
      const sectionMatch = trimmed.match(/^(\d+[a-z]?)/)
      if (sectionMatch) {
        const sectionNum = sectionMatch[1]
        inBulletSection = ['2b', '3', '6', '7', '9'].includes(sectionNum)
      }
    } else if (trimmed.endsWith(':')) {
      // Subheading ending with colon (e.g., "Payment Schedule:")
      if (currentBulletPoints.length > 0) {
        currentBulletPoints.forEach(bullet => {
          blocks.push({ type: 'p', text: `• ${bullet}` })
        })
        currentBulletPoints = []
        inBulletSection = false
      } else if (currentParagraph.length > 0) {
        blocks.push({ type: 'p', text: currentParagraph.join(' ') })
        currentParagraph = []
      }
      blocks.push({ type: 'h3', text: trimmed })
      lastWasHeading = true
      inBulletSection = true // Subheadings with colons often have bullet lists
    } else {
      // Regular text - check if it should be a bullet point
      // After a heading, if we see multiple consecutive sentences (end with period, reasonable length),
      // treat them as bullet points
      const isCompleteSentence = trimmed.endsWith('.') && trimmed.length > 15
      const nextIsCompleteSentence = nextLine && nextLine.endsWith('.') && nextLine.length > 15 && !/^\d+[a-z]?\.\s+[A-Z]/.test(nextLine)
      const isLikelyBullet = isCompleteSentence && (lastWasHeading || currentBulletPoints.length > 0 || nextIsCompleteSentence) && 
        (inBulletSection || !trimmed.includes(':'))
      
      if (isLikelyBullet) {
        currentBulletPoints.push(trimmed)
        lastWasHeading = false
      } else {
        // Regular paragraph text
        if (currentBulletPoints.length > 0) {
          // Flush bullets before adding regular text
          currentBulletPoints.forEach(bullet => {
            blocks.push({ type: 'p', text: `• ${bullet}` })
          })
          currentBulletPoints = []
          inBulletSection = false
        }
        currentParagraph.push(trimmed)
        lastWasHeading = false
      }
    }
  })
  
  // Flush any remaining content
  if (currentBulletPoints.length > 0) {
    currentBulletPoints.forEach(bullet => {
      blocks.push({ type: 'p', text: `• ${bullet}` })
    })
  } else if (currentParagraph.length > 0) {
    blocks.push({ type: 'p', text: currentParagraph.join(' ') })
  }

  blocks.push({ type: 'spacer', height: 3 })

  // Patient Information
  blocks.push({ type: 'h2', text: 'Patient Information' })
  
  blocks.push({ 
    type: 'kv', 
    key: 'Patient Name', 
    value: [form.patient_first_name, form.patient_last_name].filter(Boolean).join(' ') || 'N/A' 
  })
  
  blocks.push({ type: 'kv', key: 'Email', value: form.patient_email })
  blocks.push({ type: 'kv', key: 'Phone Number', value: form.patient_phone_number })

  blocks.push({ type: 'spacer', height: 3 })

  // Fees & Payment
  blocks.push({ type: 'h2', text: 'Fees & Payment' })
  
  blocks.push({ type: 'kv', key: 'Total Program Fee', value: formatCurrencyForPDF(form.total_program_fee) })
  blocks.push({ type: 'kv', key: 'Deposit Amount', value: formatCurrencyForPDF(form.deposit_amount) })
  
  const depositPct = typeof form.deposit_percentage === 'number' 
    ? form.deposit_percentage 
    : parseFloat(String(form.deposit_percentage)) || 0
  blocks.push({ type: 'kv', key: 'Deposit Percentage', value: `${depositPct}%` })
  
  blocks.push({ type: 'kv', key: 'Remaining Balance', value: formatCurrencyForPDF(form.remaining_balance) })
  blocks.push({ type: 'kv', key: 'Payment Method', value: form.payment_method })

  blocks.push({ type: 'spacer', height: 3 })

  // Signatures
  blocks.push({ type: 'h2', text: 'Signatures' })
  
  blocks.push({ type: 'h3', text: 'Patient Signature' })
  blocks.push({ type: 'kv', key: 'Signature Name', value: form.patient_signature_name })
  blocks.push({ 
    type: 'kv', 
    key: 'Patient Name', 
    value: [form.patient_signature_first_name, form.patient_signature_last_name]
      .filter(Boolean)
      .join(' ') || 'N/A' 
  })
  blocks.push({ type: 'kv', key: 'Date', value: formatDateForPDF(form.patient_signature_date) })
  blocks.push({ type: 'kv', key: 'Signature', value: form.patient_signature_name ? 'Signed' : 'Not provided' })

  blocks.push({ type: 'spacer', height: 3 })
  
  blocks.push({ type: 'h3', text: 'Provider Signature' })
  blocks.push({ type: 'kv', key: 'Provider Name', value: form.provider_signature_name })
  
  if (form.provider_signature_first_name) {
    blocks.push({ 
      type: 'kv', 
      key: 'First Name', 
      value: form.provider_signature_first_name
    })
  }
  
  if (form.provider_signature_last_name) {
    blocks.push({ 
      type: 'kv', 
      key: 'Last Name', 
      value: form.provider_signature_last_name
    })
  }
  
  blocks.push({ type: 'kv', key: 'Date', value: formatDateForPDF(form.provider_signature_date) })

  return blocks
}

// Ibogaine Consent Form types
interface IbogaineConsentForm {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  phone_number: string
  email: string
  address: string
  facilitator_doctor_name: string
  consent_for_treatment: boolean
  risks_and_benefits: boolean
  voluntary_participation: boolean
  confidentiality: boolean
  liability_release: boolean
  payment_collection: boolean
  signature_data: string
  signature_date: string
  signature_name: string
  created_at: string
}

const CONSENT_TEXTS: Record<string, string> = {
  consent_for_treatment: `I, hereby referred to as "the Patient", voluntarily consent to participate in the Ibogaine therapy monitored by Iboga Wellness Institute. I understand that this therapy involves Ibogaine, a psychoactive substance derived from the Tabernanthe iboga plant, used in the treatment of substance dependency, PTSD, depression, anxiety, and for personal growth.`,
  risks_and_benefits: `I acknowledge that I have been informed about the potential benefits, risks, and side effects associated with Ibogaine therapy, including but not limited to: changes in heart rate, blood pressure, nausea, hallucinations, emotional and psychological revelations, and in rare cases, severe health complications.`,
  voluntary_participation: `I acknowledge that my participation in this therapy is entirely voluntary and that I have the right to withdraw my consent and discontinue participation at any time.`,
  confidentiality: `I understand that my privacy will be respected, and all personal and medical information will be handled in accordance with Iboga Wellness Institute's privacy policy and applicable laws regarding patient confidentiality.`,
  liability_release: `I release Iboga Wellness Institute, its medical team, therapists, administrative, and operational staff from all medical, legal, and administrative responsibility for any consequences arising from my participation in Ibogaine therapy, except in cases of gross negligence or willful misconduct.`,
  payment_collection: `I acknowledge and agree that Iboga Wellness Institute will collect payment for the services provided in accordance with the agreed-upon payment terms and schedule. I understand that payment is required as specified in my service agreement.`,
}

const CONSENT_SECTIONS = [
  { heading: 'Consent for Treatment', field: 'consent_for_treatment' as const },
  { heading: 'Risks and Benefits', field: 'risks_and_benefits' as const },
  { heading: 'Voluntary Participation', field: 'voluntary_participation' as const },
  { heading: 'Confidentiality', field: 'confidentiality' as const },
  { heading: 'Liability Release', field: 'liability_release' as const },
  { heading: 'Payment Collection by Iboga Wellness Institute', field: 'payment_collection' as const },
]

/**
 * Build text blocks for Ibogaine Consent Form
 */
export function buildIbogaineConsentBlocks(form: IbogaineConsentForm): TextBlock[] {
  const blocks: TextBlock[] = []

  // Title
  blocks.push({ type: 'h1', text: 'Ibogaine Therapy Consent Form' })
  blocks.push({ type: 'spacer', height: 2 })

  // Patient Information
  blocks.push({ type: 'h2', text: 'Patient Information' })
  
  blocks.push({ type: 'kv', key: 'First Name', value: form.first_name })
  blocks.push({ type: 'kv', key: 'Last Name', value: form.last_name })
  blocks.push({ type: 'kv', key: 'Date of Birth', value: formatDateForPDF(form.date_of_birth) })
  blocks.push({ type: 'kv', key: 'Phone Number', value: form.phone_number })
  blocks.push({ type: 'kv', key: 'Email', value: form.email })
  blocks.push({ type: 'kv', key: 'Address', value: form.address })

  blocks.push({ type: 'spacer', height: 3 })

  // Therapy Information
  blocks.push({ type: 'h2', text: 'Therapy Information' })
  blocks.push({ type: 'kv', key: 'Facilitator/Doctor Name', value: form.facilitator_doctor_name })

  blocks.push({ type: 'spacer', height: 3 })

  // Consent Sections
  blocks.push({ type: 'h2', text: 'Consent for Treatment' })
  
  CONSENT_SECTIONS.forEach(section => {
    blocks.push({ type: 'h3', text: section.heading })
    blocks.push({ type: 'p', text: CONSENT_TEXTS[section.field] })
    blocks.push({ 
      type: 'kv', 
      key: 'Acknowledged', 
      value: formatBoolean(form[section.field]) 
    })
    blocks.push({ type: 'spacer', height: 2 })
  })

  blocks.push({ type: 'spacer', height: 3 })

  // Signature
  blocks.push({ type: 'h2', text: 'Signature' })
  blocks.push({ type: 'kv', key: 'Signature Name', value: form.signature_name })
  blocks.push({ type: 'kv', key: 'Signature Date', value: formatDateForPDF(form.signature_date) })
  blocks.push({ type: 'kv', key: 'Signature', value: form.signature_data ? 'Signed' : 'Not provided' })

  return blocks
}

// Medical History Form types
interface MedicalHistoryForm {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  weight: string | null
  height: string | null
  phone_number: string
  email: string
  emergency_contact_name: string
  emergency_contact_phone: string
  primary_care_provider: string | null
  other_physicians: string | null
  practitioners_therapists: string | null
  current_health_status: string | null
  reason_for_coming: string | null
  medical_conditions: string | null
  substance_use_history: string | null
  family_personal_health_info: string | null
  pain_stiffness_swelling: string | null
  metabolic_health_concerns: string | null
  digestive_health: string | null
  reproductive_health: string | null
  hormonal_health: string | null
  immune_health: string | null
  food_allergies_intolerance: string | null
  difficulties_chewing_swallowing: string | null
  medications_medical_use: string | null
  medications_mental_health: string | null
  mental_health_conditions: string | null
  mental_health_treatment: string | null
  allergies: string | null
  previous_psychedelics_experiences: string | null
  has_physical_examination: boolean | null
  physical_examination_records: string | null
  physical_examination_file_url: string | null
  physical_examination_file_name: string | null
  has_cardiac_evaluation: boolean | null
  cardiac_evaluation: string | null
  cardiac_evaluation_file_url: string | null
  cardiac_evaluation_file_name: string | null
  has_liver_function_tests: boolean | null
  liver_function_tests: string | null
  liver_function_tests_file_url: string | null
  liver_function_tests_file_name: string | null
  is_pregnant: boolean
  dietary_lifestyle_habits: string | null
  physical_activity_exercise: string | null
  signature_data: string | null
  signature_date: string
  uploaded_file_url: string | null
  uploaded_file_name: string | null
  created_at: string
}

function formatGender(gender: string | null): string {
  if (!gender) return 'N/A'
  if (gender === 'M') return 'Male'
  if (gender === 'F') return 'Female'
  return gender
}

/**
 * Build text blocks for Medical History Form
 */
export function buildMedicalHistoryBlocks(form: MedicalHistoryForm): TextBlock[] {
  const blocks: TextBlock[] = []

  // Title
  blocks.push({ type: 'h1', text: 'Medical Health History Form' })
  blocks.push({ type: 'kv', key: 'Client', value: `${form.first_name} ${form.last_name}` })
  blocks.push({ type: 'kv', key: 'Submitted', value: formatDateForPDF(form.created_at) })
  blocks.push({ type: 'spacer', height: 2 })

  // Personal Information
  blocks.push({ type: 'h2', text: 'Personal Information' })
  
  blocks.push({ 
    type: 'kv', 
    key: 'Client Name', 
    value: [form.first_name, form.last_name].filter(Boolean).join(' ') || 'N/A' 
  })
  
  blocks.push({ type: 'kv', key: 'Date of Birth', value: formatDateForPDF(form.date_of_birth) })
  blocks.push({ type: 'kv', key: 'Gender', value: formatGender(form.gender) })
  
  if (form.weight) {
    blocks.push({ type: 'kv', key: 'Weight', value: form.weight })
  }
  
  if (form.height) {
    blocks.push({ type: 'kv', key: 'Height', value: form.height })
  }
  
  blocks.push({ type: 'kv', key: 'Phone Number', value: form.phone_number })
  blocks.push({ type: 'kv', key: 'Email', value: form.email })
  blocks.push({ type: 'kv', key: 'Emergency Contact Name', value: form.emergency_contact_name })
  blocks.push({ type: 'kv', key: 'Emergency Contact Phone', value: form.emergency_contact_phone })

  blocks.push({ type: 'spacer', height: 2 })

  // Health Information
  blocks.push({ type: 'h2', text: 'Health Information' })
  
  if (form.primary_care_provider) {
    blocks.push({ type: 'kv', key: 'Primary Care Provider', value: form.primary_care_provider })
  }
  
  if (form.other_physicians) {
    blocks.push({ type: 'kv', key: 'Other Physicians', value: form.other_physicians })
  }
  
  if (form.practitioners_therapists) {
    blocks.push({ type: 'kv', key: 'Practitioners/Therapists', value: form.practitioners_therapists })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Medical History
  blocks.push({ type: 'h2', text: 'Medical History' })
  
  if (form.current_health_status) {
    blocks.push({ type: 'h3', text: 'Current Health Status' })
    blocks.push({ type: 'p', text: form.current_health_status })
  }
  
  if (form.reason_for_coming) {
    blocks.push({ type: 'h3', text: 'Reason for Coming' })
    blocks.push({ type: 'p', text: form.reason_for_coming })
  }
  
  if (form.medical_conditions) {
    blocks.push({ type: 'h3', text: 'Medical Conditions' })
    blocks.push({ type: 'p', text: form.medical_conditions })
  }
  
  if (form.substance_use_history) {
    blocks.push({ type: 'h3', text: 'Substance Use History' })
    blocks.push({ type: 'p', text: form.substance_use_history })
  }
  
  if (form.family_personal_health_info) {
    blocks.push({ type: 'h3', text: 'Family/Personal Health Information' })
    blocks.push({ type: 'p', text: form.family_personal_health_info })
  }
  
  if (form.pain_stiffness_swelling) {
    blocks.push({ type: 'h3', text: 'Pain, Stiffness, Swelling' })
    blocks.push({ type: 'p', text: form.pain_stiffness_swelling })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Health Sections
  blocks.push({ type: 'h2', text: 'Health Sections' })
  
  if (form.metabolic_health_concerns) {
    blocks.push({ type: 'h3', text: 'Metabolic Health Concerns' })
    blocks.push({ type: 'p', text: form.metabolic_health_concerns })
  }
  
  if (form.digestive_health) {
    blocks.push({ type: 'h3', text: 'Digestive Health' })
    blocks.push({ type: 'p', text: form.digestive_health })
  }
  
  if (form.reproductive_health) {
    blocks.push({ type: 'h3', text: 'Reproductive Health' })
    blocks.push({ type: 'p', text: form.reproductive_health })
  }
  
  if (form.hormonal_health) {
    blocks.push({ type: 'h3', text: 'Hormonal Health' })
    blocks.push({ type: 'p', text: form.hormonal_health })
  }
  
  if (form.immune_health) {
    blocks.push({ type: 'h3', text: 'Immune Health' })
    blocks.push({ type: 'p', text: form.immune_health })
  }
  
  if (form.food_allergies_intolerance) {
    blocks.push({ type: 'h3', text: 'Food Allergies/Intolerance' })
    blocks.push({ type: 'p', text: form.food_allergies_intolerance })
  }
  
  if (form.difficulties_chewing_swallowing) {
    blocks.push({ type: 'h3', text: 'Difficulties Chewing/Swallowing' })
    blocks.push({ type: 'p', text: form.difficulties_chewing_swallowing })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Medications
  blocks.push({ type: 'h2', text: 'Medications' })
  
  if (form.medications_medical_use) {
    blocks.push({ type: 'h3', text: 'Medications for Medical Use' })
    blocks.push({ type: 'p', text: form.medications_medical_use })
  }
  
  if (form.medications_mental_health) {
    blocks.push({ type: 'h3', text: 'Medications for Mental Health' })
    blocks.push({ type: 'p', text: form.medications_mental_health })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Mental Health
  blocks.push({ type: 'h2', text: 'Mental Health' })
  
  if (form.mental_health_conditions) {
    blocks.push({ type: 'h3', text: 'Mental Health Conditions' })
    blocks.push({ type: 'p', text: form.mental_health_conditions })
  }
  
  if (form.mental_health_treatment) {
    blocks.push({ type: 'h3', text: 'Mental Health Treatment' })
    blocks.push({ type: 'p', text: form.mental_health_treatment })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Allergies & Previous Experiences
  blocks.push({ type: 'h2', text: 'Allergies & Previous Experiences' })
  
  if (form.allergies) {
    blocks.push({ type: 'h3', text: 'Allergies' })
    blocks.push({ type: 'p', text: form.allergies })
  }
  
  if (form.previous_psychedelics_experiences) {
    blocks.push({ type: 'h3', text: 'Previous Psychedelics Experiences' })
    blocks.push({ type: 'p', text: form.previous_psychedelics_experiences })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Physical Examination & Tests
  blocks.push({ type: 'h2', text: 'Physical Examination & Medical Tests' })
  
  blocks.push({ 
    type: 'kv', 
    key: 'Physical Examination (last 12 months)', 
    value: formatBoolean(form.has_physical_examination) 
  })
  
  if (form.has_physical_examination === true && form.physical_examination_records) {
    blocks.push({ type: 'h3', text: 'Physical Examination Details' })
    blocks.push({ type: 'p', text: form.physical_examination_records })
  }
  
  if (form.has_physical_examination === true && form.physical_examination_file_url) {
    blocks.push({ 
      type: 'kv', 
      key: 'Physical Examination Report', 
      value: form.physical_examination_file_name || 'File attached' 
    })
  }
  
  blocks.push({ 
    type: 'kv', 
    key: 'Cardiac Evaluation (EKG)', 
    value: formatBoolean(form.has_cardiac_evaluation) 
  })
  
  if (form.has_cardiac_evaluation === true && form.cardiac_evaluation) {
    blocks.push({ type: 'h3', text: 'Cardiac Evaluation Details' })
    blocks.push({ type: 'p', text: form.cardiac_evaluation })
  }
  
  if (form.has_cardiac_evaluation === true && form.cardiac_evaluation_file_url) {
    blocks.push({ 
      type: 'kv', 
      key: 'Cardiac Evaluation Report', 
      value: form.cardiac_evaluation_file_name || 'File attached' 
    })
  }
  
  blocks.push({ 
    type: 'kv', 
    key: 'Liver Function Tests', 
    value: formatBoolean(form.has_liver_function_tests) 
  })
  
  if (form.has_liver_function_tests === true && form.liver_function_tests) {
    blocks.push({ type: 'h3', text: 'Liver Function Tests Details' })
    blocks.push({ type: 'p', text: form.liver_function_tests })
  }
  
  if (form.has_liver_function_tests === true && form.liver_function_tests_file_url) {
    blocks.push({ 
      type: 'kv', 
      key: 'Liver Function Test Report', 
      value: form.liver_function_tests_file_name || 'File attached' 
    })
  }
  
  if (form.gender === 'F') {
    blocks.push({ type: 'kv', key: 'Currently Pregnant', value: formatBoolean(form.is_pregnant) })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Dietary and Lifestyle
  blocks.push({ type: 'h2', text: 'Dietary and Lifestyle' })
  
  if (form.dietary_lifestyle_habits) {
    blocks.push({ type: 'h3', text: 'Dietary and Lifestyle Habits' })
    blocks.push({ type: 'p', text: form.dietary_lifestyle_habits })
  }
  
  if (form.physical_activity_exercise) {
    blocks.push({ type: 'h3', text: 'Physical Activity and Exercise' })
    blocks.push({ type: 'p', text: form.physical_activity_exercise })
  }

  blocks.push({ type: 'spacer', height: 2 })

  // Signature
  blocks.push({ type: 'h2', text: 'Signature & Authorization' })
  blocks.push({ type: 'kv', key: 'Signature Date', value: formatDateForPDF(form.signature_date) })
  blocks.push({ type: 'kv', key: 'Digital Signature', value: form.signature_data ? 'Signed' : 'Not provided' })

  if (form.uploaded_file_url) {
    blocks.push({ type: 'spacer', height: 2 })
    blocks.push({ type: 'h2', text: 'Additional Documents' })
    blocks.push({ 
      type: 'kv', 
      key: 'Additional Medical Document', 
      value: form.uploaded_file_name || 'File attached' 
    })
  }

  return blocks
}

/**
 * Generic document builder for structured content
 */
export function buildBlocksFromDocument(params: {
  title: string
  sections: Array<{ heading: string; body: string | Array<{ key: string; value: string }> }>
}): TextBlock[] {
  const blocks: TextBlock[] = []

  blocks.push({ type: 'h1', text: params.title })
  blocks.push({ type: 'spacer', height: 2 })

  params.sections.forEach(section => {
    blocks.push({ type: 'h2', text: section.heading })
    
    if (typeof section.body === 'string') {
      // Split body into paragraphs
      const paragraphs = section.body.split('\n\n').filter(p => p.trim())
      paragraphs.forEach(paragraph => {
        blocks.push({ type: 'p', text: paragraph.trim() })
      })
    } else {
      // Array of key-value pairs
      section.body.forEach(kv => {
        blocks.push({ type: 'kv', key: kv.key, value: kv.value })
      })
    }
    
    blocks.push({ type: 'spacer', height: 3 })
  })

  return blocks
}
