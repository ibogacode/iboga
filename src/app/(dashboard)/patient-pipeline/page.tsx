'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPartialIntakeForms, getPublicIntakeForms } from '@/actions/patient-pipeline.action'
import { Loader2, TrendingUp, TrendingDown, Eye, CheckCircle2, Users, Mail, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface PartialIntakeForm {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  mode: 'minimal' | 'partial'
  filled_by: 'self' | 'someone_else' | null
  recipient_email: string
  recipient_name: string | null
  created_at: string
  completed_at: string | null
  completed_form_id: string | null
  email_sent_at: string | null
  creator?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  }
  formCompletion?: {
    completed: number
    total: number
  }
}

interface PublicIntakeForm {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  created_at: string
  formCompletion?: {
    completed: number
    total: number
  }
}

export default function PatientPipelinePage() {
  const router = useRouter()
  const [partialForms, setPartialForms] = useState<PartialIntakeForm[]>([])
  const [publicForms, setPublicForms] = useState<PublicIntakeForm[]>([])
  const [isLoading, setIsLoading] = useState(true)

  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  function handleViewPartial(id: string) {
    // Navigate to patient profile page using partial form ID
    router.push(`/patient-pipeline/patient-profile/${id}`)
  }

  function handleViewPublic(id: string) {
    // Navigate to patient profile page using intake form ID
    router.push(`/patient-pipeline/patient-profile/${id}`)
  }

  const loadPipelineData = useCallback(async () => {
    setIsLoading(true)
    
    // Load both partial and public forms
    const [partialResult, publicResult] = await Promise.all([
      getPartialIntakeForms({ limit: 100 }),
      getPublicIntakeForms({ limit: 100 })
    ])
    
    if (partialResult?.data?.success && partialResult.data.data) {
      setPartialForms(partialResult.data.data)
    }
    
    if (publicResult?.data?.success && publicResult.data.data) {
      setPublicForms(publicResult.data.data)
    }
    
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadPipelineData()
  }, [loadPipelineData])

  const totalInquiries = partialForms.length + publicForms.length

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 
            style={{ 
              fontFamily: 'var(--font-instrument-serif), serif',
              fontSize: '44px',
              fontWeight: 400,
              color: 'black',
              wordWrap: 'break-word'
            }}
          >
            Patient Pipeline
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Track inquiries, scheduled patients, and onboarding.
          </p>
        </div>

        {/* Add Patient Button - Links to Initiate Intake */}
        <Link href="/owner/initiate-intake">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Add Patient
            </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inquiries - Dynamic */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Total Inquiries</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">{totalInquiries}</p>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {partialForms.length} admin sent, {publicForms.length} direct
            </span>
          </div>
        </div>

        {/* Scheduled Patients - Static */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Scheduled Patients</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">24</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              28%
            </span>
            <span className="text-gray-400 text-sm">conversion</span>
          </div>
        </div>

        {/* In Onboarding - Static */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">In Onboarding</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">9</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              3
            </span>
            <span className="text-gray-400 text-sm">at risk (slow)</span>
          </div>
        </div>

        {/* Pipeline Value - Static */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Pipeline Value</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">$380K</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              7%
            </span>
            <span className="text-gray-400 text-sm">vs last month</span>
          </div>
        </div>
      </div>

      {/* Admin/Owner Sent Forms */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">Admin/Owner Sent Forms</h2>
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
            {partialForms.length}
          </span>
        </div>
        
        {partialForms.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">No forms sent by admin/owner yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent To
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partialForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {form.first_name} {form.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{form.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{form.phone_number || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        form.mode === 'minimal' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {form.mode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{form.recipient_email}</div>
                      {form.recipient_name && (
                        <div className="text-xs text-gray-400">{form.recipient_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {form.formCompletion ? (
                        <div className="text-sm font-medium text-gray-900">
                          {form.formCompletion.completed}/{form.formCompletion.total}
                        </div>
                      ) : form.completed_at ? (
                        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <div className="text-sm text-amber-600">Pending</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(form.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPartial(form.id)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct Public Applications */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Direct Public Applications</h2>
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            {publicForms.length}
          </span>
        </div>
        
        {publicForms.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">No direct public applications yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {publicForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {form.first_name} {form.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{form.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{form.phone_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {form.formCompletion ? (
                        <div className="text-sm font-medium text-gray-900">
                          {form.formCompletion.completed}/{form.formCompletion.total}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">1/3</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(form.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPublic(form.id)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
