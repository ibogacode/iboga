'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { getAllCalendarEvents } from '@/actions/calendar.action'
import { Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, getHours, getMinutes, getTime } from 'date-fns'

interface CalendarEvent {
  id: string
  summary: string
  start: string | { dateTime?: string; date?: string }
  end: string | { dateTime?: string; date?: string }
  status: string
  attendees?: Array<{
    email: string
    responseStatus?: string
    organizer?: boolean
    displayName?: string
  }>
}


export default function ConsultSchedulingPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      
      try {
        const calendarResult = await getAllCalendarEvents({})

        if (calendarResult?.data?.success) {
          const events = calendarResult.data.data || []
          console.log('[ConsultScheduling] Loaded calendar events:', events.length)
          // Filter out cancelled events for display, but keep all others
          const activeEvents = events.filter((event: CalendarEvent) => event.status !== 'cancelled')
          setCalendarEvents(activeEvents)
          console.log('[ConsultScheduling] Active calendar events:', activeEvents.length)
        } else {
          console.warn('[ConsultScheduling] Failed to load calendar events:', calendarResult?.data)
        }
      } catch (error) {
        console.error('[ConsultScheduling] Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])


  // Get events for a specific date - show ALL events regardless of patient association
  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter((event) => {
      try {
        if (!event.start) return false
        
        // Handle both dateTime and date formats
        let eventDate: Date
        if (typeof event.start === 'string') {
          eventDate = parseISO(event.start)
        } else if (event.start.dateTime) {
          eventDate = parseISO(event.start.dateTime)
        } else if (event.start.date) {
          eventDate = parseISO(event.start.date)
        } else {
          return false
        }
        
        return isSameDay(eventDate, date)
      } catch (error) {
        console.error('[ConsultScheduling] Error parsing event date:', error, event)
        return false
      }
    })
  }

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = new Date(monthStart)
    startDate.setDate(startDate.getDate() - getDay(monthStart))
    
    const endDate = new Date(monthEnd)
    endDate.setDate(endDate.getDate() + (6 - getDay(monthEnd)))
    
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentDate])

  // Get week days for week view (based on currentDate for main view, selectedDay for modal)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])


  // Get events for a specific day and time slot
  const getEventsForDayAndTime = (day: Date, hour: number) => {
    return calendarEvents.filter((event) => {
      try {
        if (!event.start) return false
        
        let eventDate: Date
        if (typeof event.start === 'string') {
          eventDate = parseISO(event.start)
        } else if (event.start.dateTime) {
          eventDate = parseISO(event.start.dateTime)
        } else if (event.start.date) {
          eventDate = parseISO(event.start.date)
        } else {
          return false
        }
        
        const eventHour = getHours(eventDate)
        return isSameDay(eventDate, day) && eventHour === hour
      } catch {
        return false
      }
    })
  }

  // Get all events for a day (for week view)
  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter((event) => {
      try {
        if (!event.start) return false
        
        let eventDate: Date
        if (typeof event.start === 'string') {
          eventDate = parseISO(event.start)
        } else if (event.start.dateTime) {
          eventDate = parseISO(event.start.dateTime)
        } else if (event.start.date) {
          eventDate = parseISO(event.start.date)
        } else {
          return false
        }
        
        return isSameDay(eventDate, day)
      } catch {
        return false
      }
    })
  }

  // Get events for a specific hour in day view
  const getEventsForHour = (day: Date, hour: number) => {
    return calendarEvents.filter((event) => {
      try {
        if (!event.start) return false
        
        let eventDate: Date
        if (typeof event.start === 'string') {
          eventDate = parseISO(event.start)
        } else if (event.start.dateTime) {
          eventDate = parseISO(event.start.dateTime)
        } else if (event.start.date) {
          return false // All-day events
        } else {
          return false
        }
        
        return isSameDay(eventDate, day) && getHours(eventDate) === hour
      } catch {
        return false
      }
    })
  }

  // Get attendee name
  const getAttendeeName = (event: CalendarEvent) => {
    if (event.attendees && event.attendees.length > 0) {
      const attendee = event.attendees.find((a: any) => a.email && !a.organizer)
      if (attendee) {
        return attendee.email.split('@')[0] || attendee.displayName || 'Patient'
      }
    }
    return 'Patient'
  }

  // Format event time
  const getEventTime = (event: CalendarEvent) => {
    try {
      if (!event.start) return ''
      let eventDate: Date
      if (typeof event.start === 'string') {
        eventDate = parseISO(event.start)
      } else if (event.start.dateTime) {
        eventDate = parseISO(event.start.dateTime)
      } else if (event.start.date) {
        return 'All Day'
      } else {
        return ''
      }
      const hour = getHours(eventDate)
      const minute = getMinutes(eventDate)
      if (minute === 0) {
        return `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`
      }
      return `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`
    } catch {
      return ''
    }
  }

  // Get event end time
  const getEventEndTime = (event: CalendarEvent) => {
    try {
      if (!event.end) return ''
      let eventDate: Date
      if (typeof event.end === 'string') {
        eventDate = parseISO(event.end)
      } else if (event.end.dateTime) {
        eventDate = parseISO(event.end.dateTime)
      } else if (event.end.date) {
        return ''
      } else {
        return ''
      }
      const hour = getHours(eventDate)
      const minute = getMinutes(eventDate)
      if (minute === 0) {
        return `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`
      }
      return `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`
    } catch {
      return ''
    }
  }

  // Time slots for week view (7 AM to 9 PM)
  const timeSlots = Array.from({ length: 15 }, (_, i) => i + 7) // 7 to 21

  // Handle day click - set selected day and switch to day view
  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    setViewMode('day')
  }


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
      <div className="flex flex-col gap-1 mb-6">
        <h1 
          className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black"
          style={{ 
            fontFamily: 'var(--font-instrument-serif), serif',
          }}
        >
          Consult Scheduling
        </h1>
        <p className="text-sm sm:text-base text-[#777777] leading-[1.48em] tracking-[-0.04em]">
          Schedule consultations, manage availability, and track readiness.
        </p>
      </div>

      {/* Calendar Section - Full Width */}
      <div className="bg-white rounded-2xl p-5 shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-black leading-[1.193em] tracking-[-0.04em]">
              Consult Calendar - {viewMode === 'week' 
                ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                : viewMode === 'day'
                ? format(selectedDay, 'EEEE, MMMM d, yyyy')
                : format(currentDate, 'MMMM yyyy')}
            </h2>
            
            <div className="flex items-center gap-2 bg-white rounded-full p-1 border border-[#D6D2C8]">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  viewMode === 'month'
                    ? 'bg-white text-[#6E7A46] shadow-[0px_2px_16px_0px_rgba(0,0,0,0.08)]'
                    : 'text-[#090909]'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white text-[#6E7A46] shadow-[0px_2px_16px_0px_rgba(0,0,0,0.08)]'
                    : 'text-[#090909]'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white text-[#6E7A46] shadow-[0px_2px_16px_0px_rgba(0,0,0,0.08)]'
                    : 'text-[#090909]'
                }`}
              >
                Day
              </button>
            </div>
          </div>

          {/* Calendar Grid - Week, Month, or Day View */}
          {viewMode === 'day' ? (
            <div className="bg-white rounded-2xl border border-[#D6D2C8] overflow-hidden">
              <div className="flex">
                {/* Time Column */}
                <div className="w-20 border-r border-[#DCE0E5] flex flex-col">
                  <div className="h-20 border-b border-[#DCE0E5] flex items-center justify-center bg-[#F5F4F0] flex-shrink-0">
                    <p className="text-[15px] text-[#6F7C8E]">GMT +5</p>
                  </div>
                  {timeSlots.map((hour) => (
                    <div key={hour} className="h-16 border-b border-[#DCE0E5] flex items-center justify-center bg-[#F5F4F0] flex-shrink-0">
                      <p className="text-[15px] text-[#14181F]">{String(hour).padStart(2, '0')}:00</p>
                    </div>
                  ))}
                </div>

                {/* Day Column */}
                <div className="flex-1 flex flex-col">
                  {/* Day Header */}
                  <div className="h-20 border-b border-[#DCE0E5] p-2 bg-white flex-shrink-0">
                    <p className="text-2xl font-medium text-[#14181F]">{format(selectedDay, 'd')}</p>
                    <p className="text-sm text-[#14181F]">{format(selectedDay, 'MMM, EEEE')}</p>
                  </div>
                  
                  {/* Time Slots */}
                  {timeSlots.map((hour) => {
                    const slotEvents = getEventsForHour(selectedDay, hour)
                    
                    return (
                      <div
                        key={hour}
                        className="h-16 border-b border-[#DCE0E5] relative bg-white flex-shrink-0"
                      >
                        {slotEvents.map((event) => {
                          const eventSummary = event.summary || 'Consult'
                          const attendeeName = getAttendeeName(event)
                          const isConfirmed = event.status !== 'cancelled'
                          
                          // Calculate event duration for height
                          let startHour = hour
                          let startMinute = 0
                          let endHour = hour
                          let endMinute = 0
                          
                          try {
                            if (event.start) {
                              let startDate: Date
                              if (typeof event.start === 'string') {
                                startDate = parseISO(event.start)
                              } else if (event.start.dateTime) {
                                startDate = parseISO(event.start.dateTime)
                              } else {
                                startDate = new Date()
                              }
                              startHour = getHours(startDate)
                              startMinute = getMinutes(startDate)
                            }
                            
                            if (event.end) {
                              let endDate: Date
                              if (typeof event.end === 'string') {
                                endDate = parseISO(event.end)
                              } else if (event.end.dateTime) {
                                endDate = parseISO(event.end.dateTime)
                              } else {
                                endDate = new Date()
                              }
                              endHour = getHours(endDate)
                              endMinute = getMinutes(endDate)
                            }
                          } catch {
                            // Use defaults
                          }
                          
                          const durationHours = endHour - startHour + (endMinute - startMinute) / 60
                          const eventHeight = Math.max(16, durationHours * 64 - 4) // 64px per hour, 4px padding
                          const offsetTop = (startMinute / 60) * 64
                          
                          return (
                            <div
                              key={event.id}
                              className="absolute left-1 right-1 px-3 py-1 rounded-[10px] text-xs overflow-hidden"
                              style={{
                                backgroundColor: isConfirmed ? '#E2F5FF' : '#FFFBD4',
                                color: isConfirmed ? '#1976D2' : '#F59E0B',
                                top: `${offsetTop}px`,
                                height: `${eventHeight}px`,
                                zIndex: 10,
                              }}
                            >
                              <p className="font-semibold">{eventSummary}</p>
                              <p className="text-[10px]">{attendeeName}</p>
                              <p className="text-[10px] opacity-75">
                                {getEventTime(event)} - {getEventEndTime(event)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : viewMode === 'week' ? (
            <div className="bg-white rounded-2xl border border-[#D6D2C8] overflow-hidden">
              <div className="flex">
                {/* Time Column */}
                <div className="w-20 border-r border-[#DCE0E5]">
                  <div className="h-20 border-b border-[#DCE0E5] flex items-center justify-center">
                    <p className="text-[15px] text-[#6F7C8E]">GMT +5</p>
                  </div>
                  {timeSlots.map((hour) => (
                    <div key={hour} className="h-16 border-b border-[#DCE0E5] flex items-center justify-center">
                      <p className="text-[15px] text-[#14181F]">{String(hour).padStart(2, '0')}:00</p>
                    </div>
                  ))}
                </div>

                {/* Week Days */}
                <div className="flex-1 flex">
                  {weekDays.map((day, dayIndex) => {
                    const isToday = isSameDay(day, new Date())
                    const dayEvents = getEventsForDay(day)
                    
                    return (
                      <div key={dayIndex} className="flex-1 border-r border-[#DCE0E5] last:border-r-0">
                        {/* Day Header */}
                        <div className={`h-20 border-b border-[#DCE0E5] p-2 ${isToday ? 'bg-[#FDFFF5]' : ''}`}>
                          <p className="text-2xl font-medium text-[#14181F]">{format(day, 'd')}</p>
                          <p className="text-sm text-[#14181F]">{format(day, 'MMM, EEEE')}</p>
                        </div>
                        
                        {/* Time Slots */}
                        {timeSlots.map((hour) => {
                          const slotEvents = getEventsForDayAndTime(day, hour)
                          
                          return (
                            <div
                              key={hour}
                              className="h-16 border-b border-[#DCE0E5] relative"
                              onClick={() => handleDayClick(day)}
                            >
                              {slotEvents.map((event) => {
                                const eventSummary = event.summary || 'Consult'
                                let attendeeName = 'Patient'
                                if (event.attendees && event.attendees.length > 0) {
                                  const attendee = event.attendees.find((a: any) => a.email && !a.organizer)
                                  if (attendee) {
                                    attendeeName = attendee.email.split('@')[0] || attendee.displayName || 'Patient'
                                  }
                                }
                                const isConfirmed = event.status !== 'cancelled'
                                
                                return (
                                  <div
                                    key={event.id}
                                    className="absolute left-1 right-1 px-3 py-1 rounded-[10px] text-xs text-center"
                                    style={{
                                      backgroundColor: isConfirmed ? '#E2F5FF' : '#FFFBD4',
                                      color: isConfirmed ? '#1976D2' : '#F59E0B',
                                      top: '2px',
                                      bottom: '2px',
                                    }}
                                  >
                                    <p className="font-semibold">{eventSummary}</p>
                                    <p className="text-[10px]">{attendeeName}</p>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#D6D2C8] overflow-hidden">
              {/* Day Headers */}
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

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())
                const dayEvents = getEventsForDate(day)
                const eventCount = dayEvents.length

                // Get time for first event
                const getEventTime = (event: CalendarEvent) => {
                  try {
                    if (!event.start) return ''
                    let eventDate: Date
                    if (typeof event.start === 'string') {
                      eventDate = parseISO(event.start)
                    } else if (event.start.dateTime) {
                      eventDate = parseISO(event.start.dateTime)
                    } else if (event.start.date) {
                      // All-day events don't have time
                      return ''
                    } else {
                      return ''
                    }
                    const hour = getHours(eventDate)
                    const minute = getMinutes(eventDate)
                    if (minute === 0) {
                      return `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`
                    }
                    return `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`
                  } catch {
                    return ''
                  }
                }

                // Get event display text
                const getEventText = (event: CalendarEvent) => {
                  return event.summary || 'Schedule a Consult'
                }

                return (
                  <div
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={`h-[140px] p-3 border-r border-b border-[#D6D2C8] last:border-r-0 flex flex-col gap-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !isCurrentMonth ? 'bg-gray-50' : isToday ? 'bg-[#FDFFF5]' : 'bg-white'
                    } ${isToday ? 'ring-2 ring-[#CAE081] ring-inset' : ''}`}
                  >
                    <p
                      className={`text-2xl font-medium leading-[1.193em] tracking-[-0.04em] ${
                        isCurrentMonth ? 'text-[#2B2820]' : 'text-gray-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </p>
                    
                    {eventCount > 0 && (
                      <div className="flex flex-col gap-1.5 mt-auto">
                        {eventCount === 1 ? (
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-[#E2F5FF] rounded text-sm">
                            <div className="w-2 h-2 rounded-full bg-[#1976D2] flex-shrink-0"></div>
                            <span className="text-[#1976D2] text-xs font-medium truncate">
                              {(() => {
                                const time = getEventTime(dayEvents[0])
                                const text = getEventText(dayEvents[0])
                                return time ? `${time} ${text}` : text
                              })()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-[#E2F5FF] rounded text-sm">
                            <div className="w-2 h-2 rounded-full bg-[#1976D2] flex-shrink-0"></div>
                            <span className="text-[#1976D2] text-xs font-medium">
                              {eventCount}+
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          )}

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (viewMode === 'day') {
                  setSelectedDay(subDays(selectedDay, 1))
                } else if (viewMode === 'week') {
                  setCurrentDate(subWeeks(currentDate, 1))
                } else {
                  setCurrentDate(subMonths(currentDate, 1))
                }
              }}
              className="h-[44px] px-4 border border-[#D6D2C8] rounded-[24px]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date()
                if (viewMode === 'day') {
                  setSelectedDay(today)
                } else {
                  setCurrentDate(today)
                }
              }}
              className="h-[44px] px-4 border border-[#D6D2C8] rounded-[24px]"
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (viewMode === 'day') {
                  setSelectedDay(addDays(selectedDay, 1))
                } else if (viewMode === 'week') {
                  setCurrentDate(addWeeks(currentDate, 1))
                } else {
                  setCurrentDate(addMonths(currentDate, 1))
                }
              }}
              className="h-[44px] px-4 border border-[#D6D2C8] rounded-[24px]"
            >
              Next
            </Button>
          </div>
        </div>
    </div>
  )
}

