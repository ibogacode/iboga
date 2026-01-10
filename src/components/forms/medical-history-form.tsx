'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams, useRouter } from 'next/navigation'
import { Calendar, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SignaturePad } from '@/components/forms/signature-pad'
import { medicalHistoryFormSchema, type MedicalHistoryFormValues } from '@/lib/validations/medical-history'
import { submitMedicalHistoryForm, getIntakeFormData, uploadMedicalHistoryDocument } from '@/actions/medical-history.action'
import { toast } from 'sonner'

export function MedicalHistoryForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const intakeFormId = searchParams.get('intake_form_id')
  const [currentStep, setCurrentStep] = useState(1)
  const [signature, setSignature] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoadingIntake, setIsLoadingIntake] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [physicalExamFile, setPhysicalExamFile] = useState<{ url: string; name: string } | null>(null)
  const [cardiacEvalFile, setCardiacEvalFile] = useState<{ url: string; name: string } | null>(null)
  const [liverTestFile, setLiverTestFile] = useState<{ url: string; name: string } | null>(null)
  const [isUploadingPhysicalExam, setIsUploadingPhysicalExam] = useState(false)
  const [isUploadingCardiac, setIsUploadingCardiac] = useState(false)
  const [isUploadingLiver, setIsUploadingLiver] = useState(false)
  
  const form = useForm<MedicalHistoryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(medicalHistoryFormSchema) as any,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: undefined,
      weight: '',
      height: '',
      phone_number: '',
      email: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      primary_care_provider: '',
      other_physicians: '',
      practitioners_therapists: '',
      current_health_status: '',
      reason_for_coming: '',
      medical_conditions: '',
      substance_use_history: '',
      family_personal_health_info: '',
      pain_stiffness_swelling: '',
      metabolic_health_concerns: '',
      digestive_health: '',
      reproductive_health: '',
      hormonal_health: '',
      immune_health: '',
      food_allergies_intolerance: '',
      difficulties_chewing_swallowing: '',
      medications_medical_use: '',
      medications_mental_health: '',
      mental_health_conditions: '',
      mental_health_treatment: '',
      allergies: '',
      previous_psychedelics_experiences: '',
      has_physical_examination: false,
      physical_examination_records: '',
      physical_examination_file_url: '',
      physical_examination_file_name: '',
      has_cardiac_evaluation: false,
      cardiac_evaluation: '',
      cardiac_evaluation_file_url: '',
      cardiac_evaluation_file_name: '',
      has_liver_function_tests: false,
      liver_function_tests: '',
      liver_function_tests_file_url: '',
      liver_function_tests_file_name: '',
      is_pregnant: false,
      dietary_lifestyle_habits: '',
      physical_activity_exercise: '',
      signature_data: '',
      signature_date: '',
      uploaded_file_url: '',
      uploaded_file_name: '',
      intake_form_id: intakeFormId || '',
    },
  })

  // Auto-populate from intake form
  useEffect(() => {
    if (intakeFormId) {
      setIsLoadingIntake(true)
      getIntakeFormData(intakeFormId)
        .then((result) => {
          if (result.success && result.data) {
            const intakeData = result.data
            // Auto-populate fields from intake form
            form.setValue('first_name', intakeData.first_name || '')
            form.setValue('last_name', intakeData.last_name || '')
            form.setValue('email', intakeData.email || '')
            form.setValue('phone_number', intakeData.phone_number || '')
            if (intakeData.date_of_birth) {
              const dob = new Date(intakeData.date_of_birth)
              form.setValue('date_of_birth', dob.toISOString().split('T')[0])
            }
            if (intakeData.gender) {
              // Map intake gender to medical history gender (M/F)
              const genderMap: Record<string, 'M' | 'F' | 'other'> = {
                'male': 'M',
                'female': 'F',
                'other': 'other',
                'prefer-not-to-say': 'other'
              }
              const mappedGender = genderMap[intakeData.gender] || 'other'
              form.setValue('gender', mappedGender)
              // If male, set is_pregnant to false
              if (mappedGender === 'M') {
                form.setValue('is_pregnant', false)
              }
            }
            form.setValue('emergency_contact_name', 
              `${intakeData.emergency_contact_first_name || ''} ${intakeData.emergency_contact_last_name || ''}`.trim()
            )
            form.setValue('emergency_contact_phone', intakeData.emergency_contact_phone || '')
            form.setValue('intake_form_id', intakeFormId)
          }
        })
        .catch((error) => {
          console.error('Error loading intake form:', error)
          toast.error('Could not load intake form data')
        })
        .finally(() => {
          setIsLoadingIntake(false)
        })
    }
  }, [intakeFormId, form])


  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(data: MedicalHistoryFormValues) {
    setIsLoading(true)
    
    try {
      // Format signature date
      const today = new Date().toISOString().split('T')[0]
      
      // Ensure is_pregnant is false for males
      const submitData = {
        ...data,
        is_pregnant: data.gender === 'M' ? false : data.is_pregnant,
        signature_date: today,
        uploaded_file_url: uploadedFile?.url || null,
        uploaded_file_name: uploadedFile?.name || null,
        physical_examination_file_url: physicalExamFile?.url || null,
        physical_examination_file_name: physicalExamFile?.name || null,
        cardiac_evaluation_file_url: cardiacEvalFile?.url || null,
        cardiac_evaluation_file_name: cardiacEvalFile?.name || null,
        liver_function_tests_file_url: liverTestFile?.url || null,
        liver_function_tests_file_name: liverTestFile?.name || null,
      }
      
      const result = await submitMedicalHistoryForm(submitData)
      
      if (result?.data?.success) {
        setIsSubmitted(true)
        toast.success('Medical history form submitted successfully!')
        // Redirect to patient homepage after a short delay
        setTimeout(() => {
          router.push('/patient')
        }, 1500)
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await uploadMedicalHistoryDocument(formData)
      
      if (result.success && result.data) {
        setUploadedFile({
          url: result.data.fileUrl,
          name: result.data.fileName
        })
        form.setValue('uploaded_file_url', result.data.fileUrl)
        form.setValue('uploaded_file_name', result.data.fileName)
        toast.success('File uploaded successfully')
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    } catch (error) {
      console.error('File upload error:', error)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred while uploading file')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  function handleRemoveFile() {
    setUploadedFile(null)
    form.setValue('uploaded_file_url', '')
    form.setValue('uploaded_file_name', '')
  }

  async function handlePhysicalExamFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhysicalExam(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await uploadMedicalHistoryDocument(formData, 'physical-exam')
      
      if (result.success && result.data) {
        setPhysicalExamFile({
          url: result.data.fileUrl,
          name: result.data.fileName
        })
        form.setValue('physical_examination_file_url', result.data.fileUrl)
        form.setValue('physical_examination_file_name', result.data.fileName)
        toast.success('Physical examination file uploaded successfully')
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    } catch (error) {
      console.error('Physical exam file upload error:', error)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred while uploading file')
    } finally {
      setIsUploadingPhysicalExam(false)
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  function handleRemovePhysicalExamFile() {
    setPhysicalExamFile(null)
    form.setValue('physical_examination_file_url', '')
    form.setValue('physical_examination_file_name', '')
  }

  async function handleCardiacEvalFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingCardiac(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await uploadMedicalHistoryDocument(formData, 'cardiac-eval')
      
      if (result.success && result.data) {
        setCardiacEvalFile({
          url: result.data.fileUrl,
          name: result.data.fileName
        })
        form.setValue('cardiac_evaluation_file_url', result.data.fileUrl)
        form.setValue('cardiac_evaluation_file_name', result.data.fileName)
        toast.success('Cardiac evaluation file uploaded successfully')
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    } catch (error) {
      console.error('Cardiac eval file upload error:', error)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred while uploading file')
    } finally {
      setIsUploadingCardiac(false)
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  function handleRemoveCardiacEvalFile() {
    setCardiacEvalFile(null)
    form.setValue('cardiac_evaluation_file_url', '')
    form.setValue('cardiac_evaluation_file_name', '')
  }

  async function handleLiverTestFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLiver(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await uploadMedicalHistoryDocument(formData, 'liver-test')
      
      if (result.success && result.data) {
        setLiverTestFile({
          url: result.data.fileUrl,
          name: result.data.fileName
        })
        form.setValue('liver_function_tests_file_url', result.data.fileUrl)
        form.setValue('liver_function_tests_file_name', result.data.fileName)
        toast.success('Liver function test file uploaded successfully')
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    } catch (error) {
      console.error('Liver test file upload error:', error)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred while uploading file')
    } finally {
      setIsUploadingLiver(false)
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  function handleRemoveLiverTestFile() {
    setLiverTestFile(null)
    form.setValue('liver_function_tests_file_url', '')
    form.setValue('liver_function_tests_file_name', '')
  }

  const totalSteps = 8

  // Helper function to get fields for each step for validation
  function getFieldsForStep(step: number): (keyof MedicalHistoryFormValues)[] {
    switch (step) {
      case 1:
        return ['first_name', 'last_name', 'date_of_birth', 'gender', 'weight', 'height', 'phone_number', 'email', 'emergency_contact_name', 'emergency_contact_phone']
      case 2:
        return ['primary_care_provider', 'other_physicians', 'practitioners_therapists']
      case 3:
        return ['current_health_status', 'reason_for_coming', 'medical_conditions', 'substance_use_history']
      case 4:
        return ['metabolic_health_concerns', 'digestive_health', 'reproductive_health', 'hormonal_health', 'immune_health', 'food_allergies_intolerance', 'difficulties_chewing_swallowing']
      case 5:
        return ['medications_medical_use', 'medications_mental_health', 'mental_health_conditions', 'mental_health_treatment']
      case 6:
        const step6Fields: (keyof MedicalHistoryFormValues)[] = ['allergies', 'previous_psychedelics_experiences', 'has_physical_examination', 'has_cardiac_evaluation', 'has_liver_function_tests']
        // Only include is_pregnant if gender is not male
        if (form.watch('gender') !== 'M') {
          step6Fields.push('is_pregnant')
        }
        return step6Fields
      case 7:
        return ['dietary_lifestyle_habits', 'physical_activity_exercise']
      case 8:
        return ['signature_data', 'signature_date']
      default:
        return []
    }
  }

  return (
    <div className="min-h-screen bg-#EDE9E4">
      <div className="max-w-4xl mx-auto bg-white p-8">
        {isSubmitted ? (
          <div className="text-center py-16 px-4">
            <div className="mb-8">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Thank You!
            </h1>
            <p className="text-xl text-gray-700 mb-4 font-medium">
              Your Medical Health History form has been submitted successfully.
            </p>
            <div className="max-w-2xl mx-auto mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-base text-gray-700 mb-2">
                <strong>What happens next?</strong>
              </p>
              <p className="text-sm text-gray-600">
                Our medical team will review your health history information. We will contact you if we need any additional details or to proceed with the next steps in your wellness journey.
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-8">
              You will be redirected to your dashboard shortly...
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Medical Health History Form
            </h1>

            {isLoadingIntake && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">Loading your information from intake form...</p>
              </div>
            )}

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
                      <Label htmlFor="name" className="text-base font-medium">
                        Name <span className="text-red-500">*</span>
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
                      <Label htmlFor="date_of_birth" className="text-base font-medium">
                        Date of Birth <span className="text-red-500">*</span> (MM-DD-YYYY)
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
                      {form.formState.errors.date_of_birth && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.date_of_birth.message}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-base font-medium">
                        Gender <span className="text-red-500">*</span>
                      </Label>
                      <RadioGroup
                        value={form.watch('gender')}
                        onValueChange={(value) => {
                          form.setValue('gender', value as 'M' | 'F' | 'other')
                          // If gender changes to male, automatically set is_pregnant to false
                          if (value === 'M') {
                            form.setValue('is_pregnant', false)
                          }
                        }}
                        className="mt-2"
                      >
                        <div className="flex gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="M" id="gender-m" />
                            <Label htmlFor="gender-m" className="font-normal cursor-pointer">M</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="F" id="gender-f" />
                            <Label htmlFor="gender-f" className="font-normal cursor-pointer">F</Label>
                          </div>
                        </div>
                      </RadioGroup>
                      {form.formState.errors.gender && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.gender.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="weight" className="text-base font-medium">
                          Weight in lbs<span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="weight"
                          placeholder="e.g., 100"
                          {...form.register('weight')}
                          className="h-12 mt-2"
                        />
                        {form.formState.errors.weight && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.weight.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-base font-medium">
                          Height in cm <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="height"
                          placeholder="e.g., 170"
                          {...form.register('height')}
                          className="h-12 mt-2"
                        />
                        {form.formState.errors.height && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.height.message}</p>
                        )}
                      </div>
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
                      <Label htmlFor="emergency_contact_name" className="text-base font-medium">
                        Emergency Contact Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="emergency_contact_name"
                        placeholder="Emergency Contact Name"
                        {...form.register('emergency_contact_name')}
                        className="h-12 mt-2"
                      />
                      {form.formState.errors.emergency_contact_name && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="emergency_contact_phone" className="text-base font-medium">
                        Emergency Contact Phone <span className="text-red-500">*</span>
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
                </div>
              )}

              {/* Step 2: Health Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Health Information</h2>
                  <p className="text-sm text-gray-600">Do you have any of the following? If so, please list:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="primary_care_provider" className="text-base font-medium">
                        Primary care provider <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="primary_care_provider"
                        placeholder="List your primary care provider"
                        {...form.register('primary_care_provider')}
                        className="mt-2 min-h-24"
                      />
                      {form.formState.errors.primary_care_provider && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.primary_care_provider.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="other_physicians" className="text-base font-medium">
                        Other physicians or specialists
                      </Label>
                      <Textarea
                        id="other_physicians"
                        placeholder="List other physicians or specialists"
                        {...form.register('other_physicians')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="practitioners_therapists" className="text-base font-medium">
                        Practitioners, therapists, healers, etc.
                      </Label>
                      <Textarea
                        id="practitioners_therapists"
                        placeholder="List practitioners, therapists, healers, etc."
                        {...form.register('practitioners_therapists')}
                        className="mt-2 min-h-24"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Medical History */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Medical History</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="current_health_status" className="text-base font-medium">
                        Current Health Status <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Briefly describe your current health, including any recent illnesses, surgeries, or hospitalizations.</p>
                      <Textarea
                        id="current_health_status"
                        placeholder="Describe your current health status"
                        {...form.register('current_health_status')}
                        className="mt-2 min-h-32"
                      />
                      {form.formState.errors.current_health_status && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.current_health_status.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reason_for_coming" className="text-base font-medium">
                        Reason for coming <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="reason_for_coming"
                        placeholder="Why are you seeking treatment?"
                        {...form.register('reason_for_coming')}
                        className="mt-2 min-h-24"
                      />
                      {form.formState.errors.reason_for_coming && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.reason_for_coming.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="medical_conditions" className="text-base font-medium">
                        Medical Conditions <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">List any diagnosed medical conditions (e.g., heart disease, liver problems, Parkinson's, epilepsy, diabetes).</p>
                      <Textarea
                        id="medical_conditions"
                        placeholder="List medical conditions"
                        {...form.register('medical_conditions')}
                        className="mt-2 min-h-32"
                      />
                      {form.formState.errors.medical_conditions && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.medical_conditions.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="substance_use_history" className="text-base font-medium">
                        Substance Use History <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Please detail your history with substances, including type, frequency, and duration of use.</p>
                      <Textarea
                        id="substance_use_history"
                        placeholder="Detail your substance use history"
                        {...form.register('substance_use_history')}
                        className="mt-2 min-h-32"
                      />
                      {form.formState.errors.substance_use_history && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.substance_use_history.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="family_personal_health_info" className="text-base font-medium">
                        Do you have any other notable family or personal health information you would like to share?
                      </Label>
                      <Textarea
                        id="family_personal_health_info"
                        placeholder="Share any additional health information"
                        {...form.register('family_personal_health_info')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pain_stiffness_swelling" className="text-base font-medium">
                        Do you experience any pain, stiffness, or swelling on a regular basis, if so, please explain?
                      </Label>
                      <Textarea
                        id="pain_stiffness_swelling"
                        placeholder="Describe any pain, stiffness, or swelling"
                        {...form.register('pain_stiffness_swelling')}
                        className="mt-2 min-h-24"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Health Sections */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Health Sections</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="metabolic_health_concerns" className="text-base font-medium">
                        Metabolic Health Concerns
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Blood Sugar Imbalances, Elevated Blood, Elevated Cholesterol, Elevated Triglycerides, other</p>
                      <Textarea
                        id="metabolic_health_concerns"
                        placeholder="Describe metabolic health concerns"
                        {...form.register('metabolic_health_concerns')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="digestive_health" className="text-base font-medium">
                        Digestive Health
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Bloating, Constipation, Diarrhea, Gas, Nausea, Stomach Pain, other</p>
                      <Textarea
                        id="digestive_health"
                        placeholder="Describe digestive health issues"
                        {...form.register('digestive_health')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reproductive_health" className="text-base font-medium">
                        Reproductive Health
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Infertility, Irregular Menstrual Cycle, Low Libido, Other</p>
                      <Textarea
                        id="reproductive_health"
                        placeholder="Describe reproductive health concerns"
                        {...form.register('reproductive_health')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="hormonal_health" className="text-base font-medium">
                        Hormonal Health
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Thyroid Condition, Toxin Exposure, Signs or Symptoms of Hormonal Imbalance, Other</p>
                      <Textarea
                        id="hormonal_health"
                        placeholder="Describe hormonal health concerns"
                        {...form.register('hormonal_health')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="immune_health" className="text-base font-medium">
                        Immune Health
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Autoimmune Conditions, Low Vitamin D Level, Frequent Illness or Infection, Allergies and Sensitivities, Other</p>
                      <Textarea
                        id="immune_health"
                        placeholder="Describe immune health concerns"
                        {...form.register('immune_health')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="food_allergies_intolerance" className="text-base font-medium">
                        Do you have any food allergies or intolerance, if so, please list?
                      </Label>
                      <Textarea
                        id="food_allergies_intolerance"
                        placeholder="List food allergies or intolerances"
                        {...form.register('food_allergies_intolerance')}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulties_chewing_swallowing" className="text-base font-medium">
                        Difficulties Chewing or Swallowing
                      </Label>
                      <Textarea
                        id="difficulties_chewing_swallowing"
                        placeholder="Describe any difficulties"
                        {...form.register('difficulties_chewing_swallowing')}
                        className="mt-2 min-h-24"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Medications and Mental Health */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Medications and Mental Health</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="medications_medical_use" className="text-base font-medium">
                        Medical Use - Medications
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">List all medications you are currently taking, including prescription drugs, over-the-counter medications, and supplements.</p>
                      <Textarea
                        id="medications_medical_use"
                        placeholder="List medications for medical use"
                        {...form.register('medications_medical_use')}
                        className="mt-2 min-h-32"
                      />
                    </div>

                    <div>
                      <Label htmlFor="medications_mental_health" className="text-base font-medium">
                        Mental Health - Medications
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">List all medications you are currently taking for mental health.</p>
                      <Textarea
                        id="medications_mental_health"
                        placeholder="List medications for mental health"
                        {...form.register('medications_mental_health')}
                        className="mt-2 min-h-32"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mental_health_conditions" className="text-base font-medium">
                        Mental Health Conditions
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Have you been diagnosed with any mental health conditions (e.g., depression, anxiety, bipolar disorder)? If so, please specify.</p>
                      <Textarea
                        id="mental_health_conditions"
                        placeholder="List mental health conditions"
                        {...form.register('mental_health_conditions')}
                        className="mt-2 min-h-32"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mental_health_treatment" className="text-base font-medium">
                        Are you currently receiving treatment for any mental health conditions? <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="mental_health_treatment"
                        placeholder="Describe your mental health treatment status"
                        {...form.register('mental_health_treatment')}
                        className="mt-2 min-h-24"
                      />
                      {form.formState.errors.mental_health_treatment && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.mental_health_treatment.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Allergies, Experiences, and Examinations */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Allergies, Experiences, and Examinations</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="allergies" className="text-base font-medium">
                        Allergies <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">List any known allergies, including drug allergies.</p>
                      <Textarea
                        id="allergies"
                        placeholder="List all allergies"
                        {...form.register('allergies')}
                        className="mt-2 min-h-32"
                      />
                      {form.formState.errors.allergies && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.allergies.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="previous_psychedelics_experiences" className="text-base font-medium">
                        Previous Experiences with Psychedelics or Hallucinogens <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Have you previously used any psychedelics or hallucinogens? If so, please describe your experiences.</p>
                      <Textarea
                        id="previous_psychedelics_experiences"
                        placeholder="Describe previous psychedelic experiences"
                        {...form.register('previous_psychedelics_experiences')}
                        className="mt-2 min-h-32"
                      />
                      {form.formState.errors.previous_psychedelics_experiences && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.previous_psychedelics_experiences.message}</p>
                      )}
                    </div>

                    {/* Physical Examination */}
                    <div>
                      <Label className="text-base font-medium">
                        Have you had a physical examination in the last 12 months? <span className="text-red-500">*</span>
                      </Label>
                      <RadioGroup
                        value={form.watch('has_physical_examination') ? 'yes' : 'no'}
                        onValueChange={(value) => {
                          form.setValue('has_physical_examination', value === 'yes')
                          if (value === 'no') {
                            form.setValue('physical_examination_records', '')
                            handleRemovePhysicalExamFile()
                          }
                        }}
                        className="mt-2"
                      >
                        <div className="flex gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="physical-exam-yes" />
                            <Label htmlFor="physical-exam-yes" className="font-normal cursor-pointer">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="physical-exam-no" />
                            <Label htmlFor="physical-exam-no" className="font-normal cursor-pointer">No</Label>
                          </div>
                        </div>
                      </RadioGroup>
                      
                      {form.watch('has_physical_examination') && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label htmlFor="physical_examination_records" className="text-sm font-medium">
                              Please provide details of the findings
                            </Label>
                            <Textarea
                              id="physical_examination_records"
                              placeholder="Provide physical examination details"
                              {...form.register('physical_examination_records')}
                              className="mt-2 min-h-32"
                            />
                          </div>
                          <div>
                            <Label htmlFor="physical_exam_file" className="text-sm font-medium">
                              Upload Physical Examination Report (Optional)
                            </Label>
                            <div className="mt-2">
                              {physicalExamFile ? (
                                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <Upload className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-700">{physicalExamFile.name}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemovePhysicalExamFile}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <label
                                  htmlFor="physical_exam_file"
                                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {isUploadingPhysicalExam ? (
                                      <Loader2 className="w-8 h-8 mb-2 text-gray-400 animate-spin" />
                                    ) : (
                                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    )}
                                    <p className="mb-2 text-sm text-gray-500">
                                      <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, PNG, JPG</p>
                                  </div>
                                  <input
                                    id="physical_exam_file"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    onChange={handlePhysicalExamFileUpload}
                                    disabled={isUploadingPhysicalExam}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cardiac Evaluation */}
                    <div>
                      <Label className="text-base font-medium">
                        Have you undergone any cardiac evaluations (e.g., EKG)? <span className="text-red-500">*</span>
                      </Label>
                      <RadioGroup
                        value={form.watch('has_cardiac_evaluation') ? 'yes' : 'no'}
                        onValueChange={(value) => {
                          form.setValue('has_cardiac_evaluation', value === 'yes')
                          if (value === 'no') {
                            form.setValue('cardiac_evaluation', '')
                            handleRemoveCardiacEvalFile()
                          }
                        }}
                        className="mt-2"
                      >
                        <div className="flex gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="cardiac-yes" />
                            <Label htmlFor="cardiac-yes" className="font-normal cursor-pointer">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="cardiac-no" />
                            <Label htmlFor="cardiac-no" className="font-normal cursor-pointer">No</Label>
                          </div>
                        </div>
                      </RadioGroup>
                      
                      {form.watch('has_cardiac_evaluation') && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label htmlFor="cardiac_evaluation" className="text-sm font-medium">
                              Please provide the date and results
                            </Label>
                            <Textarea
                              id="cardiac_evaluation"
                              placeholder="Provide cardiac evaluation details"
                              {...form.register('cardiac_evaluation')}
                              className="mt-2 min-h-32"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cardiac_eval_file" className="text-sm font-medium">
                              Upload Cardiac Evaluation Report (Optional)
                            </Label>
                            <div className="mt-2">
                              {cardiacEvalFile ? (
                                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <Upload className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-700">{cardiacEvalFile.name}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveCardiacEvalFile}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <label
                                  htmlFor="cardiac_eval_file"
                                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {isUploadingCardiac ? (
                                      <Loader2 className="w-8 h-8 mb-2 text-gray-400 animate-spin" />
                                    ) : (
                                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    )}
                                    <p className="mb-2 text-sm text-gray-500">
                                      <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, PNG, JPG</p>
                                  </div>
                                  <input
                                    id="cardiac_eval_file"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    onChange={handleCardiacEvalFileUpload}
                                    disabled={isUploadingCardiac}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Liver Function Tests */}
                    <div>
                      <Label className="text-base font-medium">
                        Have you had any liver function tests (e.g., blood work)? <span className="text-red-500">*</span>
                      </Label>
                      <RadioGroup
                        value={form.watch('has_liver_function_tests') ? 'yes' : 'no'}
                        onValueChange={(value) => {
                          form.setValue('has_liver_function_tests', value === 'yes')
                          if (value === 'no') {
                            form.setValue('liver_function_tests', '')
                            handleRemoveLiverTestFile()
                          }
                        }}
                        className="mt-2"
                      >
                        <div className="flex gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="liver-yes" />
                            <Label htmlFor="liver-yes" className="font-normal cursor-pointer">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="liver-no" />
                            <Label htmlFor="liver-no" className="font-normal cursor-pointer">No</Label>
                          </div>
                        </div>
                      </RadioGroup>
                      
                      {form.watch('has_liver_function_tests') && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label htmlFor="liver_function_tests" className="text-sm font-medium">
                              Please provide the date and results
                            </Label>
                            <Textarea
                              id="liver_function_tests"
                              placeholder="Provide liver function test details"
                              {...form.register('liver_function_tests')}
                              className="mt-2 min-h-32"
                            />
                          </div>
                          <div>
                            <Label htmlFor="liver_test_file" className="text-sm font-medium">
                              Upload Liver Function Test Report (Optional)
                            </Label>
                            <div className="mt-2">
                              {liverTestFile ? (
                                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <Upload className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-700">{liverTestFile.name}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveLiverTestFile}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <label
                                  htmlFor="liver_test_file"
                                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {isUploadingLiver ? (
                                      <Loader2 className="w-8 h-8 mb-2 text-gray-400 animate-spin" />
                                    ) : (
                                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    )}
                                    <p className="mb-2 text-sm text-gray-500">
                                      <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, PNG, JPG</p>
                                  </div>
                                  <input
                                    id="liver_test_file"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    onChange={handleLiverTestFileUpload}
                                    disabled={isUploadingLiver}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pregnancy question - only show for females */}
                    {form.watch('gender') !== 'M' && (
                      <div>
                        <Label className="text-base font-medium">
                          Are you currently pregnant or suspect you might be pregnant? <span className="text-red-500">*</span>
                        </Label>
                        <RadioGroup
                          value={form.watch('is_pregnant') ? 'yes' : 'no'}
                          onValueChange={(value) => form.setValue('is_pregnant', value === 'yes')}
                          className="mt-2"
                        >
                          <div className="flex gap-6">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="pregnant-yes" />
                              <Label htmlFor="pregnant-yes" className="font-normal cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="pregnant-no" />
                              <Label htmlFor="pregnant-no" className="font-normal cursor-pointer">No</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 7: Dietary and Lifestyle */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Dietary and Lifestyle Habits</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dietary_lifestyle_habits" className="text-base font-medium">
                        Dietary and Lifestyle Habits <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Describe your dietary habits and any specific dietary restrictions.</p>
                      <Textarea
                        id="dietary_lifestyle_habits"
                        placeholder="Describe your dietary and lifestyle habits"
                        {...form.register('dietary_lifestyle_habits')}
                        className="mt-2 min-h-32"
                      />
                      {form.formState.errors.dietary_lifestyle_habits && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.dietary_lifestyle_habits.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="physical_activity_exercise" className="text-base font-medium">
                        Physical Activity and Exercise <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-gray-600 mb-2">Describe your level of physical activity and exercise routine.</p>
                      <Textarea
                        id="physical_activity_exercise"
                        placeholder="Describe your physical activity and exercise routine"
                        {...form.register('physical_activity_exercise')}
                        className="mt-2 min-h-32"
                      />
                      {form.formState.errors.physical_activity_exercise && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.physical_activity_exercise.message}</p>
                      )}
                    </div>

                    {/* File Upload */}
                    <div>
                      <Label className="text-base font-medium">
                        Upload scanned copy (Optional)
                      </Label>
                      <div className="mt-2">
                        {uploadedFile ? (
                          <div className="flex items-center justify-between p-4 border border-gray-300 rounded-md bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{uploadedFile.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveFile}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <input
                              type="file"
                              id="file-upload"
                              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                              onChange={handleFileUpload}
                              disabled={isUploading}
                              className="hidden"
                            />
                            <label
                              htmlFor="file-upload"
                              className="flex flex-col items-center justify-center cursor-pointer"
                            >
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="text-blue-600 hover:text-blue-700">Browse Files</span> or drag and drop files here
                              </p>
                              <p className="text-xs text-gray-500">PDF, Images, or Word documents</p>
                            </label>
                          </div>
                        )}
                        {isUploading && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 8: Signature */}
              {currentStep === 8 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Consent and Acknowledgements</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">
                        Signature <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-2 border border-gray-300 rounded-md p-4 bg-white">
                        <SignaturePad
                          value={signature}
                          onChange={(data) => {
                            setSignature(data)
                            form.setValue('signature_data', data)
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
                        Date <span className="text-red-500">*</span> (MM-DD-YYYY)
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
                      const fieldsToValidate = getFieldsForStep(currentStep)
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
