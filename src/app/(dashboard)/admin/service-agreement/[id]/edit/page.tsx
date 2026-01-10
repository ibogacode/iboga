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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  getServiceAgreementForAdminEdit, 
  updateServiceAgreementAdminFields 
} from '@/actions/admin-form-edit.action'

const adminServiceAgreementSchema = z.object({
  total_program_fee: z.string().min(1, 'Total program fee is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num > 0
    },
    { message: 'Total program fee must be a valid number greater than 0' }
  ),
  deposit_amount: z.string().min(1, 'Deposit amount is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num > 0
    },
    { message: 'Deposit amount must be a valid number greater than 0' }
  ),
  deposit_percentage: z.string().min(1, 'Deposit percentage is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num >= 0 && num <= 100
    },
    { message: 'Deposit percentage must be between 0 and 100' }
  ),
  remaining_balance: z.string().min(1, 'Remaining balance is required').refine(
    (val) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return !isNaN(num) && num >= 0
    },
    { message: 'Remaining balance must be a valid number' }
  ),
  provider_signature_name: z.string().min(1, 'Provider signature name is required'),
  provider_signature_date: z.string().min(1, 'Provider signature date is required'),
  number_of_days: z.string().min(1, 'Number of days is required').refine(
    (val) => {
      const num = parseInt(val, 10)
      return !isNaN(num) && num > 0
    },
    { message: 'Number of days must be a valid positive integer' }
  ),
})

type AdminServiceAgreementFormValues = z.infer<typeof adminServiceAgreementSchema>

export default function AdminServiceAgreementEditPage() {
  const router = useRouter()
  const params = useParams()
  const formId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  const form = useForm<AdminServiceAgreementFormValues>({
    resolver: zodResolver(adminServiceAgreementSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    async function loadForm() {
      if (!formId) return
      
      setIsLoading(true)
      const result = await getServiceAgreementForAdminEdit({ formId })
      
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
      // Initialize deposit percentage to 50% if not set
      const depositPct = data.deposit_percentage ? Number(data.deposit_percentage) : 50
      const totalFee = data.total_program_fee ? Number(data.total_program_fee) : 0
      const depositAmt = totalFee > 0 && depositPct > 0 ? (totalFee * depositPct) / 100 : (data.deposit_amount ? Number(data.deposit_amount) : 0)
      const remaining = totalFee > 0 ? totalFee - depositAmt : (data.remaining_balance ? Number(data.remaining_balance) : 0)
      
      form.reset({
        total_program_fee: totalFee > 0 ? `$${totalFee.toLocaleString()}` : '',
        deposit_amount: depositAmt > 0 ? `$${depositAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '',
        deposit_percentage: String(depositPct),
        remaining_balance: remaining >= 0 ? `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '',
        provider_signature_name: data.provider_signature_name || '',
        provider_signature_date: data.provider_signature_date ? new Date(data.provider_signature_date).toISOString().split('T')[0] : '',
        number_of_days: data.number_of_days ? String(data.number_of_days) : '',
      })
      
      setIsLoading(false)
    }
    
    loadForm()
  }, [formId, form, router])

  const handleTotalChange = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && num > 0) {
      const depositPct = parseFloat(form.watch('deposit_percentage') || '50')
      const depositAmt = (num * depositPct) / 100
      const remaining = num - depositAmt
      
      form.setValue('deposit_amount', `$${depositAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      form.setValue('remaining_balance', `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    }
  }
  
  const handleDepositPercentageChange = (value: string) => {
    const pct = parseFloat(value)
    const total = parseFloat((form.watch('total_program_fee') || '').replace(/[^0-9.]/g, ''))
    if (!isNaN(pct) && !isNaN(total) && total > 0 && pct >= 0 && pct <= 100) {
      const depositAmt = (total * pct) / 100
      const remaining = total - depositAmt
      
      form.setValue('deposit_amount', `$${depositAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      form.setValue('remaining_balance', `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    }
  }
  
  const handleDepositChange = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    const total = parseFloat((form.watch('total_program_fee') || '').replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && !isNaN(total) && total > 0) {
      const pct = (num / total) * 100
      const remaining = total - num
      
      form.setValue('deposit_percentage', pct.toFixed(2))
      form.setValue('remaining_balance', `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    }
  }

  const onSubmit = async (data: AdminServiceAgreementFormValues) => {
    if (!formId) return
    
    setIsSaving(true)
    // Convert string number_of_days to integer for the action
    const result = await updateServiceAgreementAdminFields({ 
      ...data, 
      formId,
      number_of_days: String(data.number_of_days || ''),
    })
    
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
        <h1 className="text-3xl font-bold text-gray-900">Edit Service Agreement</h1>
        {formData && (
          <p className="text-gray-600 mt-2">
            Patient: {formData.patient_first_name} {formData.patient_last_name} ({formData.patient_email})
          </p>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Fees & Payment (Admin Fields)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_program_fee" className="text-base font-medium">
                Total Program Fee (USD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="total_program_fee"
                placeholder="e.g., $15,000"
                {...form.register('total_program_fee', {
                  onChange: (e) => handleTotalChange(e.target.value)
                })}
                className={`h-12 ${form.formState.errors.total_program_fee ? 'border-red-500' : ''}`}
              />
              {form.formState.errors.total_program_fee && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.total_program_fee.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="deposit_amount" className="text-base font-medium">
                Deposit Amount (USD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposit_amount"
                placeholder="e.g., $7,500"
                {...form.register('deposit_amount', {
                  onChange: (e) => handleDepositChange(e.target.value)
                })}
                className={`h-12 ${form.formState.errors.deposit_amount ? 'border-red-500' : ''}`}
              />
              {form.formState.errors.deposit_amount && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.deposit_amount.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="deposit_percentage" className="text-base font-medium">
                Deposit Percentage <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deposit_percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="50"
                {...form.register('deposit_percentage', {
                  onChange: (e) => handleDepositPercentageChange(e.target.value)
                })}
                className={`h-12 ${form.formState.errors.deposit_percentage ? 'border-red-500' : ''}`}
              />
              <p className="text-xs text-gray-500 mt-1">Default is 50%</p>
              {form.formState.errors.deposit_percentage && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.deposit_percentage.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="remaining_balance" className="text-base font-medium">
                Remaining Balance <span className="text-red-500">*</span>
              </Label>
              <Input
                id="remaining_balance"
                readOnly
                value={form.watch('remaining_balance')}
                className="h-12 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
            </div>
            
            <div>
              <Label htmlFor="number_of_days" className="text-base font-medium">
                Number of Days of Program <span className="text-red-500">*</span>
              </Label>
              <Input
                id="number_of_days"
                type="number"
                min="1"
                step="1"
                placeholder="14"
                {...form.register('number_of_days')}
                className={`h-12 ${form.formState.errors.number_of_days ? 'border-red-500' : ''}`}
              />
              {form.formState.errors.number_of_days && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.number_of_days.message}
                </p>
              )}
            </div>

          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Provider Signature</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider_signature_name" className="text-base font-medium">
                  Provider Signature Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="provider_signature_name"
                  {...form.register('provider_signature_name')}
                  className={`h-12 ${form.formState.errors.provider_signature_name ? 'border-red-500' : ''}`}
                />
                {form.formState.errors.provider_signature_name && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.provider_signature_name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="provider_signature_date" className="text-base font-medium">
                  Provider Signature Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="provider_signature_date"
                  type="date"
                  {...form.register('provider_signature_date')}
                  className={`h-12 ${form.formState.errors.provider_signature_date ? 'border-red-500' : ''}`}
                />
                {form.formState.errors.provider_signature_date && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.provider_signature_date.message}
                  </p>
                )}
              </div>

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

