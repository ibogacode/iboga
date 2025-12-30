'use client'

import { format } from 'date-fns'

interface IbogaineConsentForm {
  id: string
  patient_id: string | null
  intake_form_id: string | null
  first_name: string
  last_name: string
  date_of_birth: string
  phone_number: string
  email: string
  address: string
  treatment_date: string
  facilitator_doctor_name: string
  consent_for_treatment: boolean
  risks_and_benefits: boolean
  pre_screening_health_assessment: boolean
  voluntary_participation: boolean
  confidentiality: boolean
  liability_release: boolean
  payment_collection: boolean
  signature_data: string
  signature_date: string
  signature_name: string
  created_at: string
  updated_at: string
}

interface IbogaineConsentFormViewProps {
  form: IbogaineConsentForm
}

const CONSENT_SECTIONS = [
  { heading: 'Consent for Treatment', field: 'consent_for_treatment' as const },
  { heading: 'Risks and Benefits', field: 'risks_and_benefits' as const },
  { heading: 'Pre-Screening and Health Assessment', field: 'pre_screening_health_assessment' as const },
  { heading: 'Voluntary Participation', field: 'voluntary_participation' as const },
  { heading: 'Confidentiality', field: 'confidentiality' as const },
  { heading: 'Liability Release', field: 'liability_release' as const },
  { heading: 'Payment Collection by Iboga Wellness Institute', field: 'payment_collection' as const },
]

export function IbogaineConsentFormView({ form }: IbogaineConsentFormViewProps) {
  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 print:shadow-none print:rounded-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center print:mb-4">
          Ibogaine Therapy Consent Form
        </h1>

        {/* Patient Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Patient Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-base font-medium text-gray-900">First Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.first_name}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-900">Last Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.last_name}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-900">Date of Birth</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {formatDate(form.date_of_birth)}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-900">Phone Number</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.phone_number}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-900">Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.email}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-base font-medium text-gray-900">Address</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.address}
              </div>
            </div>
          </div>
        </div>

        {/* Therapy Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Therapy Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-base font-medium text-gray-900">Treatment Date</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {formatDate(form.treatment_date)}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-gray-900">Facilitator/Doctor Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.facilitator_doctor_name}
              </div>
            </div>
          </div>
        </div>

        {/* Consent Sections */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Consent for Treatment</h2>
          
          <div className="space-y-6">
            {CONSENT_SECTIONS.map((section) => {
              const consentTexts: Record<string, string> = {
                consent_for_treatment: `I, hereby referred to as "the Patient", voluntarily consent to participate in the Ibogaine therapy monitored by Iboga Wellness Institute. I understand that this therapy involves Ibogaine, a psychoactive substance derived from the Tabernanthe iboga plant, used in the treatment of substance dependency, PTSD, depression, anxiety, and for personal growth.`,
                risks_and_benefits: `I acknowledge that I have been informed about the potential benefits, risks, and side effects associated with Ibogaine therapy, including but not limited to: changes in heart rate, blood pressure, nausea, hallucinations, emotional and psychological revelations, and in rare cases, severe health complications.`,
                pre_screening_health_assessment: `I confirm that I have undergone a comprehensive pre-screening and health assessment, including an EKG, blood work, and liver panel, conducted by Iboga Wellness Institute's onsite medical doctor. I have disclosed all relevant medical history, current medications, and substance use to ensure my suitability for Ibogaine therapy.`,
                voluntary_participation: `I acknowledge that my participation in this therapy is entirely voluntary and that I have the right to withdraw my consent and discontinue participation at any time.`,
                confidentiality: `I understand that my privacy will be respected, and all personal and medical information will be handled in accordance with Iboga Wellness Institute's privacy policy and applicable laws regarding patient confidentiality.`,
                liability_release: `I release Iboga Wellness Institute, its medical team, therapists, administrative, and operational staff from all medical, legal, and administrative responsibility for any consequences arising from my participation in Ibogaine therapy, except in cases of gross negligence or willful misconduct.`,
                payment_collection: `I acknowledge and agree that Iboga Wellness Institute will collect payment for the services provided in accordance with the agreed-upon payment terms and schedule. I understand that payment is required as specified in my service agreement.`,
              }
              
              const isChecked = form[section.field] === true
              
              return (
                <div key={section.field} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="bg-white p-4 rounded border border-gray-200 mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-line">{consentTexts[section.field]}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isChecked 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <label className="text-base font-medium text-gray-900">
                      {isChecked ? '✓ Acknowledged' : '✗ Not Acknowledged'}
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Signature */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Signature</h2>
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="mb-4">
              <label className="text-base font-medium text-gray-900">Signature Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-white flex items-center mt-2">
                {form.signature_name}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-base font-medium text-gray-900">Signature Date</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-white flex items-center mt-2">
                {formatDate(form.signature_date)}
              </div>
            </div>
            {form.signature_data && (
              <div>
                <label className="text-base font-medium text-gray-900 mb-2 block">Signature</label>
                <div className="border border-gray-300 rounded-md p-4 bg-white">
                  <img 
                    src={form.signature_data} 
                    alt="Signature" 
                    className="max-w-full h-auto max-h-32"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="text-sm text-gray-500 border-t pt-4 print:border-t-0 print:pt-0">
          <p>Form ID: {form.id}</p>
          <p>Submitted: {formatDate(form.created_at)}</p>
          {form.updated_at !== form.created_at && (
            <p>Last Updated: {formatDate(form.updated_at)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

