'use client'

import { format } from 'date-fns'

interface MedicalHistoryForm {
  id: string
  intake_form_id: string | null
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
  physical_examination_records: string | null
  cardiac_evaluation: string | null
  liver_function_tests: string | null
  is_pregnant: boolean
  dietary_lifestyle_habits: string | null
  physical_activity_exercise: string | null
  signature_data: string | null
  signature_date: string
  uploaded_file_url: string | null
  uploaded_file_name: string | null
  created_at: string
  updated_at: string
}

interface MedicalHistoryFormViewProps {
  form: MedicalHistoryForm
}

export function MedicalHistoryFormView({ form }: MedicalHistoryFormViewProps) {
  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  function formatGender(gender: string | null) {
    if (!gender) return 'N/A'
    if (gender === 'M') return 'Male'
    if (gender === 'F') return 'Female'
    return gender
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 print:shadow-none print:rounded-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center print:mb-4">
          Medical Health History Form
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
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {formatGender(form.gender)}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.weight && (
                <div>
                  <label className="text-base font-medium text-gray-900">Weight</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {form.weight}
                  </div>
                </div>
              )}
              {form.height && (
                <div>
                  <label className="text-base font-medium text-gray-900">Height</label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                    {form.height}
                  </div>
                </div>
              )}
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

            <div>
              <label className="text-base font-medium text-gray-900">Emergency Contact Name</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.emergency_contact_name}
              </div>
            </div>

            <div>
              <label className="text-base font-medium text-gray-900">Emergency Contact Phone</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.emergency_contact_phone}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Health Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Health Information</h2>
          
          <div className="space-y-4">
            {form.primary_care_provider && (
              <div>
                <label className="text-base font-medium text-gray-900">Primary Care Provider</label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                  {form.primary_care_provider}
                </div>
              </div>
            )}

            {form.other_physicians && (
              <div>
                <label className="text-base font-medium text-gray-900">Other Physicians</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.other_physicians}
                </div>
              </div>
            )}

            {form.practitioners_therapists && (
              <div>
                <label className="text-base font-medium text-gray-900">Practitioners/Therapists</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.practitioners_therapists}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Medical History */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Medical History</h2>
          
          <div className="space-y-4">
            {form.current_health_status && (
              <div>
                <label className="text-base font-medium text-gray-900">Current Health Status</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.current_health_status}
                </div>
              </div>
            )}

            {form.reason_for_coming && (
              <div>
                <label className="text-base font-medium text-gray-900">Reason for Coming</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.reason_for_coming}
                </div>
              </div>
            )}

            {form.medical_conditions && (
              <div>
                <label className="text-base font-medium text-gray-900">Medical Conditions</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.medical_conditions}
                </div>
              </div>
            )}

            {form.substance_use_history && (
              <div>
                <label className="text-base font-medium text-gray-900">Substance Use History</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.substance_use_history}
                </div>
              </div>
            )}

            {form.family_personal_health_info && (
              <div>
                <label className="text-base font-medium text-gray-900">Family/Personal Health Information</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.family_personal_health_info}
                </div>
              </div>
            )}

            {form.pain_stiffness_swelling && (
              <div>
                <label className="text-base font-medium text-gray-900">Pain, Stiffness, Swelling</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.pain_stiffness_swelling}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Health Sections */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Health Sections</h2>
          
          <div className="space-y-4">
            {form.metabolic_health_concerns && (
              <div>
                <label className="text-base font-medium text-gray-900">Metabolic Health Concerns</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.metabolic_health_concerns}
                </div>
              </div>
            )}

            {form.digestive_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Digestive Health</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.digestive_health}
                </div>
              </div>
            )}

            {form.reproductive_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Reproductive Health</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.reproductive_health}
                </div>
              </div>
            )}

            {form.hormonal_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Hormonal Health</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.hormonal_health}
                </div>
              </div>
            )}

            {form.immune_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Immune Health</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.immune_health}
                </div>
              </div>
            )}

            {form.food_allergies_intolerance && (
              <div>
                <label className="text-base font-medium text-gray-900">Food Allergies/Intolerance</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.food_allergies_intolerance}
                </div>
              </div>
            )}

            {form.difficulties_chewing_swallowing && (
              <div>
                <label className="text-base font-medium text-gray-900">Difficulties Chewing/Swallowing</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.difficulties_chewing_swallowing}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 5: Medications */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Medications</h2>
          
          <div className="space-y-4">
            {form.medications_medical_use && (
              <div>
                <label className="text-base font-medium text-gray-900">Medications for Medical Use</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.medications_medical_use}
                </div>
              </div>
            )}

            {form.medications_mental_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Medications for Mental Health</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.medications_mental_health}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 6: Mental Health */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Mental Health</h2>
          
          <div className="space-y-4">
            {form.mental_health_conditions && (
              <div>
                <label className="text-base font-medium text-gray-900">Mental Health Conditions</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.mental_health_conditions}
                </div>
              </div>
            )}

            {form.mental_health_treatment && (
              <div>
                <label className="text-base font-medium text-gray-900">Mental Health Treatment</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.mental_health_treatment}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 7: Allergies & Previous Experiences */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Allergies & Previous Experiences</h2>
          
          <div className="space-y-4">
            {form.allergies && (
              <div>
                <label className="text-base font-medium text-gray-900">Allergies</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.allergies}
                </div>
              </div>
            )}

            {form.previous_psychedelics_experiences && (
              <div>
                <label className="text-base font-medium text-gray-900">Previous Psychedelics Experiences</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.previous_psychedelics_experiences}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 8: Physical Examination */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Physical Examination</h2>
          
          <div className="space-y-4">
            {form.physical_examination_records && (
              <div>
                <label className="text-base font-medium text-gray-900">Physical Examination Records</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.physical_examination_records}
                </div>
              </div>
            )}

            {form.cardiac_evaluation && (
              <div>
                <label className="text-base font-medium text-gray-900">Cardiac Evaluation</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.cardiac_evaluation}
                </div>
              </div>
            )}

            {form.liver_function_tests && (
              <div>
                <label className="text-base font-medium text-gray-900">Liver Function Tests</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.liver_function_tests}
                </div>
              </div>
            )}

            <div>
              <label className="text-base font-medium text-gray-900">Pregnancy Status</label>
              <div className="h-12 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center mt-2">
                {form.is_pregnant ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </div>

        {/* Step 9: Dietary and Lifestyle */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Dietary and Lifestyle</h2>
          
          <div className="space-y-4">
            {form.dietary_lifestyle_habits && (
              <div>
                <label className="text-base font-medium text-gray-900">Dietary and Lifestyle Habits</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.dietary_lifestyle_habits}
                </div>
              </div>
            )}

            {form.physical_activity_exercise && (
              <div>
                <label className="text-base font-medium text-gray-900">Physical Activity and Exercise</label>
                <div className="min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-start mt-2 whitespace-pre-wrap">
                  {form.physical_activity_exercise}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 10: Signature */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900">Signature</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="text-base font-medium text-gray-900">Signature</label>
                <div className="mt-2">
                  {form.signature_data ? (
                    <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                      <img 
                        src={form.signature_data} 
                        alt="Signature" 
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
                  {formatDate(form.signature_date)}
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
          <div>Submitted: {formatDate(form.created_at)}</div>
        </div>
      </div>
    </div>
  )
}
