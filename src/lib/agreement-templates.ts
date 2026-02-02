// Service Agreement template functions - can be used in both server and client code
// NO 'use client' directive so these can be called from server actions

// Sentinel for legacy completed agreements that have no stored snapshot; app uses legacy template for display.
export const LEGACY_AGREEMENT_SNAPSHOT = '[LEGACY_AGREEMENT_SNAPSHOT]'

// Type for template params
export interface ServiceAgreementTemplateParams {
  programType?: 'neurological' | 'mental_health' | 'addiction'
  totalProgramFee?: number | string
  depositPercentage?: number | string
  depositAmount?: number | string
  remainingBalance?: number | string
  numberOfDays?: number | string
}

/**
 * LEGACY Service Agreement text template - used for completed agreements before snapshot feature.
 * This preserves the old Pre/Post Treatment wording so legacy clients see what they originally signed.
 */
export function getServiceAgreementTextLegacy(params: ServiceAgreementTemplateParams): string {
  const {
    programType = 'neurological',
    totalProgramFee = 0,
    depositPercentage = 50,
    depositAmount = 0,
    remainingBalance = 0,
    numberOfDays = 14,
  } = params

  // Format amounts
  const formattedTotal = typeof totalProgramFee === 'number' 
    ? `$${totalProgramFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : totalProgramFee || '$0.00'
  const formattedRemaining = typeof remainingBalance === 'number'
    ? `$${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : remainingBalance || '$0.00'
  
  const depositPct = typeof depositPercentage === 'number' ? depositPercentage : parseFloat(String(depositPercentage)) || 50
  const days = typeof numberOfDays === 'number' ? numberOfDays : parseInt(String(numberOfDays), 10) || 14

  // Program-specific text
  const isNeurological = programType === 'neurological'
  const purposeText = isNeurological
    ? "The services are focused on supporting patients' health and well-being while addressing symptoms associated with Parkinson's disease."
    : "The services are focused on supporting patients' health and well-being through wellness and therapeutic services."
  
  const treatmentPurposeText = isNeurological
    ? "Treatment is being sought for Parkinson's disease and related symptoms."
    : "Treatment is being sought for wellness, therapeutic support, and personal growth."

  // Build services list conditionally
  const servicesList = [
    'Wellness support and therapeutic care.',
    isNeurological
      ? 'Administration of ibogaine-based microdosing protocols in accordance with Dr. Omar Calderon\'s clinical guidelines.'
      : 'Administration of ibogaine-based protocols in accordance with Dr. Omar Calderon\'s clinical guidelines.',
    'Medical monitoring during treatment, including regular EKG and heart monitoring, vital sign checks, any medicines needed and observation of overall physical condition to ensure safety.',
    'Education, preparation, and integration sessions designed to maximize treatment benefit.',
    ...(isNeurological ? ['Daily Physical Therapy or Aqua Sessions.'] : []),
    'Complimentary somatic & sound therapy sessions.',
    'Weekly Massage sessions.',
    'Weekly beach club excursion.',
    'Daily meals (breakfast, lunch, dinner and meals) provided by our personal Chef and staff.',
    'Transportation to and from the Cozumel Airport in private transportation and private transportation around the island.',
    'Concierge services available to ensure a 5 star experience for each patient.',
    'Psychologist available to each patient if needed.',
  ]

  return `Between: Iboga Wellness Institute, LLC("Provider") and ("Patient")

1. Purpose of Agreement
This Agreement sets forth the terms and conditions under which Iboga Wellness Institute, LLC will provide wellness and therapeutic services to the Patient. ${purposeText}

2a. Pre-Treatment Services Provided
Provider agrees to deliver the following services prior to the Patient's arrival for Onsite Treatment Services:

Identification of medical screening processes and tests which Provider requires to be administered to the Patient in order for the Provider to Qualify/Approve the Patient for treatment.
Provider to issue a written, electronically signed Treatment Qualification/Approval letter.

2b. Onsite Treatment Services Provided
Provider agrees to deliver the following services for a ${days}-day period at clinic in Cozumel Mexico:

${servicesList.join('\n')}

2c. Post-Treatment Services Provided
The provider agrees to provide the following services remotely.
Once a week Zoom calls with patients for 3 months following Treatment to assess Post-Treatment condition and collect data needed to assess effectiveness of Treatment over time.
Once a month Zoom calls a Patient for months 4-12 following Treatment to assess Post-Treatment condition and collect data needed to assess effectiveness of Treatment over time.
Assistance with obtaining ibogaine for Patient assuming Provider deems that to be appropriate.

3. Acknowledgment of Treatment Purpose
Patient acknowledges that:

${treatmentPurposeText}
The services provided are considered alternative and experimental therapy, and outcomes may vary.
No guarantee of improvement or cure is made or implied.

4. Fees and Payment
Payment Schedule:

${depositPct}% of the total program fee (${formattedTotal} USD) is due upon issuance of the electronically signed Treatment Qualification/Approval letter.
The remaining ${100 - depositPct}% (${formattedRemaining} USD) is due no later than three (3) days prior to the patient's scheduled arrival at the clinic.
If paying by credit card, a 3% processing fee applies to the amount paid by credit card.

5a. Cancellation & Refund Policy
Cancellations made at least 30 days before your scheduled treatment date are eligible for a full refund of the program fee (minus any transfer or processing costs).
Cancellations made less than 21 days before your scheduled treatment may result in forfeiture of ½ your deposit.
Cancellations made less than 14 days before your scheduled treatment may result in forfeiture of ¾ your deposit.
Cancellations made less than 7 days before your scheduled treatment may result in forfeiture of your full deposit.
Postponements can be arranged at our discretion and based on availability.

5b. Disclaimer Of Liability
I release Iboga Wellness Institute, its medical team, therapists, administrative, and operational staff from all medical, legal, and administrative responsibility for any consequences arising from my decision not to undergo the recommended treatment.
I understand that my decision to refuse services today will not result in a refund, as long as reschedule to commence services with 90 days.
I declare that my decision has been made without coercion, external pressure, or undue influence and that I have fully understood the explanations provided.
I agree not to take legal action against Iboga Wellness Institute, its medical staff, therapists, or administrative team in relation to my decision not to accept the proposed treatment.

6. Risks and Limitations
Patient understands and accepts that:

Ibogaine carries potential physical and psychological risks, including but not limited to: changes in blood pressure, heart rhythm irregularities, nausea, dizziness, emotional distress, and other medical complications.
No guarantee of improvement or cure is provided.
Patients must disclose all relevant medical history, medications, and conditions to the Provider prior to treatment.
Emergency medical care may be required in rare cases, and the patient consents to such care if deemed necessary by the provider.

7. Patient Responsibilities
Patient agrees to:

Provide full and accurate medical history.
Follow all instructions before, during, and after treatment.
Refrain from alcohol, recreational drugs, and any medications contraindicated with ibogaine, as directed by the Provider.
Immediately report any concerning symptoms to the Provider.


8. Confidentiality
All medical and personal information will be kept confidential in accordance with applicable privacy laws in Mexico.

9. Consent to Treatment
By signing this Agreement, Patient acknowledges and consents to the following:

I voluntarily choose to receive treatment at Iboga Wellness Institute in Cozumel Mexico.
${isNeurological 
  ? 'I understand the treatment involves ibogaine microdosing following Dr. Omar Calderón\'s protocol.'
  : 'I understand the treatment involves ibogaine following Dr. Omar Calderón\'s protocol.'}
I have been informed of potential risks, benefits, and alternatives.
I understand this treatment is alternative and experimental and not guaranteed to improve my condition.
I release Iboga Wellness Institute, LLC, its staff, contractors, and affiliates from liability for outcomes reasonably associated with treatment, except in cases of gross negligence or willful misconduct.

10. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of Mexico.


11. Entire Agreement
This Agreement contains the entire understanding between Provider and Patient regarding the subject matter and supersedes all prior discussions or agreements. `
}

/**
 * CURRENT Service Agreement text template - for new signers.
 * Contains the updated Pre/Post Treatment wording.
 */
export function getServiceAgreementText(params: ServiceAgreementTemplateParams): string {
  const {
    programType = 'neurological',
    totalProgramFee = 0,
    depositPercentage = 50,
    depositAmount = 0,
    remainingBalance = 0,
    numberOfDays = 14,
  } = params

  // Format amounts
  const formattedTotal = typeof totalProgramFee === 'number' 
    ? `$${totalProgramFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : totalProgramFee || '$0.00'
  const formattedRemaining = typeof remainingBalance === 'number'
    ? `$${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : remainingBalance || '$0.00'
  
  const depositPct = typeof depositPercentage === 'number' ? depositPercentage : parseFloat(String(depositPercentage)) || 50
  const days = typeof numberOfDays === 'number' ? numberOfDays : parseInt(String(numberOfDays), 10) || 14

  // Program-specific text
  const isNeurological = programType === 'neurological'
  const purposeText = isNeurological
    ? "The services are focused on supporting patients' health and well-being while addressing symptoms associated with Parkinson's disease."
    : "The services are focused on supporting patients' health and well-being through wellness and therapeutic services."
  
  const treatmentPurposeText = isNeurological
    ? "Treatment is being sought for Parkinson's disease and related symptoms."
    : "Treatment is being sought for wellness, therapeutic support, and personal growth."

  // Build services list conditionally
  const servicesList = [
    'Wellness support and therapeutic care.',
    isNeurological
      ? 'Administration of ibogaine-based microdosing protocols in accordance with Dr. Omar Calderon\'s clinical guidelines.'
      : 'Administration of ibogaine-based protocols in accordance with Dr. Omar Calderon\'s clinical guidelines.',
    'Medical monitoring during treatment, including regular EKG and heart monitoring, vital sign checks, any medicines needed and observation of overall physical condition to ensure safety.',
    'Education, preparation, and integration sessions designed to maximize treatment benefit.',
    ...(isNeurological ? ['Daily Physical Therapy or Aqua Sessions.'] : []),
    'Complimentary somatic & sound therapy sessions.',
    'Weekly Massage sessions.',
    'Weekly beach club excursion.',
    'Daily meals (breakfast, lunch, dinner and meals) provided by our personal Chef and staff.',
    'Transportation to and from the Cozumel Airport in private transportation and private transportation around the island.',
    'Concierge services available to ensure a 5 star experience for each patient.',
    'Psychologist available to each patient if needed.',
  ]

  return `Between: Iboga Wellness Institute, LLC("Provider") and ("Patient")

1. Purpose of Agreement
This Agreement sets forth the terms and conditions under which Iboga Wellness Institute, LLC will provide wellness and therapeutic services to the Patient. ${purposeText}

2a. Pre-Treatment Services Provided
Provider agrees to deliver the following services prior to the Patient's arrival for Onsite Treatment Services:

Pre-Treatment Preparation: Two (2) preparatory sessions with a designated Pre-Treatment Specialist to ensure Patient readiness and address any questions or concerns prior to arrival.
Identification of medical screening processes and tests which Provider requires to be administered to the Patient in order for the Provider to Qualify/Approve the Patient for treatment.
Provider to issue a written, electronically signed Treatment Qualification/Approval letter.

2b. Onsite Treatment Services Provided
Provider agrees to deliver the following services for a ${days}-day period at clinic in Cozumel Mexico:

${servicesList.join('\n')}

2c. Post-Treatment Services Provided
The provider agrees to provide the following services remotely.

Post-Treatment Support:
Two (2) follow-up sessions during the first month following treatment (scheduled bi-weekly).
One (1) follow-up session per month for the subsequent two (2) months to monitor progress and provide continued support.
Assistance with obtaining ibogaine for Patient assuming Provider deems that to be appropriate.

3. Acknowledgment of Treatment Purpose
Patient acknowledges that:

${treatmentPurposeText}
The services provided are considered alternative and experimental therapy, and outcomes may vary.
No guarantee of improvement or cure is made or implied.

4. Fees and Payment
Payment Schedule:

${depositPct}% of the total program fee (${formattedTotal} USD) is due upon issuance of the electronically signed Treatment Qualification/Approval letter.
The remaining ${100 - depositPct}% (${formattedRemaining} USD) is due no later than three (3) days prior to the patient's scheduled arrival at the clinic.
If paying by credit card, a 3% processing fee applies to the amount paid by credit card.

5a. Cancellation & Refund Policy
Cancellations made at least 30 days before your scheduled treatment date are eligible for a full refund of the program fee (minus any transfer or processing costs).
Cancellations made less than 21 days before your scheduled treatment may result in forfeiture of ½ your deposit.
Cancellations made less than 14 days before your scheduled treatment may result in forfeiture of ¾ your deposit.
Cancellations made less than 7 days before your scheduled treatment may result in forfeiture of your full deposit.
Postponements can be arranged at our discretion and based on availability.

5b. Disclaimer Of Liability
I release Iboga Wellness Institute, its medical team, therapists, administrative, and operational staff from all medical, legal, and administrative responsibility for any consequences arising from my decision not to undergo the recommended treatment.
I understand that my decision to refuse services today will not result in a refund, as long as reschedule to commence services with 90 days.
I declare that my decision has been made without coercion, external pressure, or undue influence and that I have fully understood the explanations provided.
I agree not to take legal action against Iboga Wellness Institute, its medical staff, therapists, or administrative team in relation to my decision not to accept the proposed treatment.

6. Risks and Limitations
Patient understands and accepts that:

Ibogaine carries potential physical and psychological risks, including but not limited to: changes in blood pressure, heart rhythm irregularities, nausea, dizziness, emotional distress, and other medical complications.
No guarantee of improvement or cure is provided.
Patients must disclose all relevant medical history, medications, and conditions to the Provider prior to treatment.
Emergency medical care may be required in rare cases, and the patient consents to such care if deemed necessary by the provider.

7. Patient Responsibilities
Patient agrees to:

Provide full and accurate medical history.
Follow all instructions before, during, and after treatment.
Refrain from alcohol, recreational drugs, and any medications contraindicated with ibogaine, as directed by the Provider.
Immediately report any concerning symptoms to the Provider.


8. Confidentiality
All medical and personal information will be kept confidential in accordance with applicable privacy laws in Mexico.

9. Consent to Treatment
By signing this Agreement, Patient acknowledges and consents to the following:

I voluntarily choose to receive treatment at Iboga Wellness Institute in Cozumel Mexico.
${isNeurological 
  ? 'I understand the treatment involves ibogaine microdosing following Dr. Omar Calderón\'s protocol.'
  : 'I understand the treatment involves ibogaine following Dr. Omar Calderón\'s protocol.'}
I have been informed of potential risks, benefits, and alternatives.
I understand this treatment is alternative and experimental and not guaranteed to improve my condition.
I release Iboga Wellness Institute, LLC, its staff, contractors, and affiliates from liability for outcomes reasonably associated with treatment, except in cases of gross negligence or willful misconduct.

10. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of Mexico.


11. Entire Agreement
This Agreement contains the entire understanding between Provider and Patient regarding the subject matter and supersedes all prior discussions or agreements. `
}
