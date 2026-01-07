'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad } from '@/components/forms/signature-pad'
import { submitInternalRegulationsForm } from '@/actions/onboarding-forms.action'
import { internalRegulationsFormSchema, type InternalRegulationsFormInput } from '@/lib/validations/onboarding-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'

interface InternalRegulationsFormProps {
  onboardingId: string
  initialData?: Partial<InternalRegulationsFormInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

export function InternalRegulationsForm({ onboardingId, initialData, isCompleted, onSuccess }: InternalRegulationsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InternalRegulationsFormInput>({
    resolver: zodResolver(internalRegulationsFormSchema),
    defaultValues: {
      onboarding_id: onboardingId,
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      email: initialData?.email || '',
      phone_number: initialData?.phone_number || '',
      regulations_read_understood: initialData?.regulations_read_understood || false,
      rights_acknowledged: initialData?.rights_acknowledged || false,
      obligations_acknowledged: initialData?.obligations_acknowledged || false,
      coexistence_rules_acknowledged: initialData?.coexistence_rules_acknowledged || false,
      sanctions_acknowledged: initialData?.sanctions_acknowledged || false,
      acceptance_confirmed: initialData?.acceptance_confirmed || false,
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: InternalRegulationsFormInput) {
    setIsSubmitting(true)
    try {
      const result = await submitInternalRegulationsForm(data)
      if (result?.data?.success) {
        toast.success('Internal regulations form submitted successfully')
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
        <h1 className="text-2xl font-bold text-gray-900">Internal Regulations</h1>
        <p className="text-gray-600 mt-2">Iboga Wellness Centers</p>
      </div>

      {/* Chapter I: General Provisions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">CHAPTER I: GENERAL PROVISIONS</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
          <p><strong>Article 1.</strong> These regulations establish the rules of coexistence, rights, and obligations of patients, staff, and visitors within the Iboga Wellness Centers clinic.</p>
          <p><strong>Article 2.</strong> The clinic's objective is to provide comprehensive treatment for the rehabilitation of individuals with addiction problems, promoting their social reintegration and improving their quality of life.</p>
          <p><strong>Article 3.</strong> These regulations are mandatory for all persons within the clinic's facilities.</p>
        </div>
      </div>

      {/* Chapter II: Rights and Obligations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">CHAPTER II: RIGHTS AND OBLIGATIONS OF PATIENTS</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-3">
          <div>
            <p className="font-medium">Article 4. Patients' rights:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>To receive dignified, respectful, and non-discriminatory treatment.</li>
              <li>To have access to adequate medical and psychological care.</li>
              <li>To participate in scheduled therapeutic and recreational activities.</li>
              <li>To maintain communication with their families during established hours.</li>
              <li>To receive information about their treatment and progress.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Article 5. Patients' obligations:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>To comply with the established rules and schedules.</li>
              <li>To respect other patients, staff, and clinic facilities.</li>
              <li>To refrain from consuming any prohibited substances.</li>
              <li>To actively participate in their rehabilitation process.</li>
              <li>To maintain personal hygiene and cleanliness in their assigned space.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chapter III: Rules of Coexistence */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">CHAPTER III: RULES OF COEXISTENCE</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-3">
          <div>
            <p className="font-medium">Article 6. The following are strictly prohibited:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>The consumption, possession, or distribution of drugs, coffee, and alcohol.</li>
              <li>Physical or verbal violence against anyone within the clinic.</li>
              <li>The destruction or misuse of facilities.</li>
              <li>Romantic or sexual relationships between patients during their stay.</li>
              <li>Possession of dangerous objects.</li>
            </ul>
          </div>
          <p><strong>Article 7.</strong> Patients must follow the assigned therapeutic program without interruptions or unjustified excuses.</p>
          <p><strong>Article 8.</strong> Clothing must be appropriate and respectful, avoiding provocative attire or messages deemed inappropriate.</p>
          <p><strong>Article 9.</strong> Family visits must take place only during established hours and under staff supervision.</p>
        </div>
      </div>

      {/* Chapter IV: Staff Responsibilities */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">CHAPTER IV: STAFF RESPONSIBILITIES</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
          <p className="font-medium">Article 10. Clinic staff is responsible for:</p>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Providing professional and ethical care at all times.</li>
            <li>Respecting patient confidentiality.</li>
            <li>Promoting a safe and violence-free environment.</li>
            <li>Enforcing the regulations fairly and justly.</li>
            <li>Reporting any rule violations to the clinic's management.</li>
          </ul>
        </div>
      </div>

      {/* Chapter V: Sanctions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">CHAPTER V: SANCTIONS AND DISCIPLINARY MEASURES</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
          <div>
            <p className="font-medium">Article 11. In case of non-compliance with the regulations, proportional sanctions will be applied, which may include:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Verbal or written warnings.</li>
              <li>Temporary restriction of privileges.</li>
              <li>Suspension of visits.</li>
              <li>Expulsion from the program in severe cases.</li>
            </ul>
          </div>
          <p><strong>Article 12.</strong> Repeated serious offenses will be grounds for treatment review and possible termination.</p>
        </div>
      </div>

      {/* Chapter VI: Final Provisions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">CHAPTER VI: FINAL PROVISIONS</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
          <p><strong>Article 13.</strong> Any situation not covered in these regulations will be evaluated by the clinic's management.</p>
          <p><strong>Article 14.</strong> These regulations take effect upon approval and dissemination among patients and staff.</p>
          <p><strong>Article 15.</strong> Acceptance of these regulations is a mandatory condition for admission and continued stay at Iboga Wellness Centers.</p>
        </div>
      </div>

      {/* Acknowledgment of Acceptance */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Acknowledgment of Acceptance</h2>
        
        <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="regulations_read_understood"
              checked={form.watch('regulations_read_understood')}
              onCheckedChange={(checked) => form.setValue('regulations_read_understood', checked as boolean)}
            />
            <Label htmlFor="regulations_read_understood" className="text-sm">
              I have read and understood all the regulations above *
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="rights_acknowledged"
              checked={form.watch('rights_acknowledged')}
              onCheckedChange={(checked) => form.setValue('rights_acknowledged', checked as boolean)}
            />
            <Label htmlFor="rights_acknowledged" className="text-sm">
              I acknowledge my rights as a patient *
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="obligations_acknowledged"
              checked={form.watch('obligations_acknowledged')}
              onCheckedChange={(checked) => form.setValue('obligations_acknowledged', checked as boolean)}
            />
            <Label htmlFor="obligations_acknowledged" className="text-sm">
              I acknowledge my obligations as a patient *
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="coexistence_rules_acknowledged"
              checked={form.watch('coexistence_rules_acknowledged')}
              onCheckedChange={(checked) => form.setValue('coexistence_rules_acknowledged', checked as boolean)}
            />
            <Label htmlFor="coexistence_rules_acknowledged" className="text-sm">
              I acknowledge and agree to follow the rules of coexistence *
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="sanctions_acknowledged"
              checked={form.watch('sanctions_acknowledged')}
              onCheckedChange={(checked) => form.setValue('sanctions_acknowledged', checked as boolean)}
            />
            <Label htmlFor="sanctions_acknowledged" className="text-sm">
              I understand and accept the sanctions for non-compliance *
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="acceptance_confirmed"
              checked={form.watch('acceptance_confirmed')}
              onCheckedChange={(checked) => form.setValue('acceptance_confirmed', checked as boolean)}
            />
            <Label htmlFor="acceptance_confirmed" className="text-sm font-medium">
              I confirm my acceptance of these regulations as a condition for admission and continued stay *
            </Label>
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
          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="(000) 000-0000"
              {...form.register('phone_number')}
            />
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
            'Submit Internal Regulations Form'
          )}
        </Button>
      </div>
    </form>
  )
}

