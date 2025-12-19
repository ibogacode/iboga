'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { partialIntakeFormSchema, type PartialIntakeFormSchemaValues } from '@/lib/validations/partial-intake'
import { createPartialIntakeForm } from '@/actions/partial-intake.action'
import { toast } from 'sonner'

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function InitiateIntakeForm() {
  const [mode, setMode] = useState<'minimal' | 'partial'>('minimal')
  const [isLoading, setIsLoading] = useState(false)

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
    },
  })

  async function onSubmit(data: PartialIntakeFormSchemaValues) {
    setIsLoading(true)
    try {
      const result = await createPartialIntakeForm(data)
      
      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }
      
      if (result?.validationErrors) {
        const firstError = Object.values(result.validationErrors)[0]?._errors?.[0]
        toast.error(firstError || 'Validation error')
        return
      }
      
      if (result?.data?.success) {
        toast.success('Intake form created and email sent successfully!')
      } else {
        toast.error('Failed to create intake form')
        return
      }
      
      // Reset form
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
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-#EDE9E4">
      <div className="max-w-4xl mx-auto bg-white p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Initiate Patient Intake Form
        </h1>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Mode Selection */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Form Mode</h2>
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Select Form Mode <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => {
                setMode(value as 'minimal' | 'partial')
                form.setValue('mode', value as 'minimal' | 'partial')
                // Reset form when mode changes
                form.reset({
                  mode: value as 'minimal' | 'partial',
                  filled_by: form.getValues('filled_by'),
                  filler_relationship: form.getValues('filler_relationship'),
                  filler_first_name: form.getValues('filler_first_name'),
                  filler_last_name: form.getValues('filler_last_name'),
                  filler_email: form.getValues('filler_email'),
                  filler_phone: form.getValues('filler_phone'),
                  first_name: form.getValues('first_name'),
                  last_name: form.getValues('last_name'),
                  email: form.getValues('email'),
                })
              }}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minimal" id="mode_minimal" />
                <Label htmlFor="mode_minimal" className="font-normal cursor-pointer">
                  Minimal (Name & Email only)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="mode_partial" />
                <Label htmlFor="mode_partial" className="font-normal cursor-pointer">
                  Partial (Up to Emergency Contact)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Form Filler Section */}
        <div className="space-y-6 border-t pt-6">
          <h2 className="text-2xl font-semibold text-gray-900">Who Will Fill Out This Form?</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <Label className="text-base font-medium">
              Is the patient filling this out themselves, or will someone else fill it out for them? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={form.watch('filled_by')}
              onValueChange={(value) => {
                form.setValue('filled_by', value as 'self' | 'someone_else')
                if (value === 'self') {
                  // Clear filler fields when switching to self
                  form.setValue('filler_relationship', null)
                  form.setValue('filler_first_name', null)
                  form.setValue('filler_last_name', null)
                  form.setValue('filler_email', null)
                  form.setValue('filler_phone', null)
                }
              }}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self" id="filled_by_self" />
                <Label htmlFor="filled_by_self" className="font-normal cursor-pointer">
                  Patient will fill it out themselves
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="someone_else" id="filled_by_other" />
                <Label htmlFor="filled_by_other" className="font-normal cursor-pointer">
                  Someone else will fill it out for the patient
                </Label>
              </div>
            </RadioGroup>
            {form.formState.errors.filled_by && (
              <p className="text-sm text-red-500">{form.formState.errors.filled_by.message}</p>
            )}

            {/* Show filler information fields if someone else is filling */}
            {form.watch('filled_by') === 'someone_else' && (
              <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                <div>
                  <Label htmlFor="filler_relationship" className="text-base font-medium">
                    What is their relationship to the patient? <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.watch('filler_relationship') || ''}
                    onValueChange={(value) => form.setValue('filler_relationship', value)}
                  >
                    <SelectTrigger className="h-12 mt-2">
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

                <div>
                  <Label className="text-base font-medium">
                    Person Filling Out Form Information <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Input
                        id="filler_first_name"
                        placeholder="First Name"
                        {...form.register('filler_first_name')}
                        className="h-12"
                      />
                      {form.formState.errors.filler_first_name && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_first_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        id="filler_last_name"
                        placeholder="Last Name"
                        {...form.register('filler_last_name')}
                        className="h-12"
                      />
                      {form.formState.errors.filler_last_name && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_last_name.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="filler_email" className="text-base font-medium">
                    Their Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="filler_email"
                    type="email"
                    placeholder="email@example.com"
                    {...form.register('filler_email')}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.filler_email && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="filler_phone" className="text-base font-medium">
                    Their Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="filler_phone"
                    type="tel"
                    placeholder="(000) 000-0000"
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
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.filler_phone && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.filler_phone.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patient Information */}
        <div className="space-y-6 border-t pt-6">
          <h2 className="text-2xl font-semibold text-gray-900">Patient Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                {...form.register('first_name')}
                className="h-12 mt-2"
              />
              {form.formState.errors.first_name && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                {...form.register('last_name')}
                className="h-12 mt-2"
              />
              {form.formState.errors.last_name && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">
              Patient Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className="h-12 mt-2"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Partial Mode Fields */}
        {mode === 'partial' && (
          <div className="space-y-6 border-t pt-6">
            <h2 className="text-2xl font-semibold text-gray-900">Additional Patient Details</h2>
            
            <div>
              <Label htmlFor="phone_number">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone_number"
                type="tel"
                placeholder="(000) 000-0000"
                {...form.register('phone_number')}
                className="h-12 mt-2"
              />
              {form.formState.errors.phone_number && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone_number.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...form.register('date_of_birth')}
                  className="h-12 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={form.watch('gender') || ''}
                  onValueChange={(value) => form.setValue('gender', value as any)}
                >
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Select gender" />
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

            <div>
              <Label htmlFor="address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                {...form.register('address')}
                className="h-12 mt-2"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  className="h-12 mt-2"
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="state">
                  State <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.watch('state') || ''}
                  onValueChange={(value) => form.setValue('state', value)}
                >
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.state && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.state.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="zip_code">
                  Zip Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zip_code"
                  {...form.register('zip_code')}
                  className="h-12 mt-2"
                />
                {form.formState.errors.zip_code && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.zip_code.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="program_type">
                Program Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('program_type') || ''}
                onValueChange={(value) => form.setValue('program_type', value as any)}
              >
                <SelectTrigger className="h-12 mt-2">
                  <SelectValue placeholder="Select program type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neurological">Neurological</SelectItem>
                  <SelectItem value="mental_health">Mental Health</SelectItem>
                  <SelectItem value="addiction">Addiction</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.program_type && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.program_type.message}</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Emergency Contact</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_first_name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergency_contact_first_name"
                    {...form.register('emergency_contact_first_name')}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.emergency_contact_first_name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_first_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="emergency_contact_last_name">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergency_contact_last_name"
                    {...form.register('emergency_contact_last_name')}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.emergency_contact_last_name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="emergency_contact_email">Email</Label>
                  <Input
                    id="emergency_contact_email"
                    type="email"
                    {...form.register('emergency_contact_email')}
                    className="h-12 mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    placeholder="(000) 000-0000"
                    {...form.register('emergency_contact_phone')}
                    className="h-12 mt-2"
                  />
                  {form.formState.errors.emergency_contact_phone && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergency_contact_phone.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="emergency_contact_address">Address</Label>
                <Input
                  id="emergency_contact_address"
                  {...form.register('emergency_contact_address')}
                  className="h-12 mt-2"
                />
              </div>

              <div className="mt-4">
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
                  {...form.register('emergency_contact_relationship')}
                  className="h-12 mt-2"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-6 border-t">
          <Button type="submit" disabled={isLoading} className="px-8 py-6 text-base">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Form...
              </>
            ) : (
              'Create Form & Send Email'
            )}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
