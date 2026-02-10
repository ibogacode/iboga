'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPatientTasks, type PatientTask, type OnboardingStatus } from '@/actions/patient-tasks.action'
import { getIntakeFormById, getIbogaineConsentFormById } from '@/actions/patient-profile.action'
import { getMedicalHistoryFormForPatient } from '@/actions/medical-history.action'
import { getServiceAgreementForPatient } from '@/actions/service-agreement.action'
import { PatientIntakeFormView } from '@/components/admin/patient-intake-form-view'
import { MedicalHistoryFormView } from '@/components/admin/medical-history-form-view'
import { ServiceAgreementFormView } from '@/components/admin/service-agreement-form-view'
import { IbogaineConsentFormView } from '@/components/admin/ibogaine-consent-form-view'
import { toast } from 'sonner'

export default function PatientTasksPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'not_started' | 'completed'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'required_first' | 'name' | 'time'>('required_first')
  const [tasks, setTasks] = useState<PatientTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statistics, setStatistics] = useState({
    completed: 0,
    total: 0,
    inProgress: 0,
    required: 0,
    optional: 0,
  })
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [viewingForm, setViewingForm] = useState<'intake' | 'medical' | 'service' | 'ibogaine' | null>(null)
  const [viewFormData, setViewFormData] = useState<any>(null)
  const [loadingViewForm, setLoadingViewForm] = useState<string | null>(null)

  // Fetch patient tasks
  const loadTasks = async () => {
    setIsLoading(true)
    try {
      const result = await getPatientTasks({})
      
        if (result?.data?.success && result.data.data) {
          console.log('[PatientTasksPage] Loaded tasks:', result.data.data.tasks)
          console.log('[PatientTasksPage] Statistics:', result.data.data.statistics)
          
          // Log each task's status for debugging
          result.data.data.tasks.forEach((task: PatientTask) => {
            console.log(`[PatientTasksPage] Task: ${task.title} - Status: ${task.status} - FormID: ${task.formId}`)
          })
          
          setTasks(result.data.data.tasks)
          setStatistics(result.data.data.statistics)
          setOnboardingStatus(result.data.data.onboardingStatus || null)
      } else {
        console.error('[PatientTasksPage] Failed to load tasks:', result?.serverError)
        toast.error(result?.serverError || 'Failed to load tasks')
        // Set empty state
        setTasks([])
        setStatistics({
          completed: 0,
          total: 0,
          inProgress: 0,
          required: 0,
          optional: 0,
        })
      }
    } catch (error) {
      console.error('[PatientTasksPage] Error loading tasks:', error)
      toast.error('An error occurred while loading tasks')
      // Set empty state
      setTasks([])
      setStatistics({
        completed: 0,
        total: 0,
        inProgress: 0,
        required: 0,
        optional: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const progressPercentage = statistics.total > 0 
    ? Math.round((statistics.completed / statistics.total) * 100) 
    : 0

  // Filter tasks based on selected filter
  const filteredTasks = tasks.filter(task => {
    if (selectedFilter === 'all') return true
    if (selectedFilter === 'not_started') return task.status === 'not_started'
    if (selectedFilter === 'completed') return task.status === 'completed'
    return true
  })

  // Filter by search query
  const searchedTasks = filteredTasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort tasks
  const sortedTasks = [...searchedTasks].sort((a, b) => {
    if (sortBy === 'required_first') {
      if (a.isRequired && !b.isRequired) return -1
      if (!a.isRequired && b.isRequired) return 1
      return 0
    }
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title)
    }
    return 0
  })

  const handleTaskAction = async (task: PatientTask) => {
    // Onboarding EKG/Bloodwork uploads: go to Documents page
    if (task.type === 'onboarding_ekg_upload' || task.type === 'onboarding_bloodwork_upload') {
      router.push('/patient/documents')
      return
    }

    // Prevent action on locked tasks
    if (task.status === 'locked') {
      toast.error('This form is not yet activated. Please wait for admin activation.')
      return
    }
    
    // Check if this is an uploaded document (existing patient flow)
    if (task.uploadedDocument) {
      // Open the uploaded document in a new window/tab
      window.open(task.uploadedDocument.url, '_blank')
      return
    }
    
    if (task.status === 'completed' && task.formId) {
      // Show form in modal for completed forms (portal flow - patient filled form themselves)
      setLoadingViewForm(task.id)
      try {
        let result: any = null
        
        if (task.type === 'intake') {
          result = await getIntakeFormById({ formId: task.formId })
        } else if (task.type === 'medical_history') {
          result = await getMedicalHistoryFormForPatient({ formId: task.formId })
        } else if (task.type === 'service_agreement') {
          result = await getServiceAgreementForPatient({ formId: task.formId })
        } else if (task.type === 'ibogaine_consent') {
          result = await getIbogaineConsentFormById({ formId: task.formId })
        }
        
        if (result?.data?.success && result.data.data) {
          setViewFormData(result.data.data)
          // Map task types to viewingForm types
          const formTypeMap: Record<string, 'intake' | 'medical' | 'service' | 'ibogaine'> = {
            'intake': 'intake',
            'medical_history': 'medical',
            'service_agreement': 'service',
            'ibogaine_consent': 'ibogaine',
          }
          setViewingForm(formTypeMap[task.type] || null)
        } else {
          toast.error(result?.data?.error || 'Failed to load form data')
        }
      } catch (error) {
        console.error('Error loading form:', error)
        toast.error('Failed to load form data')
      } finally {
        setLoadingViewForm(null)
      }
    } else if (task.link && task.link !== '#') {
      // Navigate to form for not started forms
      router.push(task.link)
    }
  }

  const getStatusBadge = (task: PatientTask) => {
    if (task.status === 'completed') {
      return (
        <span className="px-2.5 py-1 rounded-[10px] text-xs bg-[#E8F5E9] text-[#2E7D32]">
          Completed
        </span>
      )
    }
    if (task.status === 'in_progress') {
      return (
        <span className="px-2.5 py-1 rounded-[10px] text-xs bg-[#E3F2FD] text-[#1976D2]">
          In Progress
        </span>
      )
    }
    if (task.status === 'locked') {
      return (
        <span className="px-2.5 py-1 rounded-[10px] text-xs bg-[#F5F5F5] text-[#9E9E9E]">
          Locked
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-[10px] text-xs bg-[#FFF9C4] text-[#F57F17]">
        Not Started
      </span>
    )
  }

  const getRequiredBadge = (task: PatientTask) => {
    if (task.isRequired) {
      return (
        <span className="px-2.5 py-1 rounded-[10px] text-xs bg-[#F3E5F5] text-[#7B1FA2]">
          Required
        </span>
      )
    }
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 md:px-0">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-normal leading-[1.3]"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Tasks
            </h1>
            <p className="text-sm sm:text-base text-black leading-[1.48] mt-1 sm:mt-2" style={{ letterSpacing: '-0.04em' }}>
              Complete required items to finalize your preparation. You can continue anytime.
            </p>
          </div>
          {/* Onboarding Status Badge */}
          {onboardingStatus?.isInOnboarding && (
            <div className="flex-shrink-0 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-blue-700">
                    Onboarding
                  </span>
                  <span className="text-xs text-blue-600">
                    {onboardingStatus.formsCompleted || 0}/{onboardingStatus.formsTotal || 3} forms
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2.5">
            <h2 className="text-base sm:text-lg font-medium text-black" style={{ letterSpacing: '-0.04em' }}>
              Progress
            </h2>
            <div className="hidden sm:block flex-1 h-px bg-gray-300"></div>
            <p className="text-xs sm:text-sm text-[#777777] sm:text-right w-full sm:w-auto">
              {statistics.completed} of {statistics.total} required tasks completed
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2.5 pt-2.5 pr-2.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[9px] bg-[#F5F4F0] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, rgba(110, 122, 70, 1) 0%, rgba(202, 224, 129, 1) 100%)'
                  }}
                />
              </div>
              <p className="text-sm text-[#2B2820] w-14 text-right">
                {progressPercentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-10 h-12 bg-white rounded-3xl border border-gray-200 text-sm text-[#777777]"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Category and Sort Filters */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="h-12 px-3 sm:px-4 rounded-3xl bg-white border border-gray-200 text-xs sm:text-sm text-[#777777] hover:bg-gray-50 flex-1 sm:flex-initial"
              onClick={() => setCategoryFilter(categoryFilter === 'all' ? 'forms' : 'all')}
            >
              <span className="hidden sm:inline">Category</span>
              <span className="sm:hidden">Cat</span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-12 px-3 sm:px-4 rounded-3xl bg-white border border-gray-200 text-xs sm:text-sm text-[#777777] hover:bg-gray-50 flex-1 sm:flex-initial"
              onClick={() => setSortBy(sortBy === 'required_first' ? 'name' : 'required_first')}
            >
              <span className="hidden md:inline">Sort: Required first</span>
              <span className="hidden sm:inline md:hidden">Sort</span>
              <span className="sm:hidden">Sort</span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks Module */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <div className="space-y-6">
          {/* Module Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-medium text-black" style={{ letterSpacing: '-0.04em' }}>
              Your Tasks
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={loadTasks}
                disabled={isLoading}
                className="h-9 px-3 rounded-3xl text-xs sm:text-sm border border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {/* Filter Buttons */}
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <Button
                  variant={selectedFilter === 'not_started' ? 'default' : 'outline'}
                  className={`h-9 sm:h-10 px-2 sm:px-4 rounded-3xl text-xs sm:text-sm border flex-1 sm:flex-initial ${
                    selectedFilter === 'not_started'
                      ? 'bg-[#6E7A46] text-white border-[#6E7A46]'
                      : 'bg-white text-[#777777] border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFilter('not_started')}
                  data-tour="tour-tasks-incomplete-button"
                >
                  <span className="hidden sm:inline">Not Started </span>
                  <span>({tasks.filter(t => t.status === 'not_started').length})</span>
                </Button>
                <Button
                  variant={selectedFilter === 'completed' ? 'default' : 'outline'}
                  className={`h-9 sm:h-10 px-2 sm:px-4 rounded-3xl text-xs sm:text-sm border flex-1 sm:flex-initial ${
                    selectedFilter === 'completed'
                      ? 'bg-[#6E7A46] text-white border-[#6E7A46]'
                      : 'bg-white text-[#777777] border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFilter('completed')}
                  data-tour="tour-tasks-completed-button"
                >
                  <span className="hidden sm:inline">Completed </span>
                  <span>({statistics.completed})</span>
                </Button>
                {selectedFilter !== 'all' && (
                  <Button
                    variant="outline"
                    className="h-9 sm:h-10 px-2 sm:px-4 rounded-3xl text-xs sm:text-sm border bg-white text-[#777777] border-gray-200 hover:bg-gray-50"
                    onClick={() => {
                      setSelectedFilter('all')
                      setSearchQuery('')
                      setCategoryFilter('all')
                      setSortBy('required_first')
                    }}
                  >
                    <X className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tasks Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 p-4 border-b border-gray-200">
                <div className="text-sm text-[#777777] font-medium">Task</div>
                <div className="text-sm text-[#777777] font-medium">Status</div>
                <div className="text-sm text-[#777777] font-medium">Estimated time</div>
                <div className="text-sm text-[#777777] font-medium">Action</div>
              </div>

              {sortedTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No tasks found matching your filters.
                </div>
              ) : (
                sortedTasks.map((task, index) => {
                  return (
                    <div
                      key={task.id}
                      className={`
                        ${index < sortedTasks.length - 1 ? 'border-b border-gray-200' : ''}
                        md:grid md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-4 md:p-4
                        flex flex-col gap-4 p-4
                      `}
                    >
                      {/* Task Column */}
                      <div className="flex items-start gap-3 md:col-span-1">
                        <div className="w-10 h-10 bg-[#F5F4F0] rounded-[14px] flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-black mb-1">{task.title}</h3>
                          <p className="text-xs text-[#777777]">{task.description}</p>
                        </div>
                      </div>

                      {/* Mobile Layout: Status and Time */}
                      <div className="flex items-center justify-between md:hidden">
                        <div className="flex flex-col gap-2">
                          {getStatusBadge(task)}
                          {getRequiredBadge(task)}
                        </div>
                        <p className="text-sm text-[#2B2820]">{task.estimatedTime}</p>
                      </div>

                      {/* Desktop Status Column */}
                      <div className="hidden md:flex items-center">
                        <div className="flex flex-col gap-2">
                          {getStatusBadge(task)}
                          {getRequiredBadge(task)}
                        </div>
                      </div>

                      {/* Desktop Estimated Time Column */}
                      <div className="hidden md:flex items-center">
                        <p className="text-sm text-[#2B2820]">{task.estimatedTime}</p>
                      </div>

                      {/* Action Column */}
                      <div className="flex items-center md:col-span-1">
                        {task.status === 'completed' ? (
                          <Button
                            variant="outline"
                            className="w-full md:w-auto h-10 px-4 rounded-3xl text-sm bg-white border border-gray-200 text-[#777777] hover:bg-gray-50"
                            onClick={() => handleTaskAction(task)}
                            disabled={loadingViewForm === task.id}
                          >
                            {loadingViewForm === task.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              'View'
                            )}
                          </Button>
                        ) : task.status === 'locked' ? (
                          <Button
                            variant="outline"
                            className="w-full md:w-auto h-10 px-4 rounded-3xl text-sm bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed"
                            disabled
                          >
                            Locked
                          </Button>
                        ) : (
                          <Button
                            className="w-full md:w-auto h-10 px-4 rounded-3xl text-sm bg-[#6E7A46] text-white hover:bg-[#5a6538]"
                            onClick={() => handleTaskAction(task)}
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommended Deadline Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#6E7A46] rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-[#2B2820] mb-2" style={{ letterSpacing: '-0.04em' }}>
                Recommended Deadline
              </h3>
              <p className="text-base text-[#777777] leading-[1.48]">
                Please complete required tasks by -
              </p>
            </div>
          </div>
        </div>

        {/* Need Assistance Card */}
        <div className="bg-[#6E7A46] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
          <div className="flex flex-col">
            <h3 className="text-lg font-medium text-white mb-2" style={{ letterSpacing: '-0.04em' }}>
              Need Assistance?
            </h3>
            <p className="text-base text-white leading-[1.48]">
              Message your care coordinator anytime with questions.
            </p>
          </div>
        </div>
      </div>

      {/* Form View Modals */}
      {viewingForm === 'intake' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">View Application Form</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewingForm(null)
                    setViewFormData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="p-6">
                <PatientIntakeFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingForm === 'medical' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">View Medical Health History Form</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewingForm(null)
                    setViewFormData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="p-6">
                <MedicalHistoryFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingForm === 'service' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">View Service Agreement</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewingForm(null)
                    setViewFormData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="p-6">
                <ServiceAgreementFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingForm === 'ibogaine' && viewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-gray-900">View Ibogaine Therapy Consent Form</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewingForm(null)
                    setViewFormData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="p-6">
                <IbogaineConsentFormView form={viewFormData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
