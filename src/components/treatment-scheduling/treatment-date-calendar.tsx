'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, addMonths, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay } from 'date-fns'
import { assignTreatmentDate, getAvailableTreatmentDates, getProgramDaysForOnboarding } from '@/actions/treatment-scheduling.action'
import { parseDateString } from '@/lib/utils'
import { toast } from 'sonner'

interface TreatmentDateCalendarProps {
  onboardingId: string
  patientName: string
  currentTreatmentDate?: string | null
  /** Program duration in days (from service agreement). If not provided, fetched by onboardingId. */
  programNumberOfDays?: number
  onSuccess?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DateCapacity {
  date: string
  capacityUsed: number
  capacityMax: number
  status: 'available' | 'limited' | 'full'
  patients: Array<{
    id: string
    first_name: string
    last_name: string
    program_type: string
    number_of_days: number
  }>
}

type DayStatus = 'available' | 'limited' | 'full' | 'disabled'

export function TreatmentDateCalendar({
  onboardingId,
  patientName,
  currentTreatmentDate,
  programNumberOfDays: programNumberOfDaysProp,
  onSuccess,
  open,
  onOpenChange,
}: TreatmentDateCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(currentTreatmentDate || null)
  const [dateCapacities, setDateCapacities] = useState<Map<string, DateCapacity>>(new Map())
  const [programDaysFromApi, setProgramDaysFromApi] = useState<number | null>(null)
  const [stayRangeCapacities, setStayRangeCapacities] = useState<Map<string, DateCapacity>>(new Map())
  const [loadingStayRange, setLoadingStayRange] = useState(false)

  const programNumberOfDays = programNumberOfDaysProp ?? programDaysFromApi ?? 14

  // Fetch program days from service agreement when not provided
  useEffect(() => {
    if (!open || programNumberOfDaysProp != null) return
    getProgramDaysForOnboarding({ onboarding_id: onboardingId }).then((res) => {
      if (res?.data?.success && res.data.data?.number_of_days != null) {
        setProgramDaysFromApi(res.data.data.number_of_days)
      }
    })
  }, [open, onboardingId, programNumberOfDaysProp])

  // Load available dates when modal opens or month changes
  useEffect(() => {
    if (open) {
      loadAvailableDates()
    }
  }, [open, currentMonth])

  // When a date is selected, fetch capacity for the full stay range and compute stay block
  useEffect(() => {
    if (!selectedDate || programNumberOfDays < 1) {
      setStayRangeCapacities(new Map())
      return
    }
    const start = parseDateString(selectedDate)
    const lastDay = addDays(start, programNumberOfDays - 1)
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(lastDay, 'yyyy-MM-dd')

    setLoadingStayRange(true)
    getAvailableTreatmentDates({ startDate: startStr, endDate: endStr })
      .then((result) => {
        if (!result?.data?.success || !result.data.data) {
          setStayRangeCapacities(new Map())
          return
        }
        const capacities = new Map<string, DateCapacity>()
        const schedule = result.data.data.schedule || []
        const patientsByDate = result.data.data.patientsByDate || {}
        const occupancyByDate = result.data.data.occupancyByDate || {}
        const capacityMax = 4

        function getStatus(date: string): 'available' | 'limited' | 'full' {
          const newArrivalsCount = (patientsByDate[date] || []).length
          if (newArrivalsCount >= capacityMax) return 'full'
          const totalOccupancy = (occupancyByDate[date] as number) ?? 0
          if (totalOccupancy >= capacityMax) return 'full'
          if (totalOccupancy >= 2 || newArrivalsCount >= 2) return 'limited'
          return 'available'
        }

        schedule.forEach((s: { treatment_date: string; capacity_max?: number }) => {
          const date = s.treatment_date
          if (date < startStr || date > endStr) return
          const totalOccupancy = (occupancyByDate[date] as number) ?? (patientsByDate[date]?.length ?? 0)
          const patients = patientsByDate[date] || []
          capacities.set(date, {
            date,
            capacityUsed: totalOccupancy,
            capacityMax: s.capacity_max ?? capacityMax,
            status: getStatus(date),
            patients,
          })
        })
        Object.keys(patientsByDate).forEach((date) => {
          if (date >= startStr && date <= endStr && !capacities.has(date)) {
            const patients = patientsByDate[date]
            const totalOccupancy = (occupancyByDate[date] as number) ?? patients.length
            capacities.set(date, {
              date,
              capacityUsed: totalOccupancy,
              capacityMax,
              status: getStatus(date),
              patients,
            })
          }
        })
        Object.entries(occupancyByDate).forEach(([date, occupancy]) => {
          if (date >= startStr && date <= endStr && !capacities.has(date)) {
            const totalOccupancy = occupancy as number
            capacities.set(date, {
              date,
              capacityUsed: totalOccupancy,
              capacityMax,
              status: totalOccupancy >= 4 ? 'full' : totalOccupancy >= 2 ? 'limited' : 'available',
              patients: [],
            })
          }
        })
        setStayRangeCapacities(capacities)
      })
      .finally(() => setLoadingStayRange(false))
  }, [selectedDate, programNumberOfDays])

  async function loadAvailableDates() {
    setLoading(true)
    try {
      const monthStart = startOfMonth(currentMonth)
      const twoMonthsEnd = endOfMonth(addMonths(currentMonth, 1))

      const result = await getAvailableTreatmentDates({
        startDate: monthStart.toISOString().split('T')[0],
        endDate: twoMonthsEnd.toISOString().split('T')[0],
      })

      if (result?.data?.success && result.data.data) {
        const capacities = new Map<string, DateCapacity>()
        const schedule = result.data.data.schedule || []
        const patientsByDate = result.data.data.patientsByDate || {}
        const occupancyByDate = result.data.data.occupancyByDate || {}
        const capacityMax = 4

        function getStatus(date: string): 'available' | 'limited' | 'full' {
          const newArrivalsCount = (patientsByDate[date] || []).length
          if (newArrivalsCount >= capacityMax) return 'full'
          const totalOccupancy = (occupancyByDate[date] as number) ?? 0
          if (totalOccupancy >= capacityMax) return 'full'
          if (totalOccupancy >= 2 || newArrivalsCount >= 2) return 'limited'
          return 'available'
        }

        schedule.forEach((s: { treatment_date: string; capacity_max?: number }) => {
          const date = s.treatment_date
          const totalOccupancy = (occupancyByDate[date] as number) ?? (patientsByDate[date]?.length ?? 0)
          const patients = patientsByDate[date] || []
          capacities.set(date, {
            date,
            capacityUsed: totalOccupancy,
            capacityMax: s.capacity_max ?? capacityMax,
            status: getStatus(date),
            patients,
          })
        })

        Object.keys(patientsByDate).forEach((date) => {
          if (!capacities.has(date)) {
            const patients = patientsByDate[date]
            const totalOccupancy = (occupancyByDate[date] as number) ?? patients.length
            capacities.set(date, {
              date,
              capacityUsed: totalOccupancy,
              capacityMax,
              status: getStatus(date),
              patients,
            })
          }
        })

        Object.entries(occupancyByDate).forEach(([date, occupancy]) => {
          if (!capacities.has(date)) {
            const totalOccupancy = occupancy as number
            capacities.set(date, {
              date,
              capacityUsed: totalOccupancy,
              capacityMax,
              status: totalOccupancy >= 4 ? 'full' : totalOccupancy >= 2 ? 'limited' : 'available',
              patients: [],
            })
          }
        })

        setDateCapacities(capacities)
      }
    } catch (error) {
      toast.error('Failed to load available dates')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function handleDateSelect(date: string) {
    const capacity = dateCapacities.get(date)
    if (isBefore(parseDateString(date), startOfDay(new Date()))) {
      toast.error('Cannot select a date in the past')
      return
    }
    if (capacity && capacity.status === 'full') {
      toast.error(`This date is at full capacity (${capacity.capacityMax} patients)`)
      return
    }
    setSelectedDate(date)
  }

  async function handleAssign() {
    if (!selectedDate) return
    setAssigning(true)
    try {
      const result = await assignTreatmentDate({
        onboarding_id: onboardingId,
        treatment_date: selectedDate,
      })
      if (result?.data?.success) {
        toast.success(result.data.message || 'Treatment date assigned successfully')
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(result?.data?.error || 'Failed to assign treatment date')
      }
    } catch (error) {
      toast.error('Failed to assign treatment date')
      console.error(error)
    } finally {
      setAssigning(false)
    }
  }

  function getAvailabilityStyles(status: DayStatus, isSelected: boolean): string {
    if (isSelected) {
      return 'bg-[#6E7A46] text-white border-[#6E7A46] shadow-md scale-105 hover:bg-[#6E7A46] hover:text-white'
    }
    switch (status) {
      case 'available':
        return 'bg-green-50 text-gray-900 border-green-300 hover:border-green-400 hover:bg-green-100 hover:shadow-sm'
      case 'limited':
        return 'bg-yellow-50 text-gray-900 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-100 hover:shadow-sm'
      case 'full':
        return 'bg-red-50 text-gray-400 border-red-200 cursor-not-allowed opacity-60'
      case 'disabled':
        return 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-40'
      default:
        return 'bg-white text-gray-900 border-gray-200'
    }
  }

  function getAvailabilityLabel(status: DayStatus): string {
    switch (status) {
      case 'available':
        return 'Great availability'
      case 'limited':
        return 'Limited spots'
      case 'full':
        return 'Fully booked'
      case 'disabled':
        return 'Past date'
      default:
        return ''
    }
  }

  // Build calendar grid with leading empty cells so day 1 aligns with weekday
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = monthStart.getDay()
  const leadingBlanks = Array(firstDayOfWeek).fill(null)
  const calendarCells: (Date | null)[] = [...leadingBlanks, ...daysInMonth]

  function getDayStatus(day: Date): DayStatus {
    const dateStr = format(day, 'yyyy-MM-dd')
    if (isBefore(day, startOfDay(new Date()))) return 'disabled'
    const capacity = dateCapacities.get(dateStr)
    if (capacity) return capacity.status
    return 'available'
  }

  function getDayCapacity(day: Date): { used: number; max: number } {
    const dateStr = format(day, 'yyyy-MM-dd')
    const capacity = dateCapacities.get(dateStr)
    if (capacity) return { used: capacity.capacityUsed, max: capacity.capacityMax }
    return { used: 0, max: 4 }
  }

  const selectedCapacity = selectedDate ? dateCapacities.get(selectedDate) : null

  // Stay block: all dates from arrival to arrival + (programNumberOfDays - 1)
  const stayDates: string[] = selectedDate
    ? (() => {
        const start = parseDateString(selectedDate)
        const out: string[] = []
        for (let i = 0; i < programNumberOfDays; i++) {
          out.push(format(addDays(start, i), 'yyyy-MM-dd'))
        }
        return out
      })()
    : []

  // For each stay date, check capacity (use stayRangeCapacities when loaded, else dateCapacities)
  const stayDateStatuses = stayDates.map((dateStr) => {
    const cap = stayRangeCapacities.get(dateStr) ?? dateCapacities.get(dateStr)
    const isPast = isBefore(parseDateString(dateStr), startOfDay(new Date()))
    if (isPast) return { date: dateStr, status: 'disabled' as DayStatus }
    if (cap) return { date: dateStr, status: cap.status as DayStatus }
    return { date: dateStr, status: 'available' as DayStatus }
  })

  const stayBlockUnavailableDates = stayDateStatuses.filter(
    (s) => s.status === 'full' || s.status === 'disabled'
  )
  const canAssignStay = stayDates.length > 0 && stayBlockUnavailableDates.length === 0
  const departureDateStr = stayDates.length > 0 ? stayDates[stayDates.length - 1] : null

  const stayDatesSet = new Set(stayDates)
  const stayBlockedDatesSet = new Set(
    stayDateStatuses.filter((s) => s.status === 'full' || s.status === 'disabled').map((s) => s.date)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl w-full p-0 gap-0 overflow-y-auto max-h-[90vh] rounded-2xl border-0 shadow-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
                Assign Treatment Date
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm text-gray-600 mt-0">
                Select arrival date for <span className="font-medium text-gray-900">{patientName}</span>
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              className="flex items-center gap-1 px-2 md:px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="flex items-center gap-1 px-2 md:px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border-2 border-green-300 rounded" />
                <span className="text-gray-700">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border-2 border-yellow-300 rounded" />
                <span className="text-gray-700">Limited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border-2 border-red-200 rounded" />
                <span className="text-gray-700">Full</span>
              </div>
              <div className="ml-auto text-gray-500 text-xs">Max 4/day</div>
            </div>
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {calendarCells.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />
                  }
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const status = getDayStatus(day)
                  const { used, max } = getDayCapacity(day)
                  const isSelected = selectedDate === dateStr
                  const isInStayBlock = selectedDate ? stayDatesSet.has(dateStr) : false
                  const isClickable = status !== 'disabled' && status !== 'full'
                  const stayDayBlocked = isInStayBlock && stayBlockedDatesSet.has(dateStr)
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => isClickable && handleDateSelect(dateStr)}
                      disabled={!isClickable}
                      className={`relative aspect-square rounded-lg border-2 p-1.5 flex flex-col items-center justify-center transition-all ${
                        getAvailabilityStyles(status, isSelected)
                      } ${
                        isInStayBlock && !isSelected
                          ? 'border-[#6E7A46] bg-[#6E7A46]/15 hover:bg-[#6E7A46]/25'
                          : ''
                      } ${isInStayBlock ? 'ring-2 ring-[#6E7A46] ring-offset-1' : ''} ${
                        stayDayBlocked ? 'opacity-80' : ''
                      }`}
                    >
                      <div
                        className={`text-base font-semibold mb-0.5 ${isSelected ? 'text-white' : ''}`}
                      >
                        {format(day, 'd')}
                      </div>
                      <div
                        className={`text-[10px] font-medium ${isSelected ? 'text-white/90' : 'text-gray-500'}`}
                      >
                        {used}/{max}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-b-2xl">
          <p className="text-xs text-gray-500 hidden sm:block">
            Facility capacity includes ongoing patient stays
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assigning}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-200 bg-white border border-gray-300 rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={
                !selectedDate ||
                assigning ||
                loadingStayRange ||
                !canAssignStay
              }
              title={
                selectedDate && !canAssignStay
                  ? 'Some days in this stay have no availability. Choose another date.'
                  : undefined
              }
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm bg-[#6E7A46] hover:bg-[#5d6639] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {assigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarIcon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {assigning ? 'Assigning...' : 'Confirm Date'}
              </span>
              <span className="sm:hidden">{assigning ? '...' : 'Confirm'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
