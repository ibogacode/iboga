'use client'

import { useRef } from 'react'
import { format } from 'date-fns'
import { FileText, Download, CheckCircle2, XCircle } from 'lucide-react'
import { PDFDownloadButton } from '@/components/ui/pdf-download-button'

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
  updated_at: string
}

interface MedicalHistoryFormViewProps {
  form: MedicalHistoryForm
}

export function MedicalHistoryFormView({ form }: MedicalHistoryFormViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MM-dd-yyyy')
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

  function renderFileLink(url: string | null, fileName: string | null, label: string) {
    if (!url) return null
    
    return (
      <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{fileName || 'Download file'}</p>
            </div>
          </div>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 print:bg-white print:py-4">
      {/* Download Button */}
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <PDFDownloadButton
          formType="Medical-History"
          patientName={`${form.first_name}-${form.last_name}`}
          date={form.created_at?.split('T')[0]}
          contentRef={contentRef as React.RefObject<HTMLElement>}
        >
          Download PDF
        </PDFDownloadButton>
      </div>

      <div ref={contentRef} className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8 print:shadow-none print:rounded-none">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center print:mb-4">
            Medical Health History Form
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <span>Client: {form.first_name} {form.last_name}</span>
            <span>•</span>
            <span>Submitted: {formatDate(form.created_at)}</span>
          </div>
        </div>

        {/* Step 1: Personal Information */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Personal Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-base font-medium text-gray-900">Client Name</label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="h-12 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center font-medium">
                    {form.first_name || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="h-12 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center font-medium">
                    {form.last_name || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-base font-medium text-gray-900">Date of Birth</label>
                <div className="h-12 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center mt-2">
                  {form.date_of_birth ? formatDate(form.date_of_birth) : 'N/A'}
                </div>
              </div>
              <div>
                <label className="text-base font-medium text-gray-900">Gender</label>
                <div className="h-12 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center mt-2">
                  {form.gender ? formatGender(form.gender) : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.weight && (
                <div>
                  <label className="text-base font-medium text-gray-900">Weight</label>
                  <div className="h-12 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center mt-2">
                    {form.weight}
                  </div>
                </div>
              )}
              {form.height && (
                <div>
                  <label className="text-base font-medium text-gray-900">Height</label>
                  <div className="h-12 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center mt-2">
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
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Health Information</h2>
          
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
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.other_physicians}
                </div>
              </div>
            )}

            {form.practitioners_therapists && (
              <div>
                <label className="text-base font-medium text-gray-900">Practitioners/Therapists</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.practitioners_therapists}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Medical History */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Medical History</h2>
          
          <div className="space-y-4">
            {form.current_health_status && (
              <div>
                <label className="text-base font-medium text-gray-900">Current Health Status</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.current_health_status}
                </div>
              </div>
            )}

            {form.reason_for_coming && (
              <div>
                <label className="text-base font-medium text-gray-900">Reason for Coming</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.reason_for_coming}
                </div>
              </div>
            )}

            {form.medical_conditions && (
              <div>
                <label className="text-base font-medium text-gray-900">Medical Conditions</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.medical_conditions}
                </div>
              </div>
            )}

            {form.substance_use_history && (
              <div>
                <label className="text-base font-medium text-gray-900">Substance Use History</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.substance_use_history}
                </div>
              </div>
            )}

            {form.family_personal_health_info && (
              <div>
                <label className="text-base font-medium text-gray-900">Family/Personal Health Information</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.family_personal_health_info}
                </div>
              </div>
            )}

            {form.pain_stiffness_swelling && (
              <div>
                <label className="text-base font-medium text-gray-900">Pain, Stiffness, Swelling</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.pain_stiffness_swelling}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Health Sections */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Health Sections</h2>
          
          <div className="space-y-4">
            {form.metabolic_health_concerns && (
              <div>
                <label className="text-base font-medium text-gray-900">Metabolic Health Concerns</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.metabolic_health_concerns}
                </div>
              </div>
            )}

            {form.digestive_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Digestive Health</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.digestive_health}
                </div>
              </div>
            )}

            {form.reproductive_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Reproductive Health</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.reproductive_health}
                </div>
              </div>
            )}

            {form.hormonal_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Hormonal Health</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.hormonal_health}
                </div>
              </div>
            )}

            {form.immune_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Immune Health</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.immune_health}
                </div>
              </div>
            )}

            {form.food_allergies_intolerance && (
              <div>
                <label className="text-base font-medium text-gray-900">Food Allergies/Intolerance</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.food_allergies_intolerance}
                </div>
              </div>
            )}

            {form.difficulties_chewing_swallowing && (
              <div>
                <label className="text-base font-medium text-gray-900">Difficulties Chewing/Swallowing</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.difficulties_chewing_swallowing}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 5: Medications */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Medications</h2>
          
          <div className="space-y-4">
            {form.medications_medical_use && (
              <div>
                <label className="text-base font-medium text-gray-900">Medications for Medical Use</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.medications_medical_use}
                </div>
              </div>
            )}

            {form.medications_mental_health && (
              <div>
                <label className="text-base font-medium text-gray-900">Medications for Mental Health</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.medications_mental_health}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 6: Mental Health */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Mental Health</h2>
          
          <div className="space-y-4">
            {form.mental_health_conditions && (
              <div>
                <label className="text-base font-medium text-gray-900">Mental Health Conditions</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.mental_health_conditions}
                </div>
              </div>
            )}

            {form.mental_health_treatment && (
              <div>
                <label className="text-base font-medium text-gray-900">Mental Health Treatment</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.mental_health_treatment}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 7: Allergies & Previous Experiences */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Allergies & Previous Experiences</h2>
          
          <div className="space-y-4">
            {form.allergies && (
              <div>
                <label className="text-base font-medium text-gray-900">Allergies</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.allergies}
                </div>
              </div>
            )}

            {form.previous_psychedelics_experiences && (
              <div>
                <label className="text-base font-medium text-gray-900">Previous Psychedelics Experiences</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.previous_psychedelics_experiences}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 8: Physical Examination & Tests */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Physical Examination & Medical Tests</h2>
          
          <div className="space-y-6">
            {/* Physical Examination */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Have you had a physical examination in the last 12 months?</h3>
                {form.has_physical_examination !== null && form.has_physical_examination !== undefined && (
                  form.has_physical_examination ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )
                )}
                <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-300">
                  {form.has_physical_examination === true ? 'Yes' : form.has_physical_examination === false ? 'No' : 'Not answered'}
                </span>
              </div>
              
              {form.has_physical_examination === true && (
                <div className="mt-4 space-y-4 bg-white rounded-md p-4 border border-gray-200">
                  {form.physical_examination_records && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Details</label>
                      <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start whitespace-pre-wrap text-sm leading-relaxed">
                        {form.physical_examination_records}
                      </div>
                    </div>
                  )}
                  {renderFileLink(
                    form.physical_examination_file_url,
                    form.physical_examination_file_name,
                    'Physical Examination Report'
                  )}
                </div>
              )}
            </div>

            {/* Cardiac Evaluation */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Have you undergone any cardiac evaluations (e.g., EKG)?</h3>
                {form.has_cardiac_evaluation !== null && form.has_cardiac_evaluation !== undefined && (
                  form.has_cardiac_evaluation ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )
                )}
                <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-300">
                  {form.has_cardiac_evaluation === true ? 'Yes' : form.has_cardiac_evaluation === false ? 'No' : 'Not answered'}
                </span>
              </div>
              
              {form.has_cardiac_evaluation === true && (
                <div className="mt-4 space-y-4 bg-white rounded-md p-4 border border-gray-200">
                  {form.cardiac_evaluation && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Details</label>
                      <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start whitespace-pre-wrap text-sm leading-relaxed">
                        {form.cardiac_evaluation}
                      </div>
                    </div>
                  )}
                  {renderFileLink(
                    form.cardiac_evaluation_file_url,
                    form.cardiac_evaluation_file_name,
                    'Cardiac Evaluation Report'
                  )}
                </div>
              )}
            </div>

            {/* Liver Function Tests */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Have you had any liver function tests (e.g., blood work)?</h3>
                {form.has_liver_function_tests !== null && form.has_liver_function_tests !== undefined && (
                  form.has_liver_function_tests ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )
                )}
                <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-300">
                  {form.has_liver_function_tests === true ? 'Yes' : form.has_liver_function_tests === false ? 'No' : 'Not answered'}
                </span>
              </div>
              
              {form.has_liver_function_tests === true && (
                <div className="mt-4 space-y-4 bg-white rounded-md p-4 border border-gray-200">
                  {form.liver_function_tests && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Details</label>
                      <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start whitespace-pre-wrap text-sm leading-relaxed">
                        {form.liver_function_tests}
                      </div>
                    </div>
                  )}
                  {renderFileLink(
                    form.liver_function_tests_file_url,
                    form.liver_function_tests_file_name,
                    'Liver Function Test Report'
                  )}
                </div>
              )}
            </div>

            {/* Pregnancy Status - only show if not male */}
            {form.gender !== 'M' && (
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Are you currently pregnant or suspect you might be pregnant?</h3>
                  <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-300">
                    {form.is_pregnant ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 9: Dietary and Lifestyle */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Dietary and Lifestyle</h2>
          
          <div className="space-y-4">
            {form.dietary_lifestyle_habits && (
              <div>
                <label className="text-base font-medium text-gray-900">Dietary and Lifestyle Habits</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.dietary_lifestyle_habits}
                </div>
              </div>
            )}

            {form.physical_activity_exercise && (
              <div>
                <label className="text-base font-medium text-gray-900">Physical Activity and Exercise</label>
                <div className="min-h-[80px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-start mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {form.physical_activity_exercise}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 10: Signature */}
        <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Signature & Authorization</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="text-base font-medium text-gray-900 mb-2 block">Digital Signature</label>
                {form.signature_data ? (
                  <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                    <img 
                      src={form.signature_data} 
                      alt="Client Signature" 
                      className="max-w-full h-auto mx-auto"
                    />
                  </div>
                ) : (
                  <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    No signature provided
                  </div>
                )}
              </div>

              <div>
                <label className="text-base font-medium text-gray-900 mb-2 block">Signature Date</label>
                <div className="h-12 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center font-medium">
                  {formatDate(form.signature_date)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Documents */}
        {form.uploaded_file_url && (
          <div className="space-y-6 mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3">Additional Documents</h2>
            {renderFileLink(
              form.uploaded_file_url,
              form.uploaded_file_name,
              'Additional Medical Document'
            )}
          </div>
        )}

        {/* Metadata - hidden in print */}
        <div className="text-sm text-gray-500 border-t border-gray-200 pt-6 mt-8 print:hidden">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Form ID:</span> {form.id}
            </div>
            <div>
              <span className="font-medium text-gray-700">Submitted:</span> {formatDate(form.created_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
