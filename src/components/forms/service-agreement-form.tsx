'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignaturePad } from '@/components/forms/signature-pad'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { serviceAgreementSchema, type ServiceAgreementFormValues } from '@/lib/validations/service-agreement'
import { submitServiceAgreement, uploadServiceAgreementDocument, getPatientDataForServiceAgreement } from '@/actions/service-agreement.action'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { SERVICE_AGREEMENT_TEXT, ServiceAgreementContent } from '@/components/forms/form-content'

interface ServiceAgreementFormProps {
  prefillPatientData?: boolean // If true, fetch and pre-fill patient data
}

export function ServiceAgreementForm({ prefillPatientData = false }: ServiceAgreementFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(prefillPatientData)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null)
  const [patientSignature, setPatientSignature] = useState('')
  const [providerSignature, setProviderSignature] = useState('')
  const [patientId, setPatientId] = useState<string | null>(null)
  const [intakeFormId, setIntakeFormId] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  
  const totalSteps = 6
  
  const form = useForm<ServiceAgreementFormValues>({
    resolver: zodResolver(serviceAgreementSchema),
    mode: 'onBlur', // Changed from 'onChange' to prevent constant re-renders
    defaultValues: {
      patient_first_name: '',
      patient_last_name: '',
      patient_email: '',
      patient_phone_number: '',
      total_program_fee: '',
      deposit_amount: '',
      deposit_percentage: '',
      remaining_balance: '0',
      payment_method: '',
      patient_signature_name: '',
      patient_signature_first_name: '',
      patient_signature_last_name: '',
      patient_signature_date: '',
      patient_signature_data: '',
      provider_signature_name: '',
      provider_signature_first_name: '',
      provider_signature_last_name: '',
      provider_signature_date: '',
      provider_signature_data: '',
      uploaded_file_url: '',
      uploaded_file_name: '',
    },
  })

  // Fetch and pre-populate patient data if requested
  useEffect(() => {
    if (!prefillPatientData) {
      setIsLoadingPatientData(false)
      return
    }

    let isMounted = true

    async function loadPatientData() {
      try {
        const result = await getPatientDataForServiceAgreement()
        
        if (!isMounted) return
        
        if (result.success && result.data) {
          const { profile, intakeForm, existingForm } = result.data
          
          // Set patient ID and intake form ID for linking
          if (profile.id) {
            setPatientId(profile.id)
            form.setValue('patient_id', profile.id)
          }
          
          if (intakeForm?.id) {
            setIntakeFormId(intakeForm.id)
            form.setValue('intake_form_id', intakeForm.id)
          }
          
          // Pre-populate patient information
          // Use intake form data if available, otherwise use profile data
          const firstName = intakeForm?.first_name || profile.first_name || ''
          const lastName = intakeForm?.last_name || profile.last_name || ''
          const email = intakeForm?.email || profile.email || ''
          const phone = intakeForm?.phone_number || profile.phone || ''
          
          form.setValue('patient_first_name', firstName)
          form.setValue('patient_last_name', lastName)
          form.setValue('patient_email', email)
          form.setValue('patient_phone_number', phone)
          
          // Pre-populate signature name fields
          form.setValue('patient_signature_first_name', firstName)
          form.setValue('patient_signature_last_name', lastName)
          form.setValue('patient_signature_name', `${firstName} ${lastName}`.trim())
          
          // Pre-populate admin fields from existing form (read-only for patients)
          if (existingForm) {
            form.setValue('total_program_fee', existingForm.total_program_fee ? `$${Number(existingForm.total_program_fee).toLocaleString()}` : '')
            form.setValue('deposit_amount', existingForm.deposit_amount ? `$${Number(existingForm.deposit_amount).toLocaleString()}` : '')
            form.setValue('deposit_percentage', existingForm.deposit_percentage ? String(existingForm.deposit_percentage) : '')
            form.setValue('remaining_balance', existingForm.remaining_balance ? String(existingForm.remaining_balance) : '0')
            form.setValue('payment_method', existingForm.payment_method || '')
            form.setValue('provider_signature_name', existingForm.provider_signature_name || '')
            form.setValue('provider_signature_first_name', existingForm.provider_signature_first_name || '')
            form.setValue('provider_signature_last_name', existingForm.provider_signature_last_name || '')
            if (existingForm.provider_signature_date) {
              form.setValue('provider_signature_date', new Date(existingForm.provider_signature_date).toISOString().split('T')[0])
            }
          }
        } else {
          // Show error and prevent form access
          const errorMessage = result.error || 'Failed to load patient data'
          toast.error(errorMessage)
          setIsLoadingPatientData(false)
          // Set access denied if form is not activated
          if (errorMessage.includes('not yet activated')) {
            setAccessDenied(true)
          }
          return
        }
      } catch (error) {
        console.error('Error loading patient data:', error)
      } finally {
        if (isMounted) {
          setIsLoadingPatientData(false)
        }
      }
    }

    loadPatientData()

    return () => {
      isMounted = false
    }
  }, [prefillPatientData]) // Removed 'form' from dependencies to prevent infinite re-renders

  // Calculate remaining balance when deposit changes
  const handleDepositChange = (value: string) => {
    const total = parseFloat(form.getValues('total_program_fee').replace(/[^0-9.]/g, '')) || 0
    const deposit = parseFloat(value.replace(/[^0-9.]/g, '')) || 0
    const percentage = total > 0 ? (deposit / total) * 100 : 0
    const remaining = total - deposit
    
    form.setValue('deposit_amount', value)
    form.setValue('deposit_percentage', percentage.toFixed(2))
    form.setValue('remaining_balance', remaining.toFixed(2))
  }

  // Calculate deposit percentage when total changes
  const handleTotalChange = (value: string) => {
    const total = parseFloat(value.replace(/[^0-9.]/g, '')) || 0
    const deposit = parseFloat(form.getValues('deposit_amount').replace(/[^0-9.]/g, '')) || 0
    const percentage = total > 0 ? (deposit / total) * 100 : 0
    const remaining = total - deposit
    
    form.setValue('total_program_fee', value)
    form.setValue('deposit_percentage', percentage.toFixed(2))
    form.setValue('remaining_balance', remaining.toFixed(2))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = await uploadServiceAgreementDocument(formData)
      if (result.success && result.data) {
        setUploadedFile({ url: result.data.fileUrl, name: result.data.fileName })
        form.setValue('uploaded_file_url', result.data.fileUrl)
        form.setValue('uploaded_file_name', result.data.fileName)
        toast.success('File uploaded successfully')
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    } catch (error) {
      toast.error('An error occurred while uploading the file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    form.setValue('uploaded_file_url', '')
    form.setValue('uploaded_file_name', '')
  }

  // Helper function to get fields for each step for validation
  function getFieldsForStep(step: number): (keyof ServiceAgreementFormValues)[] {
    switch (step) {
      case 1:
        return [] // Service Agreement Text - no validation needed
      case 2:
        return ['patient_first_name', 'patient_last_name', 'patient_email', 'patient_phone_number']
      case 3:
        return ['total_program_fee', 'deposit_amount', 'deposit_percentage', 'remaining_balance', 'payment_method']
      case 4:
        return ['patient_signature_name', 'patient_signature_first_name', 'patient_signature_last_name', 'patient_signature_date', 'patient_signature_data']
      case 5:
        return ['provider_signature_name', 'provider_signature_first_name', 'provider_signature_last_name', 'provider_signature_date', 'provider_signature_data']
      case 6:
        return [] // File upload is optional
      default:
        return []
    }
  }

  const onSubmit = async (data: ServiceAgreementFormValues) => {
    setIsLoading(true)
    
    // Check activation status before allowing submission (for patients)
    if (prefillPatientData) {
      const activationCheck = await getPatientDataForServiceAgreement()
      if (!activationCheck.success) {
        toast.error(activationCheck.error || 'Form is not activated')
        setIsLoading(false)
        return
      }
    }
    
    // Set signature data
    if (patientSignature) {
      data.patient_signature_data = patientSignature
    }
    if (providerSignature) {
      data.provider_signature_data = providerSignature
    }
    
    // Auto-link to patient and intake form if available
    if (patientId) {
      data.patient_id = patientId
    }
    if (intakeFormId) {
      data.intake_form_id = intakeFormId
    }

    try {
      const result = await submitServiceAgreement(data)
      
      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }

      if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
        const firstError = errors.length > 0 ? String(errors[0]) : null
        toast.error(firstError || 'Validation failed')
        return
      }

      if (result?.data?.success) {
        toast.success('Service agreement created successfully!')
        setIsSubmitted(true)
        // Don't redirect for patients - let them see success message
        if (prefillPatientData) {
          // Patient submitted - stay on page to show success
        } else {
          // Admin/Owner submitted - redirect after delay
          setTimeout(() => {
            router.push('/owner/service-agreements')
          }, 2000)
        }
      } else if (result?.data?.error) {
        toast.error(result.data.error)
      } else {
        toast.error('Failed to create service agreement')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingPatientData) {
    return (
      <div className="min-h-screen bg-#EDE9E4">
        <div className="max-w-4xl mx-auto bg-white p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading your information...</span>
          </div>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-#EDE9E4">
        <div className="max-w-4xl mx-auto bg-white p-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Form Not Available</h1>
            <p className="text-gray-600 mb-8">This form is not yet activated. Please wait for admin activation.</p>
            <Button onClick={() => router.push('/patient/tasks')} className="mt-4">
              Go to Tasks
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-#EDE9E4">
      <div className="max-w-4xl mx-auto bg-white p-8">
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
              Your service agreement has been submitted successfully.
            </p>
            <p className="text-base text-gray-500">
              We will review your information and get back to you soon.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Service Agreement
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

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Step 1: Service Agreement Text */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Service Agreement</h2>
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <ServiceAgreementContent text={SERVICE_AGREEMENT_TEXT} />
                  </div>
                </div>
              )}

              {/* Step 2: Patient Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Patient Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patient_first_name" className="text-base font-medium">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="patient_first_name"
                        {...form.register('patient_first_name')}
                        className={`h-12 ${form.formState.errors.patient_first_name ? 'border-red-500' : ''}`}
                      />
                      {form.formState.errors.patient_first_name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_first_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="patient_last_name" className="text-base font-medium">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="patient_last_name"
                        {...form.register('patient_last_name')}
                        className={`h-12 ${form.formState.errors.patient_last_name ? 'border-red-500' : ''}`}
                      />
                      {form.formState.errors.patient_last_name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_last_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="patient_email" className="text-base font-medium">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="patient_email"
                        type="email"
                        {...form.register('patient_email')}
                        className={`h-12 ${form.formState.errors.patient_email ? 'border-red-500' : ''}`}
                      />
                      {form.formState.errors.patient_email && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="patient_phone_number" className="text-base font-medium">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="patient_phone_number"
                        type="tel"
                        placeholder="(000) 000-0000"
                        {...form.register('patient_phone_number')}
                        className={`h-12 ${form.formState.errors.patient_phone_number ? 'border-red-500' : ''}`}
                      />
                      {form.formState.errors.patient_phone_number && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_phone_number.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Fees & Payment */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Fees & Payment</h2>
                  <p className="text-sm text-gray-600">Fee amounts have been pre-filled by the administration. Please select your payment method.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_program_fee" className="text-base font-medium">
                Total Program Fee (USD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="total_program_fee"
                readOnly
                value={form.watch('total_program_fee')}
                className="h-12 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="deposit_amount" className="text-base font-medium">
                Deposit Amount (USD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposit_amount"
                readOnly
                value={form.watch('deposit_amount')}
                className="h-12 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="deposit_percentage" className="text-base font-medium">
                Deposit Equals (% of Total Fee) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposit_percentage"
                readOnly
                value={form.watch('deposit_percentage')}
                className="h-12 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="remaining_balance" className="text-base font-medium">
                Remaining Balance (Before Arrival) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="remaining_balance"
                readOnly
                value={`$${form.watch('remaining_balance')}`}
                className="h-12 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="payment_method" className="text-base font-medium">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('payment_method')}
                onValueChange={(value) => form.setValue('payment_method', value)}
              >
                <SelectTrigger className={`h-12 ${form.formState.errors.payment_method ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.payment_method && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.payment_method.message}
                </p>
              )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Patient Signature */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">For Patient</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patient_signature_first_name" className="text-base font-medium">
                        Patient Name - First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="patient_signature_first_name"
                        {...form.register('patient_signature_first_name')}
                        className={`h-12 ${form.formState.errors.patient_signature_first_name ? 'border-red-500' : ''}`}
                      />
                      {form.formState.errors.patient_signature_first_name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_signature_first_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="patient_signature_last_name" className="text-base font-medium">
                        Patient Name - Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="patient_signature_last_name"
                        {...form.register('patient_signature_last_name')}
                        className={`h-12 ${form.formState.errors.patient_signature_last_name ? 'border-red-500' : ''}`}
                      />
                      {form.formState.errors.patient_signature_last_name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_signature_last_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="patient_signature_name" className="text-base font-medium">
                        Patient Name (Full) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="patient_signature_name"
                        {...form.register('patient_signature_name')}
                        className={`h-12 ${form.formState.errors.patient_signature_name ? 'border-red-500' : ''}`}
                      />
                      {form.formState.errors.patient_signature_name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_signature_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="patient_signature_date" className="text-base font-medium">
                        Date Signed by Patient <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="patient_signature_date"
                          type="date"
                          {...form.register('patient_signature_date')}
                          className={`h-12 ${form.formState.errors.patient_signature_date ? 'border-red-500' : ''}`}
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                      {form.formState.errors.patient_signature_date && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.patient_signature_date.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Patient Signature</Label>
                    <SignaturePad
                      onChange={(signatureData) => {
                        setPatientSignature(signatureData)
                        form.setValue('patient_signature_data', signatureData)
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Provider Signature */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Provider Signature</h2>
                  <p className="text-sm text-gray-600">This section has been completed by the administration.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="provider_signature_first_name" className="text-base font-medium">
                        Provider Name - First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="provider_signature_first_name"
                        readOnly
                        value={form.watch('provider_signature_first_name')}
                        className="h-12 bg-gray-50 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <Label htmlFor="provider_signature_last_name" className="text-base font-medium">
                        Provider Name - Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="provider_signature_last_name"
                        readOnly
                        value={form.watch('provider_signature_last_name')}
                        className="h-12 bg-gray-50 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <Label htmlFor="provider_signature_name" className="text-base font-medium">
                        Provider Name (Full) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="provider_signature_name"
                        readOnly
                        value={form.watch('provider_signature_name')}
                        className="h-12 bg-gray-50 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <Label htmlFor="provider_signature_date" className="text-base font-medium">
                        Date Signed by Provider <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="provider_signature_date"
                        type="date"
                        readOnly
                        value={form.watch('provider_signature_date')}
                        className="h-12 bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: File Upload */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Upload Signed Service Agreement & Cancelation Form (Scan / PDF / JPEG)
                  </h2>
                  
                  <div className="space-y-4">
                    {uploadedFile ? (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Upload className="h-5 w-5 text-gray-500" />
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
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                              <span className="text-sm text-gray-500">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                Browse Files
                              </span>
                              <span className="text-xs text-gray-500">
                                Drag and drop files here
                              </span>
                              <span className="text-xs text-gray-400">
                                No file chosen
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      Please upload the client-signed Service Agreement & Cancelation form
                    </p>
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
                  className="h-12 px-6"
                >
                  Back
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={async () => {
                      // Validate current step before proceeding
                      const fieldsToValidate = getFieldsForStep(currentStep)
                      if (fieldsToValidate.length > 0) {
                        const isValid = await form.trigger(fieldsToValidate as any)
                        if (!isValid) {
                          // Scroll to first error
                          const firstErrorField = fieldsToValidate.find((field: keyof ServiceAgreementFormValues) => 
                            form.formState.errors[field as keyof typeof form.formState.errors]
                          )
                          if (firstErrorField) {
                            const element = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`)
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                          }
                          return
                        }
                      }
                      setCurrentStep(currentStep + 1)
                    }}
                    className="h-12 px-6"
                  >
                    Next
                  </Button>
                ) : (
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isLoading}
                      className="h-12 px-6"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="h-12 px-6">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
