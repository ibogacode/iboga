'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad } from '@/components/forms/signature-pad'
import { submitSocialMediaForm } from '@/actions/onboarding-forms.action'
import { socialMediaFormSchema, type SocialMediaFormInput } from '@/lib/validations/onboarding-forms'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'

interface SocialMediaFormProps {
  onboardingId: string
  initialData?: Partial<SocialMediaFormInput>
  isCompleted?: boolean
  onSuccess?: () => void
}

export function SocialMediaForm({ onboardingId, initialData, isCompleted, onSuccess }: SocialMediaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SocialMediaFormInput>({
    resolver: zodResolver(socialMediaFormSchema),
    defaultValues: {
      onboarding_id: onboardingId,
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      email: initialData?.email || '',
      phone_number: initialData?.phone_number || '',
      consent_image_photograph: initialData?.consent_image_photograph || false,
      consent_video_recordings: initialData?.consent_video_recordings || false,
      consent_voice_recordings: initialData?.consent_voice_recordings || false,
      consent_written_testimonials: initialData?.consent_written_testimonials || false,
      consent_first_name_only: initialData?.consent_first_name_only || false,
      authorize_recording: initialData?.authorize_recording || false,
      authorize_promotional_use: initialData?.authorize_promotional_use || false,
      voluntary_participation_understood: initialData?.voluntary_participation_understood || false,
      confidentiality_understood: initialData?.confidentiality_understood || false,
      revocation_understood: initialData?.revocation_understood || false,
      anonymity_option_understood: initialData?.anonymity_option_understood || false,
      signature_data: initialData?.signature_data || '',
      signature_date: initialData?.signature_date || new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: SocialMediaFormInput) {
    setIsSubmitting(true)
    try {
      const result = await submitSocialMediaForm(data)
      if (result?.data?.success) {
        toast.success('Social media release form submitted successfully')
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
        <h1 className="text-2xl font-bold text-gray-900">Patient Social Media Release</h1>
        <p className="text-gray-600 mt-2">Location: Cozumel, Mexico</p>
      </div>

      {/* Introduction */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-700 text-sm">
          At Iboga Wellness Centers, we respect the privacy and confidentiality of all our patients. From time to time, 
          photographs or videos may be taken during activities, ceremonies, or around the center. We may also collect 
          short written or spoken testimonials.
        </p>
        <p className="text-gray-700 text-sm mt-2">
          We kindly ask for your permission to use your image, likeness, voice, or testimonial for educational and promotional purposes.
        </p>
      </div>

      {/* Consent & Authorization */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Consent & Authorization</h2>
        <p className="text-gray-600 text-sm">I, the undersigned, authorize Iboga Wellness Centers to:</p>
        
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="authorize_recording"
              checked={form.watch('authorize_recording')}
              onCheckedChange={(checked) => form.setValue('authorize_recording', checked as boolean)}
            />
            <Label htmlFor="authorize_recording" className="text-sm">
              Record my image, likeness, or voice through photographs, video, or audio recordings.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="authorize_promotional_use"
              checked={form.watch('authorize_promotional_use')}
              onCheckedChange={(checked) => form.setValue('authorize_promotional_use', checked as boolean)}
            />
            <Label htmlFor="authorize_promotional_use" className="text-sm">
              Use these materials for educational, promotional, and marketing purposes, including on social media, websites, brochures, and presentations.
            </Label>
          </div>
        </div>
      </div>

      {/* Patient Rights */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Patient Rights</h2>
        <p className="text-gray-600 text-sm">Please acknowledge that you understand the following:</p>
        
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="voluntary_participation_understood"
              checked={form.watch('voluntary_participation_understood')}
              onCheckedChange={(checked) => form.setValue('voluntary_participation_understood', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="voluntary_participation_understood" className="font-medium">Voluntary Participation *</Label>
              <p className="text-sm text-gray-600">I understand that my consent is completely voluntary and is not a condition of treatment.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="confidentiality_understood"
              checked={form.watch('confidentiality_understood')}
              onCheckedChange={(checked) => form.setValue('confidentiality_understood', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="confidentiality_understood" className="font-medium">Confidentiality *</Label>
              <p className="text-sm text-gray-600">I understand that if I choose not to consent, my identity will not be recorded or shared.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="revocation_understood"
              checked={form.watch('revocation_understood')}
              onCheckedChange={(checked) => form.setValue('revocation_understood', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="revocation_understood" className="font-medium">Revocation *</Label>
              <p className="text-sm text-gray-600">I may withdraw consent at any time by submitting written notice. However, I understand this will not apply to materials already created or published.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="anonymity_option_understood"
              checked={form.watch('anonymity_option_understood')}
              onCheckedChange={(checked) => form.setValue('anonymity_option_understood', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="anonymity_option_understood" className="font-medium">Anonymity Option *</Label>
              <p className="text-sm text-gray-600">I may request that only my first name or no name at all be associated with any media.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Consent Options */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Consent Options (check all that apply)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="consent_image_photograph"
              checked={form.watch('consent_image_photograph')}
              onCheckedChange={(checked) => form.setValue('consent_image_photograph', checked as boolean)}
            />
            <Label htmlFor="consent_image_photograph" className="text-sm">
              I consent to the use of my image/photograph
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="consent_video_recordings"
              checked={form.watch('consent_video_recordings')}
              onCheckedChange={(checked) => form.setValue('consent_video_recordings', checked as boolean)}
            />
            <Label htmlFor="consent_video_recordings" className="text-sm">
              I consent to the use of my video recordings
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="consent_voice_recordings"
              checked={form.watch('consent_voice_recordings')}
              onCheckedChange={(checked) => form.setValue('consent_voice_recordings', checked as boolean)}
            />
            <Label htmlFor="consent_voice_recordings" className="text-sm">
              I consent to the use of my voice recordings
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="consent_written_testimonials"
              checked={form.watch('consent_written_testimonials')}
              onCheckedChange={(checked) => form.setValue('consent_written_testimonials', checked as boolean)}
            />
            <Label htmlFor="consent_written_testimonials" className="text-sm">
              I consent to the use of my written testimonials
            </Label>
          </div>

          <div className="flex items-center space-x-3 md:col-span-2">
            <Checkbox
              id="consent_first_name_only"
              checked={form.watch('consent_first_name_only')}
              onCheckedChange={(checked) => form.setValue('consent_first_name_only', checked as boolean)}
            />
            <Label htmlFor="consent_first_name_only" className="text-sm">
              I consent to use of my first name only in connection with the above
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
            'Submit Social Media Release'
          )}
        </Button>
      </div>
    </form>
  )
}

