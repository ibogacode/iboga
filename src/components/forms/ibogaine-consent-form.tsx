'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad } from '@/components/forms/signature-pad'
import { ibogaineConsentFormSchema, type IbogaineConsentFormValues } from '@/lib/validations/ibogaine-consent'
import { submitIbogaineConsentForm, getIntakeFormDataForConsent } from '@/actions/ibogaine-consent.action'
import { toast } from 'sonner'

// Consent section texts
const CONSENT_SECTIONS = [
  {
    heading: 'Consent for Treatment',
    text: `I, hereby referred to as "the Patient", voluntarily consent to participate in the Ibogaine therapy monitored by Iboga Wellness Institute. I understand that this therapy involves Ibogaine, a psychoactive substance derived from the Tabernanthe iboga plant, used in the treatment of substance dependency, PTSD, depression, anxiety, and for personal growth.`,
    field: 'consent_for_treatment' as const,
  },
  {
    heading: 'Risks and Benefits',
    text: `I acknowledge that I have been informed about the potential benefits, risks, and side effects associated with Ibogaine therapy, including but not limited to: changes in heart rate, blood pressure, nausea, hallucinations, emotional and psychological revelations, and in rare cases, severe health complications.`,
    field: 'risks_and_benefits' as const,
  },
  {
    heading: 'Pre-Screening and Health Assessment',
    text: `I confirm that I have undergone a comprehensive pre-screening and health assessment, including an EKG, blood work, and liver panel, conducted by Iboga Wellness Institute's onsite medical doctor. I have disclosed all relevant medical history, current medications, and substance use to ensure my suitability for Ibogaine therapy.`,
    field: 'pre_screening_health_assessment' as const,
  },
  {
    heading: 'Voluntary Participation',
    text: `I acknowledge that my participation in this therapy is entirely voluntary and that I have the right to withdraw my consent and discontinue participation at any time.`,
    field: 'voluntary_participation' as const,
  },
  {
    heading: 'Confidentiality',
    text: `I understand that my privacy will be respected, and all personal and medical information will be handled in accordance with Iboga Wellness Institute's privacy policy and applicable laws regarding patient confidentiality.`,
    field: 'confidentiality' as const,
  },
  {
    heading: 'Liability Release',
    text: `I release Iboga Wellness Institute, its medical team, therapists, administrative, and operational staff from all medical, legal, and administrative responsibility for any consequences arising from my participation in Ibogaine therapy, except in cases of gross negligence or willful misconduct.`,
    field: 'liability_release' as const,
  },
  {
    heading: 'Payment Collection by Iboga Wellness Institute',
    text: `I acknowledge and agree that Iboga Wellness Institute will collect payment for the services provided in accordance with the agreed-upon payment terms and schedule. I understand that payment is required as specified in my service agreement.`,
    field: 'payment_collection' as const,
  },
]

export function IbogaineConsentForm() {
  const searchParams = useSearchParams()
  const intakeFormId = searchParams.get('intake_form_id')
  const [currentStep, setCurrentStep] = useState(1)
  const [signature, setSignature] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoadingIntake, setIsLoadingIntake] = useState(false)
  
  const form = useForm<IbogaineConsentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ibogaineConsentFormSchema) as any,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      phone_number: '',
      email: '',
      address: '',
      treatment_date: '',
      facilitator_doctor_name: '',
      consent_for_treatment: false,
      risks_and_benefits: false,
      pre_screening_health_assessment: false,
      voluntary_participation: false,
      confidentiality: false,
      liability_release: false,
      payment_collection: false,
      signature_data: '',
      signature_date: '',
      signature_name: '',
      patient_id: null,
      intake_form_id: intakeFormId || null,
    },
  })

  // Auto-populate from intake form
  useEffect(() => {
    if (intakeFormId) {
      setIsLoadingIntake(true)
      getIntakeFormDataForConsent(intakeFormId)
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
            if (intakeData.address) {
              const addressParts = [
                intakeData.address,
                intakeData.city,
                intakeData.state,
                intakeData.zip_code,
              ].filter(Boolean)
              form.setValue('address', addressParts.join(', '))
            }
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
  const totalSteps = 4

  function formatPhoneNumber(value: string): string {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  function handlePhoneChange(value: string) {
    const formatted = formatPhoneNumber(value)
    form.setValue('phone_number', formatted)
  }

  function formatDate(value: string): string {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 8)}`
  }

  function handleDateChange(field: 'date_of_birth' | 'treatment_date', value: string) {
    const formatted = formatDate(value)
    form.setValue(field, formatted)
  }

  async function onSubmit(data: IbogaineConsentFormValues) {
    setIsLoading(true)
    
    try {
      // Format signature date
      const today = new Date().toISOString().split('T')[0]
      const result = await submitIbogaineConsentForm({
        ...data,
        signature_date: today,
        signature_data: signature,
        signature_name: `${data.first_name} ${data.last_name}`.trim(),
      })
      
      if (result?.data?.success) {
        setIsSubmitted(true)
        toast.success('Ibogaine Therapy Consent Form submitted successfully!')
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

  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Form Submitted Successfully!</h2>
          <p className="text-gray-600 mb-8">
            Thank you for submitting your Ibogaine Therapy Consent Form. We have received your information and will process it shortly.
          </p>
        </div>
      </div>
    )
  }

  if (isLoadingIntake) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Ibogaine Therapy Consent Form</h1>
          <p className="text-gray-600">Please complete all required fields marked with *</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Patient Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Patient Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="first_name" className="text-base font-semibold text-gray-900">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    {...form.register('first_name')}
                    className="mt-2"
                    placeholder="Enter first name"
                  />
                  {form.formState.errors.first_name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name" className="text-base font-semibold text-gray-900">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    {...form.register('last_name')}
                    className="mt-2"
                    placeholder="Enter last name"
                  />
                  {form.formState.errors.last_name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.last_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="date_of_birth" className="text-base font-semibold text-gray-900">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-2">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="date_of_birth"
                      {...form.register('date_of_birth')}
                      className="pl-10"
                      placeholder="MM-DD-YYYY"
                      maxLength={10}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        handleDateChange('date_of_birth', value)
                      }}
                    />
                  </div>
                  {form.formState.errors.date_of_birth && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.date_of_birth.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone_number" className="text-base font-semibold text-gray-900">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone_number"
                    {...form.register('phone_number')}
                    className="mt-2"
                    placeholder="(000) 000-0000"
                    maxLength={14}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                  />
                  {form.formState.errors.phone_number && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone_number.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-base font-semibold text-gray-900">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    className="mt-2"
                    placeholder="Enter email address"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address" className="text-base font-semibold text-gray-900">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    {...form.register('address')}
                    className="mt-2"
                    placeholder="Enter full address"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Therapy Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Therapy Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="treatment_date" className="text-base font-semibold text-gray-900">
                    Treatment Date <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-2">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="treatment_date"
                      {...form.register('treatment_date')}
                      className="pl-10"
                      placeholder="MM-DD-YYYY"
                      maxLength={10}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        handleDateChange('treatment_date', value)
                      }}
                    />
                  </div>
                  {form.formState.errors.treatment_date && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.treatment_date.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="facilitator_doctor_name" className="text-base font-semibold text-gray-900">
                    Facilitator/Doctor Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="facilitator_doctor_name"
                    {...form.register('facilitator_doctor_name')}
                    className="mt-2"
                    placeholder="Enter facilitator/doctor name"
                  />
                  {form.formState.errors.facilitator_doctor_name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.facilitator_doctor_name.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Consent Sections */}
          {currentStep === 3 && (
            <div className="space-y-6">

              
              <div className="space-y-6">
                {CONSENT_SECTIONS.map((section) => (
                  <div key={section.field} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {section.heading} <span className="text-red-500">*</span>
                    </h3>
                    <div className="bg-white p-4 rounded border border-gray-200 mb-4">
                      <p className="text-sm text-gray-700 whitespace-pre-line">{section.text}</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={section.field}
                        checked={form.watch(section.field)}
                        onCheckedChange={(checked) => form.setValue(section.field, checked === true)}
                        className="mt-1"
                      />
                      <Label htmlFor={section.field} className="text-base font-medium text-gray-900 leading-relaxed cursor-pointer flex-1">
                        I acknowledge and agree to the above statement <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    {form.formState.errors[section.field] && (
                      <p className="text-sm text-red-500 mt-2 ml-7">{form.formState.errors[section.field]?.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Signature */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Signature</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <Label className="text-base font-semibold text-gray-900 mb-4 block">
                  Please sign below <span className="text-red-500">*</span>
                </Label>
                <SignaturePad
                  onChange={(sig) => {
                    setSignature(sig)
                    form.setValue('signature_data', sig)
                  }}
                />
                {form.formState.errors.signature_data && (
                  <p className="text-sm text-red-500 mt-2">{form.formState.errors.signature_data.message}</p>
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
              Previous
            </Button>
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={() => {
                  // Validate current step before proceeding
                  const fieldsToValidate: (keyof IbogaineConsentFormValues)[] = 
                    currentStep === 1 
                      ? ['first_name', 'last_name', 'date_of_birth', 'phone_number', 'email', 'address']
                      : currentStep === 2
                      ? ['treatment_date', 'facilitator_doctor_name']
                      : currentStep === 3
                      ? ['consent_for_treatment', 'risks_and_benefits', 'pre_screening_health_assessment', 'voluntary_participation', 'confidentiality', 'liability_release', 'payment_collection']
                      : []
                  
                  form.trigger(fieldsToValidate).then((isValid) => {
                    if (isValid) {
                      setCurrentStep(currentStep + 1)
                    }
                  })
                }}
                disabled={isLoading}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading || !signature}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Form'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

