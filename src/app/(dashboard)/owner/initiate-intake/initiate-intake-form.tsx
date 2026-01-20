'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { partialIntakeFormSchema, type PartialIntakeFormSchemaValues } from '@/lib/validations/partial-intake'
import { createPartialIntakeForm } from '@/actions/partial-intake.action'
import { addExistingPatient } from '@/actions/existing-patient.action'
import { toast } from 'sonner'

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

// Canadian Provinces and Territories list
const CANADIAN_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon'
]

type Step = 'entry-mode' | 'details' | 'confirmation' | 'existing-patient'

interface InitiateIntakeFormProps {
  onSuccess?: () => void
  onClose?: () => void
  onStepChange?: (step: 'entry-mode' | 'details' | 'confirmation') => void
}

export default function InitiateIntakeForm({ onSuccess, onClose, onStepChange }: InitiateIntakeFormProps = {}) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('entry-mode')
  const [mode, setMode] = useState<'minimal' | 'partial' | 'existing'>('minimal')
  const [isLoading, setIsLoading] = useState(false)
  const [submittedData, setSubmittedData] = useState<{
    recipient_name: string
    recipient_email: string
    mode: 'minimal' | 'partial'
  } | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)

  const form = useForm<PartialIntakeFormSchemaValues>({
    resolver: zodResolver(partialIntakeFormSchema),
    mode: 'onChange',
    defaultValues: {
      mode: 'minimal',
      filled_by: 'self',
      filler_relationship: null,
      filler_first_name: null,
      filler_last_name: null,
      filler_email: null,
      filler_phone: null,
      first_name: '',
      last_name: '',
      email: '',
      country: '',
    },
  })

  async function onSubmit(data: PartialIntakeFormSchemaValues) {
    setIsLoading(true)
    try {
      const result = await createPartialIntakeForm(data)
      
      // Store submitted data for confirmation step (regardless of success/failure)
      const recipientName = data.filled_by === 'self' 
        ? `${data.first_name} ${data.last_name}`.trim()
        : `${data.filler_first_name || ''} ${data.filler_last_name || ''}`.trim()
      const recipientEmail = data.filled_by === 'self' 
        ? data.email 
        : (data.filler_email || '')
      
      setSubmittedData({
        recipient_name: recipientName,
        recipient_email: recipientEmail || '',
        mode: data.mode
      })
      
      if (result?.serverError) {
        setIsSuccess(false)
        setErrorMessage(result.serverError)
        setCurrentStep('confirmation')
        if (onStepChange) {
          onStepChange('confirmation')
        }
        setShowErrorDialog(true)
        setIsLoading(false)
        return
      }
      
      if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
        const firstError = errors.length > 0 ? String(errors[0]) : null
        setIsSuccess(false)
        setErrorMessage(firstError || 'Validation failed')
        setCurrentStep('confirmation')
        if (onStepChange) {
          onStepChange('confirmation')
        }
        setShowErrorDialog(true)
        setIsLoading(false)
        return
      }
      
      if (result?.data?.success) {
        setIsSuccess(true)
        setErrorMessage(null)
        setIsLoading(false)
        setCurrentStep('confirmation')
        // Notify parent of step change
        if (onStepChange) {
          onStepChange('confirmation')
        }
        // DON'T call onSuccess here - it causes re-render and resets the modal
        // onSuccess will be called when user closes the modal or navigates away
      } else if (result?.data?.error) {
        setIsSuccess(false)
        setErrorMessage(result.data.error)
        setCurrentStep('confirmation')
        setIsLoading(false)
        if (onStepChange) {
          onStepChange('confirmation')
        }
        setShowErrorDialog(true)
      } else {
        setIsSuccess(false)
        setErrorMessage('Failed to create intake form')
        setCurrentStep('confirmation')
        setIsLoading(false)
        if (onStepChange) {
          onStepChange('confirmation')
        }
        setShowErrorDialog(true)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setIsSuccess(false)
      setErrorMessage('An unexpected error occurred')
      setCurrentStep('confirmation')
      setIsLoading(false)
      if (onStepChange) {
        onStepChange('confirmation')
      }
      setShowErrorDialog(true)
    }
  }

  function handleModeSelect(selectedMode: 'minimal' | 'partial' | 'existing') {
    setMode(selectedMode)
    if (selectedMode === 'existing') {
      // Redirect to existing patient page
      router.push('/patient-pipeline/add-existing-patient')
      if (onClose) {
        onClose()
      }
    } else {
      form.setValue('mode', selectedMode)
      setCurrentStep('details')
      if (onStepChange) {
        onStepChange('details')
      }
    }
  }

  async function handleExistingPatientSubmit(data: any) {
    setIsLoading(true)
    try {
      const result = await addExistingPatient(data)
      
      if (result?.data?.success) {
        setIsSuccess(true)
        setErrorMessage(null)
        setSubmittedData({
          recipient_name: `${data.first_name} ${data.last_name}`,
          recipient_email: data.email,
          mode: 'existing' as any,
        })
        setCurrentStep('confirmation')
        if (onStepChange) {
          onStepChange('confirmation')
        }
      } else {
        setIsSuccess(false)
        setErrorMessage(result?.data?.error || 'Failed to add existing patient')
        setCurrentStep('confirmation')
        if (onStepChange) {
          onStepChange('confirmation')
        }
        setShowErrorDialog(true)
      }
    } catch (error) {
      console.error('Error submitting existing patient:', error)
      setIsSuccess(false)
      setErrorMessage('An unexpected error occurred')
      setCurrentStep('confirmation')
      if (onStepChange) {
        onStepChange('confirmation')
      }
      setShowErrorDialog(true)
    } finally {
      setIsLoading(false)
    }
  }

  function handleBack() {
    if (currentStep === 'details' || currentStep === 'existing-patient') {
      setCurrentStep('entry-mode')
      if (onStepChange) {
        onStepChange('entry-mode')
      }
    }
  }

  function handleContinue() {
    if (currentStep === 'entry-mode') {
      setCurrentStep('details')
      if (onStepChange) {
        onStepChange('details')
      }
    }
  }

  function handleViewPatientRecord() {
    // Close the modal first (this will trigger onSuccess in the modal)
    if (onClose) {
      onClose()
    }
    // Navigate to patient pipeline
    router.push('/patient-pipeline')
  }

  function handleAddAnotherPatient() {
    form.reset({
      mode: 'minimal',
      filled_by: 'self',
      filler_relationship: null,
      filler_first_name: null,
      filler_last_name: null,
      filler_email: null,
      filler_phone: null,
      first_name: '',
      last_name: '',
      email: '',
    })
    setMode('minimal')
    setCurrentStep('entry-mode')
    setSubmittedData(null)
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 md:gap-8">
          {/* Header Section */}
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
            <div className="flex flex-col gap-[10px]">
              <h1 
                className="text-2xl font-medium text-black leading-[1.193em] tracking-[-0.04em]"
                style={{ fontFamily: 'SF Pro Text, -apple-system, system-ui, sans-serif' }}
              >
                {currentStep === 'confirmation' ? 'Invite Sent Successfully' : 'Add Patient'}
              </h1>
              <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">
                {currentStep === 'entry-mode' && 'Choose how much information you want to capture before sending the patient application.'}
                {currentStep === 'details' && (mode === 'minimal' 
                  ? 'Minimal mode: enter name + email. We\'ll email the patient their application form link.'
                  : 'Partial mode: capture key details while assisting the patient. Application link is emailed with data prefilled.')}
                {currentStep === 'confirmation' && 'The patient has received their application form via email.'}
              </p>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-[46px]">
              <button
                onClick={() => setCurrentStep('entry-mode')}
                disabled={currentStep === 'confirmation'}
                className={`w-[205px] h-[33px] rounded-full text-sm leading-[1.193em] tracking-[-0.04em] transition-all flex items-center justify-center ${
                  currentStep === 'entry-mode'
                    ? 'bg-white text-[#6E7A46] shadow-[0px_2px_16px_0px_rgba(0,0,0,0.08)]'
                    : 'text-[#090909] bg-transparent'
                } ${currentStep === 'confirmation' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Entry Mode
              </button>
              <button
                onClick={() => {
                  if (mode === 'existing') {
                    setCurrentStep('existing-patient')
                  } else {
                    setCurrentStep('details')
                  }
                }}
                disabled={currentStep === 'confirmation'}
                className={`w-[119px] h-[33px] rounded-full text-sm leading-[1.193em] tracking-[-0.04em] transition-all flex items-center justify-center ${
                  (currentStep === 'details' || currentStep === 'existing-patient')
                    ? 'bg-white text-[#6E7A46] shadow-[0px_2px_16px_0px_rgba(0,0,0,0.08)]'
                    : 'text-[#090909] bg-transparent'
                } ${currentStep === 'confirmation' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {mode === 'existing' ? 'Patient Details' : 'Details'}
              </button>
              <button
                className={`w-[94px] h-[33px] rounded-full text-sm leading-[1.193em] tracking-[-0.04em] flex items-center justify-center ${
                  currentStep === 'confirmation'
                    ? 'bg-white text-[#6E7A46] shadow-[0px_2px_16px_0px_rgba(0,0,0,0.08)]'
                    : 'text-[#090909] bg-transparent opacity-50'
                }`}
                disabled
              >
                Confirmation
              </button>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 'entry-mode' && (
            <>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                {/* Minimal Card */}
                <div className="flex-1 bg-[#F5F4F0] border border-[#D6D2C8] rounded-[10px] p-5 flex flex-col gap-[25px]">
                  <div className="flex flex-col gap-[3px]">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-normal text-black leading-[1.48em] tracking-[-0.04em]">Minimal</h3>
                    </div>
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#777777] leading-[1.5em] tracking-[-0.04em]">
                        Enter only name and email. We email the patient their application form.
                      </p>
                      <p className="text-sm text-[#777777] leading-[1.5em] tracking-[-0.04em] font-medium mt-2">
                        Name<br />Email
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleModeSelect('minimal')}
                    className="w-full h-auto py-[10px] px-4 bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                  >
                    Select Minimal
                  </Button>
                </div>

                {/* Partial Card */}
                <div className="flex-1 bg-[#F5F4F0] border border-[#D6D2C8] rounded-[10px] p-5 flex flex-col gap-[25px]">
                  <div className="flex flex-col gap-[3px]">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-normal text-black leading-[1.48em] tracking-[-0.04em]">Partial</h3>
                    </div>
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#777777] leading-[1.5em] tracking-[-0.04em]">
                        Capture key details while assisting the patient. Application link is emailed with data prefilled.
                      </p>
                      <p className="text-sm text-[#777777] leading-[1.5em] tracking-[-0.04em] font-medium mt-2">
                        Name & Email<br />Emergency contact
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleModeSelect('partial')}
                    className="w-full h-auto py-[10px] px-4 bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                  >
                    Select Partial
                  </Button>
                </div>

                {/* Existing Patient Card */}
                <div className="flex-1 bg-[#F5F4F0] border border-[#D6D2C8] rounded-[10px] p-5 flex flex-col gap-[25px]">
                  <div className="flex flex-col gap-[3px]">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-normal text-black leading-[1.48em] tracking-[-0.04em]">Existing Patient</h3>
                    </div>
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#777777] leading-[1.5em] tracking-[-0.04em]">
                        Add an existing patient with all details. Admin can upload documents on their behalf.
                      </p>
                      <p className="text-sm text-[#777777] leading-[1.5em] tracking-[-0.04em] font-medium mt-2">
                        Full Details<br />Document Uploads
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleModeSelect('existing')}
                    className="w-full h-auto py-[10px] px-4 bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                  >
                    Add Existing Patient
                  </Button>
                </div>
              </div>

              {/* What happens next */}
              <div className="flex flex-col gap-[10px] pt-[30px] border-t border-[#D6D2C8]">
                <h3 className="text-lg font-medium text-black leading-[1.193em] tracking-[-0.04em]">What happens next?</h3>
                <p className="text-sm text-[#777777] leading-[2.03em] tracking-[-0.04em]">
                  Once selected, you'll enter the required details and the system will:<br />
                  Create a patient record in the pipeline.<br />
                  Send the patient a secure application form link.<br />
                  Track form completion (0/4 → 4/4)
                </p>
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-[23px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (onClose) {
                      onClose()
                    } else {
                      router.back()
                    }
                  }}
                  className="h-auto py-[10px] px-4 bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50 rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={!mode}
                  className="h-auto py-[10px] px-4 bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base"
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {currentStep === 'details' && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              {/* Patient Details Header */}
              <div className="flex flex-col gap-[10px]">
                <h2 className="text-lg font-medium text-black leading-[1.193em] tracking-[-0.04em]">Patient Details</h2>
                <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Required fields are marked with *</p>
              </div>

              {/* Form Filler Section */}
              <div className="space-y-4">
                <Label className="text-base font-medium text-[#2B2820]">
                  Who will fill out this form? <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={form.watch('filled_by')}
                  onValueChange={(value) => {
                    form.setValue('filled_by', value as 'self' | 'someone_else')
                    if (value === 'self') {
                      form.setValue('filler_relationship', null)
                      form.setValue('filler_first_name', null)
                      form.setValue('filler_last_name', null)
                      form.setValue('filler_email', null)
                      form.setValue('filler_phone', null)
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="self" id="filled_by_self" />
                    <Label htmlFor="filled_by_self" className="font-normal cursor-pointer text-[#2B2820]">
                      Patient will fill it out themselves
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="someone_else" id="filled_by_other" />
                    <Label htmlFor="filled_by_other" className="font-normal cursor-pointer text-[#2B2820]">
                      Someone else will fill it out for the patient
                    </Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.filled_by && (
                  <p className="text-sm text-red-500">{form.formState.errors.filled_by.message}</p>
                )}

                {/* Filler Information */}
                {form.watch('filled_by') === 'someone_else' && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                    <div>
                      <Label htmlFor="filler_relationship" className="text-base font-medium text-[#2B2820]">
                        What is their relationship to the patient? <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={form.watch('filler_relationship') || ''}
                        onValueChange={(value) => form.setValue('filler_relationship', value)}
                      >
                        <SelectTrigger className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="filler_first_name" className="text-base font-medium text-[#2B2820]">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="filler_first_name"
                          placeholder="First Name"
                          {...form.register('filler_first_name')}
                          className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                        />
                        {form.formState.errors.filler_first_name && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_first_name.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="filler_last_name" className="text-base font-medium text-[#2B2820]">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="filler_last_name"
                          placeholder="Last Name"
                          {...form.register('filler_last_name')}
                          className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                        />
                        {form.formState.errors.filler_last_name && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_last_name.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="filler_email" className="text-base font-medium text-[#2B2820]">
                        Their Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="filler_email"
                        type="email"
                        placeholder="Enter your email"
                        {...form.register('filler_email')}
                        className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                      />
                      {form.formState.errors.filler_email && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="filler_phone" className="text-base font-medium text-[#2B2820]">
                        Their Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="filler_phone"
                        type="tel"
                        placeholder="(123) 000-0000"
                        {...form.register('filler_phone')}
                        onChange={(e) => {
                          const value = e.target.value
                          const numbers = value.replace(/\D/g, '')
                          let formatted = value
                          if (numbers.length <= 3) formatted = numbers
                          else if (numbers.length <= 6) formatted = `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
                          else formatted = `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
                          form.setValue('filler_phone', formatted)
                        }}
                        className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                      />
                      {form.formState.errors.filler_phone && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_phone.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Patient Information - Only show if patient is filling themselves */}
              {form.watch('filled_by') === 'self' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="first_name" className="text-base font-medium text-[#2B2820]">
                        First Name*
                      </Label>
                      <Input
                        id="first_name"
                        placeholder="First Name"
                        {...form.register('first_name')}
                        className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                      />
                      {form.formState.errors.first_name && (
                        <p className="text-sm text-red-500">{form.formState.errors.first_name.message}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="last_name" className="text-base opacity-0 sm:opacity-100">Last Name*</Label>
                      <Input
                        id="last_name"
                        placeholder="Last Name"
                        {...form.register('last_name')}
                        className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                      />
                      {form.formState.errors.last_name && (
                        <p className="text-sm text-red-500">{form.formState.errors.last_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label htmlFor="email" className="text-base font-medium text-[#2B2820]">
                      Email*
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      {...form.register('email')}
                      className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Partial Mode Fields */}
                  {mode === 'partial' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-3">
                          <Label htmlFor="phone_number" className="text-base font-medium text-[#2B2820]">
                            Phone number*
                          </Label>
                          <Input
                            id="phone_number"
                            type="tel"
                            placeholder="(123) 000-0000"
                            {...form.register('phone_number')}
                            className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                          />
                          {(form.formState.errors as any).phone_number && (
                            <p className="text-sm text-red-500">{(form.formState.errors as any).phone_number.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-3">
                          <Label htmlFor="date_of_birth" className="text-base font-medium text-[#2B2820]">
                            Date of Birth
                          </Label>
                          <div className="relative">
                            <Input
                              id="date_of_birth"
                              type="date"
                              {...form.register('date_of_birth')}
                              className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)] pr-10"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-[#777777] pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Label htmlFor="gender" className="text-base font-medium text-[#2B2820]">
                            Gender
                          </Label>
                          <Select
                            value={form.watch('gender') || ''}
                            onValueChange={(value) => form.setValue('gender', value as any)}
                          >
                            <SelectTrigger className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]">
                              <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Label htmlFor="address_line_1" className="text-base font-medium text-[#2B2820]">
                          Address Line 1*
                        </Label>
                        <Input
                          id="address_line_1"
                          placeholder="Street address, P.O. box, company name"
                          {...form.register('address_line_1')}
                          className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                        />
                        {(form.formState.errors as any).address_line_1 && (
                          <p className="text-sm text-red-500">{(form.formState.errors as any).address_line_1.message}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <Label htmlFor="address_line_2" className="text-base font-medium text-[#2B2820]">
                          Address Line 2 <span className="text-gray-500 text-sm">(Optional)</span>
                        </Label>
                        <Input
                          id="address_line_2"
                          placeholder="Apartment, suite, unit, building, floor, etc."
                          {...form.register('address_line_2')}
                          className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                        />
                        {(form.formState.errors as any).address_line_2 && (
                          <p className="text-sm text-red-500">{(form.formState.errors as any).address_line_2.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-3">
                          <Input
                            placeholder="City*"
                            {...form.register('city')}
                            className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                          />
                          {(form.formState.errors as any).city && (
                            <p className="text-sm text-red-500">{(form.formState.errors as any).city.message}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          <Input
                            placeholder="Zip/Postal Code*"
                            {...form.register('zip_code')}
                            className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                          />
                          {(form.formState.errors as any).zip_code && (
                            <p className="text-sm text-red-500">{(form.formState.errors as any).zip_code.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Label htmlFor="country" className="text-base font-medium text-[#2B2820]">
                          Country*
                        </Label>
                        <Input
                          id="country"
                          placeholder="Country name"
                          {...form.register('country')}
                          className="h-12 bg-white border border-[#D6D2C8] rounded-[14px] shadow-[0px_0.5px_1px_0px_rgba(25,33,61,0.04)]"
                        />
                        {(form.formState.errors as any).country && (
                          <p className="text-sm text-red-500">{(form.formState.errors as any).country.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="program_type" className="text-base font-medium text-[#2B2820]">
                          Program Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={form.watch('program_type') || ''}
                          onValueChange={(value) => form.setValue('program_type', value as any)}
                        >
                          <SelectTrigger className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]">
                            <SelectValue placeholder="Select program type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="neurological">Neurological</SelectItem>
                            <SelectItem value="mental_health">Mental Health</SelectItem>
                            <SelectItem value="addiction">Addiction</SelectItem>
                          </SelectContent>
                        </Select>
                        {(form.formState.errors as any).program_type && (
                          <p className="text-sm text-red-500 mt-1">{(form.formState.errors as any).program_type.message}</p>
                        )}
                      </div>

                      {/* Emergency Contact */}
                      <div className="border-t border-[#D6D2C8] pt-6 mt-6">
                        <h3 className="text-lg font-medium mb-4 text-[#2B2820]">Emergency Contact</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="emergency_contact_first_name" className="text-base font-medium text-[#2B2820]">
                              First Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="emergency_contact_first_name"
                              {...form.register('emergency_contact_first_name')}
                              className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                            />
                            {(form.formState.errors as any).emergency_contact_first_name && (
                              <p className="text-sm text-red-500 mt-1">{(form.formState.errors as any).emergency_contact_first_name.message}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="emergency_contact_last_name" className="text-base font-medium text-[#2B2820]">
                              Last Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="emergency_contact_last_name"
                              {...form.register('emergency_contact_last_name')}
                              className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                            />
                            {(form.formState.errors as any).emergency_contact_last_name && (
                              <p className="text-sm text-red-500 mt-1">{(form.formState.errors as any).emergency_contact_last_name.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label htmlFor="emergency_contact_email" className="text-base font-medium text-[#2B2820]">Email</Label>
                            <Input
                              id="emergency_contact_email"
                              type="email"
                              {...form.register('emergency_contact_email')}
                              className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="emergency_contact_phone" className="text-base font-medium text-[#2B2820]">
                              Phone Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="emergency_contact_phone"
                              type="tel"
                              placeholder="(000) 000-0000"
                              {...form.register('emergency_contact_phone')}
                              className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                            />
                            {(form.formState.errors as any).emergency_contact_phone && (
                              <p className="text-sm text-red-500 mt-1">{(form.formState.errors as any).emergency_contact_phone.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label htmlFor="emergency_contact_address" className="text-base font-medium text-[#2B2820]">Address</Label>
                          <Input
                            id="emergency_contact_address"
                            {...form.register('emergency_contact_address')}
                            className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                          />
                        </div>

                        <div className="mt-4">
                          <Label htmlFor="emergency_contact_relationship" className="text-base font-medium text-[#2B2820]">Relationship</Label>
                          <Input
                            id="emergency_contact_relationship"
                            {...form.register('emergency_contact_relationship')}
                            className="h-12 mt-2 bg-white border border-[#D6D2C8] rounded-[14px]"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Invite Email Preview Card */}
              {mode === 'minimal' && form.watch('filled_by') === 'self' && (
                <div className="bg-[#F5F4F0] border border-[#D6D2C8] rounded-[10px] p-5 flex flex-col gap-[25px]">
                  <div className="flex flex-col gap-[3px]">
                    <h3 className="text-base font-normal text-black leading-[1.48em] tracking-[-0.04em]">Invite Email Preview</h3>
                    <p className="text-sm text-[#2B2820] leading-[1.5em] tracking-[-0.04em]">
                      Recipient: {form.watch('email') || '(Email above)'} • Template: Patient Application Link • Tracking: Opened / Completed
                    </p>
                    <div className="pt-[10px] border-t border-[#D6D2C8] mt-[10px]">
                      <p className="text-sm text-[#777777] leading-[2.03em] tracking-[-0.04em]">
                        The patient will receive a secure link to complete the full application and required forms (0/4 → 4/4).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex flex-col gap-3 pt-4 sm:pt-5 border-t border-[#D6D2C8]">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-[23px]">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-[23px]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="h-auto py-[10px] px-4 bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50 rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      className="h-auto py-[10px] px-4 bg-white border border-[#D6D2C8] text-[#777777] rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base opacity-50"
                    >
                      Save Draft
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-auto py-[10px] px-4 bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Form & Send Invite'
                    )}
                  </Button>
                </div>
                <p className="text-sm text-[#777777] leading-[2.03em] tracking-[-0.04em]">
                  Tip: If email exists, system will suggest "Link to existing lead" instead of creating duplicate.
                </p>
              </div>
            </form>
          )}

          {currentStep === 'confirmation' && submittedData && !isLoading && (
            <>
              {/* Success/Error Icon */}
              <div className="flex flex-col items-center gap-[10px]">
                <div className="w-[159px] h-[159px] bg-[#F5F4F0] rounded-full flex items-center justify-center">
                  {isSuccess ? (
                    <CheckCircle2 className="w-24 h-24 text-[#10B981]" strokeWidth={1.5} />
                  ) : (
                    <XCircle className="w-24 h-24 text-red-500" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex flex-col items-center gap-[10px]">
                  <h1 
                    className="text-[40px] font-normal text-black leading-[1.3em] text-center"
                    style={{ fontFamily: 'Instrument Serif, serif' }}
                  >
                    {isSuccess ? 'Invite Sent Successfully' : 'Failed to Send Invite'}
                  </h1>
                  <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em] text-center">
                    {isSuccess 
                      ? 'The patient has received their application form via email.'
                      : (errorMessage || 'There was an error sending the invite. Please try again or contact support.')}
                  </p>
                </div>
              </div>

              {/* Patient Info Card - Only show on success */}
              {isSuccess && (
                <div className="bg-[#F5F4F0] border border-[#D6D2C8] rounded-[10px] p-[15px] flex flex-col gap-[10px]">
                  <div className="flex justify-between items-center pb-5 border-b border-[#D6D2C8]">
                    <div className="flex flex-col gap-[10px]">
                      <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">Patient</p>
                      <p className="text-base font-semibold text-[#2B2820] leading-[1.193em] tracking-[-0.04em]">
                        {submittedData.recipient_name}<br />
                        {submittedData.recipient_email}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-[10px]">
                      <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">Mode</p>
                      <span className="px-3 py-0 h-[26px] rounded-[10px] bg-[#DEF8EE] text-[#10B981] text-xs leading-[1.193em] tracking-[-0.04em] flex items-center justify-center">
                        {submittedData.mode.charAt(0).toUpperCase() + submittedData.mode.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-[10px]">
                      <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">Next Step</p>
                      <p className="text-xs text-[#2B2820] leading-[1.193em] tracking-[-0.04em]">
                        Waiting for patient to complete the application (0/4)
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-[10px]">
                      <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">Status</p>
                      <span className="px-3 py-0 h-[26px] rounded-[10px] bg-[#FFFBD4] text-[#F59E0B] text-xs leading-[1.193em] tracking-[-0.04em] flex items-center justify-center">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Info Card - Show on failure */}
              {!isSuccess && (
                <div className="bg-[#F5F4F0] border border-[#D6D2C8] rounded-[10px] p-[15px] flex flex-col gap-[10px]">
                  <div className="flex justify-between items-center pb-5 border-b border-[#D6D2C8]">
                    <div className="flex flex-col gap-[10px]">
                      <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">Patient</p>
                      <p className="text-base font-semibold text-[#2B2820] leading-[1.193em] tracking-[-0.04em]">
                        {submittedData.recipient_name}<br />
                        {submittedData.recipient_email}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-[10px]">
                      <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">Mode</p>
                      <span className="px-3 py-0 h-[26px] rounded-[10px] bg-[#DEF8EE] text-[#10B981] text-xs leading-[1.193em] tracking-[-0.04em] flex items-center justify-center">
                        {submittedData.mode.charAt(0).toUpperCase() + submittedData.mode.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[10px]">
                    <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">Error Reason</p>
                    <p className="text-sm text-red-600 leading-[1.193em] tracking-[-0.04em]">
                      {errorMessage || 'An error occurred while sending the invite.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Email Tracking Card - Only show on success */}
              {isSuccess && (
                <div className="bg-white border border-[#D6D2C8] rounded-[10px] p-5 flex flex-col gap-[25px]">
                  <div className="flex flex-col gap-[3px]">
                    <h3 className="text-base font-normal text-black leading-[1.48em] tracking-[-0.04em]">Email Tracking</h3>
                    <p className="text-sm text-[#2B2820] leading-[1.5em] tracking-[-0.04em]">
                      Status: Sent • Opens and completion will update automatically.
                    </p>
                    <div className="pt-[10px] border-t border-[#D6D2C8] mt-[10px]">
                      <p className="text-sm text-[#777777] leading-[2.03em] tracking-[-0.04em]">
                        If the patient doesn't respond, you can resend the invite or follow up manually.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-[23px]">
                  {isSuccess ? (
                    <>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-[23px]">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (onClose) {
                              onClose()
                            }
                            router.push('/patient-pipeline')
                          }}
                          className="h-auto py-[10px] px-4 bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50 rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base w-full sm:w-auto"
                        >
                          Resend Invite
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddAnotherPatient}
                          className="h-auto py-[10px] px-4 bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50 rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base w-full sm:w-auto"
                        >
                          + Add Another Patient
                        </Button>
                      </div>
                      <Button
                        type="button"
                        onClick={handleViewPatientRecord}
                        className="h-auto py-[10px] px-4 bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base w-full sm:w-auto"
                      >
                        View Patient Record
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-[23px]">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddAnotherPatient}
                          className="h-auto py-[10px] px-4 bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50 rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base w-full sm:w-auto"
                        >
                          + Add Another Patient
                        </Button>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowErrorDialog(false)
                          setCurrentStep('details')
                          if (onStepChange) {
                            onStepChange('details')
                          }
                        }}
                        className="h-auto py-[10px] px-4 bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-base w-full sm:w-auto"
                      >
                        Try Again
                      </Button>
                    </>
                  )}
                </div>
                {isSuccess && (
                  <p className="text-sm text-[#777777] leading-[2.03em] tracking-[-0.04em]">
                    Tip: You can track completion progress in the Patient Pipeline dashboard.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Error Dialog */}
          <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
            <DialogContent className="max-w-md">
              <DialogTitle className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-500" />
                Error Sending Invite
              </DialogTitle>
              <DialogDescription className="pt-2">
                {errorMessage || 'An error occurred while sending the invite. Please try again.'}
              </DialogDescription>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowErrorDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowErrorDialog(false)
                    setCurrentStep('details')
                  }}
                >
                  Try Again
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
  )
}
