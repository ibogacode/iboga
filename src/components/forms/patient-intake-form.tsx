'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { patientIntakeFormSchema, type PatientIntakeFormValues } from '@/lib/validations/patient-intake'
import { submitPatientIntakeForm } from '@/actions/patient-intake.action'
import { getPartialIntakeForm } from '@/actions/partial-intake.action'
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

// Service Agreement text removed - no longer used in the form

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

// Component to format Service Agreement with styled headings (removed - no longer used)
/* function ServiceAgreementContent({ text }: { text: string }) {
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
} */


function PatientIntakeFormContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoadingPartial, setIsLoadingPartial] = useState(!!token)
  const [partialFormId, setPartialFormId] = useState<string | null>(null)
  
  const form = useForm<PatientIntakeFormValues>({
    resolver: zodResolver(patientIntakeFormSchema),
    mode: 'onChange', // Validate on change to show errors immediately
    reValidateMode: 'onChange', // Re-validate on change
    defaultValues: {
      // Form Filler Information
      filled_by: 'self',
      filler_relationship: null,
      filler_first_name: null,
      filler_last_name: null,
      filler_email: null,
      filler_phone: null,
      
      // Program Type
      program_type: undefined,
      
      // Personal Information
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      date_of_birth: null,
      gender: null,
      address: '',
      city: '',
      state: '',
      zip_code: '',
      // Emergency Contact Information
      emergency_contact_first_name: '',
      emergency_contact_last_name: '',
      emergency_contact_email: null,
      emergency_contact_phone: '',
      emergency_contact_address: null,
      emergency_contact_relationship: null,
      // Consent and Agreements
      privacy_policy_accepted: false,
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  // Load partial form data if token is present
  useEffect(() => {
    async function loadPartialForm() {
      if (!token) {
        setIsLoadingPartial(false)
        return
      }

      try {
        const result = await getPartialIntakeForm({ token })
        
        if (result?.data?.success && result.data.data) {
          const partialData = result.data.data
          setPartialFormId(partialData.id)
          
          // Pre-fill filled_by field
          if (partialData.filled_by) {
            form.setValue('filled_by', partialData.filled_by as 'self' | 'someone_else')
          }
          
          // If someone else is filling, prefill their information
          if (partialData.filled_by === 'someone_else') {
            form.setValue('filler_relationship', partialData.filler_relationship || null)
            form.setValue('filler_first_name', partialData.filler_first_name || null)
            form.setValue('filler_last_name', partialData.filler_last_name || null)
            form.setValue('filler_email', partialData.filler_email || null)
            form.setValue('filler_phone', partialData.filler_phone || null)
          }
          
          // Pre-fill patient data (only if patient info exists)
          // When someone else is filling, patient info might be null
          if (partialData.first_name) {
            form.setValue('first_name', partialData.first_name)
          }
          if (partialData.last_name) {
            form.setValue('last_name', partialData.last_name)
          }
          if (partialData.email) {
            form.setValue('email', partialData.email)
          }
          
          if (partialData.mode === 'partial') {
            if (partialData.phone_number) {
              form.setValue('phone_number', partialData.phone_number)
            }
            if (partialData.date_of_birth) {
              const dob = new Date(partialData.date_of_birth)
              form.setValue('date_of_birth', dob.toISOString().split('T')[0])
            }
            if (partialData.gender) {
              form.setValue('gender', partialData.gender as any)
            }
            if (partialData.address) {
              form.setValue('address', partialData.address)
            }
            if (partialData.city) {
              form.setValue('city', partialData.city)
            }
            if (partialData.state) {
              form.setValue('state', partialData.state)
            }
            if (partialData.zip_code) {
              form.setValue('zip_code', partialData.zip_code)
            }
            if (partialData.program_type) {
              form.setValue('program_type', partialData.program_type as any)
            }
            if (partialData.emergency_contact_first_name) {
              form.setValue('emergency_contact_first_name', partialData.emergency_contact_first_name)
            }
            if (partialData.emergency_contact_last_name) {
              form.setValue('emergency_contact_last_name', partialData.emergency_contact_last_name)
            }
            if (partialData.emergency_contact_email) {
              form.setValue('emergency_contact_email', partialData.emergency_contact_email)
            }
            if (partialData.emergency_contact_phone) {
              form.setValue('emergency_contact_phone', partialData.emergency_contact_phone)
            }
            if (partialData.emergency_contact_address) {
              form.setValue('emergency_contact_address', partialData.emergency_contact_address)
            }
            if (partialData.emergency_contact_relationship) {
              form.setValue('emergency_contact_relationship', partialData.emergency_contact_relationship)
            }
          }
        } else {
          toast.error(result?.serverError || 'Invalid or expired form link')
        }
      } catch (error) {
        console.error('Error loading partial form:', error)
        toast.error('Failed to load form data')
      } finally {
        setIsLoadingPartial(false)
      }
    }

    loadPartialForm()
  }, [token, form])

  async function onSubmit(data: PatientIntakeFormValues) {
    setIsLoading(true)
    
    try {
      const result = await submitPatientIntakeForm({
        ...data,
        partialFormId: partialFormId || undefined, // Pass partial form ID to link completed form
      })
      
      if (result?.data?.success) {
        setIsSubmitted(true)
        toast.success('Form submitted successfully!')
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

  function handlePhoneChange(field: 'phone_number' | 'emergency_contact_phone' | 'filler_phone', value: string) {
    const formatted = formatPhoneNumber(value)
    form.setValue(field, formatted)
  }


  const totalSteps = 3

  if (isLoadingPartial) {
    return (
      <div className="min-h-screen bg-#EDE9E4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-#EDE9E4">
      <div className="max-w-4xl mx-auto bg-white p-4 md:p-8">
        {token && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">
              ✓ Pre-filled Information Detected
            </p>
            <p className="text-sm text-blue-700">
              Some information has been pre-filled for you. Please review all fields and complete any missing sections. 
              You can still choose whether you're filling this out for yourself or someone else.
            </p>
          </div>
        )}
        {isSubmitted ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank You!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Your form has been submitted successfully.
            </p>
            <p className="text-base text-gray-500">
              We will review your information and get back to you soon.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8 text-center">
              Patient Application Form
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Personal Information</h2>
              
              <div className="space-y-4">
                {/* Form Filler Section */}
                <div className="bg-gray-50 p-3 md:p-4 rounded-lg space-y-3 md:space-y-4">
                  <Label className="text-base font-medium">
                    Are you filling out this form yourself, or is someone else filling it out for you? <span className="text-red-500">*</span>
                  </Label>
                  {token && (
                    <p className="text-xs text-gray-600 italic">
                      Note: Even though some information was pre-filled, please select who is actually completing this form.
                    </p>
                  )}
                  <RadioGroup
                    value={form.watch('filled_by')}
                    onValueChange={(value) => {
                      form.setValue('filled_by', value as 'self' | 'someone_else')
                      if (value === 'self') {
                        // Clear filler fields when switching to self
                        form.setValue('filler_relationship', null)
                        form.setValue('filler_first_name', null)
                        form.setValue('filler_last_name', null)
                        form.setValue('filler_email', null)
                        form.setValue('filler_phone', null)
                      }
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="self" id="filled_by_self" />
                      <Label htmlFor="filled_by_self" className="font-normal cursor-pointer">
                        I am filling this out myself
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="someone_else" id="filled_by_other" />
                      <Label htmlFor="filled_by_other" className="font-normal cursor-pointer">
                        Someone else is filling this out for me
                      </Label>
                    </div>
                  </RadioGroup>
                  {form.formState.errors.filled_by && (
                    <p className="text-sm text-red-500">{form.formState.errors.filled_by.message}</p>
                  )}

                  {/* Show filler information fields if someone else is filling */}
                  {form.watch('filled_by') === 'someone_else' && (
                    <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                      <div>
                        <Label htmlFor="filler_relationship" className="text-base font-medium">
                          What is your relationship to the patient? <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={form.watch('filler_relationship') || ''}
                          onValueChange={(value) => form.setValue('filler_relationship', value)}
                        >
                          <SelectTrigger className="h-12 mt-2">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="family_member">Family Member</SelectItem>
                            <SelectItem value="spouse">Spouse/Partner</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="guardian">Guardian</SelectItem>
                            <SelectItem value="caregiver">Caregiver</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="legal_representative">Legal Representative</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.formState.errors.filler_relationship && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_relationship.message}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-base font-medium">
                          Your Information (Person Filling Out Form) <span className="text-red-500">*</span>
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <Input
                              id="filler_first_name"
                              placeholder="First Name"
                              {...form.register('filler_first_name')}
                              className="h-12"
                            />
                            {form.formState.errors.filler_first_name && (
                              <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_first_name.message}</p>
                            )}
                          </div>
                          <div>
                            <Input
                              id="filler_last_name"
                              placeholder="Last Name"
                              {...form.register('filler_last_name')}
                              className="h-12"
                            />
                            {form.formState.errors.filler_last_name && (
                              <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_last_name.message}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="filler_email" className="text-base font-medium">
                          Your Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="filler_email"
                          type="email"
                          placeholder="your.email@example.com"
                          {...form.register('filler_email')}
                          className="h-12 mt-2"
                        />
                        {form.formState.errors.filler_email && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_email.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="filler_phone" className="text-base font-medium">
                          Your Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="filler_phone"
                          type="tel"
                          placeholder="(000) 000-0000"
                          {...form.register('filler_phone')}
                          onChange={(e) => handlePhoneChange('filler_phone', e.target.value)}
                          className="h-12 mt-2"
                        />
                        {form.formState.errors.filler_phone && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_phone.message}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Program Type Section */}
                <div className="bg-gray-50 p-3 md:p-4 rounded-lg space-y-3 md:space-y-4">
                  <Label className="text-base font-medium">
                    What program are you applying for? <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={form.watch('program_type')}
                    onValueChange={(value) => {
                      form.setValue('program_type', value as 'neurological' | 'mental_health' | 'addiction')
                    }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="neurological" id="program_neurological" />
                      <Label htmlFor="program_neurological" className="font-normal cursor-pointer">
                        Neurological
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mental_health" id="program_mental_health" />
                      <Label htmlFor="program_mental_health" className="font-normal cursor-pointer">
                        Mental Health
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="addiction" id="program_addiction" />
                      <Label htmlFor="program_addiction" className="font-normal cursor-pointer">
                        Addiction
                      </Label>
                    </div>
                  </RadioGroup>
                  {form.formState.errors.program_type && (
                    <p className="text-sm text-red-500">{form.formState.errors.program_type.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="first_name" className="text-base font-medium">
                    Patient Name <span className="text-red-500">*</span>
                    {token && form.watch('first_name') && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">(Pre-filled)</span>
                    )}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <Input
                        id="first_name"
                        placeholder="First Name"
                        {...form.register('first_name')}
                        className={`h-12 ${token && form.watch('first_name') ? 'bg-blue-50 border-blue-200' : ''}`}
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
                        className={`h-12 ${token && form.watch('last_name') ? 'bg-blue-50 border-blue-200' : ''}`}
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
                    {token && form.watch('email') && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">(Pre-filled)</span>
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    {...form.register('email')}
                    className={`h-12 mt-2 ${token && form.watch('email') ? 'bg-blue-50 border-blue-200' : ''}`}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-4">
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
                    <Label className="text-base font-medium block mb-2">Gender</Label>
                    <RadioGroup
                      value={form.watch('gender') || ''}
                      onValueChange={(value) => form.setValue('gender', value as any)}
                      className="flex flex-row gap-6 mt-2"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-base font-medium">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="City"
                      {...form.register('city')}
                      className="h-12 mt-2"
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-base font-medium">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.watch('state') || ''}
                      onValueChange={(value) => {
                        form.setValue('state', value)
                        form.trigger('state')
                      }}
                    >
                      <SelectTrigger id="state" className="h-12 mt-2">
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
                    {form.formState.errors.state && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.state.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="zip_code" className="text-base font-medium">
                    Zip Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="zip_code"
                    placeholder="Zip Code"
                    {...form.register('zip_code')}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.zip_code && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.zip_code.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Emergency Contact Information</h2>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">
                    Emergency Contact Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Privacy Policy</h2>
              
              <div className="bg-gray-50 p-4 md:p-8 rounded-lg">
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
                    I confirm that I have read and agree to the Iboga Wellness Institute Privacy Policy, and consent to the collection and use of my information as described.
                  </Label>
                </div>
                {form.formState.errors.privacy_policy_accepted && (
                  <p className="text-sm text-red-500">{form.formState.errors.privacy_policy_accepted.message}</p>
                )}
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
                onClick={async () => {
                  // Validate current step before proceeding
                  const fieldsToValidate = getFieldsForStep(currentStep, form.watch('filled_by'))
                  const isValid = await form.trigger(fieldsToValidate as any)
                  if (isValid) {
                    setCurrentStep(currentStep + 1)
                  } else {
                    // Scroll to first error
                    const firstErrorField = fieldsToValidate.find(field => 
                      form.formState.errors[field as keyof typeof form.formState.errors]
                    )
                    if (firstErrorField) {
                      const element = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }
                  }
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
          </>
        )}
      </div>
    </div>
  )
}

function getFieldsForStep(step: number, filledBy?: string): string[] {
  switch (step) {
    case 1:
      // Validate all required fields in step 1, including all address fields and filler info if applicable
      const fields: string[] = ['filled_by', 'program_type', 'first_name', 'last_name', 'email', 'phone_number', 'address', 'city', 'state', 'zip_code']
      if (filledBy === 'someone_else') {
        fields.push('filler_relationship', 'filler_first_name', 'filler_last_name', 'filler_email', 'filler_phone')
      }
      return fields
    case 2:
      // Validate all required emergency contact fields
      return ['emergency_contact_first_name', 'emergency_contact_last_name', 'emergency_contact_phone', 'emergency_contact_email']
    case 3:
      return ['privacy_policy_accepted']
    default:
      return []
  }
}

// Wrapper component with Suspense for useSearchParams
export function PatientIntakeForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-#EDE9E4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    }>
      <PatientIntakeFormContent />
    </Suspense>
  )
}

