'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOpportunities } from '@/actions/opportunities.action'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Opportunity {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  created_at: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOpportunities()
  }, [])

  async function loadOpportunities() {
    setIsLoading(true)
    const result = await getOpportunities({ limit: 100, offset: 0 })
    if (result?.data?.success && result.data.data) {
      setOpportunities(result.data.data.opportunities)
    }
    setIsLoading(false)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 
        style={{ 
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: '44px',
          fontWeight: 400,
          color: 'black',
          wordWrap: 'break-word',
          marginBottom: '32px'
        }}
      >
        Onboarding
      </h1>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          View and manage patient opportunities submitted through the public form.
        </p>
        <Link href="/owner/opportunities">
          <Button variant="outline">
            View All Opportunities
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow p-8">
          <p>No opportunities found.</p>
          <p className="text-sm mt-2">New opportunities will appear here once submitted.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Recent Opportunities</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {opportunities.slice(0, 10).map((opportunity) => (
              <div 
                key={opportunity.id} 
                className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {opportunity.first_name} {opportunity.last_name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {opportunity.email} • {opportunity.phone_number}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Submitted: {new Date(opportunity.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Link href={`/owner/opportunities?view=${opportunity.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          {opportunities.length > 10 && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <Link href="/owner/opportunities">
                <Button variant="ghost">
                  View All {opportunities.length} Opportunities
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
