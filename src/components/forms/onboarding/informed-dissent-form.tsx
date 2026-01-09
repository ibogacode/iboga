'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/forms/signature-pad'
import { submitInformedDissentForm } from '@/actions/onboarding-forms.action'
import { informedDissentFormSchema, type InformedDissentFormInput } from '@/lib/validations/onboarding-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

interface InformedDissentFormProps {
  onboardingId: string
  initialData?: Partial<InformedDissentFormInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

export function InformedDissentForm({ onboardingId, initialData, isCompleted, onSuccess }: InformedDissentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InformedDissentFormInput>({
    resolver: zodResolver(informedDissentFormSchema) as any,
    defaultValues: {
      onboarding_id: onboardingId,
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      official_identification: initialData?.official_identification || '',
      phone_number: initialData?.phone_number || '',
      address: initialData?.address || '',
      email: initialData?.email || '',
      treatment_refused: initialData?.treatment_refused || false,
      liability_release_accepted: initialData?.liability_release_accepted || false,
      no_refund_understood: initialData?.no_refund_understood || false,
      decision_voluntary: initialData?.decision_voluntary || false,
      no_legal_action_agreed: initialData?.no_legal_action_agreed || false,
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || new Date().toISOString().split('T')[0],
    },
  })

  const treatmentRefused = form.watch('treatment_refused')

  async function onSubmit(data: InformedDissentFormInput) {
    setIsSubmitting(true)
    try {
      const result = await submitInformedDissentForm(data as any)
      if (result?.data?.success) {
        toast.success('Informed dissent form submitted successfully')
        onSuccess?.()
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-800">Form Completed</h3>
        <p className="text-green-600 text-sm mt-1">This form has already been submitted.</p>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Header */}
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Letter Of Informed Dissent</h1>
        <p className="text-gray-600 mt-2">IBOGA WELLNESS INSTITUTE CLINIC</p>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-800 font-medium">Important Notice</p>
            <p className="text-amber-700 text-sm mt-1">
              This form is to be completed if you choose NOT to accept the treatment offered by Iboga Wellness Institute. 
              If you are proceeding with treatment, please complete this form acknowledging you have read and understood 
              the dissent process, but leave the &quot;I refuse treatment&quot; checkbox unchecked.
            </p>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              {...form.register('first_name')}
              aria-invalid={!!form.formState.errors.first_name}
            />
            {form.formState.errors.first_name && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.first_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              {...form.register('last_name')}
              aria-invalid={!!form.formState.errors.last_name}
            />
            {form.formState.errors.last_name && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.last_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="official_identification">Official Identification (ID/Passport) *</Label>
            <Input
              id="official_identification"
              {...form.register('official_identification')}
              aria-invalid={!!form.formState.errors.official_identification}
            />
            {form.formState.errors.official_identification && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.official_identification.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone_number">Phone Number *</Label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="(000) 000-0000"
              {...form.register('phone_number')}
              aria-invalid={!!form.formState.errors.phone_number}
            />
            {form.formState.errors.phone_number && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone_number.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              rows={2}
              {...form.register('address')}
              aria-invalid={!!form.formState.errors.address}
            />
            {form.formState.errors.address && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.address.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              aria-invalid={!!form.formState.errors.email}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Statement of Dissent */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Statement of Dissent</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700 text-sm mb-4">
            I, <strong>{form.watch('first_name')} {form.watch('last_name')}</strong>, of legal age and in full possession of my mental faculties, 
            declare that I have been duly informed by the medical and therapeutic team at Iboga Wellness Institute about the 
            available treatments for my condition, including their benefits, risks, and potential adverse effects.
          </p>
          <p className="text-gray-700 text-sm">
            After receiving all the necessary information and having the opportunity to ask questions, I voluntarily choose 
            not to accept the treatment offered and provided by Iboga Wellness Institute Clinic.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="treatment_refused"
              checked={form.watch('treatment_refused')}
              onCheckedChange={(checked) => form.setValue('treatment_refused', checked as boolean)}
            />
            <div>
              <Label htmlFor="treatment_refused" className="font-medium text-red-800">
                I REFUSE THE TREATMENT OFFERED
              </Label>
              <p className="text-sm text-red-600 mt-1">
                Check this box ONLY if you are refusing treatment. Leave unchecked if you are proceeding with treatment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer of Liability */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Disclaimer of Liability</h2>
        <p className="text-gray-600 text-sm">
          {treatmentRefused 
            ? 'Since you are refusing treatment, please acknowledge the following:'
            : 'Please read and acknowledge the following (these apply if you ever choose to refuse treatment):'}
        </p>
        
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="liability_release_accepted"
              checked={form.watch('liability_release_accepted')}
              onCheckedChange={(checked) => form.setValue('liability_release_accepted', checked as boolean)}
            />
            <Label htmlFor="liability_release_accepted" className="text-sm">
              I release Iboga Wellness Institute, its medical team, therapists, administrative, and operational staff from all 
              medical, legal, and administrative responsibility for any consequences arising from my decision not to undergo 
              the recommended treatment.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="no_refund_understood"
              checked={form.watch('no_refund_understood')}
              onCheckedChange={(checked) => form.setValue('no_refund_understood', checked as boolean)}
            />
            <Label htmlFor="no_refund_understood" className="text-sm">
              I understand that my decision to refuse services today will not result in a refund, as long as I reschedule 
              to commence services within 90 days.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="decision_voluntary"
              checked={form.watch('decision_voluntary')}
              onCheckedChange={(checked) => form.setValue('decision_voluntary', checked as boolean)}
            />
            <Label htmlFor="decision_voluntary" className="text-sm">
              I declare that my decision has been made without coercion, external pressure, or undue influence and that 
              I have fully understood the explanations provided.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="no_legal_action_agreed"
              checked={form.watch('no_legal_action_agreed')}
              onCheckedChange={(checked) => form.setValue('no_legal_action_agreed', checked as boolean)}
            />
            <Label htmlFor="no_legal_action_agreed" className="text-sm">
              I agree not to take legal action against Iboga Wellness Institute, its medical staff, therapists, or 
              administrative team in relation to my decision not to accept the proposed treatment.
            </Label>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Patient Signature</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Signature *</Label>
            <SignaturePad
              value={form.watch('signature_data')}
              onChange={(data) => form.setValue('signature_data', data)}
            />
            {form.formState.errors.signature_data && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.signature_data.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="signature_date">Date *</Label>
            <Input
              id="signature_date"
              type="date"
              {...form.register('signature_date')}
              aria-invalid={!!form.formState.errors.signature_date}
            />
            {form.formState.errors.signature_date && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.signature_date.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Note about Representative Signature */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>Note:</strong> The Iboga Wellness Institute Representative signature section will be completed by clinic staff 
          if treatment is refused. This form serves as acknowledgment that you have been informed of the dissent process.
        </p>
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
            'Submit Informed Dissent Form'
          )}
        </Button>
      </div>
    </form>
  )
}

