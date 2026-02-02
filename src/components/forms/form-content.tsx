'use client'

import React from 'react'

// Privacy Policy text
export const PRIVACY_POLICY_TEXT = `1. Information We Collect
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

Records are stored securely, accessible only to authorized Iboga Wellness Institute staff.
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
Iboga Wellness Institute

Email: contactus@theibogainstitute.org
Phone: +1 (800) 604-7294
Website: https://theibogainstitute.org/

10. Policy Updates
We may update this Privacy Policy periodically to reflect best practices or changes in legal requirements. Any updates will be communicated directly to guests prior to their treatment.`

// Ibogaine Therapy Consent sections
export const IBOGAINE_THERAPY_CONSENT_SECTIONS = [
  {
    heading: 'Consent for Treatment',
    text: `I, hereby referred to as "the Patient", voluntarily consent to participate in the Ibogaine therapy monitored by Iboga Wellness Institute. I understand that this therapy involves Ibogaine, a psychoactive substance derived from the Tabernanthe iboga plant, used in the treatment of substance dependency, PTSD, depression, anxiety, and for personal growth.`,
    field: 'consent_for_treatment'
  },
  {
    heading: 'Risks and Benefits',
    text: `I acknowledge that I have been informed about the potential benefits, risks, and side effects associated with Ibogaine therapy, including but not limited to: changes in heart rate, blood pressure, nausea, hallucinations, emotional and psychological revelations, and in rare cases, severe health complications.`,
    field: 'risks_and_benefits'
  },
  {
    heading: 'Pre-Screening and Health Assessment',
    text: `I confirm that I have undergone a comprehensive pre-screening and health assessment, including an EKG, blood work, and liver panel, conducted by Iboga Wellness Institute's onsite medical doctor. I have disclosed all relevant medical history, current medications, and substance use to ensure my suitability for Ibogaine therapy.`,
    field: 'pre_screening_health_assessment'
  },
  {
    heading: 'Voluntary Participation',
    text: `I acknowledge that my participation in this therapy is entirely voluntary and that I have the right to withdraw my consent and discontinue participation at any time.`,
    field: 'voluntary_participation'
  },
  {
    heading: 'Confidentiality',
    text: `I understand that my privacy will be respected, and all personal and medical information will be handled in accordance with Iboga Wellness Institute's privacy policy and applicable laws regarding patient confidentiality.`,
    field: 'confidentiality'
  },
  {
    heading: 'Liability Release',
    text: `I, the undersigned, formally absolve Iboga Wellness Institute, along with its employees and associated entities, from any claims, liabilities, or damages that may result from my engagement in the Ibogaine therapy program. I acknowledge that Iboga Wellness Institute assumes a supplementary role, offering professional and medical support in the event of an emergency.`,
    field: 'liability_release'
  },
  {
    heading: 'Payment Collection by Iboga Wellness Institute LLC',
    text: `Iboga Wellness Institute LLC oversees payment collection. We handle fees for all aspects of your stay, including medical supervision, program costs, food, accommodations, and any non-medical expenses related to your visit.`,
    field: 'payment_collection_1'
  },
  {
    heading: 'Payment Collection by Iboga Wellness Institute LLC',
    text: `I have read this consent form (or have had it read to me) in its entirety. I have had the opportunity to ask questions, and all my questions have been answered to my satisfaction. I hereby acknowledge my understanding that during the Ibogaine therapy process, Iboga Wellness Institute's role is exclusively to monitor participants to ensure their safety. I agree to adhere to all terms and conditions specified in this consent form.`,
    field: 'payment_collection_2'
  }
]

// Agreement template functions are now in @/lib/agreement-templates (no 'use client')
// Import from there for server-side usage, or use the imports below for client components.
import { getServiceAgreementText } from '@/lib/agreement-templates'

// Default Service Agreement text (for backward compatibility)
export const SERVICE_AGREEMENT_TEXT = getServiceAgreementText({
  programType: 'neurological',
  totalProgramFee: 0,
  depositPercentage: 50,
  depositAmount: 0,
  remainingBalance: 0,
  numberOfDays: 14,
})

// Release Consent text
export const RELEASE_CONSENT_TEXT = `Acknowledgment and Consent
I, the undersigned, acknowledge and agree to the following:


Voluntary Participation:

I understand that my participation in Iboga Wellness Institute is entirely voluntary and that I can withdraw at any time.
Medical Conditions:

I have disclosed all known medical conditions, including physical and mental health issues, to the Iboga Wellness Institute staff.
I understand that ibogaine and psilocybin treatments can have significant physiological and psychological effects and may interact with other medications.
Risks:

I am aware of the potential risks associated with ibogaine and psilocybin therapy, including but not limited to cardiac events, psychological distress, and drug interactions.
I acknowledge that these treatments should be conducted under medical supervision and in a controlled environment.
Medical Supervision:

I agree to follow all guidelines and instructions provided by the medical and support staff at Iboga Wellness Institute.
I consent to any necessary medical intervention should an emergency arise during my participation in the retreat.
Confidentiality:

I understand that my personal information and any data collected during the retreat will be kept confidential and used only for the purposes of providing care and treatment.
Waiver of Liability:

I release Iboga Wellness Institute, its owners, staff, and affiliates from any liability, claims, or demands that may arise from my participation in the retreat, including but not limited to personal injury, psychological trauma, or death.
Compliance:

I agree to adhere to the rules and guidelines set forth by Iboga Wellness Institute to ensure a safe and conducive environment for all participants.`

// Component to format Privacy Policy with styled headings
export function PrivacyPolicyContent({ text }: { text: string }) {
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
  
  function isNumberedHeading(line: string): boolean {
    return /^\d+\.\s+[A-Z]/.test(line)
  }
  
  function isSubheading(line: string): boolean {
    // Exclude information type lines that should not be bold
    const infoTypePatterns = [
      /^Personal Information:/,
      /^Medical Information:/,
      /^Payment Information:/,
      /^Travel & Stay Information:/
    ]
    
    // If it matches an information type pattern, don't treat it as a subheading
    if (infoTypePatterns.some(pattern => pattern.test(line))) {
      return false
    }
    
    return /^[A-Z][^:]+:\s+.+/.test(line)
  }
  
  function isBulletPoint(line: string): boolean {
    if (!line) return false
    // Lines that are complete sentences ending with period
    if (/^[A-Z][^:]*\.$/.test(line)) return true
    return false
  }
  
  function formatContactInfo(line: string): React.ReactNode {
    const emailMatch = line.match(/Email:\s*([^\s]+)/)
    const phoneMatch = line.match(/Phone:\s*([^\n]+)/)
    const websiteMatch = line.match(/Website:\s*([^\s]+)/)
    
    if (emailMatch || phoneMatch || websiteMatch) {
      const parts: React.ReactNode[] = []
      let lastIndex = 0
      const fullMatch = line.match(/(Email|Phone|Website):\s*([^\s\n]+)/g)
      
      if (fullMatch) {
        fullMatch.forEach((match) => {
          const beforeMatch = line.substring(lastIndex, line.indexOf(match))
          if (beforeMatch) parts.push(beforeMatch)
          
          if (match.includes('Email:')) {
            const email = match.replace('Email:', '').trim()
            parts.push(
              <a key={email} href={`mailto:${email}`} className="text-blue-600 underline">
                {email}
              </a>
            )
          } else if (match.includes('Phone:')) {
            const phone = match.replace('Phone:', '').trim()
            parts.push(
              <a key={phone} href={`tel:${phone}`} className="text-blue-600 underline">
                {phone}
              </a>
            )
          } else if (match.includes('Website:')) {
            const website = match.replace('Website:', '').trim()
            const url = website.startsWith('http') ? website : `https://${website}`
            parts.push(
              <a key={website} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                {website}
              </a>
            )
          }
          
          lastIndex = line.indexOf(match) + match.length
        })
        const afterMatch = line.substring(lastIndex)
        if (afterMatch) parts.push(afterMatch)
        return <span>{parts}</span>
      }
    }
    return line
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextNonEmptyLine = lines.slice(i + 1).find(l => l.trim())
    
    if (isNumberedHeading(line)) {
      flushBulletList()
      elements.push(
        <h3 key={i} className="text-lg font-bold mb-3 mt-4">
          {line}
        </h3>
      )
    } else if (isSubheading(line)) {
      flushBulletList()
      elements.push(
        <li key={i} className="font-bold mb-2 ml-6">
          {line}
        </li>
      )
    } else if (line && isBulletPoint(line)) {
      if (expectingBullets || bulletItems.length > 0 || (nextNonEmptyLine && isBulletPoint(nextNonEmptyLine))) {
        bulletItems.push(line)
        expectingBullets = true
      } else {
        flushBulletList()
        elements.push(
          <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
            {formatContactInfo(line)}
          </p>
        )
      }
    } else if (line) {
      if (bulletItems.length > 0) {
        flushBulletList()
      }
      expectingBullets = false
      elements.push(
        <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
          {formatContactInfo(line)}
        </p>
      )
    } else {
      if (bulletItems.length > 0 && !isBulletPoint(nextNonEmptyLine || '')) {
        flushBulletList()
      } else if (bulletItems.length === 0) {
        elements.push(<div key={i} className="mb-2" />)
      }
    }
  }
  
  flushBulletList()
  
  return <div style={{ width: '100%', display: 'block', visibility: 'visible' }}>{elements}</div>
}

// Component to format Service Agreement with styled headings
export function ServiceAgreementContent({ text }: { text: string }) {
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
    const trimmed = line.trim()
    const numberedPattern = /^\d+\s*-\s+/
    if (numberedPattern.test(trimmed)) return true
    return false
  }
  
  function isNumberedHeading(line: string): boolean {
    if (!line) return false
    const trimmed = line.trim()
    if (/^\d+[a-z]?\.\s+[A-Z]/.test(trimmed)) {
      const words = trimmed.split(/\s+/).length
      return words <= 6
    }
    return false
  }
  
  function isIntroLine(line: string): boolean {
    if (!line) return false
    if (line.endsWith(':')) {
      if (line.toLowerCase().includes('remotely')) return false
      return true
    }
    return false
  }
  
  function isBulletPoint(line: string): boolean {
    if (!line) return false
    if (/^[A-Z][^:]*\.$/.test(line)) return true
    if (/^Ibogaine/.test(line) && line.endsWith('.')) return true
    return false
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextNonEmptyLine = lines.slice(i + 1).find(l => l.trim())
    
    if (isNumberedHeading(line)) {
      flushBulletList()
      flushNumberedList()
      elements.push(
        <h3 key={i} className="text-lg font-bold mb-3 mt-4">
          {line}
        </h3>
      )
    } else if (isIntroLine(line)) {
      flushBulletList()
      flushNumberedList()
      expectingBullets = true
      elements.push(
        <p key={i} className="mb-3 text-base font-bold text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    } else if (isNumberedListItem(line)) {
      flushBulletList()
      numberedItems.push(line)
      expectingNumbered = true
    } else if (line && isBulletPoint(line)) {
      if (expectingBullets || bulletItems.length > 0 || (nextNonEmptyLine && isBulletPoint(nextNonEmptyLine))) {
        flushNumberedList()
        bulletItems.push(line)
        expectingBullets = true
      } else {
        flushBulletList()
        flushNumberedList()
        elements.push(
          <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
            {line}
          </p>
        )
      }
    } else if (line) {
      flushBulletList()
      flushNumberedList()
      elements.push(
        <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    } else {
      if (bulletItems.length > 0 && !isBulletPoint(nextNonEmptyLine || '')) {
        flushBulletList()
      }
      if (numberedItems.length > 0 && !isNumberedListItem(nextNonEmptyLine || '')) {
        flushNumberedList()
      }
      if (bulletItems.length === 0 && numberedItems.length === 0) {
        elements.push(<div key={i} className="mb-2" />)
      }
    }
  }
  
  flushBulletList()
  flushNumberedList()
  
  return <div>{elements}</div>
}

// Component to format Release Consent with styled headings
export function ReleaseConsentContent({ text }: { text: string }) {
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
    if (/^[A-Z][^:]*\.$/.test(line)) return true
    if (/^I (understand|acknowledge|agree|release|declare)/.test(line) && line.endsWith('.')) return true
    return false
  }
  
  function isIntroLine(line: string): boolean {
    return line.endsWith(':') || line.toLowerCase().includes('acknowledge and agree to the following')
  }
  
  function isSubheading(line: string): boolean {
    return /^[A-Z][^:]+:\s*$/.test(line)
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextNonEmptyLine = lines.slice(i + 1).find(l => l.trim())
    
    if (isSubheading(line)) {
      flushBulletList()
      elements.push(
        <h3 key={i} className="text-lg font-bold mb-3 mt-4">
          {line}
        </h3>
      )
    } else if (isIntroLine(line)) {
      flushBulletList()
      expectingBullets = true
      elements.push(
        <p key={i} className="mb-3 text-base font-bold text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    } else if (line && isBulletPoint(line)) {
      if (expectingBullets || bulletItems.length > 0 || (nextNonEmptyLine && isBulletPoint(nextNonEmptyLine))) {
        bulletItems.push(line)
        expectingBullets = true
      } else {
        flushBulletList()
        elements.push(
          <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
            {line}
          </p>
        )
      }
    } else if (line) {
      if (bulletItems.length > 0) {
        flushBulletList()
      }
      expectingBullets = false
      elements.push(
        <p key={i} className="mb-3 text-base text-gray-700 leading-relaxed">
          {line}
        </p>
      )
    } else {
      if (bulletItems.length > 0 && !isBulletPoint(nextNonEmptyLine || '')) {
        flushBulletList()
      } else if (bulletItems.length === 0) {
        elements.push(<div key={i} className="mb-2" />)
      }
    }
  }
  
  flushBulletList()
  
  return <div>{elements}</div>
}

