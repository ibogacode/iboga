'use client'

import { format } from 'date-fns'
import { getServiceAgreementText, ServiceAgreementContent } from '@/components/forms/form-content'

interface ServiceAgreement {
  id: string
  patient_id: string | null
  intake_form_id: string | null
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
  patient_signature_data: string | null
  provider_signature_name: string
  provider_signature_first_name?: string | null
  provider_signature_last_name?: string | null
  provider_signature_date: string
  provider_signature_data: string | null
  uploaded_file_url: string | null
  uploaded_file_name: string | null
  program_type?: 'neurological' | 'mental_health' | 'addiction' | null
  number_of_days?: number | null
  created_at: string
  updated_at: string
}

interface ServiceAgreementFormViewProps {
  form: ServiceAgreement
}

export function ServiceAgreementFormView({ form }: ServiceAgreementFormViewProps) {
  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  function formatCurrency(amount: number | string) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  function formatPercentage(percent: number | string) {
    const num = typeof percent === 'string' ? parseFloat(percent) : percent
    if (isNaN(num)) return 'N/A'
    return `${num}%`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 print:shadow-none print:rounded-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center print:mb-4">
          Service Agreement
        </h1>

        {/* Service Agreement Content */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <div className="bg-gray-50 p-8 rounded-lg print:p-4">
            <div className="prose prose-sm max-w-none">
              <ServiceAgreementContent 
                text={getServiceAgreementText({
                  programType: form.program_type || 'neurological',
                  totalProgramFee: typeof form.total_program_fee === 'number' ? form.total_program_fee : parseFloat(String(form.total_program_fee).replace(/[^0-9.]/g, '')) || 0,
                  depositPercentage: typeof form.deposit_percentage === 'number' ? form.deposit_percentage : parseFloat(String(form.deposit_percentage)) || 50,
                  depositAmount: typeof form.deposit_amount === 'number' ? form.deposit_amount : parseFloat(String(form.deposit_amount).replace(/[^0-9.]/g, '')) || 0,
                  remainingBalance: typeof form.remaining_balance === 'number' ? form.remaining_balance : parseFloat(String(form.remaining_balance).replace(/[^0-9.]/g, '')) || 0,
                  numberOfDays: form.number_of_days || 14,
                })} 
              />
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Patient Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-base font-medium text-gray-900">Patient Name</label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {form.patient_first_name}
                  </div>
                </div>
                <div>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                    {form.patient_last_name}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Email</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.patient_email}
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Phone Number</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.patient_phone_number}
              </div>
            </div>
          </div>
        </div>

        {/* Fees & Payment */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Fees & Payment</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-base font-medium text-gray-900">Total Program Fee</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {formatCurrency(form.total_program_fee)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-base font-medium text-gray-900">Deposit Amount</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {formatCurrency(form.deposit_amount)}
                </div>
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Deposit Percentage</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {formatPercentage(form.deposit_percentage)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Remaining Balance</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {formatCurrency(form.remaining_balance)}
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Payment Method</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.payment_method}
              </div>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Signatures</h2>
          
          <div className="space-y-6">
            {/* Patient Signature */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Signature</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-base font-medium text-gray-900">Signature Name</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {form.patient_signature_name}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-base font-medium text-gray-900">First Name</label>
                    <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                      {form.patient_signature_first_name}
                    </div>
                  </div>
                  <div>
                    <label className="text-base font-medium text-gray-900">Last Name</label>
                    <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                      {form.patient_signature_last_name}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="text-base font-medium text-gray-900">Signature</label>
                    <div className="mt-2">
                      {form.patient_signature_data ? (
                        <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                          <img 
                            src={form.patient_signature_data} 
                            alt="Patient Signature" 
                            className="max-w-full h-auto"
                          />
                        </div>
                      ) : (
                        <div className="h-32 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                          No signature provided
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-base font-medium text-gray-900">Date</label>
                    <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                      {formatDate(form.patient_signature_date)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Signature */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Signature</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-base font-medium text-gray-900">Signature Name</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {form.provider_signature_name}
                  </div>
                </div>
                {(form.provider_signature_first_name || form.provider_signature_last_name) && (
                  <div className="grid grid-cols-2 gap-4">
                    {form.provider_signature_first_name && (
                      <div>
                        <label className="text-base font-medium text-gray-900">First Name</label>
                        <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                          {form.provider_signature_first_name}
                        </div>
                      </div>
                    )}
                    {form.provider_signature_last_name && (
                      <div>
                        <label className="text-base font-medium text-gray-900">Last Name</label>
                        <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                          {form.provider_signature_last_name}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="text-base font-medium text-gray-900">Signature</label>
                    <div className="mt-2">
                      {form.provider_signature_data ? (
                        <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                          <img 
                            src={form.provider_signature_data} 
                            alt="Provider Signature" 
                            className="max-w-full h-auto"
                          />
                        </div>
                      ) : (
                        <div className="h-32 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                          No signature provided
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-base font-medium text-gray-900">Date</label>
                    <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                      {formatDate(form.provider_signature_date)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload */}
        {form.uploaded_file_url && (
          <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-2xl font-semibold text-gray-900">Uploaded Document</h2>
            <div>
              <label className="text-base font-medium text-gray-900">File</label>
              <div className="mt-2">
                <a 
                  href={form.uploaded_file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {form.uploaded_file_name || 'View Document'}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Metadata - hidden in print */}
        <div className="text-sm text-gray-500 border-t pt-4 print:hidden">
          <div>Form ID: {form.id}</div>
          <div>Created: {formatDate(form.created_at)}</div>
          {form.updated_at && <div>Last Updated: {formatDate(form.updated_at)}</div>}
        </div>
      </div>
    </div>
  )
}
