'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns'
import { assignTreatmentDate, getAvailableTreatmentDates } from '@/actions/treatment-scheduling.action'
import { parseDateString } from '@/lib/utils'
import { toast } from 'sonner'

interface TreatmentDateCalendarProps {
  onboardingId: string
  patientName: string
  currentTreatmentDate?: string | null
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

export function TreatmentDateCalendar({
  onboardingId,
  patientName,
  currentTreatmentDate,
  onSuccess,
  open,
  onOpenChange,
}: TreatmentDateCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(currentTreatmentDate || null)
  const [dateCapacities, setDateCapacities] = useState<Map<string, DateCapacity>>(new Map())

  // Load available dates when modal opens or month changes
  useEffect(() => {
    if (open) {
      loadAvailableDates()
    }
  }, [open, currentMonth])

  async function loadAvailableDates() {
    setLoading(true)
    try {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      // Fetch data for 2 months (current + next)
      const twoMonthsEnd = endOfMonth(addMonths(currentMonth, 1))

      const result = await getAvailableTreatmentDates({
        startDate: monthStart.toISOString().split('T')[0],
        endDate: twoMonthsEnd.toISOString().split('T')[0],
      })

      if (result?.data?.success && result.data.data) {
        // Build date capacities from computed occupancy and patients (single source of truth).
        // Do NOT use treatment_schedule.capacity_used for display - it is not updated when
        // assigning a patient, so it would show stale counts (e.g. day still showing empty
        // after assignment). Use occupancyByDate = total facility occupancy, patientsByDate
        // for the list and for "full" (max 4 new arrivals per day).
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

        // Add all dates from schedule (so we show every date we have a row for)
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

        // Add dates with patients but no schedule entry (arrival dates without a schedule row)
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

        // Add days with occupancy but no new arrivals (patients staying from earlier arrival)
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

  async function handleDateSelect(date: string) {
    const capacity = dateCapacities.get(date)

    // Don't allow selecting dates in the past
    if (isBefore(parseDateString(date), startOfDay(new Date()))) {
      toast.error('Cannot select a date in the past')
      return
    }

    // Don't allow selecting full dates
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

  function getStatusColor(status: 'available' | 'limited' | 'full'): string {
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 border-green-300'
      case 'limited':
        return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300'
      case 'full':
        return 'bg-red-100 border-red-300 cursor-not-allowed'
    }
  }

  function renderCalendar() {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    // Get all days to show (including padding)
    const startDate = monthStart
    const endDate = monthEnd
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const capacity = dateCapacities.get(dateStr)
          const status = capacity?.status || 'available'
          const isSelected = selectedDate === dateStr
          const isPast = isBefore(day, startOfDay(new Date()))
          const isCurrentDay = isToday(day)

          return (
            <button
              key={dateStr}
              onClick={() => handleDateSelect(dateStr)}
              disabled={isPast || status === 'full'}
              className={`
                relative p-2 border rounded-lg transition-colors
                ${isPast ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : getStatusColor(status)}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                ${isCurrentDay ? 'font-bold' : ''}
              `}
            >
              <div className="text-sm">{format(day, 'd')}</div>
              {capacity && !isPast && capacity.capacityUsed > 0 && (
                <div className="text-xs mt-1">
                  {capacity.capacityUsed}/{capacity.capacityMax}
                </div>
              )}
              {capacity && capacity.patients.length > 0 && (
                <div className="absolute top-1 right-1">
                  <Users className="h-3 w-3 text-gray-500" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Assign Treatment Date for {patientName}</DialogTitle>
          <DialogDescription>
            Select an available date for the patient's arrival. Numbers show total facility occupancy (includes patients staying multiple days). Maximum 4 new arrivals per day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                <span>Available (0-1 patients)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
                <span>Limited (2-3 patients)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                <span>Full (4+ patients)</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Numbers shown include all patients in the facility (arrival dates + ongoing stays based on program duration from service agreement)
            </p>
          </div>

          {/* Calendar */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            renderCalendar()
          )}

          {/* Selected date info */}
          {selectedDate && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold mb-2">Selected Date: {format(parseDateString(selectedDate), 'MMMM d, yyyy')}</h4>
              {dateCapacities.get(selectedDate) && (
                <div>
                  <p className="text-sm text-gray-600">
                    Capacity: {dateCapacities.get(selectedDate)!.capacityUsed} / {dateCapacities.get(selectedDate)!.capacityMax} patients
                  </p>
                  {dateCapacities.get(selectedDate)!.patients.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Patients scheduled:</p>
                      <ul className="text-sm text-gray-600 ml-4 mt-1">
                        {dateCapacities.get(selectedDate)!.patients.map((p) => (
                          <li key={p.id}>
                            {p.first_name} {p.last_name} ({p.program_type}, {p.number_of_days} days)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedDate || assigning}>
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Assign Date
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
