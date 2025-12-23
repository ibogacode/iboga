'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getOpportunities, getOpportunity } from '@/actions/opportunities.action'
import { Button } from '@/components/ui/button'
import { Download, Printer, ArrowLeft, Loader2, Eye } from 'lucide-react'
import { OpportunityFormView } from '@/components/admin/opportunity-form-view'

interface Opportunity {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  date_of_birth: string | null
  gender: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  emergency_contact_first_name: string
  emergency_contact_last_name: string
  emergency_contact_email: string | null
  emergency_contact_phone: string
  emergency_contact_address: string | null
  emergency_contact_relationship: string | null
  privacy_policy_accepted: boolean
  consent_for_treatment: boolean
  risks_and_benefits: boolean
  pre_screening_health_assessment: boolean
  voluntary_participation: boolean
  confidentiality: boolean
  liability_release: boolean
  payment_collection_1: boolean
  payment_collection_2: boolean
  ibogaine_therapy_consent_accepted: boolean
  service_agreement_accepted: boolean
  release_consent_accepted: boolean
  final_acknowledgment_accepted: boolean
  signature_data: string | null
  signature_date: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isViewing, setIsViewing] = useState(false)

  useEffect(() => {
    loadOpportunities()
  }, [])

  useEffect(() => {
    const viewId = searchParams.get('view')
    if (viewId) {
      if (opportunities.length > 0) {
        const opportunity = opportunities.find(o => o.id === viewId)
        if (opportunity) {
          setSelectedOpportunity(opportunity)
          setIsViewing(true)
        } else {
          // Try to fetch it directly
          loadOpportunity(viewId)
        }
      } else {
        // Wait for opportunities to load, then check again
        const timer = setTimeout(() => {
          if (opportunities.length > 0) {
            const opportunity = opportunities.find(o => o.id === viewId)
            if (opportunity) {
              setSelectedOpportunity(opportunity)
              setIsViewing(true)
            } else {
              loadOpportunity(viewId)
            }
          }
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [searchParams, opportunities])

  async function loadOpportunities() {
    setIsLoading(true)
    const result = await getOpportunities({ limit: 100, offset: 0 })
    if (result?.data?.success && result.data.data) {
      setOpportunities(result.data.data.opportunities)
    }
    setIsLoading(false)
  }

  async function loadOpportunity(id: string) {
    setIsLoading(true)
    const result = await getOpportunity({ id })
    if (result?.data?.success && result.data.data) {
      setSelectedOpportunity(result.data.data.opportunity)
      setIsViewing(true)
    }
    setIsLoading(false)
  }

  function handleView(opportunity: Opportunity) {
    setSelectedOpportunity(opportunity)
    setIsViewing(true)
  }

  function handlePrint() {
    window.print()
  }

  function handleDownload() {
    if (!selectedOpportunity) return
    
    const element = document.getElementById('opportunity-form-view')
    if (!element) return

    // Clone the element to preserve original
    const clonedElement = element.cloneNode(true) as HTMLElement
    
    // Create a new window with the form content
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Get all styles from the current document
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n')
        } catch (e) {
          return ''
        }
      })
      .join('\n')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Application Form - ${selectedOpportunity.first_name} ${selectedOpportunity.last_name}</title>
          <meta charset="utf-8">
          <style>
            ${styles}
            @media print {
              body { 
                padding: 0;
                margin: 0;
                background: white;
              }
              .no-print { 
                display: none !important; 
              }
              .print\\:break-inside-avoid {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .print\\:mb-6 {
                margin-bottom: 1.5rem;
              }
              .print\\:p-4 {
                padding: 1rem;
              }
              .print\\:bg-white {
                background: white;
              }
              .print\\:py-4 {
                padding-top: 1rem;
                padding-bottom: 1rem;
              }
              .print\\:shadow-none {
                box-shadow: none;
              }
              .print\\:rounded-none {
                border-radius: 0;
              }
              .print\\:mb-4 {
                margin-bottom: 1rem;
              }
            }
            @page {
              size: letter;
              margin: 0.5in;
            }
          </style>
        </head>
        <body>
          ${clonedElement.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  if (isViewing && selectedOpportunity) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex items-center justify-between no-print">
          <Button
            variant="outline"
            onClick={() => {
              setIsViewing(false)
              setSelectedOpportunity(null)
              router.push('/owner/opportunities')
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
        <div id="opportunity-form-view">
          <OpportunityFormView opportunity={selectedOpportunity} />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Patient Opportunities</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No opportunities found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {opportunity.first_name} {opportunity.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{opportunity.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{opportunity.phone_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(opportunity.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(opportunity)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Form
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

