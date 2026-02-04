'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { getAvailableTreatmentDates } from '@/actions/treatment-scheduling.action'
import { Loader2 } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getDay,
  addMonths,
  subMonths,
  differenceInDays,
} from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const OCCUPANCY_LIMIT = 4

interface OccupancyPatient {
  id: string
  first_name: string
  last_name: string
  program_type?: string
  number_of_days: number
  source?: string
}

interface ClientOnDay {
  first_name: string
  last_name: string
  program_type: string | null
  number_of_days: number
  arrival_date: string
}

interface OccupancyData {
  occupancyByDate: Record<string, number>
  patientsByDate: Record<string, OccupancyPatient[]>
}

function formatProgramType(programType: string | null | undefined): string {
  if (!programType) return '—'
  const map: Record<string, string> = {
    neurological: 'Neurological',
    mental_health: 'Mental Health',
    addiction: 'Addiction',
  }
  return map[programType] ?? programType
}

/** Local date string (yyyy-MM-dd) for lookups – avoids UTC off-by-one. */
function toLocalDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function getDaysLeftFrom(arrivalDate: string, numberOfDays: number, fromDate: Date): number {
  const arrival = new Date(arrivalDate + 'T12:00:00') // parse as local calendar day
  const lastDay = new Date(arrival)
  lastDay.setDate(lastDay.getDate() + numberOfDays - 1)
  const diff = differenceInDays(lastDay, fromDate)
  return Math.max(0, diff)
}

function getEstimatedDischargeDate(arrivalDate: string, numberOfDays: number): Date {
  const arrival = new Date(arrivalDate + 'T12:00:00')
  const discharge = new Date(arrival)
  discharge.setDate(discharge.getDate() + numberOfDays - 1)
  return discharge
}

type OccupancyStatus = 'green' | 'orange' | 'red'

function getOccupancyStatus(count: number): OccupancyStatus {
  if (count >= OCCUPANCY_LIMIT) return 'red'
  if (count >= 3) return 'orange'
  return 'green'
}

/** Build map of date string -> clients in facility that day (with arrival so we can compute days left). Uses local date to avoid off-by-one. */
function buildClientsByDate(
  patientsByDate: Record<string, OccupancyPatient[]>
): Map<string, ClientOnDay[]> {
  const byDate = new Map<string, ClientOnDay[]>()
  const add = (dayStr: string, p: OccupancyPatient, arrivalStr: string) => {
    if (!byDate.has(dayStr)) byDate.set(dayStr, [])
    byDate.get(dayStr)!.push({
      first_name: p.first_name,
      last_name: p.last_name,
      program_type: p.program_type ?? null,
      number_of_days: p.number_of_days ?? 14,
      arrival_date: arrivalStr,
    })
  }
  Object.entries(patientsByDate).forEach(([arrivalStr, patients]) => {
    const [y, m, d] = arrivalStr.split('-').map(Number)
    const arrival = new Date(y, m - 1, d)
    patients.forEach((p) => {
      const days = p.number_of_days ?? 14
      for (let i = 0; i < days; i++) {
        const dayDate = new Date(arrival)
        dayDate.setDate(dayDate.getDate() + i)
        const dayStr = format(dayDate, 'yyyy-MM-dd')
        add(dayStr, p, arrivalStr)
      }
    })
  })
  return byDate
}

/** Fixed wide range so Next/Previous don’t refetch – one load covers many months. */
function getInitialDateRange(): { startDate: string; endDate: string } {
  const today = new Date()
  const start = new Date(today)
  start.setMonth(start.getMonth() - 3)
  const end = new Date(today)
  end.setMonth(end.getMonth() + 12)
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
}

const statusStyles: Record<
  OccupancyStatus,
  { bg: string; dot: string; text: string }
> = {
  green: { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  orange: { bg: 'bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-700' },
  red: { bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-700' },
}

export default function FacilityOccupancyPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<OccupancyData | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const { startDate, endDate } = getInitialDateRange()
    let cancelled = false
    async function loadData() {
      setIsLoading(true)
      try {
        const result = await getAvailableTreatmentDates({ startDate, endDate })
        if (cancelled) return
        if (result?.data?.success && result.data.data) {
          setData({
            occupancyByDate: result.data.data.occupancyByDate || {},
            patientsByDate: result.data.data.patientsByDate || {},
          })
        } else {
          setData({ occupancyByDate: {}, patientsByDate: {} })
        }
      } catch (error) {
        if (!cancelled) console.error('[FacilityOccupancy] Error loading data:', error)
        if (!cancelled) setData({ occupancyByDate: {}, patientsByDate: {} })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const occupancyByDate = data?.occupancyByDate ?? {}
  const patientsByDate = data?.patientsByDate ?? {}
  const clientsByDate = useMemo(() => buildClientsByDate(patientsByDate), [patientsByDate])

  const getCountForDate = (date: Date) => {
    const key = toLocalDateKey(date)
    return occupancyByDate[key] ?? 0
  }

  const getClientsForDate = (date: Date): ClientOnDay[] => {
    const key = toLocalDateKey(date)
    return clientsByDate.get(key) ?? []
  }

  function handleDayClick(day: Date) {
    setSelectedDay(day)
    setSheetOpen(true)
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = new Date(monthStart)
    startDate.setDate(startDate.getDate() - getDay(monthStart))
    const endDate = new Date(monthEnd)
    endDate.setDate(endDate.getDate() + (6 - getDay(monthEnd)))
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentDate])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 md:px-[25px] pt-4 sm:pt-6 md:pt-[30px] pb-0">
      <div className="flex flex-col gap-1 mb-6">
        <h1
          className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black"
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
          }}
        >
          Facility Occupancy
        </h1>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-medium text-black leading-[1.193em] tracking-[-0.04em]">
            Occupancy Calendar – {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="h-[44px] px-4 border border-[#D6D2C8] rounded-[24px]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
              className="h-[44px] px-4 border border-[#D6D2C8] rounded-[24px]"
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="h-[44px] px-4 border border-[#D6D2C8] rounded-[24px]"
            >
              Next
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6D2C8] overflow-hidden">
          <div className="grid grid-cols-7 bg-[#6E7A46]">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div
                key={day}
                className="px-3 py-3 border-r border-[#DCE0E5] last:border-r-0 text-center"
              >
                <p className="text-[15px] font-medium text-white leading-[1.4em]">{day}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, new Date())
              const isPast = toLocalDateKey(day) < toLocalDateKey(new Date())
              const count = getCountForDate(day)
              const clients = getClientsForDate(day)
              const status = getOccupancyStatus(count)
              const styles = statusStyles[status]
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-[140px] p-3 border-r border-b border-[#D6D2C8] last:border-r-0 flex flex-col gap-2 text-left cursor-pointer transition-colors ${
                    isPast
                      ? 'bg-gray-50 hover:bg-gray-100'
                      : 'hover:bg-gray-50/80 ' +
                        (!isCurrentMonth ? 'bg-gray-50' : isToday ? 'bg-[#FDFFF5]' : 'bg-white')
                  } ${isToday && !isPast ? 'ring-2 ring-[#CAE081] ring-inset' : ''}`}
                >
                  <p
                    className={`text-2xl font-medium leading-[1.193em] tracking-[-0.04em] ${
                      isPast
                        ? 'text-gray-500'
                        : isCurrentMonth
                          ? 'text-[#2B2820]'
                          : 'text-gray-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </p>
                  {/* Past days: names only (no count). Today/future: names (lg) + count */}
                  <div className="flex flex-col gap-1.5 mt-auto min-h-0">
                    <div
                      className={`hidden lg:grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[10px] leading-tight overflow-hidden ${
                        isPast ? 'text-gray-500' : styles.text
                      }`}
                    >
                      {clients.slice(0, 4).map((c, i) => (
                        <span key={i} className="truncate" title={`${c.first_name} ${c.last_name}`}>
                          {c.first_name} {c.last_name}
                        </span>
                      ))}
                    </div>
                    {!isPast && (
                      <div
                        className={`flex items-center gap-2 px-2 py-1.5 ${styles.bg} rounded text-sm lg:mt-1`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${styles.dot} flex-shrink-0`}
                          aria-hidden
                        />
                        <span className={`text-xs font-medium ${styles.text}`}>
                          {count}/{OCCUPANCY_LIMIT}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[#2B2820]">
          <span className="font-medium">Limit {OCCUPANCY_LIMIT}/day:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden />
            <span>0–2 (available)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden />
            <span>3 (limited)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" aria-hidden />
            <span>{OCCUPANCY_LIMIT}+ (full)</span>
          </span>
        </div>
      </div>

      {/* Right-side card: selected day clients with treatment type and days left */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDay
                ? format(selectedDay, 'EEEE, MMMM d, yyyy')
                : 'Select a day'}
            </SheetTitle>
          </SheetHeader>
          {selectedDay && (
            <div className="px-4 pb-6 space-y-4">
              {getClientsForDate(selectedDay).length === 0 ? (
                <p className="text-[#6F7C8E] text-sm">No clients in facility this day.</p>
              ) : (
                <ul className="space-y-3">
                  {getClientsForDate(selectedDay).map((client, idx) => {
                    const daysLeft = getDaysLeftFrom(
                      client.arrival_date,
                      client.number_of_days,
                      selectedDay
                    )
                    const estimatedDischarge = getEstimatedDischargeDate(
                      client.arrival_date,
                      client.number_of_days
                    )
                    return (
                      <li
                        key={idx}
                        className="rounded-xl border border-[#D6D2C8] p-4 bg-[#F5F4F0]/50 space-y-2"
                      >
                        <p className="font-semibold text-[#2B2820]">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-sm text-[#6F7C8E]">
                          Treatment: {formatProgramType(client.program_type)}
                        </p>
                        <p className="text-sm text-[#2B2820]">
                          Est. discharge: {format(estimatedDischarge, 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm font-medium text-[#1976D2]">
                          {daysLeft === 0
                            ? 'Departs today'
                            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
