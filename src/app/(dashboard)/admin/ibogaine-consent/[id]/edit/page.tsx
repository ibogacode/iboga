'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  getIbogaineConsentForAdminEdit, 
  updateIbogaineConsentAdminFields 
} from '@/actions/admin-form-edit.action'

const adminIbogaineConsentSchema = z.object({
  treatment_date: z.string().min(1, 'Treatment date is required'),
  facilitator_doctor_name: z.string().min(1, 'Facilitator/Doctor name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(1, 'Address is required'),
})

type AdminIbogaineConsentFormValues = z.infer<typeof adminIbogaineConsentSchema>

export default function AdminIbogaineConsentEditPage() {
  const router = useRouter()
  const params = useParams()
  const formId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  const form = useForm<AdminIbogaineConsentFormValues>({
    resolver: zodResolver(adminIbogaineConsentSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    async function loadForm() {
      if (!formId) return
      
      setIsLoading(true)
      const result = await getIbogaineConsentForAdminEdit({ formId })
      
      if (result?.serverError || result?.validationErrors) {
        toast.error('Failed to load form')
        router.back()
        return
      }
      
      if (!result?.data?.data) {
        toast.error('Form not found')
        router.back()
        return
      }
      
      const data = result.data.data
      setFormData(data)
      
      // Format values for form
      form.reset({
        treatment_date: data.treatment_date ? new Date(data.treatment_date).toISOString().split('T')[0] : '',
        facilitator_doctor_name: data.facilitator_doctor_name || '',
        date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : '',
        address: data.address || '',
      })
      
      setIsLoading(false)
    }
    
    loadForm()
  }, [formId, form, router])

  const onSubmit = async (data: AdminIbogaineConsentFormValues) => {
    if (!formId) return
    
    setIsSaving(true)
    const result = await updateIbogaineConsentAdminFields({ ...data, formId })
    
    if (result?.serverError) {
      toast.error(result.serverError || 'Failed to update form')
      setIsSaving(false)
      return
    }
    
    if (result?.validationErrors) {
      toast.error('Please fix validation errors')
      setIsSaving(false)
      return
    }
    
    if (result?.data?.success) {
      toast.success('Form updated successfully')
      router.back()
    } else {
      toast.error(result?.data?.error || 'Failed to update form')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Ibogaine Consent Form</h1>
        {formData && (
          <p className="text-gray-600 mt-2">
            Patient: {formData.first_name} {formData.last_name} ({formData.email})
          </p>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Admin Fields</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="treatment_date" className="text-base font-medium">
                Treatment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="treatment_date"
                type="date"
                {...form.register('treatment_date')}
                className={`h-12 ${form.formState.errors.treatment_date ? 'border-red-500' : ''}`}
              />
              {form.formState.errors.treatment_date && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.treatment_date.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="facilitator_doctor_name" className="text-base font-medium">
                Facilitator/Doctor Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="facilitator_doctor_name"
                {...form.register('facilitator_doctor_name')}
                className={`h-12 ${form.formState.errors.facilitator_doctor_name ? 'border-red-500' : ''}`}
              />
              {form.formState.errors.facilitator_doctor_name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.facilitator_doctor_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="date_of_birth" className="text-base font-medium">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                {...form.register('date_of_birth')}
                className={`h-12 ${form.formState.errors.date_of_birth ? 'border-red-500' : ''}`}
              />
              {form.formState.errors.date_of_birth && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.date_of_birth.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-base font-medium">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                {...form.register('address')}
                className={`h-12 ${form.formState.errors.address ? 'border-red-500' : ''}`}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

