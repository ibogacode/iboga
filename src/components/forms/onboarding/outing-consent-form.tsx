'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad } from '@/components/forms/signature-pad'
import { submitOutingConsentForm } from '@/actions/onboarding-forms.action'
import { outingConsentFormSchema, type OutingConsentFormInput } from '@/lib/validations/onboarding-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'

interface OutingConsentFormProps {
  onboardingId: string
  initialData?: Partial<OutingConsentFormInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

export function OutingConsentForm({ onboardingId, initialData, isCompleted, onSuccess }: OutingConsentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<OutingConsentFormInput>({
    resolver: zodResolver(outingConsentFormSchema),
    defaultValues: {
      onboarding_id: onboardingId,
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      date_of_birth: initialData?.date_of_birth || '',
      date_of_outing: initialData?.date_of_outing || '',
      email: initialData?.email || '',
      protocol_compliance: initialData?.protocol_compliance || false,
      proper_conduct: initialData?.proper_conduct || false,
      no_harassment: initialData?.no_harassment || false,
      substance_prohibition: initialData?.substance_prohibition || false,
      financial_penalties_accepted: initialData?.financial_penalties_accepted || false,
      additional_consequences_understood: initialData?.additional_consequences_understood || false,
      declaration_read_understood: initialData?.declaration_read_understood || false,
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: OutingConsentFormInput) {
    setIsSubmitting(true)
    try {
      const result = await submitOutingConsentForm(data)
      if (result?.data?.success) {
        toast.success('Outing consent form submitted successfully')
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
        <h1 className="text-2xl font-bold text-gray-900">Iboga Wellness Institute Outing/Transfer Consent</h1>
        <p className="text-gray-600 mt-2">Please complete all sections below</p>
      </div>

      {/* Participant Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Participant Information</h2>
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
            <Label htmlFor="date_of_birth">Date of Birth *</Label>
            <Input
              id="date_of_birth"
              type="date"
              {...form.register('date_of_birth')}
              aria-invalid={!!form.formState.errors.date_of_birth}
            />
            {form.formState.errors.date_of_birth && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.date_of_birth.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="date_of_outing">Date of Outing/Transfer</Label>
            <Input
              id="date_of_outing"
              type="date"
              {...form.register('date_of_outing')}
            />
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

      {/* Consent Declaration */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Consent Declaration</h2>
        <p className="text-gray-600 text-sm">
          I, in full use of my faculties, authorize my temporary outing or transfer from the clinic Iboga Wellness Centers, 
          under the conditions established in this document. I understand that this outing/transfer is subject to the following rules and restrictions.
        </p>
        
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="protocol_compliance"
              checked={form.watch('protocol_compliance')}
              onCheckedChange={(checked) => form.setValue('protocol_compliance', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="protocol_compliance" className="font-medium">Protocol Compliance *</Label>
              <p className="text-sm text-gray-600">I agree to follow all guidelines and protocols established by the clinic during the outing/transfer period.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="proper_conduct"
              checked={form.watch('proper_conduct')}
              onCheckedChange={(checked) => form.setValue('proper_conduct', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="proper_conduct" className="font-medium">Proper Conduct *</Label>
              <p className="text-sm text-gray-600">I will refrain from any inappropriate behavior that may compromise my well-being or that of others.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="no_harassment"
              checked={form.watch('no_harassment')}
              onCheckedChange={(checked) => form.setValue('no_harassment', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="no_harassment" className="font-medium">Prohibition of Inquiries or Harassment *</Label>
              <p className="text-sm text-gray-600">It is strictly prohibited to harass, intimidate, or ask other patients, staff, or companions about the use, access, or availability of prohibited substances.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="substance_prohibition"
              checked={form.watch('substance_prohibition')}
              onCheckedChange={(checked) => form.setValue('substance_prohibition', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="substance_prohibition" className="font-medium">Substance Prohibition *</Label>
              <p className="text-sm text-gray-600">I will not consume, carry, or request prohibited substances at any time during my outing/transfer.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="financial_penalties_accepted"
              checked={form.watch('financial_penalties_accepted')}
              onCheckedChange={(checked) => form.setValue('financial_penalties_accepted', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="financial_penalties_accepted" className="font-medium">Financial Penalties *</Label>
              <p className="text-sm text-gray-600">In case of non-compliance with any of the aforementioned points, I accept that a financial penalty of $150.00 will be applied, with the amount determined by the clinic administration according to the severity of the violation.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="additional_consequences_understood"
              checked={form.watch('additional_consequences_understood')}
              onCheckedChange={(checked) => form.setValue('additional_consequences_understood', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="additional_consequences_understood" className="font-medium">Additional Consequences *</Label>
              <p className="text-sm text-gray-600">I understand that any violation of these rules may result in the cancellation of future outings/transfers and possible disciplinary measures within the treatment program. Furthermore, repeated or serious violations may lead to expulsion from the clinic.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Final Declaration */}
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="declaration_read_understood"
              checked={form.watch('declaration_read_understood')}
              onCheckedChange={(checked) => form.setValue('declaration_read_understood', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="declaration_read_understood" className="font-medium">Declaration *</Label>
              <p className="text-sm text-gray-600">I declare that I have read and understood all the conditions mentioned in this form and agree to comply with them without exception.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Signature</h2>
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

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Outing Consent Form'
          )}
        </Button>
      </div>
    </form>
  )
}

