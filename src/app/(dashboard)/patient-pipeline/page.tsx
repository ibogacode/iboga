'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPartialIntakeForms, getPublicIntakeForms, getScheduledPatientsCount, getPipelineStatistics } from '@/actions/patient-pipeline.action'
import { getProspects } from '@/actions/prospect-status.action'
import { Loader2, TrendingUp, TrendingDown, Eye, CheckCircle2, Users, Mail, UserPlus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddPatientModal } from '@/components/patient/add-patient-modal'
import { ProspectsTable, type Prospect } from '@/components/patient/prospects-table'
import { format } from 'date-fns'
import { useUser } from '@/hooks/use-user.hook'

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
  program_type: 'neurological' | 'mental_health' | 'addiction' | null
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
  program_type: 'neurological' | 'mental_health' | 'addiction' | null
  formCompletion?: {
    completed: number
    total: number
  }
}

export default function PatientPipelinePage() {
  const router = useRouter()
  const { profile } = useUser()
  const [partialForms, setPartialForms] = useState<PartialIntakeForm[]>([])
  const [publicForms, setPublicForms] = useState<PublicIntakeForm[]>([])
  const [scheduledCount, setScheduledCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  // Pipeline statistics state
  const [onboardingCount, setOnboardingCount] = useState<number>(0)
  const [atRiskCount, setAtRiskCount] = useState<number>(0)
  const [pipelineValue, setPipelineValue] = useState<number>(0)
  const [monthOverMonthChange, setMonthOverMonthChange] = useState<number>(0)
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [currentPagePartial, setCurrentPagePartial] = useState(1)
  const [currentPagePublic, setCurrentPagePublic] = useState(1)
  const [itemsPerPage] = useState(6)
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all-time')
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [activeApplicationsTab, setActiveApplicationsTab] = useState<'invites' | 'applications'>('applications')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isProspectsLoading, setIsProspectsLoading] = useState(true)

  // All staff roles can view client profiles

  const programs = [
    { value: 'all', label: 'All Programs' },
    { value: 'neurological', label: 'Neurological' },
    { value: 'mental_health', label: 'Mental Health' },
    { value: 'addiction', label: 'Addiction' },
  ]

  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  function formatProgramType(programType: 'neurological' | 'mental_health' | 'addiction' | null): string {
    if (!programType) return '—'
    const map: Record<string, string> = {
      neurological: 'Neurological',
      mental_health: 'Mental Health',
      addiction: 'Addiction',
    }
    return map[programType] ?? programType
  }

  function handleViewPartial(id: string) {
    // Navigate to client profile page using partial form ID
    router.push(`/patient-pipeline/patient-profile/${id}`)
  }

  function handleViewPublic(id: string) {
    // Navigate to client profile page using intake form ID
    router.push(`/patient-pipeline/patient-profile/${id}`)
  }

  // Load pipeline data only once on mount
  useEffect(() => {
    async function loadPipelineData() {
      setIsLoading(true)
      
      // Load forms first (faster, don't wait for scheduled count)
      const [partialResult, publicResult] = await Promise.all([
        getPartialIntakeForms({ limit: 50 }),
        getPublicIntakeForms({ limit: 50 }),
      ])
      
      if (partialResult?.data?.success && partialResult.data.data) {
        setPartialForms(partialResult.data.data)
      }
      
      if (publicResult?.data?.success && publicResult.data.data) {
        setPublicForms(publicResult.data.data)
      }
      
      // Load prospects (clients in prospect stage)
      getProspects()
        .then((result) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PatientPipeline] getProspects result:', { success: result?.success, dataLength: result?.data?.length, error: result?.error })
          }
          if (result?.success && result.data) {
            setProspects(result.data)
          } else if (result?.error && process.env.NODE_ENV === 'development') {
            console.warn('[PatientPipeline] getProspects error:', result.error)
          }
          setIsProspectsLoading(false)
        })
        .catch((err) => {
          console.error('[PatientPipeline] getProspects failed:', err)
          setIsProspectsLoading(false)
        })

      // Don't block UI - load scheduled count in background
      setIsLoading(false)
      
      // Load scheduled count and pipeline statistics asynchronously (doesn't block page render)
      Promise.all([
        getScheduledPatientsCount({}),
        getPipelineStatistics({})
      ]).then(([scheduledResult, statsResult]) => {
        if (scheduledResult?.data?.success && scheduledResult.data.data) {
          setScheduledCount(scheduledResult.data.data.count)

          // Only log debug info in development
          if (process.env.NODE_ENV === 'development' && scheduledResult.data.data.debug) {
            console.log('[PatientPipeline] Scheduled Patients Debug Info:', scheduledResult.data.data.debug)
          }
        }

        if (statsResult?.data?.success && statsResult.data.data) {
          setOnboardingCount(statsResult.data.data.onboardingCount)
          setAtRiskCount(statsResult.data.data.atRiskCount)
          setPipelineValue(statsResult.data.data.pipelineValue)
          setMonthOverMonthChange(statsResult.data.data.monthOverMonthChange)
        }
      }).catch(error => {
        console.error('[PatientPipeline] Failed to get scheduled count or statistics:', error)
        // Set to 0 on error to not break UI
        setScheduledCount(0)
      })
    }
    
    loadPipelineData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Expose loadPipelineData function for manual refresh (e.g., after adding patient)
  const loadPipelineData = useCallback(async () => {
    setIsLoading(true)
    
    const [partialResult, publicResult] = await Promise.all([
      getPartialIntakeForms({ limit: 50 }),
      getPublicIntakeForms({ limit: 50 }),
    ])
    
    if (partialResult?.data?.success && partialResult.data.data) {
      setPartialForms(partialResult.data.data)
    }
    
    if (publicResult?.data?.success && publicResult.data.data) {
      setPublicForms(publicResult.data.data)
    }
    
    setIsLoading(false)

    getProspects().then((result) => {
      if (result?.success && result.data) setProspects(result.data)
    })

    Promise.all([
      getScheduledPatientsCount({}),
      getPipelineStatistics({})
    ]).then(([scheduledResult, statsResult]) => {
      if (scheduledResult?.data?.success && scheduledResult.data.data) {
        setScheduledCount(scheduledResult.data.data.count)
      }

      if (statsResult?.data?.success && statsResult.data.data) {
        setOnboardingCount(statsResult.data.data.onboardingCount)
        setAtRiskCount(statsResult.data.data.atRiskCount)
        setPipelineValue(statsResult.data.data.pipelineValue)
        setMonthOverMonthChange(statsResult.data.data.monthOverMonthChange)
      }
    }).catch(error => {
      console.error('[PatientPipeline] Failed to get scheduled count or statistics:', error)
      setScheduledCount(0)
    })
  }, [])

  // Calculate date range based on selection
  function getDateRange() {
    const now = new Date()
    let startDate: Date

    switch (selectedDateRange) {
      case 'all-time':
        return null
      case 'last-7-days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { startDate, endDate: now }
      case 'last-30-days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return { startDate, endDate: now }
      case 'last-90-days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        return { startDate, endDate: now }
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate),
            endDate: new Date(customEndDate)
          }
        }
        return null
      default:
        return null
    }
  }

  // Filter forms based on date range
  function filterByDateRange(formDate: string) {
    const dateRange = getDateRange()
    if (!dateRange) return true

    const formDateObj = new Date(formDate)
    // Set time to start of day for proper comparison
    const startDate = new Date(dateRange.startDate)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateRange.endDate)
    endDate.setHours(23, 59, 59, 999)
    formDateObj.setHours(0, 0, 0, 0)
    
    return formDateObj >= startDate && formDateObj <= endDate
  }

  // Filter forms based on selected program
  // When candidate fills out application, program_type comes from completed form
  // Otherwise, it comes from partial form (if set during creation)
  const filteredByProgramPartial = partialForms.filter((form) => {
    // Filter by program
    if (selectedProgram !== 'all' && form.program_type !== selectedProgram) {
      return false
    }
    // Filter by date range
    return filterByDateRange(form.created_at)
  })

  const filteredByProgramPublic = publicForms.filter((form) => {
    // Filter by program
    if (selectedProgram !== 'all' && form.program_type !== selectedProgram) {
      return false
    }
    // Filter by date range
    return filterByDateRange(form.created_at)
  })

  const totalInquiries = filteredByProgramPartial.length + filteredByProgramPublic.length

  // No tab filtering - show all forms
  const filteredPartialForms = filteredByProgramPartial

  // Pagination
  const totalPagesPartial = Math.ceil(filteredPartialForms.length / itemsPerPage)
  const startIndexPartial = (currentPagePartial - 1) * itemsPerPage
  const endIndexPartial = startIndexPartial + itemsPerPage
  const paginatedPartialForms = filteredPartialForms.slice(startIndexPartial, endIndexPartial)
  
  const totalPagesPublic = Math.ceil(filteredByProgramPublic.length / itemsPerPage)
  const startIndexPublic = (currentPagePublic - 1) * itemsPerPage
  const endIndexPublic = startIndexPublic + itemsPerPage
  const paginatedPublicForms = filteredByProgramPublic.slice(startIndexPublic, endIndexPublic)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 md:px-[25px] pt-4 sm:pt-6 md:pt-[30px] pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-[25px]">
        <div className="flex flex-col gap-1">
          <h1 
            className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black"
            style={{ 
              fontFamily: 'var(--font-instrument-serif), serif',
            }}
          >
            Client Pipeline
          </h1>
          <p className="text-sm sm:text-base text-[#777777] leading-[1.48em] tracking-[-0.04em]">
            Track inquiries, scheduled clients, and onboarding readiness.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-[23px] shrink-0">
          <Button 
            onClick={() => setIsAddPatientModalOpen(true)}
            className="gap-[10px] px-3 sm:px-4 py-[10px] h-auto min-h-[44px] bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm sm:text-base truncate"
          >
            <span className="truncate">+ Add Client</span>
          </Button>
          <Link href="/patient-pipeline/add-existing-patient" className="w-full sm:w-auto">
            <Button variant="outline" className="gap-[10px] px-3 sm:px-4 py-[10px] h-auto min-h-[44px] bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50 rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm sm:text-base w-full truncate">
              <span className="truncate">+ Add Existing</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 md:gap-[25px] mb-4 sm:mb-6 md:mb-[25px]">
        <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
          <Select 
            value={selectedDateRange} 
            onValueChange={(value) => {
              setSelectedDateRange(value)
              if (value !== 'custom') {
                setShowCustomDateRange(false)
              } else {
                setShowCustomDateRange(true)
              }
              setCurrentPagePartial(1)
              setCurrentPagePublic(1)
            }}
          >
            <SelectTrigger className="h-[44px] px-3 sm:px-4 py-[10px] bg-white border border-[#D6D2C8] rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-xs sm:text-sm text-[#777777]">
              <SelectValue placeholder="Date: All time" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All time</SelectItem>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Custom Date Range Inputs */}
          {showCustomDateRange && (
            <div className="flex gap-3 items-end col-span-2">
              <div className="flex flex-col gap-1 flex-1">
                <Label htmlFor="start-date" className="text-xs text-[#777777]">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value)
                    setCurrentPagePartial(1)
                    setCurrentPagePublic(1)
                  }}
                  max={customEndDate || new Date().toISOString().split('T')[0]}
                  className="h-[44px] px-4 bg-white border border-[#D6D2C8] rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label htmlFor="end-date" className="text-xs text-[#777777]">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value)
                    setCurrentPagePartial(1)
                    setCurrentPagePublic(1)
                  }}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-[44px] px-4 bg-white border border-[#D6D2C8] rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <Select value={selectedProgram} onValueChange={(value) => {
          setSelectedProgram(value)
          setCurrentPagePartial(1)
          setCurrentPagePublic(1)
        }}>
          <SelectTrigger className="h-[44px] w-full px-3 sm:px-4 py-[10px] bg-white border border-[#D6D2C8] rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-xs sm:text-sm text-[#777777] sm:w-[150px]">
            <SelectValue placeholder="Program" className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((program) => (
              <SelectItem key={program.value} value={program.value}>
                {program.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="h-[44px] w-full px-3 sm:px-4 py-[10px] bg-white border border-[#D6D2C8] rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-xs sm:text-sm text-[#777777] sm:w-auto">
            <SelectValue placeholder="Coordinator" className="truncate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coordinators</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="h-[44px] w-full px-3 sm:px-4 py-[10px] bg-white border border-[#D6D2C8] rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-xs sm:text-sm text-[#777777] sm:w-auto">
            <SelectValue placeholder="Source" className="truncate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-[25px] mb-4 sm:mb-6 md:mb-[25px]">
        {/* Total Inquiries */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-2">
            <p className="text-xs sm:text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Total Inquiries</p>
            <p className="text-xl sm:text-2xl md:text-[25px] font-semibold text-black leading-[1.193em] tracking-[-0.04em]">{totalInquiries}</p>
            <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">
              {filteredByProgramPartial.length} admin sent, {filteredByProgramPublic.length} direct
            </p>
          </div>
        </div>

        {/* Scheduled Patients */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-2">
            <p className="text-xs sm:text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Scheduled Clients</p>
            <p className="text-xl sm:text-2xl md:text-[25px] font-semibold text-black leading-[1.193em] tracking-[-0.04em]">{scheduledCount}</p>
            <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">
              with calendar events
            </p>
          </div>
        </div>

        {/* In Onboarding */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-2">
            <p className="text-xs sm:text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">In Onboarding</p>
            <p className="text-xl sm:text-2xl md:text-[25px] font-semibold text-black leading-[1.193em] tracking-[-0.04em]">{onboardingCount}</p>
            <div className="flex items-center gap-[10px] flex-wrap">
              <span className="flex items-center justify-center gap-[1px] px-3 py-0 h-[19px] rounded-[10px] bg-[#DEF8EE] text-[#10B981] text-xs leading-[1.193em] tracking-[-0.04em]">
                {atRiskCount}
              </span>
              <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">at risk (slow)</p>
            </div>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-2">
            <p className="text-xs sm:text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Pipeline Value</p>
            <p className="text-xl sm:text-2xl md:text-[25px] font-semibold text-black leading-[1.193em] tracking-[-0.04em]">
              ${pipelineValue >= 1000 ? `${(pipelineValue / 1000).toFixed(0)}K` : pipelineValue.toFixed(0)}
            </p>
            <div className="flex items-center gap-[10px] flex-wrap">
              <span className={`flex items-center justify-center gap-[1px] px-3 py-0 h-[19px] rounded-[10px] text-xs leading-[1.193em] tracking-[-0.04em] ${
                monthOverMonthChange >= 0
                  ? 'bg-[#DEF8EE] text-[#10B981]'
                  : 'bg-[#FEE2E2] text-[#EF4444]'
              }`}>
                {monthOverMonthChange > 0 ? '+' : ''}{monthOverMonthChange}%
              </span>
              <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">vs last month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Applications - single card with tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
        {/* Section Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Client Applications</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-0 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveApplicationsTab('applications')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeApplicationsTab === 'applications'
                ? 'bg-[#6E7A46] text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Direct Public Applications
          </button>
          <button
            type="button"
            onClick={() => setActiveApplicationsTab('invites')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeApplicationsTab === 'invites'
                ? 'bg-[#6E7A46] text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Admin/Owner Sent Invites
          </button>
        </div>

        {/* Tab Content: Admin/Owner Sent Invites */}
        {activeApplicationsTab === 'invites' && (
          <div className="p-5">
            <p className="text-xs sm:text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em] mb-4">
              Mode = data captured before sending the client application link (Minimal: Name+Email • Partial: +Emergency Contact)
            </p>
            {/* Table - Desktop, Cards - Mobile */}
        {paginatedPartialForms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#777777]">No forms found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="flex gap-0 min-w-full">
                {/* Mode Column */}
                <div className="flex flex-col w-[120px] md:w-[152px] shrink-0">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Mode</p>
                  </div>
                  {paginatedPartialForms.map((form) => (
                    <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <span className={`px-3 py-0 h-[26px] rounded-[10px] text-xs leading-[1.193em] tracking-[-0.04em] flex items-center ${
                        form.mode === 'minimal' 
                          ? 'bg-[#F5F4F0] text-[#2B2820]' 
                          : 'bg-[#F5F4F0] text-[#2B2820]'
                      }`}>
                        {form.mode.charAt(0).toUpperCase() + form.mode.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Sent To Column */}
                <div className="flex flex-col flex-1 min-w-[250px] md:min-w-[303px]">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Sent To</p>
                  </div>
                  {paginatedPartialForms.map((form) => (
                    <div key={form.id} className="px-3 py-[15px] h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-black leading-[1.193em] tracking-[-0.04em]">{form.recipient_name || 'N/A'}</p>
                        <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">
                          {form.recipient_email} {form.phone_number ? `• ${form.phone_number}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sent By Column */}
                <div className="flex flex-col min-w-[250px] md:min-w-[319px]">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Sent By</p>
                  </div>
                  {paginatedPartialForms.map((form) => (
                    <div key={form.id} className="px-3 py-[15px] h-[66px] border-b border-[#D6D2C8] flex items-center">
                      {form.creator ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-black leading-[1.193em] tracking-[-0.04em]">
                            {form.creator.first_name} {form.creator.last_name}
                          </p>
                          <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">
                            {form.creator.email}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-[#777777]">N/A</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status Column */}
                <div className="flex flex-col w-[154px] shrink-0">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Status</p>
                  </div>
                  {paginatedPartialForms.map((form) => {
                    const completed = form.formCompletion?.completed || 0
                    const total = form.formCompletion?.total || 4
                    const statusText = `${completed}/${total}`
                    let statusBg = '#FEE2E2'
                    let statusTextColor = '#E7000B'
                    
                    if (completed === total) {
                      statusBg = '#DEF8EE'
                      statusTextColor = '#10B981'
                    } else if (completed > 0) {
                      statusBg = '#FFFBD4'
                      statusTextColor = '#F59E0B'
                    } else {
                      statusBg = '#DBEAFE'
                      statusTextColor = '#1D4ED8'
                    }

                    return (
                      <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                        <span className={`px-3 py-0 h-[26px] rounded-[10px] text-xs leading-[1.193em] tracking-[-0.04em] flex items-center justify-center`}
                          style={{ backgroundColor: statusBg, color: statusTextColor }}
                        >
                          {statusText}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Sent Date Column */}
                <div className="flex flex-col w-[150px] md:w-[192px] shrink-0">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Sent Date</p>
                  </div>
                  {paginatedPartialForms.map((form) => (
                    <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <p className="text-sm text-[#2B2820] leading-[1.193em] tracking-[-0.04em]">
                        {formatDate(form.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Action Column */}
                <div className="flex flex-col flex-1 min-w-[86px]">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Action</p>
                  </div>
                  {paginatedPartialForms.map((form) => (
                    <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <Button
                        onClick={() => handleViewPartial(form.id)}
                        className="px-4 py-[10px] h-auto bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {paginatedPartialForms.map((form) => {
                const completed = form.formCompletion?.completed || 0
                const total = form.formCompletion?.total || 4
                const statusText = `${completed}/${total}`
                let statusBg = '#FEE2E2'
                let statusTextColor = '#E7000B'
                
                if (completed === total) {
                  statusBg = '#DEF8EE'
                  statusTextColor = '#10B981'
                } else if (completed > 0) {
                  statusBg = '#FFFBD4'
                  statusTextColor = '#F59E0B'
                } else {
                  statusBg = '#DBEAFE'
                  statusTextColor = '#1D4ED8'
                }

                return (
                  <div key={form.id} className="bg-[#F5F4F0] border border-[#D6D2C8] rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-base font-semibold text-black mb-1">{form.recipient_name || 'N/A'}</p>
                        <p className="text-xs text-[#777777] mb-1">{form.recipient_email}</p>
                        {form.phone_number && (
                          <p className="text-xs text-[#777777]">{form.phone_number}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 h-[26px] rounded-[10px] text-xs flex items-center shrink-0`}
                        style={{ backgroundColor: statusBg, color: statusTextColor }}
                      >
                        {statusText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 h-[26px] rounded-[10px] bg-[#F5F4F0] text-[#2B2820] text-xs">
                        {form.mode.charAt(0).toUpperCase() + form.mode.slice(1)}
                      </span>
                      <span className="text-xs text-[#777777]">•</span>
                      <span className="text-xs text-[#777777]">{formatDate(form.created_at)}</span>
                    </div>
                    {form.creator && (
                      <div className="pt-2 border-t border-[#D6D2C8]">
                        <p className="text-xs text-[#777777] mb-1">Sent By</p>
                        <p className="text-sm text-black">{form.creator.first_name} {form.creator.last_name}</p>
                        <p className="text-xs text-[#777777]">{form.creator.email}</p>
                      </div>
                    )}
                    <Button
                      onClick={() => handleViewPartial(form.id)}
                      className="w-full mt-2 px-4 py-[10px] h-auto bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                    >
                      View
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPagesPartial > 1 && (
              <div className="flex items-center justify-between mt-[26px] pt-5 border-t border-[#D6D2C8]">
                <p className="text-sm text-[#9C9387] leading-[1.193em] tracking-[-0.04em]">
                  Showing {startIndexPartial + 1} to {Math.min(endIndexPartial, filteredPartialForms.length)} of {filteredPartialForms.length} leads
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPagePartial(prev => Math.max(1, prev - 1))}
                    disabled={currentPagePartial === 1}
                    className="px-3 py-2 h-auto min-h-[44px] rounded-lg border border-[#D6D2C8] disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <div className="hidden sm:flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPagesPartial) }, (_, i) => {
                      let pageNum
                      if (totalPagesPartial <= 5) {
                        pageNum = i + 1
                      } else if (currentPagePartial <= 3) {
                        pageNum = i + 1
                      } else if (currentPagePartial >= totalPagesPartial - 2) {
                        pageNum = totalPagesPartial - 4 + i
                      } else {
                        pageNum = currentPagePartial - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPagePartial === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPagePartial(pageNum)}
                          className={`px-3 py-2 h-auto rounded-lg ${
                            currentPagePartial === pageNum
                              ? 'bg-[#2C2C2C] text-[#F5F5F5]'
                              : 'border border-[#D6D2C8] text-[#1E1E1E]'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    {totalPagesPartial > 5 && currentPagePartial < totalPagesPartial - 2 && (
                      <span className="px-4 text-base font-bold text-black">...</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPagePartial(prev => Math.min(totalPagesPartial, prev + 1))}
                    disabled={currentPagePartial === totalPagesPartial}
                    className="px-3 py-2 h-auto min-h-[44px] rounded-lg border border-[#D6D2C8] disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        )}

        {/* Tab Content: Direct Public Applications */}
        {activeApplicationsTab === 'applications' && (
          <div className="p-5">
            {/* Table - Desktop, Cards - Mobile */}
            {filteredByProgramPublic.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#777777]">No direct public applications yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="flex gap-0 min-w-full">
                {/* Name Column */}
                <div className="flex flex-col w-[180px] md:w-[238px] shrink-0">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Name</p>
                  </div>
                  {paginatedPublicForms.map((form) => (
                    <div key={form.id} className="px-3 py-[15px] h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <p className="text-sm text-black leading-[1.193em] tracking-[-0.04em]">
                        {form.first_name} {form.last_name}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Email Column */}
                <div className="flex flex-col min-w-[250px] md:min-w-[296px]">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Email</p>
                  </div>
                  {paginatedPublicForms.map((form) => (
                    <div key={form.id} className="px-3 py-[15px] h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <p className="text-xs text-[#777777] leading-[1.193em] tracking-[-0.04em]">
                        {form.email}{form.phone_number && ` • ${form.phone_number}`}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Program Type Column */}
                <div className="flex flex-col w-[150px] md:w-[192px] shrink-0">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Program Type</p>
                  </div>
                  {paginatedPublicForms.map((form) => (
                    <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <p className="text-sm text-[#2B2820] leading-[1.193em] tracking-[-0.04em]">
                        {formatProgramType(form.program_type)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Status Column */}
                <div className="flex flex-col w-[120px] md:w-[154px] shrink-0">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Status</p>
                  </div>
                  {paginatedPublicForms.map((form) => {
                    const completed = form.formCompletion?.completed || 1
                    const total = form.formCompletion?.total || 4
                    const statusText = `${completed}/${total}`
                    let statusBg = '#FEE2E2'
                    let statusTextColor = '#E7000B'
                    
                    if (completed === total) {
                      statusBg = '#DEF8EE'
                      statusTextColor = '#10B981'
                    } else if (completed > 0) {
                      statusBg = '#FFFBD4'
                      statusTextColor = '#F59E0B'
                    } else {
                      statusBg = '#DBEAFE'
                      statusTextColor = '#1D4ED8'
                    }

                    return (
                      <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                        <span className={`px-3 py-0 h-[26px] rounded-[10px] text-xs leading-[1.193em] tracking-[-0.04em] flex items-center justify-center`}
                          style={{ backgroundColor: statusBg, color: statusTextColor }}
                        >
                          {statusText}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Submission Date Column */}
                <div className="flex flex-col w-[150px] md:w-[192px] shrink-0">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Submission Date</p>
                  </div>
                  {paginatedPublicForms.map((form) => (
                    <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <p className="text-sm text-[#2B2820] leading-[1.193em] tracking-[-0.04em]">
                        {formatDate(form.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Action Column */}
                <div className="flex flex-col flex-1 min-w-[86px]">
                  <div className="px-3 py-2 h-[40px] border-b border-[rgba(28,28,28,0.2)] flex items-center">
                    <p className="text-sm text-[#777777] leading-[1.193em] tracking-[-0.04em]">Action</p>
                  </div>
                  {paginatedPublicForms.map((form) => (
                    <div key={form.id} className="px-3 py-2 h-[66px] border-b border-[#D6D2C8] flex items-center">
                      <Button
                        onClick={() => handleViewPublic(form.id)}
                        className="px-4 py-[10px] h-auto bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {paginatedPublicForms.map((form) => {
                const completed = form.formCompletion?.completed || 1
                const total = form.formCompletion?.total || 4
                const statusText = `${completed}/${total}`
                let statusBg = '#FEE2E2'
                let statusTextColor = '#E7000B'
                
                if (completed === total) {
                  statusBg = '#DEF8EE'
                  statusTextColor = '#10B981'
                } else if (completed > 0) {
                  statusBg = '#FFFBD4'
                  statusTextColor = '#F59E0B'
                } else {
                  statusBg = '#DBEAFE'
                  statusTextColor = '#1D4ED8'
                }

                return (
                  <div key={form.id} className="bg-[#F5F4F0] border border-[#D6D2C8] rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-base font-semibold text-black mb-1">{form.first_name} {form.last_name}</p>
                        <p className="text-xs text-[#777777] mb-1">{form.email}</p>
                        <p className="text-xs text-[#777777]">{formatProgramType(form.program_type)}</p>
                      </div>
                      <span className={`px-3 py-1 h-[26px] rounded-[10px] text-xs flex items-center shrink-0`}
                        style={{ backgroundColor: statusBg, color: statusTextColor }}
                      >
                        {statusText}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#D6D2C8]">
                      <p className="text-xs text-[#777777] mb-1">Submission Date</p>
                      <p className="text-sm text-black">{formatDate(form.created_at)}</p>
                    </div>
                    <Button
                      onClick={() => handleViewPublic(form.id)}
                      className="w-full mt-2 px-4 py-[10px] h-auto bg-[#6E7A46] hover:bg-[#6E7A46]/90 text-white rounded-[24px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] text-sm"
                    >
                      View
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPagesPublic > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 sm:mt-6 md:mt-[26px] pt-5 border-t border-[#D6D2C8]">
                <p className="text-xs sm:text-sm text-[#9C9387] leading-[1.193em] tracking-[-0.04em] text-center sm:text-left">
                  Showing {startIndexPublic + 1} to {Math.min(endIndexPublic, filteredByProgramPublic.length)} of {filteredByProgramPublic.length} leads
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPagePublic(prev => Math.max(1, prev - 1))}
                    disabled={currentPagePublic === 1}
                    className="px-3 py-2 h-auto min-h-[44px] rounded-lg border border-[#D6D2C8] disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <div className="hidden sm:flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPagesPublic) }, (_, i) => {
                      let pageNum
                      if (totalPagesPublic <= 5) {
                        pageNum = i + 1
                      } else if (currentPagePublic <= 3) {
                        pageNum = i + 1
                      } else if (currentPagePublic >= totalPagesPublic - 2) {
                        pageNum = totalPagesPublic - 4 + i
                      } else {
                        pageNum = currentPagePublic - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPagePublic === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPagePublic(pageNum)}
                          className={`px-3 py-2 h-auto rounded-lg ${
                            currentPagePublic === pageNum
                              ? 'bg-[#2C2C2C] text-[#F5F5F5]'
                              : 'border border-[#D6D2C8] text-[#1E1E1E]'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    {totalPagesPublic > 5 && currentPagePublic < totalPagesPublic - 2 && (
                      <span className="px-4 text-base font-bold text-black">...</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPagePublic(prev => Math.min(totalPagesPublic, prev + 1))}
                    disabled={currentPagePublic === totalPagesPublic}
                    className="px-3 py-2 h-auto min-h-[44px] rounded-lg border border-[#D6D2C8] disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        )}
      </div>

      {/* Prospects */}
      <div className="mt-6">
        <ProspectsTable prospects={prospects} isLoading={isProspectsLoading} />
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal 
        open={isAddPatientModalOpen}
        onOpenChange={setIsAddPatientModalOpen}
        onSuccess={() => {
          // Reload pipeline data after successful submission
          loadPipelineData()
        }}
      />
    </div>
  )
}
