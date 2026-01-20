'use client'

import { format } from 'date-fns'
import { 
  PRIVACY_POLICY_TEXT, 
  PrivacyPolicyContent,
} from '@/components/forms/form-content'

interface Opportunity {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  date_of_birth: string | null
  gender: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  emergency_contact_first_name: string
  emergency_contact_last_name: string
  emergency_contact_email: string | null
  emergency_contact_phone: string
  emergency_contact_address: string | null
  emergency_contact_relationship: string | null
  privacy_policy_accepted: boolean
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

interface OpportunityFormViewProps {
  opportunity: Opportunity
}

export function OpportunityFormView({ opportunity }: OpportunityFormViewProps) {
  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MM-dd-yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 print:shadow-none print:rounded-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center print:mb-4">
          Client Application Form
        </h1>

        {/* Step 1: Personal Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-base font-medium text-gray-900">Patient Name</label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {opportunity.first_name}
                  </div>
                </div>
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {opportunity.last_name}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {opportunity.email}
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Phone Number</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {opportunity.phone_number}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {opportunity.date_of_birth && (
                <div>
                  <label className="text-base font-medium text-gray-900">Date of Birth</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {formatDate(opportunity.date_of_birth)}
                  </div>
                </div>
              )}
              {opportunity.gender && (
                <div>
                  <label className="text-base font-medium text-gray-900">Gender</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2 capitalize">
                    {opportunity.gender.replace('-', ' ')}
                  </div>
                </div>
              )}
            </div>

            {(opportunity.address || opportunity.city || opportunity.state || opportunity.zip_code) && (
              <div>
                <label className="text-base font-medium text-gray-900">Address</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {[opportunity.address, opportunity.city, opportunity.state, opportunity.zip_code]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Emergency Contact Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Emergency Contact Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-base font-medium text-gray-900">Emergency Contact Name</label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {opportunity.emergency_contact_first_name}
                  </div>
                </div>
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {opportunity.emergency_contact_last_name}
                  </div>
                </div>
              </div>
            </div>

            {opportunity.emergency_contact_email && (
              <div>
                <label className="text-base font-medium text-gray-900">Email</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {opportunity.emergency_contact_email}
                </div>
              </div>
            )}

            <div>
              <label className="text-base font-medium text-gray-900">Phone Number</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {opportunity.emergency_contact_phone}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {opportunity.emergency_contact_address && (
                <div>
                  <label className="text-base font-medium text-gray-900">Address</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {opportunity.emergency_contact_address}
                  </div>
                </div>
              )}
              {opportunity.emergency_contact_relationship && (
                <div>
                  <label className="text-base font-medium text-gray-900">Relationship</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {opportunity.emergency_contact_relationship}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Privacy Policy */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Privacy Policy</h2>
          
          <div className="bg-gray-50 p-8 rounded-lg print:p-4">
            <div className="prose prose-sm max-w-none">
              <PrivacyPolicyContent text={PRIVACY_POLICY_TEXT} />
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <label className="text-base font-semibold text-gray-900">
              Privacy Policy Acceptance
            </label>
            <div className="flex items-start space-x-3">
              <span className={opportunity.privacy_policy_accepted ? 'text-green-600 text-xl' : 'text-red-600 text-xl'}>
                {opportunity.privacy_policy_accepted ? '✓' : '✗'}
              </span>
              <label className="text-base text-gray-700 leading-relaxed">
                I confirm that I have read and agree to the Iboga Wellness Centers Privacy Policy, and consent to the collection and use of my information as described.
              </label>
            </div>
          </div>
        </div>

        {/* Metadata - hidden in print */}
        <div className="text-sm text-gray-500 border-t pt-4 print:hidden">
          <div>Form ID: {opportunity.id}</div>
          <div>Submitted: {formatDate(opportunity.created_at)}</div>
          {opportunity.ip_address && <div>IP Address: {opportunity.ip_address}</div>}
        </div>
      </div>
    </div>
  )
}
