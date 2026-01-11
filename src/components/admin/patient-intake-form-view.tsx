'use client'

import { format } from 'date-fns'
import { 
  PRIVACY_POLICY_TEXT, 
  PrivacyPolicyContent,
} from '@/components/forms/form-content'

interface PatientIntakeForm {
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
  updated_at: string
}

interface PatientIntakeFormViewProps {
  form: PatientIntakeForm
}

export function PatientIntakeFormView({ form }: PatientIntakeFormViewProps) {
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
          Patient Application Form
        </h1>

        {/* Form Filler Information */}
        {form.filled_by === 'someone_else' && (
          <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-2xl font-semibold text-gray-900">Form Filler Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-base font-medium text-gray-900">Filled By</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2 capitalize">
                  {form.filled_by?.replace('_', ' ')}
                </div>
              </div>

              {form.filler_first_name && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-base font-medium text-gray-900">Filler First Name</label>
                    <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                      {form.filler_first_name}
                    </div>
                  </div>
                  <div>
                    <label className="text-base font-medium text-gray-900">Filler Last Name</label>
                    <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                      {form.filler_last_name}
                    </div>
                  </div>
                </div>
              )}

              {form.filler_email && (
                <div>
                  <label className="text-base font-medium text-gray-900">Filler Email</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {form.filler_email}
                  </div>
                </div>
              )}

              {form.filler_phone && (
                <div>
                  <label className="text-base font-medium text-gray-900">Filler Phone</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {form.filler_phone}
                  </div>
                </div>
              )}

              {form.filler_relationship && (
                <div>
                  <label className="text-base font-medium text-gray-900">Relationship to Patient</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {form.filler_relationship}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Personal Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-base font-medium text-gray-900">Patient Name</label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {form.first_name}
                  </div>
                </div>
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {form.last_name}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.email}
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Phone Number</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.phone_number}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.date_of_birth && (
                <div>
                  <label className="text-base font-medium text-gray-900">Date of Birth</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {formatDate(form.date_of_birth)}
                  </div>
                </div>
              )}
              {form.gender && (
                <div>
                  <label className="text-base font-medium text-gray-900">Gender</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2 capitalize">
                    {form.gender.replace('-', ' ')}
                  </div>
                </div>
              )}
            </div>

            {(form.address || form.city || form.state || form.zip_code) && (
              <div>
                <label className="text-base font-medium text-gray-900">Address</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {[form.address, form.city, form.state, form.zip_code]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}

            {form.program_type && (
              <div>
                <label className="text-base font-medium text-gray-900">Program Type</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2 capitalize">
                  {form.program_type.replace('_', ' ')}
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
                    {form.emergency_contact_first_name}
                  </div>
                </div>
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {form.emergency_contact_last_name}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Emergency Contact Phone</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.emergency_contact_phone}
              </div>
            </div>

            {form.emergency_contact_email && (
              <div>
                <label className="text-base font-medium text-gray-900">Emergency Contact Email</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {form.emergency_contact_email}
                </div>
              </div>
            )}

            {form.emergency_contact_address && (
              <div>
                <label className="text-base font-medium text-gray-900">Emergency Contact Address</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {form.emergency_contact_address}
                </div>
              </div>
            )}

            {form.emergency_contact_relationship && (
              <div>
                <label className="text-base font-medium text-gray-900">Relationship</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {form.emergency_contact_relationship}
                </div>
              </div>
            )}
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
              <span className={form.privacy_policy_accepted ? 'text-green-600 text-xl' : 'text-red-600 text-xl'}>
                {form.privacy_policy_accepted ? '✓' : '✗'}
              </span>
              <label className="text-base text-gray-700 leading-relaxed">
                I confirm that I have read and agree to the Iboga Wellness Institute Privacy Policy, and consent to the collection and use of my information as described.
              </label>
            </div>
          </div>
        </div>

        {/* Metadata - hidden in print */}
        <div className="text-sm text-gray-500 border-t pt-4 print:hidden">
          <div>Form ID: {form.id}</div>
          <div>Submitted: {formatDate(form.created_at)}</div>
        </div>
      </div>
    </div>
  )
}
