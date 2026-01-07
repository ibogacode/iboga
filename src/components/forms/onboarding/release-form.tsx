'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad } from '@/components/forms/signature-pad'
import { submitReleaseForm } from '@/actions/onboarding-forms.action'
import { releaseFormSchema, type ReleaseFormInput } from '@/lib/validations/onboarding-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'

interface ReleaseFormProps {
  onboardingId: string
  initialData?: Partial<ReleaseFormInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

export function ReleaseForm({ onboardingId, initialData, isCompleted, onSuccess }: ReleaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<ReleaseFormInput>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: {
      onboarding_id: onboardingId,
      full_name: initialData?.full_name || '',
      date_of_birth: initialData?.date_of_birth || '',
      phone_number: initialData?.phone_number || '',
      email: initialData?.email || '',
      emergency_contact_name: initialData?.emergency_contact_name || '',
      emergency_contact_phone: initialData?.emergency_contact_phone || '',
      emergency_contact_email: initialData?.emergency_contact_email ?? '', // Optional field - use empty string if null/undefined
      emergency_contact_relationship: initialData?.emergency_contact_relationship ?? '', // Optional field - use empty string if null/undefined
      voluntary_participation: initialData?.voluntary_participation || false,
      medical_conditions_disclosed: initialData?.medical_conditions_disclosed || false,
      risks_acknowledged: initialData?.risks_acknowledged || false,
      medical_supervision_agreed: initialData?.medical_supervision_agreed || false,
      confidentiality_understood: initialData?.confidentiality_understood || false,
      liability_waiver_accepted: initialData?.liability_waiver_accepted || false,
      compliance_agreed: initialData?.compliance_agreed || false,
      consent_to_treatment: initialData?.consent_to_treatment || false,
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: ReleaseFormInput) {
    setIsSubmitting(true)
    try {
      const result = await submitReleaseForm(data)
      if (result?.data?.success) {
        setIsSubmitted(true)
        toast.success('Release form submitted successfully')
        setTimeout(() => {
          onSuccess?.()
        }, 1500)
      } else {
        toast.error(result?.data?.error || 'Failed to submit form')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('An error occurred while submitting the form')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCompleted) {
    return (
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
          Form Completed
        </h1>
        <p className="text-lg text-gray-600">
          This form has already been submitted.
        </p>
      </div>
    )
  }

  if (isSubmitted) {
    return (
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
          Your release form has been submitted successfully.
        </p>
        <p className="text-base text-gray-500">
          We will review your information and get back to you soon.
        </p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Iboga Wellness Institute Release Form
      </h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Participant Information */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Participant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name" className="text-base font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                {...form.register('full_name')}
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.full_name}
              />
              {form.formState.errors.full_name && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.full_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="date_of_birth" className="text-base font-medium">
                Date of Birth <span className="text-red-500">*</span> (MM-DD-YYYY)
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                {...form.register('date_of_birth')}
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.date_of_birth}
              />
              {form.formState.errors.date_of_birth && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.date_of_birth.message}</p>
              )}
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
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.phone_number}
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
                {...form.register('email')}
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.email}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact Information */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Emergency Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency_contact_name" className="text-base font-medium">
                Emergency Contact Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emergency_contact_name"
                {...form.register('emergency_contact_name')}
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.emergency_contact_name}
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
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.emergency_contact_phone}
              />
              {form.formState.errors.emergency_contact_phone && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="emergency_contact_email" className="text-base font-medium">
                Emergency Contact Email
              </Label>
              <Input
                id="emergency_contact_email"
                type="email"
                {...form.register('emergency_contact_email')}
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.emergency_contact_email}
              />
              {form.formState.errors.emergency_contact_email && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="emergency_contact_relationship" className="text-base font-medium">
                Relationship
              </Label>
              <Input
                id="emergency_contact_relationship"
                {...form.register('emergency_contact_relationship')}
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.emergency_contact_relationship}
              />
              {form.formState.errors.emergency_contact_relationship && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_relationship.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Acknowledgment and Consent */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Acknowledgment and Consent</h2>
          <p className="text-gray-600 text-sm">I, the undersigned, acknowledge and agree to the following:</p>
          
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="voluntary_participation"
                checked={form.watch('voluntary_participation')}
                onCheckedChange={(checked) => form.setValue('voluntary_participation', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="voluntary_participation" className="text-base font-medium">
                  Voluntary Participation <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I understand that my participation in Iboga Wellness Centers is entirely voluntary and that I can withdraw at any time.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="medical_conditions_disclosed"
                checked={form.watch('medical_conditions_disclosed')}
                onCheckedChange={(checked) => form.setValue('medical_conditions_disclosed', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="medical_conditions_disclosed" className="text-base font-medium">
                  Medical Conditions <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I have disclosed all known medical conditions, including physical and mental health issues, to the Iboga Wellness Centers staff. I understand that ibogaine and psilocybin treatments can have significant physiological and psychological effects and may interact with other medications.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="risks_acknowledged"
                checked={form.watch('risks_acknowledged')}
                onCheckedChange={(checked) => form.setValue('risks_acknowledged', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="risks_acknowledged" className="text-base font-medium">
                  Risks <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I am aware of the potential risks associated with ibogaine and psilocybin therapy, including but not limited to cardiac events, psychological distress, and drug interactions. I acknowledge that these treatments should be conducted under medical supervision and in a controlled environment.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="medical_supervision_agreed"
                checked={form.watch('medical_supervision_agreed')}
                onCheckedChange={(checked) => form.setValue('medical_supervision_agreed', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="medical_supervision_agreed" className="text-base font-medium">
                  Medical Supervision <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I agree to follow all guidelines and instructions provided by the medical and support staff at Iboga Wellness Centers. I consent to any necessary medical intervention should an emergency arise during my participation in the retreat.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="confidentiality_understood"
                checked={form.watch('confidentiality_understood')}
                onCheckedChange={(checked) => form.setValue('confidentiality_understood', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="confidentiality_understood" className="text-base font-medium">
                  Confidentiality <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I understand that my personal information and any data collected during the retreat will be kept confidential and used only for the purposes of providing care and treatment.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="liability_waiver_accepted"
                checked={form.watch('liability_waiver_accepted')}
                onCheckedChange={(checked) => form.setValue('liability_waiver_accepted', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="liability_waiver_accepted" className="text-base font-medium">
                  Waiver of Liability <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I release Iboga Wellness Centers, its owners, staff, and affiliates from any liability, claims, or demands that may arise from my participation in the retreat, including but not limited to personal injury, psychological trauma, or death.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="compliance_agreed"
                checked={form.watch('compliance_agreed')}
                onCheckedChange={(checked) => form.setValue('compliance_agreed', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="compliance_agreed" className="text-base font-medium">
                  Compliance <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I agree to adhere to the rules and guidelines set forth by Iboga Wellness Centers to ensure a safe and conducive environment for all participants.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Consent to Treatment */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Consent to Treatment</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent_to_treatment"
                checked={form.watch('consent_to_treatment')}
                onCheckedChange={(checked) => form.setValue('consent_to_treatment', checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="consent_to_treatment" className="text-base font-medium">
                  I Consent to Treatment <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">I have read and understood the above information. I acknowledge that I have had the opportunity to ask questions and that my questions have been answered to my satisfaction. I voluntarily agree to participate in Iboga Wellness Centers and consent to the administration of ibogaine and/or psilocybin therapies as outlined.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Signature</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-base font-medium">
                Signature <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2">
                <SignaturePad
                  value={form.watch('signature_data')}
                  onChange={(data) => form.setValue('signature_data', data)}
                />
              </div>
              {form.formState.errors.signature_data && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.signature_data.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="signature_date" className="text-base font-medium">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signature_date"
                type="date"
                {...form.register('signature_date')}
                className="h-12 mt-2"
                aria-invalid={!!form.formState.errors.signature_date}
              />
              {form.formState.errors.signature_date && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.signature_date.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Release Form'
            )}
          </Button>
        </div>
      </form>
    </>
  )
}

