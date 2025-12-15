'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SignaturePad } from '@/components/forms/signature-pad'
import { patientIntakeFormSchema, type PatientIntakeFormValues } from '@/lib/validations/patient-intake'
import { submitPatientIntakeForm } from '@/actions/patient-intake.action'
import { toast } from 'sonner'

// Privacy Policy text
const PRIVACY_POLICY_TEXT = `1. Information We Collect
We may collect the following types of information:

Personal Information: Name, date of birth, contact details, address, passport/ID details.
Medical Information: Medical history, medications, test results (EKG, bloodwork, liver function panel), mental health history, and treatment notes.
Payment Information: Billing name, contact, and transaction details (handled by secure payment processors; we do not store full credit card data).
Travel & Stay Information: Arrival and departure details, emergency contact information, and accommodations preferences.

2. Purpose of Collection
Your information is collected solely to:

Evaluate your eligibility and safety for Ibogaine therapy.
Provide appropriate medical supervision and support.
Maintain accurate records of treatment and outcomes.
Communicate logistics, follow-up care, and integration guidance.
Comply with legal and medical obligations.

3. Confidentiality of Medical Records
All medical and personal information is strictly confidential.

Records are stored securely, accessible only to authorized Iboga Wellness Centers staff.
Information will never be shared with third parties without your consent, unless required by law or in cases of medical emergency.

4. Data Security
Electronic records are stored on encrypted, password-protected systems.
Physical documents are secured in locked cabinets with restricted access.
Staff are trained in confidentiality and privacy best practices.

5. Your Rights
You have the right to:

Access your personal and medical records upon request.
Request correction of inaccurate information.
Withdraw consent for future use of your information (with the understanding that certain medical/legal requirements may apply).
Request deletion of your non-medical data after your treatment has concluded.

6. Sharing of Information
We do not sell, trade, or rent your information. Information may only be shared:

With medical staff directly involved in your treatment.
With emergency medical providers, if necessary to protect your health.
If required by Mexican law, international law, or public health authorities.

7. International Guests
As many of our guests travel from the United States, Europe, and abroad:

We adhere to standards similar to HIPAA (U.S.) and GDPR (EU) where applicable.
All cross-border data transfers are handled with strict confidentiality.

8. Retention of Records
Medical records will be kept for a minimum of 5 years, as required by medical best practices in Mexico.
Non-medical information may be securely deleted upon request after your treatment is complete.

9. Contact Information
For questions about this Privacy Policy or to exercise your rights, please contact:
Iboga Wellness Centers

Email: james@ibogawellnesscenters.com
Phone: +1 (800) 604-7294
Website: www.ibogawellnesscenters.com

10. Policy Updates
We may update this Privacy Policy periodically to reflect best practices or changes in legal requirements. Any updates will be communicated directly to guests prior to their treatment.`

// Ibogaine Therapy Consent sections
const IBOGAINE_THERAPY_CONSENT_SECTIONS = [
  {
    heading: 'Consent for Treatment',
    text: `I, hereby referred to as "the Patient", voluntarily consent to participate in the Ibogaine therapy monitored by Iboga Wellness Centers. I understand that this therapy involves Ibogaine, a psychoactive substance derived from the Tabernanthe iboga plant, used in the treatment of substance dependency, PTSD, depression, anxiety, and for personal growth.`,
    field: 'consent_for_treatment'
  },
  {
    heading: 'Risks and Benefits',
    text: `I acknowledge that I have been informed about the potential benefits, risks, and side effects associated with Ibogaine therapy, including but not limited to: changes in heart rate, blood pressure, nausea, hallucinations, emotional and psychological revelations, and in rare cases, severe health complications.`,
    field: 'risks_and_benefits'
  },
  {
    heading: 'Pre-Screening and Health Assessment',
    text: `I confirm that I have undergone a comprehensive pre-screening and health assessment, including an EKG, blood work, and liver panel, conducted by Iboga Wellness Centers' onsite medical doctor. I have disclosed all relevant medical history, current medications, and substance use to ensure my suitability for Ibogaine therapy.`,
    field: 'pre_screening_health_assessment'
  },
  {
    heading: 'Voluntary Participation',
    text: `I acknowledge that my participation in this therapy is entirely voluntary and that I have the right to withdraw my consent and discontinue participation at any time.`,
    field: 'voluntary_participation'
  },
  {
    heading: 'Confidentiality',
    text: `I understand that my privacy will be respected, and all personal and medical information will be handled in accordance with Iboga Wellness Centers' privacy policy and applicable laws regarding patient confidentiality.`,
    field: 'confidentiality'
  },
  {
    heading: 'Liability Release',
    text: `I, the undersigned, formally absolve Iboga Wellness Centers, along with its employees and associated entities, from any claims, liabilities, or damages that may result from my engagement in the Ibogaine therapy program. I acknowledge that Iboga Wellness Centers assumes a supplementary role, offering professional and medical support in the event of an emergency.`,
    field: 'liability_release'
  },
  {
    heading: 'Payment Collection by Iboga Wellness Centers LLC',
    text: `Iboga Wellness Centers LLC oversees payment collection. We handle fees for all aspects of your stay, including medical supervision, program costs, food, accommodations, and any non-medical expenses related to your visit.`,
    field: 'payment_collection_1'
  },
  {
    heading: 'Payment Collection by Iboga Wellness Centers LLC',
    text: `I have read this consent form (or have had it read to me) in its entirety. I have had the opportunity to ask questions, and all my questions have been answered to my satisfaction. I hereby acknowledge my understanding that during the Ibogaine therapy process, Iboga Wellness Centers' role is exclusively to monitor participants to ensure their safety. I agree to adhere to all terms and conditions specified in this consent form.`,
    field: 'payment_collection_2'
  }
]

// Service Agreement text
const SERVICE_AGREEMENT_TEXT = `Between: Iboga Wellness Centers, LLC("Provider") and ("Patient")

1. Purpose of Agreement
This Agreement sets forth the terms and conditions under which Iboga Wellness Centers, LLC will provide wellness and therapeutic services to the Patient. The services are focused on supporting patients' health and well-being while addressing symptoms associated with Parkinson's disease.

2a. Pre-Treatment Services Provided
Provider agrees to deliver the following services prior to the Patient's arrival for Onsite Treatment Services:

Identification of medical screening processes and tests which Provider requires to be administered to the Patient in order for the Provider to Qualify/Approve the Patient for treatment.
Provider to issue a written, electronically signed Treatment Qualification/Approval letter.

2b. Onsite Treatment Services Provided
Provider agrees to deliver the following services for a 14-day period from 10/27-11/10 2025 at clinic in Cozumel Mexico:

Wellness support and therapeutic care.
Administration of ibogaine-based microdosing protocols in accordance with Dr. Omar Calderon's clinical guidelines.
Medical monitoring during treatment, including regular EKG and heart monitoring, vital sign checks, any medicines needed and observation of overall physical condition to ensure safety.
Education, preparation, and integration sessions designed to maximize treatment benefit.
Daily Physical Therapy or Aqua Sessions.
Daily Yoga sessions.
Weekly Massage sessions.
Weekly boat excursion to a sandbar for lunch or dinner if the patient is able.
Daily meals (breakfast, lunch, dinner and meals) provided by our personal Chef and staff.
Transportation to and from the Airport in private transportation and private transportation around the island.
Concierge services available to ensure a 5 star experience for each patient.
Psychologist available to each patient if needed.

2c. Post-Treatment Services Provided
The provider agrees to provide the following services remotely.
Once a week Zoom calls with patients for 3 months following Treatment to assess Post-Treatment condition and collect data needed to assess effectiveness of Treatment over time.
Once a month Zoom calls a Patient for months 4-12 following Treatment to assess Post-Treatment condition and collect data needed to assess effectiveness of Treatment over time.
Assistance with obtaining ibogaine for Patient assuming Provider deems that to be appropriate.

3. Acknowledgment of Treatment Purpose
Patient acknowledges that:

Treatment is being sought for Parkinson's disease and related symptoms.
The services provided are considered alternative and experimental therapy, and outcomes may vary.
No guarantee of improvement or cure is made or implied.

4. Fees and Payment
Payment Schedule:

50% of the total program fee (USD) is due upon issuance of the electronically signed Treatment Qualification/Approval letter.
The remaining 50% (USD) is due no later than three (3) days prior to the patient's scheduled arrival at the clinic.
If paying by card, a 3% processing fee applies to the amount paid by card.

5a. Cancellation & Refund Policy
Cancellations made at least 30 days before your scheduled treatment date are eligible for a full refund of the program fee (minus any transfer or processing costs).
Cancellations made less than 21 days before your scheduled treatment may result in forfeiture of ½ your deposit.
Cancellations made less than 14 days before your scheduled treatment may result in forfeiture of ¾ your deposit.
Cancellations made less than 7 days before your scheduled treatment may result in forfeiture of your full deposit.
Postponements can be arranged at our discretion and based on availability.

5b. Disclaimer Of Liability
I release Iboga Wellness Centers, its medical team, therapists, administrative, and operational staff from all medical, legal, and administrative responsibility for any consequences arising from my decision not to undergo the recommended treatment.
I understand that my decision to refuse services today will not result in a refund, as long as reschedule to commence services with 90 days.
I declare that my decision has been made without coercion, external pressure, or undue influence and that I have fully understood the explanations provided.
I agree not to take legal action against Iboga Wellness Centers, its medical staff, therapists, or administrative team in relation to my decision not to accept the proposed treatment.

6. Risks and Limitations
Patient understands and accepts that:

Ibogaine carries potential physical and psychological risks, including but not limited to: changes in blood pressure, heart rhythm irregularities, nausea, dizziness, emotional distress, and other medical complications.
No guarantee of improvement or cure is provided.
Patients must disclose all relevant medical history, medications, and conditions to the Provider prior to treatment.
Emergency medical care may be required in rare cases, and the patient consents to such care if deemed necessary by the provider.

7. Patient Responsibilities
Patient agrees to:

1 -  Provide full and accurate medical history.
2 - Follow all instructions before, during, and after treatment.
3 - Refrain from alcohol, recreational drugs, and any medications contraindicated with ibogaine, as directed by the Provider.
4 - Immediately report any concerning symptoms to the Provider.


8. Confidentiality
All medical and personal information will be kept confidential in accordance with applicable privacy laws in Mexico.

9. Consent to Treatment
By signing this Agreement, Patient acknowledges and consents to the following:

I voluntarily choose to receive treatment at Iboga Wellness Center in Cozumel Mexico.
I understand the treatment involves ibogaine microdosing following Dr. Omar Calderón’s protocol.
I have been informed of potential risks, benefits, and alternatives.
I understand this treatment is alternative and experimental and not guaranteed to improve my condition.
I release Iboga Wellness Centers, LLC, its staff, contractors, and affiliates from liability for outcomes reasonably associated with treatment, except in cases of gross negligence or willful misconduct.

10. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of Mexico.


11. Entire Agreement
This Agreement contains the entire understanding between Provider and Patient regarding the subject matter and supersedes all prior discussions or agreements. `

// Release Consent text
const RELEASE_CONSENT_TEXT = `Acknowledgment and Consent
I, the undersigned, acknowledge and agree to the following:


Voluntary Participation:

I understand that my participation in Iboga Wellness Centers is entirely voluntary and that I can withdraw at any time.
Medical Conditions:

I have disclosed all known medical conditions, including physical and mental health issues, to the Iboga Wellness Centers staff.
I understand that ibogaine and psilocybin treatments can have significant physiological and psychological effects and may interact with other medications.
Risks:

I am aware of the potential risks associated with ibogaine and psilocybin therapy, including but not limited to cardiac events, psychological distress, and drug interactions.
I acknowledge that these treatments should be conducted under medical supervision and in a controlled environment.
Medical Supervision:

I agree to follow all guidelines and instructions provided by the medical and support staff at Iboga Wellness Centers.
I consent to any necessary medical intervention should an emergency arise during my participation in the retreat.
Confidentiality:

I understand that my personal information and any data collected during the retreat will be kept confidential and used only for the purposes of providing care and treatment.
Waiver of Liability:

I release Iboga Wellness Centers, its owners, staff, and affiliates from any liability, claims, or demands that may arise from my participation in the retreat, including but not limited to personal injury, psychological trauma, or death.
Compliance:

I agree to adhere to the rules and guidelines set forth by Iboga Wellness Centers to ensure a safe and conducive environment for all participants.`

// US States list
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

// Component to format Privacy Policy with styled headings
function PrivacyPolicyContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let bulletItems: string[] = []
  let expectingBullets = false // Track if we're expecting bullet points
  
  function formatContactInfo(line: string): React.ReactNode {
    // Email: james@ibogawellnesscenters.com
    const emailMatch = line.match(/^Email:\s+(.+)$/i)
    if (emailMatch) {
      const email = emailMatch[1]
      return (
        <>
          <span className="font-bold text-gray-900">Email:</span>{' '}
          <a 
            href={`mailto:${email}`}
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {email}
          </a>
        </>
      )
    }
    
    // Phone: +1 (800) 604-7294
    const phoneMatch = line.match(/^Phone:\s+(.+)$/i)
    if (phoneMatch) {
      const phone = phoneMatch[1]
      // Remove spaces, parentheses, and dashes for tel: link
      const phoneNumber = phone.replace(/[\s\(\)\-]/g, '')
      return (
        <>
          <span className="font-bold text-gray-900">Phone:</span>{' '}
          <a 
            href={`tel:${phoneNumber}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {phone}
          </a>
        </>
      )
    }
    
    // Website: www.ibogawellnesscenters.com
    const websiteMatch = line.match(/^Website:\s+(.+)$/i)
    if (websiteMatch) {
      const website = websiteMatch[1]
      // Add http:// if not present
      const websiteUrl = website.startsWith('http://') || website.startsWith('https://') 
        ? website 
        : `https://${website}`
      return (
        <>
          <span className="font-bold text-gray-900">Website:</span>{' '}
          <a 
            href={websiteUrl}
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {website}
          </a>
        </>
      )
    }
    
    // Not a contact info line, return as-is
    return line
  }
  
  function flushBulletList() {
    if (bulletItems.length > 0) {
      elements.push(
        <ul key={`bullets-${elements.length}`} className="list-disc list-inside mb-3 ml-6">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="text-base text-gray-700 leading-relaxed">
              {formatContactInfo(item)}
            </li>
          ))}
        </ul>
      )
      bulletItems = []
      expectingBullets = false
    }
  }
  
  function isBulletPoint(line: string): boolean {
    if (!line) return false
    // Not a numbered heading
    if (/^\d+\.\s+/.test(line)) return false
    // Contact info format: "Email: ...", "Phone: ...", "Website: ..."
    if (/^(Email|Phone|Website):\s+.+/.test(line)) return true
    // Standard bullet: starts with capital, ends with period, no colon in middle
    if (/^[A-Z][^:]*\.$/.test(line)) return true
    // Lines starting with specific patterns that are bullets
    if (/^(With|Access|Request|We|All|Medical|Non-medical|Records|Information|Electronic|Physical|Staff)/.test(line) && line.endsWith('.')) return true
    return false
  }
  
  function isIntroLine(line: string): boolean {
    // Lines that indicate bullets are coming
    return line.endsWith(':') || line.endsWith('to:') || line.endsWith('abroad:')
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const prevNonEmptyLine = (() => {
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j].trim()
        if (prev) return prev
      }
      return ''
    })()
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : ''
    const nextNonEmptyLine = (() => {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next) return next
      }
      return ''
    })()
    
    // Check if line is a numbered heading (e.g., "1. Information We Collect")
    if (/^\d+\.\s+/.test(line)) {
      flushBulletList()
      expectingBullets = false
      elements.push(
        <h3 key={i} className="text-lg font-bold text-gray-900 mt-6 mb-3 first:mt-0">
          {line}
        </h3>
      )
    } 
    // Check if line is contact info (Email, Phone, Website) - add to bullet list if next line is also contact info
    else if (/^(Email|Phone|Website):\s+.+/.test(line)) {
      // Check if next non-empty line is also contact info - if so, treat as bullet list
      if (/^(Email|Phone|Website):\s+.+/.test(nextNonEmptyLine)) {
        bulletItems.push(line)
        expectingBullets = true
      } else {
        // Single contact info or last in list - flush any existing bullets and render
        if (bulletItems.length > 0) {
          bulletItems.push(line)
          flushBulletList()
        } else {
          // Single contact info line
          flushBulletList()
          elements.push(
            <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
              {formatContactInfo(line)}
            </p>
          )
        }
      }
    }
    // Check if line is a subheading with content (e.g., "Personal Information: Name, date...")
    else if (/^[A-Z][^:]+:\s+.+/.test(line) && !isIntroLine(line)) {
      flushBulletList()
      expectingBullets = false
      // Split subheading and content
      const match = line.match(/^([^:]+):\s+(.+)/)
      if (match) {
        const [, subheading, content] = match
        elements.push(
          <ul key={i} className="list-disc list-inside mb-3 ml-6">
            <li className="text-base text-gray-700 leading-relaxed">
              <span className="font-bold text-gray-900">{subheading}:</span> {content}
            </li>
          </ul>
        )
      } else {
        elements.push(
          <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
            {line}
          </p>
        )
      }
    }
    // Check if line ends with ":" - this indicates bullet points are coming
    else if (line && isIntroLine(line)) {
      flushBulletList()
      expectingBullets = true
      elements.push(
        <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    }
    // Check if line is a bullet point
    // Add to bullet list if:
    // 1. We're expecting bullets (after a line ending with ":")
    // 2. We already have bullets collected (continuation of a list)
    // 3. The next non-empty line is also a bullet (detecting start of a new list)
    else if (line && isBulletPoint(line)) {
      if (expectingBullets || bulletItems.length > 0 || isBulletPoint(nextNonEmptyLine)) {
        bulletItems.push(line)
        expectingBullets = true
      } else {
        // Single bullet point, treat as regular text
        flushBulletList()
        elements.push(
          <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
            {line}
          </p>
        )
      }
    }
    else if (line) {
      // If we have bullets and this line doesn't look like a bullet, flush them
      if (bulletItems.length > 0) {
        flushBulletList()
      }
      expectingBullets = false
      // Regular text
      elements.push(
        <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    } else {
      // Empty line - flush bullets if we have any and next line is not a bullet
      if (bulletItems.length > 0 && !isBulletPoint(nextNonEmptyLine)) {
        flushBulletList()
      } else if (bulletItems.length === 0) {
        elements.push(<div key={i} className="mb-2" />)
      }
    }
  }
  
  // Flush any remaining bullets
  flushBulletList()
  
  return <div>{elements}</div>
}

// Component to format Service Agreement with styled headings
function ServiceAgreementContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let bulletItems: string[] = []
  let numberedItems: string[] = []
  let expectingBullets = false
  let expectingNumbered = false
  
  function flushBulletList() {
    if (bulletItems.length > 0) {
      elements.push(
        <ul key={`bullets-${elements.length}`} className="list-disc list-inside mb-3 ml-6">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="text-base text-gray-700 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )
      bulletItems = []
      expectingBullets = false
    }
  }
  
  function flushNumberedList() {
    if (numberedItems.length > 0) {
      elements.push(
        <ol key={`numbered-${elements.length}`} className="list-decimal list-inside mb-3 ml-6">
          {numberedItems.map((item, idx) => {
            // Remove the number prefix (e.g., "1. " or "2. ") from the item
            const text = item.replace(/^\d+\.\s+/, '')
            return (
              <li key={idx} className="text-base text-gray-700 leading-relaxed">
                {text}
              </li>
            )
          })}
        </ol>
      )
      numberedItems = []
      expectingNumbered = false
    }
  }
  
  function isNumberedListItem(line: string): boolean {
    if (!line) return false
    // Check if line starts with a number followed by period and space (e.g., "1. ", "2. ")
    // Section headings are typically title case with multiple capitalized words
    // Numbered list items are usually sentences that start with a verb or action word
    const match = line.match(/^(\d+)\.\s+(.+)$/)
    if (!match) return false
    const [, number, text] = match
    // Section headings with letter after number (2a., 5b.) are always headings
    if (/^\d+[a-z]\.\s+/.test(line)) return false
    // Section headings typically have title case (multiple capitalized words like "Acknowledgment of Treatment Purpose")
    // Check if text has multiple capitalized words (title case pattern)
    const titleCaseWords = text.match(/\b[A-Z][a-z]+\b/g) || []
    if (titleCaseWords.length >= 2) return false // Likely a section heading (e.g., "Acknowledgment of Treatment Purpose")
    // If text is very short (1-2 words), it's likely a section heading
    const wordCount = text.trim().split(/\s+/).length
    if (wordCount <= 2) return false // Likely a section heading
    // Otherwise, it's a numbered list item (usually starts with a verb like "Provide", "Follow", etc.)
    return true
  }
  
  function isBulletPoint(line: string): boolean {
    if (!line) return false
    // Not a numbered heading
    if (/^\d+[a-z]?\.\s+/.test(line)) return false
    // Not a header line
    if (/^Between:/.test(line)) return false
    // Bullet points: start with capital letter, end with period
    if (/^[A-Z][^:]*\.$/.test(line)) return true
    // Lines with colons in middle but still bullets (e.g., "Ibogaine carries... including but not limited to:")
    if (/^(Ibogaine|No guarantee|Patients|Emergency)/.test(line) && line.endsWith('.')) return true
    // Lines starting with specific patterns that are bullets
    if (/^(Identification|Provider|Cancellations|Postponements|I release|I understand|I declare|I agree|I voluntarily|I have been|I understand this treatment)/.test(line) && line.endsWith('.')) return true
    return false
  }
  
  function isIntroLine(line: string): boolean {
    return line.endsWith(':') || (line.toLowerCase().includes('following services') && !line.toLowerCase().includes('remotely')) || line.toLowerCase().includes('acknowledges and consents to the following')
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextNonEmptyLine = (() => {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next) return next
      }
      return ''
    })()
    
    // Check if line is a numbered heading (e.g., "1. Purpose" or "2a. Pre-Treatment")
    if (/^\d+[a-z]?\.\s+/.test(line) && !isNumberedListItem(line)) {
      flushBulletList()
      flushNumberedList()
      expectingBullets = false
      expectingNumbered = false
      elements.push(
        <h3 key={i} className="text-lg font-bold text-gray-900 mt-6 mb-3 first:mt-0">
          {line}
        </h3>
      )
    }
    // Check if line is header (Between: ...)
    else if (/^Between:/.test(line)) {
      flushBulletList()
      flushNumberedList()
      elements.push(
        <p key={i} className="mb-4 text-base text-gray-700 leading-relaxed font-medium">
          {line}
        </p>
      )
    }
    // Check if line ends with ":" - indicates bullet points or numbered list are coming (make it bold)
    else if (line && isIntroLine(line)) {
      flushBulletList()
      flushNumberedList()
      // Check if next line is a numbered list item
      if (isNumberedListItem(nextNonEmptyLine)) {
        expectingNumbered = true
      } else {
        expectingBullets = true
      }
      elements.push(
        <p key={i} className="mb-3 text-base font-bold text-gray-900 leading-relaxed">
          {line}
        </p>
      )
    }
    // Check if line is a numbered list item
    else if (line && isNumberedListItem(line) && (expectingNumbered || numberedItems.length > 0 || isNumberedListItem(nextNonEmptyLine))) {
      numberedItems.push(line)
      expectingNumbered = true
    }
    // Check if line is a bullet point
    else if (line && isBulletPoint(line) && (expectingBullets || bulletItems.length > 0 || isBulletPoint(nextNonEmptyLine))) {
      bulletItems.push(line)
      expectingBullets = true
    }
    else if (line) {
      if (bulletItems.length > 0) {
        flushBulletList()
      }
      if (numberedItems.length > 0) {
        flushNumberedList()
      }
      expectingBullets = false
      expectingNumbered = false
      // Regular text
      elements.push(
        <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    } else {
      // Empty line - flush lists if we have any and next line is not a list item
      if (bulletItems.length > 0 && !isBulletPoint(nextNonEmptyLine) && !isNumberedListItem(nextNonEmptyLine)) {
        flushBulletList()
      }
      if (numberedItems.length > 0 && !isNumberedListItem(nextNonEmptyLine) && !isBulletPoint(nextNonEmptyLine)) {
        flushNumberedList()
      }
      if (bulletItems.length === 0 && numberedItems.length === 0) {
        elements.push(<div key={i} className="mb-2" />)
      }
    }
  }
  
  // Flush any remaining bullets and numbered lists
  flushBulletList()
  flushNumberedList()
  
  return <div>{elements}</div>
}

// Component to format Release Consent with styled headings
function ReleaseConsentContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let bulletItems: string[] = []
  let expectingBullets = false
  
  function flushBulletList() {
    if (bulletItems.length > 0) {
      elements.push(
        <ul key={`bullets-${elements.length}`} className="list-disc list-inside mb-3 ml-6">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="text-base text-gray-700 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )
      bulletItems = []
      expectingBullets = false
    }
  }
  
  function isBulletPoint(line: string): boolean {
    if (!line) return false
    // Bullet points: start with capital letter, end with period
    if (/^[A-Z][^:]*\.$/.test(line)) return true
    // Lines starting with "I" that are statements
    if (/^I (understand|acknowledge|agree|release|declare)/.test(line) && line.endsWith('.')) return true
    return false
  }
  
  function isIntroLine(line: string): boolean {
    return line.endsWith(':') || line.toLowerCase().includes('acknowledge and agree to the following')
  }
  
  function isSubheading(line: string): boolean {
    // Subheadings like "Voluntary Participation:" that end with colon
    return /^[A-Z][^:]+:\s*$/.test(line)
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextNonEmptyLine = (() => {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next) return next
      }
      return ''
    })()
    
    // Check if line is main heading (Iboga Wellness Centers Release Consent)
    if (line === 'Iboga Wellness Centers Release Consent') {
      flushBulletList()
      elements.push(
        <h2 key={i} className="text-xl font-bold text-gray-900 mb-4">
          {line}
        </h2>
      )
    }
    // Check if line is subheading (Acknowledgment and Consent)
    else if (line === 'Acknowledgment and Consent') {
      flushBulletList()
      elements.push(
        <h3 key={i} className="text-lg font-bold text-gray-900 mt-6 mb-3">
          {line}
        </h3>
      )
    }
    // Check if line is a section subheading (e.g., "Voluntary Participation:")
    else if (line && isSubheading(line)) {
      flushBulletList()
      expectingBullets = true
      elements.push(
        <h4 key={i} className="text-base font-bold text-gray-900 mt-4 mb-2">
          {line}
        </h4>
      )
    }
    // Check if line ends with ":" - indicates bullet points are coming (make it bold)
    else if (line && isIntroLine(line)) {
      flushBulletList()
      expectingBullets = true
      elements.push(
        <p key={i} className="mb-3 text-base font-bold text-gray-900 leading-relaxed">
          {line}
        </p>
      )
    }
    // Check if line is a bullet point
    else if (line && isBulletPoint(line) && (expectingBullets || bulletItems.length > 0 || isBulletPoint(nextNonEmptyLine))) {
      bulletItems.push(line)
      expectingBullets = true
    }
    else if (line) {
      if (bulletItems.length > 0) {
        flushBulletList()
      }
      expectingBullets = false
      // Regular text
      elements.push(
        <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    } else {
      // Empty line - flush bullets if we have any and next line is not a bullet
      if (bulletItems.length > 0 && !isBulletPoint(nextNonEmptyLine)) {
        flushBulletList()
      } else if (bulletItems.length === 0) {
        elements.push(<div key={i} className="mb-2" />)
      }
    }
  }
  
  // Flush any remaining bullets
  flushBulletList()
  
  return <div>{elements}</div>
}

export function PatientIntakeForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [signature, setSignature] = useState('')
  
  const form = useForm<PatientIntakeFormValues>({
    resolver: zodResolver(patientIntakeFormSchema),
    defaultValues: {
      privacy_policy_accepted: false,
      consent_for_treatment: false,
      risks_and_benefits: false,
      pre_screening_health_assessment: false,
      voluntary_participation: false,
      confidentiality: false,
      liability_release: false,
      payment_collection_1: false,
      payment_collection_2: false,
      ibogaine_therapy_consent_accepted: false,
      service_agreement_accepted: false,
      release_consent_accepted: false,
      final_acknowledgment_accepted: false,
      signature_data: '',
      signature_date: '',
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(data: PatientIntakeFormValues) {
    setIsLoading(true)
    
    try {
      // Format signature date
      const today = new Date().toISOString().split('T')[0]
      const result = await submitPatientIntakeForm({
        ...data,
        signature_date: today,
      })
      
      if (result?.data?.success) {
        toast.success('Form submitted successfully!')
        form.reset()
        setCurrentStep(1)
        setSignature('')
      } else if (result?.serverError) {
        toast.error(result.serverError)
      } else if (result?.data?.error) {
        toast.error(result.data.error)
      } else {
        toast.error('Failed to submit form')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  function formatPhoneNumber(value: string): string {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  function handlePhoneChange(field: 'phone_number' | 'emergency_contact_phone', value: string) {
    const formatted = formatPhoneNumber(value)
    form.setValue(field, formatted)
  }


  const totalSteps = 7

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Patient Opportunity Form
        </h1>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="first_name" className="text-base font-medium">
                    Patient Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Input
                        id="first_name"
                        placeholder="First Name"
                        {...form.register('first_name')}
                        className="h-12"
                      />
                      {form.formState.errors.first_name && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.first_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        id="last_name"
                        placeholder="Last Name"
                        {...form.register('last_name')}
                        className="h-12"
                      />
                      {form.formState.errors.last_name && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.last_name.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-base font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    {...form.register('email')}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone_number" className="text-base font-medium">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="(000) 000-0000"
                    {...form.register('phone_number')}
                    onChange={(e) => handlePhoneChange('phone_number', e.target.value)}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.phone_number && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone_number.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_of_birth" className="text-base font-medium">
                      Date of Birth
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="date_of_birth"
                        type="date"
                        {...form.register('date_of_birth')}
                        className="h-12"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-2 block">Gender</Label>
                    <RadioGroup
                      value={form.watch('gender') || ''}
                      onValueChange={(value) => form.setValue('gender', value as any)}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-base font-medium">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    placeholder="Street Address"
                    {...form.register('address')}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      placeholder="City"
                      {...form.register('city')}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Select
                      value={form.watch('state') || ''}
                      onValueChange={(value) => form.setValue('state', value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Please Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Input
                    placeholder="Zip Code"
                    {...form.register('zip_code')}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Emergency Contact Information</h2>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">
                    Emergency Contact Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Input
                        placeholder="First Name"
                        {...form.register('emergency_contact_first_name')}
                        className="h-12"
                      />
                      {form.formState.errors.emergency_contact_first_name && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_first_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="Last Name"
                        {...form.register('emergency_contact_last_name')}
                        className="h-12"
                      />
                      {form.formState.errors.emergency_contact_last_name && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_last_name.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_email" className="text-base font-medium">Email</Label>
                    <Input
                      id="emergency_contact_email"
                      type="email"
                      placeholder="Email"
                      {...form.register('emergency_contact_email')}
                      className="h-12 mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone" className="text-base font-medium">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      placeholder="(000) 000-0000"
                      {...form.register('emergency_contact_phone')}
                      onChange={(e) => handlePhoneChange('emergency_contact_phone', e.target.value)}
                      className="h-12 mt-2"
                    />
                    {form.formState.errors.emergency_contact_phone && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_address" className="text-base font-medium">Address</Label>
                    <Input
                      id="emergency_contact_address"
                      placeholder="Address"
                      {...form.register('emergency_contact_address')}
                      className="h-12 mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_relationship" className="text-base font-medium">Relationship</Label>
                    <Input
                      id="emergency_contact_relationship"
                      placeholder="Relationship"
                      {...form.register('emergency_contact_relationship')}
                      className="h-12 mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Privacy Policy */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Privacy Policy</h2>
              
              <div className="bg-gray-50 p-8 rounded-lg">
                <div className="prose prose-sm max-w-none">
                  <PrivacyPolicyContent text={PRIVACY_POLICY_TEXT} />
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Label className="text-base font-semibold text-gray-900">
                  Privacy Policy Acceptance <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="privacy_policy"
                    checked={form.watch('privacy_policy_accepted')}
                    onCheckedChange={(checked) => form.setValue('privacy_policy_accepted', checked === true)}
                  />
                  <Label htmlFor="privacy_policy" className="text-base text-gray-700 leading-relaxed cursor-pointer">
                    I confirm that I have read and agree to the Iboga Wellness Centers Privacy Policy, and consent to the collection and use of my information as described.
                  </Label>
                </div>
                {form.formState.errors.privacy_policy_accepted && (
                  <p className="text-sm text-red-500">{form.formState.errors.privacy_policy_accepted.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Ibogaine Therapy Consent */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Ibogaine Therapy Consent</h2>
              
              <div className="space-y-6">
                {IBOGAINE_THERAPY_CONSENT_SECTIONS.map((section, index) => (
                  <div key={section.field} className="bg-gray-50 p-6 rounded-lg space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.heading} <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-base text-gray-700 leading-relaxed">
                      {section.text}
                    </p>
                    <div className="flex items-start space-x-3 pt-2">
                      <Checkbox
                        id={section.field}
                        checked={form.watch(section.field as any) as boolean}
                        onCheckedChange={(checked) => {
                          form.setValue(section.field as any, checked === true)
                          // Update main consent if all sections are accepted
                          const allAccepted = IBOGAINE_THERAPY_CONSENT_SECTIONS.every(s => {
                            const value = form.watch(s.field as any) as boolean
                            return s.field === section.field ? checked === true : value === true
                          })
                          form.setValue('ibogaine_therapy_consent_accepted', allAccepted)
                        }}
                      />
                      <Label htmlFor={section.field} className="text-base font-medium text-gray-900 cursor-pointer">
                        I acknowledge and accept
                      </Label>
                    </div>
                    {(() => {
                      const error = form.formState.errors[section.field as keyof typeof form.formState.errors]
                      return error ? (
                        <p className="text-sm text-red-500">
                          {error.message}
                        </p>
                      ) : null
                    })()}
                  </div>
                ))}
              </div>
              
              {form.formState.errors.ibogaine_therapy_consent_accepted && (
                <p className="text-sm text-red-500">{form.formState.errors.ibogaine_therapy_consent_accepted.message}</p>
              )}
            </div>
          )}

          {/* Step 5: Service Agreement */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Service Agreement</h2>
              
              <div className="bg-gray-50 p-8 rounded-lg">
                <div className="prose prose-sm max-w-none">
                  <ServiceAgreementContent text={SERVICE_AGREEMENT_TEXT} />
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Label className="text-base font-semibold text-gray-900">
                  Service Agreement Acceptance <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="service_agreement"
                    checked={form.watch('service_agreement_accepted')}
                    onCheckedChange={(checked) => form.setValue('service_agreement_accepted', checked === true)}
                  />
                  <Label htmlFor="service_agreement" className="text-base text-gray-700 leading-relaxed cursor-pointer">
                    I confirm that I have read, understood, and agree to the terms outlined in the Service Agreement between Iboga Wellness Centers, LLC ("Provider") and myself ("Patient"), and consent to receive the described wellness and therapeutic services under these conditions.
                  </Label>
                </div>
                {form.formState.errors.service_agreement_accepted && (
                  <p className="text-sm text-red-500">{form.formState.errors.service_agreement_accepted.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Release Consent */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Iboga Wellness Centers Release Consent</h2>
              
              <div className="bg-gray-50 p-8 rounded-lg">
                <div className="prose prose-sm max-w-none">
                  <ReleaseConsentContent text={RELEASE_CONSENT_TEXT} />
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Label className="text-base font-semibold text-gray-900">
                  Consent to Treatment Acceptance <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="release_consent"
                    checked={form.watch('release_consent_accepted')}
                    onCheckedChange={(checked) => form.setValue('release_consent_accepted', checked === true)}
                  />
                  <Label htmlFor="release_consent" className="text-base text-gray-700 leading-relaxed cursor-pointer">
                    I have read and understood the above information. I acknowledge that I have had the opportunity to ask questions and that my questions have been answered to my satisfaction. I voluntarily agree to participate in Iboga Wellness Centers and consent to the administration of ibogaine and/or psilocybin therapies as outlined.
                  </Label>
                </div>
                {form.formState.errors.release_consent_accepted && (
                  <p className="text-sm text-red-500">{form.formState.errors.release_consent_accepted.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 7: Patient Acknowledgment & Signature */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Patient Acknowledgment & Signature</h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="final_acknowledgment"
                    checked={form.watch('final_acknowledgment_accepted')}
                    onCheckedChange={(checked) => form.setValue('final_acknowledgment_accepted', checked === true)}
                  />
                  <Label htmlFor="final_acknowledgment" className="text-base font-medium cursor-pointer">
                    Final Acknowledgment & Acceptance <span className="text-red-500">*</span>
                  </Label>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  I confirm that all the information I have provided in this form is true and complete to the best of my knowledge, and that I have read, understood, and accepted all sections, including the Privacy Policy, Ibogaine Therapy Consent, Service Agreement, and Release Consent of Iboga Wellness Centers.
                </p>
                {form.formState.errors.final_acknowledgment_accepted && (
                  <p className="text-sm text-red-500 ml-7">{form.formState.errors.final_acknowledgment_accepted.message}</p>
                )}

                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div>
                    <Label htmlFor="signature" className="text-base font-medium">
                      Signature <span className="text-red-500">*</span>
                    </Label>
                    <div className="mt-2">
                      <SignaturePad
                        value={signature}
                        onChange={(signatureData) => {
                          setSignature(signatureData)
                          form.setValue('signature_data', signatureData)
                        }}
                        onClear={() => {
                          setSignature('')
                          form.setValue('signature_data', '')
                        }}
                      />
                    </div>
                    {form.formState.errors.signature_data && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.signature_data.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="signature_date" className="text-base font-medium">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="signature_date"
                        type="date"
                        {...form.register('signature_date')}
                        className="h-12"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    {form.formState.errors.signature_date && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.signature_date.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1 || isLoading}
            >
              Back
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={() => {
                  // Validate current step before proceeding
                  const fieldsToValidate = getFieldsForStep(currentStep)
                  form.trigger(fieldsToValidate as any).then((isValid) => {
                    if (isValid) {
                      setCurrentStep(currentStep + 1)
                    }
                  })
                }}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function getFieldsForStep(step: number): string[] {
  switch (step) {
    case 1:
      return ['first_name', 'last_name', 'email', 'phone_number', 'address']
    case 2:
      return ['emergency_contact_first_name', 'emergency_contact_last_name', 'emergency_contact_phone']
    case 3:
      return ['privacy_policy_accepted']
    case 4:
      return ['ibogaine_therapy_consent_accepted']
    case 5:
      return ['service_agreement_accepted']
    case 6:
      return ['release_consent_accepted']
    case 7:
      return ['final_acknowledgment_accepted', 'signature_data', 'signature_date']
    default:
      return []
  }
}

