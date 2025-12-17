'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getOpportunities } from '@/actions/opportunities.action'
import { Loader2, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface Opportunity {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  created_at: string
}

export default function PatientPipelinePage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [thisWeekCount, setThisWeekCount] = useState(0)
  const [lastWeekCount, setLastWeekCount] = useState(0)

  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  function handleView(id: string) {
    router.push(`/owner/opportunities?view=${id}`)
  }

  const loadOpportunities = useCallback(async () => {
    setIsLoading(true)
    const result = await getOpportunities({ limit: 100, offset: 0 })
    if (result?.data?.success && result.data.data) {
      const allOpportunities = result.data.data.opportunities
      setOpportunities(allOpportunities)
      
      // Calculate this week vs last week
      const now = new Date()
      const startOfThisWeek = new Date(now)
      startOfThisWeek.setDate(now.getDate() - now.getDay())
      startOfThisWeek.setHours(0, 0, 0, 0)
      
      const startOfLastWeek = new Date(startOfThisWeek)
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
      
      const thisWeek = allOpportunities.filter((o: Opportunity) => 
        new Date(o.created_at) >= startOfThisWeek
      ).length
      
      const lastWeek = allOpportunities.filter((o: Opportunity) => {
        const date = new Date(o.created_at)
        return date >= startOfLastWeek && date < startOfThisWeek
      }).length
      
      setThisWeekCount(thisWeek)
      setLastWeekCount(lastWeek)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadOpportunities()
  }, [loadOpportunities])

  const weekDiff = thisWeekCount - lastWeekCount
  const isPositive = weekDiff >= 0

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
      <div className="mb-8">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inquiries - Dynamic */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-2">Total Inquiries</p>
          <p className="text-4xl font-semibold text-gray-900 mb-3">{opportunities.length}</p>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
              isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {isPositive ? '+' : ''}{weekDiff}
            </span>
            <span className="text-gray-400 text-sm">this week</span>
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

      {/* Inquiries Table */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Inquiries</h2>
        
        {opportunities.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">No inquiries yet.</p>
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
                    Submitted
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
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
                      <div className="text-sm text-gray-500">{formatDate(opportunity.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(opportunity.id)}
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
