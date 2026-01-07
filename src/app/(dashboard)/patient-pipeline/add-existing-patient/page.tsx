'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addExistingPatient } from '@/actions/existing-patient.action'
import { uploadDocumentClient } from '@/lib/supabase/client-storage'
import { ArrowLeft, Upload, FileText, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DocumentUpload } from '@/components/forms/document-upload'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Form schema matching the server action
const existingPatientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  program_type: z.enum(['neurological', 'mental_health', 'addiction']).optional(),
  emergency_contact_first_name: z.string().optional(),
  emergency_contact_last_name: z.string().optional(),
  emergency_contact_email: z.string().email().optional().or(z.literal('')),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  intake_form_document_url: z.string().url().optional().or(z.literal('')),
  intake_form_document_name: z.string().optional(),
  medical_history_document_url: z.string().url().optional().or(z.literal('')),
  medical_history_document_name: z.string().optional(),
  service_agreement_document_url: z.string().url().optional().or(z.literal('')),
  service_agreement_document_name: z.string().optional(),
  ibogaine_consent_document_url: z.string().url().optional().or(z.literal('')),
  ibogaine_consent_document_name: z.string().optional(),
  notes: z.string().optional(),
})

type ExistingPatientFormValues = z.infer<typeof existingPatientSchema>

interface OtherDocument {
  name: string
  url: string
}

export default function AddExistingPatientPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [otherDocuments, setOtherDocuments] = useState<OtherDocument[]>([])
  const [showOtherDocForm, setShowOtherDocForm] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocUrl, setNewDocUrl] = useState('')

  const form = useForm<ExistingPatientFormValues>({
    resolver: zodResolver(existingPatientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      date_of_birth: '',
      gender: undefined,
      address: '',
      city: '',
      state: '',
      zip_code: '',
      program_type: undefined,
      emergency_contact_first_name: '',
      emergency_contact_last_name: '',
      emergency_contact_email: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      intake_form_document_url: '',
      medical_history_document_url: '',
      service_agreement_document_url: '',
      ibogaine_consent_document_url: '',
      notes: '',
    },
  })

  const addOtherDocument = () => {
    if (!newDocName.trim() || !newDocUrl.trim()) {
      toast.error('Please provide both document name and URL')
      return
    }

    try {
      // Validate URL
      new URL(newDocUrl)
      setOtherDocuments([...otherDocuments, { name: newDocName, url: newDocUrl }])
      setNewDocName('')
      setNewDocUrl('')
      setShowOtherDocForm(false)
      toast.success('Document added')
    } catch {
      toast.error('Please provide a valid URL')
    }
  }

  const removeOtherDocument = (index: number) => {
    setOtherDocuments(otherDocuments.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: ExistingPatientFormValues) => {
    setIsSubmitting(true)
    try {
      // Clean up empty strings to null
      const cleanedData = {
        ...data,
        intake_form_document_url: data.intake_form_document_url || null,
        medical_history_document_url: data.medical_history_document_url || null,
        service_agreement_document_url: data.service_agreement_document_url || null,
        ibogaine_consent_document_url: data.ibogaine_consent_document_url || null,
        emergency_contact_email: data.emergency_contact_email || null,
        other_documents: otherDocuments.length > 0 ? otherDocuments : null,
      }
      
      const result = await addExistingPatient(cleanedData)

      if (result?.data?.success && result.data.data) {
        toast.success(result.data.data.message || 'Existing patient added successfully')
        router.push('/patient-pipeline')
      } else {
        toast.error(result?.data?.error || 'Failed to add existing patient')
      }
    } catch (error) {
      console.error('Error adding existing patient:', error)
      toast.error('An error occurred while adding the patient')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Add Existing Patient</h1>
        <p className="text-gray-600">
          Add a patient who has already completed treatment or has existing documents.
          Fill in only the information you have available.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
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
                {...form.register('phone_number')}
                placeholder="(000) 000-0000"
              />
            </div>
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...form.register('date_of_birth')}
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={form.watch('gender') || ''}
                onValueChange={(value) => form.setValue('gender', value as any)}
              >
                <SelectTrigger>
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
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" {...form.register('address')} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register('city')} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" {...form.register('state')} />
            </div>
            <div>
              <Label htmlFor="zip_code">Zip Code</Label>
              <Input id="zip_code" {...form.register('zip_code')} />
            </div>
          </div>
        </div>

        {/* Program Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Program Information</h2>
          <div>
            <Label htmlFor="program_type">Program Type</Label>
            <Select
              value={form.watch('program_type') || ''}
              onValueChange={(value) => form.setValue('program_type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select program type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neurological">Neurological Treatment Program</SelectItem>
                <SelectItem value="mental_health">Mental Health Treatment Program</SelectItem>
                <SelectItem value="addiction">Addiction Treatment Program</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Emergency Contact (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency_contact_first_name">First Name</Label>
              <Input id="emergency_contact_first_name" {...form.register('emergency_contact_first_name')} />
            </div>
            <div>
              <Label htmlFor="emergency_contact_last_name">Last Name</Label>
              <Input id="emergency_contact_last_name" {...form.register('emergency_contact_last_name')} />
            </div>
            <div>
              <Label htmlFor="emergency_contact_email">Email</Label>
              <Input
                id="emergency_contact_email"
                type="email"
                {...form.register('emergency_contact_email')}
              />
            </div>
            <div>
              <Label htmlFor="emergency_contact_phone">Phone</Label>
              <Input id="emergency_contact_phone" {...form.register('emergency_contact_phone')} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="emergency_contact_relationship">Relationship</Label>
              <Input id="emergency_contact_relationship" {...form.register('emergency_contact_relationship')} />
            </div>
          </div>
        </div>

        {/* Document Uploads Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Uploads *
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload existing documents or provide URLs. You can upload PDFs, images, or Word documents.
          </p>
          
          <div className="space-y-4">
            <DocumentUpload
              label="Application Form Document"
              fileType="intake"
              value={form.watch('intake_form_document_url') || null}
              onChange={(url, fileName) => {
                form.setValue('intake_form_document_url', url || '')
                if (fileName) form.setValue('intake_form_document_name', fileName)
              }}
              onUpload={async (file) => {
                // Upload directly to Supabase Storage from client (bypasses Server Action body size limit)
                const result = await uploadDocumentClient('intake-form-documents', file)
                return { url: result.url, fileName: file.name }
              }}
            />
            <DocumentUpload
              label="Medical History Document"
              fileType="medical"
              value={form.watch('medical_history_document_url') || null}
              onChange={(url, fileName) => {
                form.setValue('medical_history_document_url', url || '')
                if (fileName) form.setValue('medical_history_document_name', fileName)
              }}
              onUpload={async (file) => {
                // Upload directly to Supabase Storage from client (bypasses Server Action body size limit)
                const result = await uploadDocumentClient('medical-history-documents', file)
                return { url: result.url, fileName: file.name }
              }}
            />
            <DocumentUpload
              label="Service Agreement Document"
              fileType="service"
              value={form.watch('service_agreement_document_url') || null}
              onChange={(url, fileName) => {
                form.setValue('service_agreement_document_url', url || '')
                if (fileName) form.setValue('service_agreement_document_name', fileName)
              }}
              onUpload={async (file) => {
                // Upload directly to Supabase Storage from client (bypasses Server Action body size limit)
                const result = await uploadDocumentClient('service-agreement-documents', file)
                return { url: result.url, fileName: file.name }
              }}
            />
            <DocumentUpload
              label="Ibogaine Consent Form Document"
              fileType="ibogaine"
              value={form.watch('ibogaine_consent_document_url') || null}
              onChange={(url, fileName) => {
                form.setValue('ibogaine_consent_document_url', url || '')
                if (fileName) form.setValue('ibogaine_consent_document_name', fileName)
              }}
              onUpload={async (file) => {
                // Upload directly to Supabase Storage from client (bypasses Server Action body size limit)
                const result = await uploadDocumentClient('ibogaine-consent-documents', file)
                return { url: result.url, fileName: file.name }
              }}
            />
            
            {/* URL Input Fallback */}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Or provide document URLs directly:</p>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="intake_form_document_url_manual">Application Form URL</Label>
                  <Input
                    id="intake_form_document_url_manual"
                    type="url"
                    placeholder="https://..."
                    value={form.watch('intake_form_document_url') || ''}
                    onChange={(e) => form.setValue('intake_form_document_url', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="medical_history_document_url_manual">Medical History URL</Label>
                  <Input
                    id="medical_history_document_url_manual"
                    type="url"
                    placeholder="https://..."
                    value={form.watch('medical_history_document_url') || ''}
                    onChange={(e) => form.setValue('medical_history_document_url', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="service_agreement_document_url_manual">Service Agreement URL</Label>
                  <Input
                    id="service_agreement_document_url_manual"
                    type="url"
                    placeholder="https://..."
                    value={form.watch('service_agreement_document_url') || ''}
                    onChange={(e) => form.setValue('service_agreement_document_url', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ibogaine_consent_document_url_manual">Ibogaine Consent URL</Label>
                  <Input
                    id="ibogaine_consent_document_url_manual"
                    type="url"
                    placeholder="https://..."
                    value={form.watch('ibogaine_consent_document_url') || ''}
                    onChange={(e) => form.setValue('ibogaine_consent_document_url', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Other Documents */}
            {otherDocuments.length > 0 && (
              <div className="mt-4">
                <Label>Other Documents</Label>
                <div className="space-y-2 mt-2">
                  {otherDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="flex-1 text-sm">{doc.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOtherDocument(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showOtherDocForm ? (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <Input
                  placeholder="Document name"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                />
                <Input
                  type="url"
                  placeholder="Document URL"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={addOtherDocument}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowOtherDocForm(false)
                      setNewDocName('')
                      setNewDocUrl('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOtherDocForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Other Document
              </Button>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Additional Notes (Optional)</h2>
          <Textarea
            id="notes"
            rows={4}
            placeholder="Add any additional information about this existing patient..."
            {...form.register('notes')}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding Patient...
              </>
            ) : (
              'Add Existing Patient'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

